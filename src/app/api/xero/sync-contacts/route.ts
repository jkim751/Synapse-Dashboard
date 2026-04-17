import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAnyXeroClient } from '@/lib/xero';
import { Contact, Phone } from 'xero-node';

export async function POST() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get an authenticated Xero client using whichever admin has connected Xero
    let xero;
    try {
      xero = await getAnyXeroClient();
    } catch (error) {
      console.error('Failed to initialize Xero client:', error);
      return NextResponse.json({ error: 'Failed to initialize Xero client. Please connect Xero first.' }, { status: 500 });
    }

    const activeTenantId = xero.tenants[0]?.tenantId;
    if (!activeTenantId) {
      return NextResponse.json({ error: 'No active Xero tenant found. Please re-authenticate.' }, { status: 500 });
    }

    // 1. Fetch all local records that need syncing
    const studentsToSync = await prisma.student.findMany();
    const parentsToSync = await prisma.parent.findMany();

    // Combine them into a single list for processing
    const allPeople = [
        ...studentsToSync.map((p: any) => ({ ...p, type: 'student' })), 
        ...parentsToSync.map((p: any) => ({ ...p, type: 'parent' }))
    ];
    
    // 2. Prepare contacts for Xero API, separating new from existing
    const contactsToCreate: Contact[] = [];
    const contactsToUpdate: Contact[] = [];
    // Create a map to link our local ID to the Xero payload
    const creationMap = new Map<string, { id: string; type: 'student' | 'parent' }>();

    for (const person of allPeople) {
      // Use a unique account number to reliably map back after creation
      const accountNumber = `${person.type.toUpperCase()}-${person.id}`;

      const contactPayload: Contact = {
        accountNumber: accountNumber, // Add a unique identifier
        name: `${person.name} ${person.surname} (${person.type.charAt(0).toUpperCase()})`, // e.g., "Jason Kim (S)"
        firstName: person.name,
        lastName: person.surname,
        emailAddress: person.email || undefined,
        phones: person.phone ? [{ phoneType: Phone.PhoneTypeEnum.DEFAULT, phoneNumber: person.phone }] : undefined,
      };

      if (!contactPayload.name || !contactPayload.firstName || !contactPayload.lastName) {
        console.error("Invalid contact payload:", contactPayload);
        continue;
      }

      if ('xeroContactId' in person && person.xeroContactId) {
        // This contact already exists in Xero, so we'll update it
        contactPayload.contactID = person.xeroContactId;
        contactsToUpdate.push(contactPayload);
      } else {
        // This is a new contact, we'll create it
        contactsToCreate.push(contactPayload);
        // Map the account number back to our local person's ID and type
        creationMap.set(accountNumber, { id: person.id, type: person.type as 'student' | 'parent' });
      }
    }

    // 3. Reconcile: fetch all existing Xero contacts to find any that were previously
    //    synced but whose contactID isn't stored in our DB (e.g. after a DB migration).
    //    Match by accountNumber and move them from create → update, writing the ID back locally.
    if (contactsToCreate.length > 0) {
      const existingXeroMap = new Map<string, string>(); // accountNumber -> contactID
      const existingXeroByName = new Map<string, string>(); // normalised name -> contactID
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await xero.accountingApi.getContacts(
          activeTenantId,
          undefined, undefined, undefined, undefined, undefined,
          false, false, undefined, page
        );
        const contacts = response.body.contacts || [];
        for (const contact of contacts) {
          if (contact.contactID) {
            if (contact.accountNumber) {
              existingXeroMap.set(contact.accountNumber, contact.contactID);
            }
            if (contact.name) {
              existingXeroByName.set(contact.name.trim().toLowerCase(), contact.contactID);
            }
          }
        }
        hasMore = contacts.length === 100;
        page++;
      }

      const trulyNew: Contact[] = [];
      for (const contact of contactsToCreate) {
        // First try to match by accountNumber (reliable)
        let existingId = contact.accountNumber ? existingXeroMap.get(contact.accountNumber) : undefined;

        // Fallback: match by name for contacts previously synced without an accountNumber
        if (!existingId && contact.name) {
          existingId = existingXeroByName.get(contact.name.trim().toLowerCase());
        }

        if (existingId) {
          // Already in Xero — write contactID back to local DB and move to update list
          const personInfo = contact.accountNumber ? creationMap.get(contact.accountNumber) : undefined;
          if (personInfo) {
            if (personInfo.type === 'student') {
              await prisma.student.update({ where: { id: personInfo.id }, data: { xeroContactId: existingId } });
            } else {
              await prisma.parent.update({ where: { id: personInfo.id }, data: { xeroContactId: existingId } });
            }
          }
          contact.contactID = existingId;
          contactsToUpdate.push(contact);
        } else {
          trulyNew.push(contact);
        }
      }
      contactsToCreate.length = 0;
      contactsToCreate.push(...trulyNew);
    }

    // 4. Execute bulk operations against Xero API
    let createdCount = 0;
    let updatedCount = 0;

    if (contactsToCreate.length > 0) {
      const createResponse = await xero.accountingApi.createContacts(activeTenantId, { contacts: contactsToCreate });
      createdCount = createResponse.body.contacts?.length || 0;
      
      // IMPORTANT: Update your local database with the new Xero Contact IDs
      if (createResponse.body.contacts) {
        for (const newXeroContact of createResponse.body.contacts) {
          // Find the original person record using our reliable map
          const originalPersonInfo = newXeroContact.accountNumber ? creationMap.get(newXeroContact.accountNumber) : undefined;
          
          if (originalPersonInfo && newXeroContact.contactID) {
            if (originalPersonInfo.type === 'student') {
              await prisma.student.update({
                where: { id: originalPersonInfo.id },
                data: { xeroContactId: newXeroContact.contactID }
              });
            } else {
              await prisma.parent.update({
                where: { id: originalPersonInfo.id },
                data: { xeroContactId: newXeroContact.contactID }
              });
            }
          }
        }
      }
    }

    if (contactsToUpdate.length > 0) {
      // Batch updates in chunks of 100 (same endpoint as create — contactID triggers update)
      const BATCH_SIZE = 100;
      for (let i = 0; i < contactsToUpdate.length; i += BATCH_SIZE) {
        const batch = contactsToUpdate.slice(i, i + BATCH_SIZE);
        const response = await xero.accountingApi.updateOrCreateContacts(activeTenantId, { contacts: batch });
        updatedCount += response.body.contacts?.length || 0;
      }
    }
    
    return NextResponse.json({ 
        success: true, 
        message: `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}.` 
    });

  } catch (error: any) {
    if (error.message?.includes('refresh')) {
      console.error('Xero token refresh failed. Prompting re-authentication:', error);
      return NextResponse.json({ error: 'Xero token refresh failed. Please re-authenticate.' }, { status: 401 });
    }
    console.error('Xero contact sync failed:', error);
    return NextResponse.json({ error: 'Failed to sync contacts with Xero.', details: error.message }, { status: 500 });
  }
}