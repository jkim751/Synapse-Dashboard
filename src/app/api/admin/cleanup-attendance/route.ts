import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { findInvalidAttendanceRecords, deleteInvalidRecords } from "../../../../../scripts/cleanupAttendance";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    // Only allow admin users
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const invalidRecords = await findInvalidAttendanceRecords();
    
    return NextResponse.json({
      success: true,
      count: invalidRecords.length,
      records: invalidRecords,
    });
  } catch (error) {
    console.error("Error finding invalid attendance records:", error);
    return NextResponse.json(
      { error: "Failed to find invalid records" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    // Only allow admin users
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const invalidRecords = await findInvalidAttendanceRecords();
    
    if (invalidRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No invalid records found to delete",
        deletedCount: 0,
      });
    }

    await deleteInvalidRecords(invalidRecords, false);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${invalidRecords.length} invalid attendance records`,
      deletedCount: invalidRecords.length,
    });
  } catch (error) {
    console.error("Error deleting invalid attendance records:", error);
    return NextResponse.json(
      { error: "Failed to delete invalid records" },
      { status: 500 }
    );
  }
}
