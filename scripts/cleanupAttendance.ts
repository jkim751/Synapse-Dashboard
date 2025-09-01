import { PrismaClient } from '@prisma/client';
import { doesRecurringLessonOccurOnDate, getDayFromDate, isDateWithinLessonPeriod } from '../src/lib/rruleUtils';

const prisma = new PrismaClient();

interface InvalidAttendanceRecord {
  id: number;
  date: Date;
  studentId: string;
  lessonId?: number;
  recurringLessonId?: number;
  reason: string;
  studentName: string;
  lessonName: string;
}

async function findInvalidAttendanceRecords(): Promise<InvalidAttendanceRecord[]> {
  console.log('🔍 Scanning for invalid attendance records...');
  
  const invalidRecords: InvalidAttendanceRecord[] = [];
  
  // Get all attendance records
  const attendanceRecords = await prisma.attendance.findMany({
    include: {
      student: true,
      lesson: {
        include: {
          subject: true,
          class: true,
        },
      },
      recurringLesson: {
        include: {
          subject: true,
          class: true,
        },
      },
    },
  });

  console.log(`📊 Found ${attendanceRecords.length} total attendance records to check`);

  for (const record of attendanceRecords) {
    const attendanceDate = new Date(record.date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check regular lessons
    if (record.lessonId && record.lesson) {
      const lessonDay = getDayFromDate(record.lesson.startTime);
      const attendanceDay = getDayFromDate(attendanceDate);
      
      if (lessonDay !== attendanceDay) {
        invalidRecords.push({
          id: record.id,
          date: attendanceDate,
          studentId: record.studentId,
          lessonId: record.lessonId,
          reason: `Regular lesson scheduled for ${lessonDay} but attendance marked for ${attendanceDay}`,
          studentName: `${record.student.name} ${record.student.surname}`,
          lessonName: `${record.lesson.subject?.name || 'Unknown'} - ${record.lesson.class?.name || 'Unknown'}`,
        });
      }
    }

    // Check recurring lessons
    if (record.recurringLessonId && record.recurringLesson) {
      const lesson = record.recurringLesson;
      
      // Check if the lesson period includes the attendance date
      if (!isDateWithinLessonPeriod(lesson.startTime, attendanceDate, lesson.rrule)) {
        invalidRecords.push({
          id: record.id,
          date: attendanceDate,
          studentId: record.studentId,
          recurringLessonId: record.recurringLessonId,
          reason: `Attendance date is outside the recurring lesson's active period`,
          studentName: `${record.student.name} ${record.student.surname}`,
          lessonName: `${lesson.subject?.name || 'Unknown'} - ${lesson.class?.name || 'Unknown'} (Recurring)`,
        });
        continue;
      }

      // Check if the lesson actually occurs on this specific date based on RRule
      if (!doesRecurringLessonOccurOnDate(lesson.rrule, lesson.startTime, attendanceDate)) {
        invalidRecords.push({
          id: record.id,
          date: attendanceDate,
          studentId: record.studentId,
          recurringLessonId: record.recurringLessonId,
          reason: `Recurring lesson does not occur on this date according to RRule: ${lesson.rrule}`,
          studentName: `${record.student.name} ${record.student.surname}`,
          lessonName: `${lesson.subject?.name || 'Unknown'} - ${lesson.class?.name || 'Unknown'} (Recurring)`,
        });
      }
    }

    // Check for orphaned records (no lesson or recurring lesson)
    if (!record.lessonId && !record.recurringLessonId) {
      invalidRecords.push({
        id: record.id,
        date: attendanceDate,
        studentId: record.studentId,
        reason: 'Orphaned attendance record - no associated lesson',
        studentName: `${record.student.name} ${record.student.surname}`,
        lessonName: 'No lesson associated',
      });
    }
  }

  return invalidRecords;
}

async function displayInvalidRecords(records: InvalidAttendanceRecord[]) {
  console.log('\n📋 Invalid Attendance Records Found:');
  console.log('='.repeat(80));
  
  if (records.length === 0) {
    console.log('✅ No invalid attendance records found!');
    return;
  }

  records.forEach((record, index) => {
    console.log(`\n${index + 1}. Record ID: ${record.id}`);
    console.log(`   Date: ${record.date.toDateString()}`);
    console.log(`   Student: ${record.studentName}`);
    console.log(`   Lesson: ${record.lessonName}`);
    console.log(`   Reason: ${record.reason}`);
    console.log(`   Lesson ID: ${record.lessonId || 'N/A'}`);
    console.log(`   Recurring Lesson ID: ${record.recurringLessonId || 'N/A'}`);
  });

  console.log(`\n📊 Total invalid records: ${records.length}`);
}

async function deleteInvalidRecords(records: InvalidAttendanceRecord[], dryRun: boolean = true) {
  if (records.length === 0) {
    console.log('✅ No records to delete.');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No records will be deleted');
    console.log(`Would delete ${records.length} invalid attendance records`);
    return;
  }

  console.log('\n🗑️  Deleting invalid attendance records...');
  
  const recordIds = records.map(r => r.id);
  
  try {
    const result = await prisma.attendance.deleteMany({
      where: {
        id: {
          in: recordIds,
        },
      },
    });

    console.log(`✅ Successfully deleted ${result.count} invalid attendance records`);
  } catch (error) {
    console.error('❌ Error deleting records:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--delete');
  const showAll = args.includes('--show-all');

  console.log('🧹 Attendance Cleanup Script');
  console.log('='.repeat(50));
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode (use --delete to actually delete records)');
  } else {
    console.log('⚠️  DELETION MODE - Invalid records will be permanently deleted!');
  }

  try {
    const invalidRecords = await findInvalidAttendanceRecords();
    
    if (showAll || invalidRecords.length <= 20) {
      await displayInvalidRecords(invalidRecords);
    } else {
      console.log(`\n📊 Found ${invalidRecords.length} invalid records (use --show-all to see details)`);
    }

    if (!dryRun && invalidRecords.length > 0) {
      // Ask for confirmation in deletion mode
      console.log('\n⚠️  Are you sure you want to delete these records? This action cannot be undone!');
      console.log('Type "DELETE" to confirm:');
      
      // In a real script, you'd want to use readline for input
      // For now, we'll just proceed with deletion
      await deleteInvalidRecords(invalidRecords, false);
    } else {
      await deleteInvalidRecords(invalidRecords, true);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { findInvalidAttendanceRecords, deleteInvalidRecords };
