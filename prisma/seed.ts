import bcrypt from 'bcryptjs'

import { formatRelativeTimeArabic, getDateOnly, getTimeOnly } from '../lib/utils'
import { prisma } from '../lib/prisma'

async function main() {
  await prisma.auditLog.deleteMany()
  await prisma.warning.deleteMany()
  await prisma.transferHistory.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()

  await prisma.user.create({
    data: {
      id: '10',
      username: '10',
      name: 'حسين',
      password: await bcrypt.hash('admin123', 10),
      role: 'CURATOR',
      isActive: true,
    },
  })

  const principal = await prisma.user.create({
    data: {
      id: '11',
      username: 'principal',
      name: 'سارة القحطاني',
      email: 'principal@thabat.local',
      password: await bcrypt.hash('Admin123!', 10),
      role: 'PRINCIPAL',
      isActive: true,
    },
  })

  const vicePrincipal = await prisma.user.create({
    data: {
      id: '12',
      username: 'vice_principal',
      name: 'ريم الحربي',
      email: 'vice@thabat.local',
      password: await bcrypt.hash('Admin123!', 10),
      role: 'VICE_PRINCIPAL',
      isActive: true,
    },
  })

  const teacher = await prisma.user.create({
    data: {
      id: '13',
      username: 'teacher',
      name: 'نور السعدي',
      email: 'teacher@thabat.local',
      password: await bcrypt.hash('Admin123!', 10),
      role: 'TEACHER',
      isActive: true,
      assignedDivisions: JSON.stringify(['101', '102']),
    },
  })

  const studentSeed = [
    { fullName: 'أحمد الزهراني', arabicName: 'أحمد الزهراني', nationalId: '1234567890', gradeLevel: 1, divisionCode: '101', behaviorScore: 100 },
    { fullName: 'سارة الحربي', arabicName: 'سارة الحربي', nationalId: '1234567891', gradeLevel: 1, divisionCode: '101', behaviorScore: 94 },
    { fullName: 'عبدالله الميمان', arabicName: 'عبدالله الميمان', nationalId: '1234567892', gradeLevel: 1, divisionCode: '102', behaviorScore: 100 },
    { fullName: 'فاطمة النعيمي', arabicName: 'فاطمة النعيمي', nationalId: '1234567893', gradeLevel: 1, divisionCode: '102', behaviorScore: 96 },
    { fullName: 'حسين العتيبي', arabicName: 'حسين العتيبي', nationalId: '1234567894', gradeLevel: 2, divisionCode: '201', behaviorScore: 91 },
    { fullName: 'ليلى السلمي', arabicName: 'ليلى السلمي', nationalId: '1234567895', gradeLevel: 2, divisionCode: '201', behaviorScore: 89 },
    { fullName: 'يوسف الشهري', arabicName: 'يوسف الشهري', nationalId: '1234567896', gradeLevel: 2, divisionCode: '201', behaviorScore: 98 },
    { fullName: 'مريم العوشن', arabicName: 'مريم العوشن', nationalId: '1234567897', gradeLevel: 3, divisionCode: '301', behaviorScore: 92 },
    { fullName: 'خالد الصبحي', arabicName: 'خالد الصبحي', nationalId: '1234567898', gradeLevel: 3, divisionCode: '301', behaviorScore: 87 },
    { fullName: 'نورة البقمي', arabicName: 'نورة البقمي', nationalId: '1234567899', gradeLevel: 3, divisionCode: '301', behaviorScore: 95 },
  ]

  const createdStudents = await Promise.all(
    studentSeed.map(async (student) => {
      const now = new Date()

      return prisma.student.create({
        data: {
          fullName: student.fullName,
          arabicName: student.arabicName,
          nationalId: student.nationalId,
          gradeLevel: student.gradeLevel,
          divisionCode: student.divisionCode,
          behaviorScore: student.behaviorScore,
          attendanceScore: 100,
          createdDateOnly: getDateOnly(now),
          createdTimeOnly: getTimeOnly(now),
          lastUpdatedBy: principal.id,
          lastUpdatedByName: principal.name,
          lastUpdatedByRole: principal.role,
        },
      })
    }),
  )

  for (const code of Array.from(new Set(studentSeed.map((student) => student.divisionCode)))) {
    await prisma.division.upsert({ where: { code }, update: {}, create: { code, name: `الشعبة ${code}` } })
  }

  const originalTransferDate = new Date('2026-09-01T09:15:00')

  await prisma.transferHistory.create({
    data: {
      studentId: createdStudents[4].id,
      fromDivision: '201',
      toDivision: '301',
      changedBy: vicePrincipal.id,
      performedByName: vicePrincipal.name,
      performedByRole: vicePrincipal.role,
      reason: 'نقل بناءً على طلب إدارة الصف',
      transferredAt: originalTransferDate,
      transferDateOnly: getDateOnly(originalTransferDate),
      transferTimeOnly: getTimeOnly(originalTransferDate),
      timestamp: originalTransferDate,
    },
  })

  await prisma.student.update({
    where: { id: createdStudents[4].id },
    data: {
      divisionCode: '301',
      lastUpdatedBy: vicePrincipal.id,
      lastUpdatedByName: vicePrincipal.name,
      lastUpdatedByRole: vicePrincipal.role,
    },
  })

  const warningSeed = [
    {
      studentId: createdStudents[0].id,
      issuedBy: principal.id,
      issuedByName: principal.name,
      issuedByRole: principal.role,
      type: 'TARDINESS',
      reason: 'تأخر الطالب عن بداية الحصة ثلاث مرات خلال الأسبوع',
      deduction: 5,
      severity: 'MINOR',
      issuedAt: new Date('2026-09-01T08:10:00'),
    },
    {
      studentId: createdStudents[5].id,
      issuedBy: vicePrincipal.id,
      issuedByName: vicePrincipal.name,
      issuedByRole: vicePrincipal.role,
      type: 'CONDUCT',
      reason: 'مخالفة سلوكية في الصف أثناء الحصة الدراسية',
      deduction: 8,
      severity: 'MODERATE',
      issuedAt: new Date('2026-09-01T10:25:00'),
    },
    {
      studentId: createdStudents[8].id,
      issuedBy: teacher.id,
      issuedByName: teacher.name,
      issuedByRole: teacher.role,
      type: 'ABSENCE',
      reason: 'غياب متكرر دون تنسيق مسبق مع المشرفة',
      deduction: 6,
      severity: 'MAJOR',
      issuedAt: new Date('2026-09-01T11:40:00'),
    },
  ]

  for (const warning of warningSeed) {
    const warningRecord = await prisma.warning.create({
      data: {
        studentId: warning.studentId,
        issuedBy: warning.issuedBy,
        issuedByName: warning.issuedByName,
        issuedByRole: warning.issuedByRole,
        type: warning.type,
        reason: warning.reason,
        deduction: warning.deduction,
        severity: warning.severity,
        issuedAt: warning.issuedAt,
        issuedDateOnly: getDateOnly(warning.issuedAt),
        issuedTimeOnly: getTimeOnly(warning.issuedAt),
      },
    })

    await prisma.student.update({
      where: { id: warning.studentId },
      data: {
        behaviorScore: {
          decrement: warning.deduction,
        },
        lastUpdatedBy: warning.issuedBy,
        lastUpdatedByName: warning.issuedByName,
        lastUpdatedByRole: warning.issuedByRole,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: warning.issuedBy,
        userName: warning.issuedByName,
        userRole: warning.issuedByRole,
        action: 'WARNING_ISSUED',
        targetType: 'Warning',
        targetId: warningRecord.id,
        targetName: createdStudents.find((student) => student.id === warning.studentId)?.fullName ?? 'طالب',
        studentId: warning.studentId,
        oldValue: '100',
        newValue: '0',
        details: JSON.stringify({
          warningType: warning.type,
          deduction: warning.deduction,
          reason: warning.reason,
        }),
        dateOnly: getDateOnly(warning.issuedAt),
        timeOnly: getTimeOnly(warning.issuedAt),
        relativeTime: formatRelativeTimeArabic(warning.issuedAt),
      },
    })
  }

  for (const student of createdStudents) {
    await prisma.auditLog.create({
      data: {
        userId: principal.id,
        userName: principal.name,
        userRole: principal.role,
        action: 'STUDENT_CREATED',
        targetType: 'Student',
        targetId: student.id,
        targetName: student.fullName,
        studentId: student.id,
        details: JSON.stringify({
          divisionCode: student.divisionCode,
          gradeLevel: student.gradeLevel,
        }),
        dateOnly: getDateOnly(student.createdAt),
        timeOnly: getTimeOnly(student.createdAt),
        relativeTime: formatRelativeTimeArabic(student.createdAt),
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: principal.id,
      userName: principal.name,
      userRole: principal.role,
      action: 'USER_LOGIN',
      targetType: 'User',
      targetId: principal.id,
      targetName: principal.name,
      details: JSON.stringify({
        source: 'local-seed',
      }),
      dateOnly: getDateOnly(new Date()),
      timeOnly: getTimeOnly(new Date()),
      relativeTime: formatRelativeTimeArabic(new Date()),
    },
  })

  console.log('Seed data created successfully for Thabat local testing.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
