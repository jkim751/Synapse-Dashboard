import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "director") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, personType, payRate } = body;

  const result = await prisma.payRate.create({
    data: {
      name,
      personType,
      payRate: parseFloat(payRate),
    },
  });

  return NextResponse.json(result);
}
