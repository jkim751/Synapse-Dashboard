import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroClient } from '@/lib/xero';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactIDs } = await request.json();
    if (!contactIDs || !Array.isArray(contactIDs) || contactIDs.length === 0) {
      // If there are no contacts with Xero IDs, return an empty array.
      return NextResponse.json([]);
    }

    const xero = await getXeroClient(userId);
    const activeTenantId = xero.tenants[0].tenantId;

    const response = await xero.accountingApi.getInvoices(
      activeTenantId,
      undefined,
      `Contact.ContactID IN (${contactIDs.map(id => `"${id}"`).join(",")})`
    );
    
    // Map the complex Xero response to the simple Invoice interface our component needs
    const invoices = response.body.invoices?.map(inv => ({
      id: inv.invoiceID,
      studentName: inv.contact?.name,
      amount: inv.amountDue,
      dueDate: inv.dueDate,
      status: inv.status,
      description: inv.lineItems?.[0]?.description || 'School Fees',
    })) || [];

    return NextResponse.json(invoices);

  } catch (error: any) {
    console.error('Error fetching Xero invoices:', error.response?.body || error.message);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}