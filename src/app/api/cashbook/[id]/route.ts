import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ALLOWED = ["admin", "director", "teacher-admin"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const entry = await prisma.cashbookEntry.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.xero !== undefined && { xero: Boolean(body.xero) }),
      ...(body.receipt !== undefined && { receipt: Boolean(body.receipt) }),
      ...(body.cashbook !== undefined && { cashbook: Boolean(body.cashbook) }),
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.cashbookEntry.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
