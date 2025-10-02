import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getXeroClient } from '@/lib/xero';
import { Contact, Phone } from 'xero-node';

export async function POST() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get an authenticated Xero client
    let xero;
    try {
      xero = await getXeroClient(userId);
    } catch (error) {
      console.error('Failed to initialize Xero client:', error);
      return NextResponse.json({ error: 'Failed to initialize Xero client. Please re-authenticate.' }, { status: 500 });
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

    // 3. Execute bulk operations against Xero API
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
        // Update contacts individually since updateContacts doesn't exist
        for (const contact of contactsToUpdate) {
          if (contact.contactID) {
            await xero.accountingApi.updateContact(activeTenantId, contact.contactID, { contacts: [contact] });
            updatedCount++;
          }
        }
    }
    
    return NextResponse.json({ 
        success: true, 
        message: `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}.` 
    });

  } catch (error: any) {
    if (error.message.includes('refresh')) {
      console.error('Xero token refresh failed. Prompting re-authentication:', error);
      return NextResponse.json({ error: 'Xero token refresh failed. Please re-authenticate.' }, { status: 401 });
    }
    console.error('Xero contact sync failed:', error);
    return NextResponse.json({ error: 'Failed to sync contacts with Xero.', details: error.message }, { status: 500 });
  }
}