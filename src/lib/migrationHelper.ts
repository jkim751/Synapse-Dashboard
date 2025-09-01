import prisma from "./prisma";

export async function checkAndMigrateAttendanceStatus() {
  try {
    // Try to find the first attendance record to check if status field exists
    const sampleRecord = await prisma.attendance.findFirst({
      select: {
        id: true,
        present: true,
        status: true, // This will fail if the field doesn't exist
      },
    });
    
    console.log("Status field exists in database");
    return true;
  } catch (error) {
    console.log("Status field does not exist in database yet");
    return false;
  }
}

export async function migrateExistingAttendanceRecords() {
  try {
    const hasStatusField = await checkAndMigrateAttendanceStatus();
    
    if (!hasStatusField) {
      console.log("Please run database migration to add status field");
      return false;
    }

    // Update existing records that don't have a status set
    const recordsToUpdate = await prisma.attendance.findMany({
      where: {
        OR: [
          { status: null },
          { status: "" },
        ],
      },
    });

    console.log(`Found ${recordsToUpdate.length} records to migrate`);

    for (const record of recordsToUpdate) {
      const status = record.present ? "present" : "absent";
      await prisma.attendance.update({
        where: { id: record.id },
        data: { status },
      });
    }

    console.log(`Migrated ${recordsToUpdate.length} attendance records`);
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}
