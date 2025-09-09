import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId, userRole, photoUrl } = await request.json();

    // Verify the authenticated user is updating their own photo or is an admin
    if (userId !== targetUserId) {
      // You might want to add admin check here
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the photo in the database based on role
    switch (userRole) {
      case "admin":
        await prisma.admin.update({
          where: { id: targetUserId },
          data: { img: photoUrl }
        });
        break;
      case "teacher":
        await prisma.teacher.update({
          where: { id: targetUserId },
          data: { img: photoUrl }
        });
        break;
      case "student":
        await prisma.student.update({
          where: { id: targetUserId },
          data: { img: photoUrl }
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing photo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
