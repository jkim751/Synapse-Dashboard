import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getXeroClient } from '@/lib/xero';
import { Contact, Phone } from 'xero-node';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get an authenticated Xero client
    const xero = await getXeroClient(userId);
    const activeTenantId = xero.tenants[0].tenantId;

    // 1. Fetch all local records that need syncing
    const studentsToSync = await prisma.student.findMany();
    const parentsToSync = await prisma.parent.findMany();

    // Combine them into a single list for processing
    const allPeople = [
        ...studentsToSync.map(p => ({ ...p, type: 'student' })), 
        ...parentsToSync.map(p => ({ ...p, type: 'parent' }))
    ];
    
    // 2. Prepare contacts for Xero API, separating new from existing
    const contactsToCreate: Contact[] = [];
    const contactsToUpdate: Contact[] = [];

    for (const person of allPeople) {
      const contactPayload: Contact = {
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
          // Find the original person record to update it
          const originalPerson = allPeople.find(p => !('xeroContactId' in p && p.xeroContactId) && p.name === newXeroContact.firstName && p.surname === newXeroContact.lastName);
          if (originalPerson && newXeroContact.contactID) {
            if (originalPerson.type === 'student') {
              await prisma.student.update({
                where: { id: originalPerson.id },
                data: { xeroContactId: newXeroContact.contactID }
              });
            } else {
              await prisma.parent.update({
                where: { id: originalPerson.id },
                data: { xeroContactId: newXeroContact.contactID }
              });
            }
          }
        }
      }
    }

    if (contactsToUpdate.length > 0) {
        const updateResponse = await xero.accountingApi.updateOrCreateContacts(activeTenantId, { contacts: contactsToUpdate });
        updatedCount = updateResponse.body.contacts?.length || 0;
    }
    
    return NextResponse.json({ 
        success: true, 
        message: `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}.` 
    });

  } catch (error: any) {
    console.error('Xero contact sync failed:', error);
    return NextResponse.json({ error: 'Failed to sync contacts with Xero.', details: error.message }, { status: 500 });
  }
}