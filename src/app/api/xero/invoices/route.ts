import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAnyXeroClient } from '@/lib/xero';

// GET — fetch invoices for the signed-in parent using their own xeroContactId
export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'parent') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: userId },
      select: { xeroContactId: true },
    });

    if (!parent?.xeroContactId) {
      return NextResponse.json([]);
    }

    const xero = await getAnyXeroClient();
    const activeTenantId = xero.tenants[0].tenantId;

    const response = await xero.accountingApi.getInvoices(
      activeTenantId,
      undefined,
      undefined,
      undefined,
      undefined,
      [parent.xeroContactId],
    );

    const invoices = (response.body.invoices ?? []).map(inv => ({
      id: inv.invoiceID ?? '',
      invoiceNumber: inv.invoiceNumber ?? '',
      total: inv.total ?? 0,
      amountDue: inv.amountDue ?? 0,
      amountPaid: inv.amountPaid ?? 0,
      dueDate: inv.dueDate ? (inv.dueDate as unknown as Date).toISOString() : null,
      status: inv.status ?? 'UNKNOWN',
      description: inv.lineItems?.[0]?.description ?? 'School Fees',
    }));

    return NextResponse.json(invoices);

  } catch (error: any) {
    console.error('Error fetching Xero invoices:', error.response?.body || error.message);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST — create and optionally send an invoice (admin/director only)
export async function POST(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || (role !== 'admin' && role !== 'director')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, description, amount, dueDate, send } = body;

    if (!contactId || !description || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: contactId, description, amount' },
        { status: 400 }
      );
    }

    const xero = await getAnyXeroClient();
    const activeTenantId = xero.tenants[0].tenantId;

    const invoicePayload = {
      invoices: [
        {
          type: 'ACCREC' as any,
          contact: { contactID: contactId },
          lineItems: [
            {
              description,
              quantity: 1.0,
              unitAmount: parseFloat(amount),
              accountCode: '200',
            },
          ],
          ...(dueDate ? { dueDate: new Date(dueDate).toISOString().split('T')[0] } : {}),
          status: ('DRAFT' as any),
        },
      ],
    };

    const response = await xero.accountingApi.createInvoices(activeTenantId, invoicePayload);
    const createdInvoice = response.body.invoices?.[0];

    if (!createdInvoice?.invoiceID) {
      return NextResponse.json({ error: 'Failed to create invoice in Xero' }, { status: 500 });
    }

    if (send) {
      await xero.accountingApi.emailInvoice(activeTenantId, createdInvoice.invoiceID, {});
    }

    return NextResponse.json({ success: true, invoiceId: createdInvoice.invoiceID });

  } catch (error: any) {
    const xeroBody = error.response?.body;
    let details: string;
    if (typeof xeroBody === 'string' && xeroBody) {
      details = xeroBody;
    } else if (xeroBody && typeof xeroBody === 'object') {
      details = JSON.stringify(xeroBody);
    } else {
      details = error.message ?? String(error);
    }
    console.error('Error creating Xero invoice:', details);
    return NextResponse.json({ error: 'Failed to create invoice', details }, { status: 500 });
  }
}
