import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export type AttendanceExportStudent = {
  id: string;
  studentId?: string;
  fullName: string;
  divisionCode?: string | null;
  status?: string;
  notes?: string;
};
type AttendanceExportProfile = { name: string; role: string };
const border = {
  top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
};
const statusLabel = (status?: string) =>
  status === "PRESENT"
    ? "حاضر"
    : status === "LEFT_WITH_PERMISSION"
      ? "مستأذن"
    : status === "ABSENT_EXCUSED" || status === "ABSENT_UNEXCUSED"
      ? "غائب"
      : status === "LATE"
        ? "متأخر"
        : "";

async function getImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${url.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${btoa(binary)}`;
}
function setup(
  sheet: ExcelJS.Worksheet,
  weekly: boolean,
  images: { ministry: number; kingdom: number; crest: number },
  profile: AttendanceExportProfile,
  divisionCodes: string[],
) {
  const last = weekly ? "M" : "F";
  sheet.views = [{ rightToLeft: true, showGridLines: false, zoomScale: 90 }];
  sheet.getRow(1).height = 45;
  sheet.mergeCells(`B2:${last}2`);
  sheet.mergeCells(`B3:${last}3`);
  sheet.getCell("B2").value = "ثانوية النجاح بالقطيف";
  sheet.getCell("B2").font = {
    name: "Arial",
    size: 18,
    bold: true,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("B2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("B3").value = `سجل الحضور - ${sheet.name}`;
  sheet.getCell("B3").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(5).values = [
    "",
    "تعيين الدور:",
    profile.role,
    "المعلم المصدّر:",
    profile.name,
    "الشعب / القاعات:",
    divisionCodes.join(" , "),
  ];
  sheet.getRow(5).eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = border;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFECFDF5" },
    };
  });
  sheet.addImage(images.ministry, {
    tl: { col: 0, row: 0 },
    ext: { width: 65, height: 65 },
  });
  sheet.addImage(images.kingdom, {
    tl: { col: 2, row: 0 },
    ext: { width: 180, height: 35 },
  });
  sheet.addImage(images.crest, {
    tl: { col: weekly ? 10 : 4, row: 0 },
    ext: { width: 75, height: 55 },
  });
}
function styleTable(sheet: ExcelJS.Worksheet, statusColumns: number[]) {
  sheet.getRow(9).height = 30;
  sheet.getRow(9).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = border;
  });
  for (let rowNumber = 10; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (String(row.getCell(1).value ?? "").startsWith("الشعبة ")) continue;
    const absent = statusColumns.some(
      (column) => row.getCell(column).value === "غائب",
    );
    row.height = 24;
    row.eachCell((cell) => {
      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: absent ? "FFB91C1C" : "FF1E293B" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: absent ? "FFFEF2F2" : rowNumber % 2 ? "FFF8FAFC" : "FFFFFFFF",
        },
      };
      cell.border = border;
    });
  }
}

function addDivisionHeader(sheet: ExcelJS.Worksheet, code: string, lastColumn: string) {
  const row = sheet.addRow([`الشعبة ${code}`]);
  sheet.mergeCells(`A${row.number}:${lastColumn}${row.number}`);
  row.height = 24;
  row.getCell(1).font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  row.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
}

export async function exportAttendanceWorkbook(
  divisionCodes: string[],
  date: string,
  suppliedStudents: AttendanceExportStudent[],
  profile: AttendanceExportProfile,
  userId?: string,
) {
  const records = suppliedStudents.filter(
    (student) =>
      student.divisionCode && new Set(divisionCodes).has(student.divisionCode),
  ).sort(
    (left, right) =>
      (left.divisionCode ?? '').localeCompare(right.divisionCode ?? '', 'en', { numeric: true }) ||
      left.fullName.localeCompare(right.fullName, 'ar'),
  );
  const weekStart = new Date(`${date}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDates = Array.from({ length: 5 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day.toISOString().slice(0, 10);
  });
  const weeklyStatuses = new Map<string, Map<string, string>>();
  if (userId) {
    await Promise.all(weekDates.flatMap((weekDate) => divisionCodes.map(async (divisionCode) => {
      const params = new URLSearchParams({ date: weekDate, divisionId: divisionCode, mode: profile.role === "TEACHER" ? "CLASS" : "SCHOOL" });
      if (profile.role === "TEACHER") params.set("teacherId", userId);
      try {
        const response = await fetch(`/api/attendance?${params}`, { headers: { "x-thabat-user-id": userId } });
        if (!response.ok) return;
        const json = await response.json() as { data?: AttendanceExportStudent[] };
        const statuses = weeklyStatuses.get(weekDate) ?? new Map<string, string>();
        for (const student of json.data ?? []) if (student.studentId || student.id) statuses.set(student.studentId ?? student.id, student.status ?? "UNMARKED");
        weeklyStatuses.set(weekDate, statuses);
      } catch {
        // Leave unavailable historical days unmarked rather than duplicating today's status.
      }
    })));
  }
  const workbook = new ExcelJS.Workbook();
  const images = {
    ministry: workbook.addImage({
      base64: await getImage("/attendance/ministry.jpg"),
      extension: "jpeg" as const,
    }),
    kingdom: workbook.addImage({
      base64: await getImage("/attendance/kingdom.png"),
      extension: "png" as const,
    }),
    crest: workbook.addImage({
      base64: await getImage("/attendance/crest.jpeg"),
      extension: "jpeg" as const,
    }),
  };
  ["الحالة اليومية (الجميع)", "الغائبون اليوم فقط"].forEach((name, index) => {
    const sheet = workbook.addWorksheet(name);
    setup(sheet, false, images, profile, divisionCodes);
    sheet.columns = [
      { width: 3 },
      { width: 18 },
      { width: 30 },
      { width: 18 },
      { width: 22 },
      { width: 42 },
    ];
    sheet.getRow(9).values = [
      "",
      "رقم الطالب",
      "اسم الطالب",
      "الشعبة / الفصل",
      "حالة الحضور اليوم",
      "ملاحظات المعلم / الإجراء",
    ];
    let currentDivision = "";
    records
      .filter((student) => index === 0 || statusLabel(student.status) === "غائب")
      .forEach((student) => {
        if (student.divisionCode !== currentDivision) {
          currentDivision = student.divisionCode ?? "";
          addDivisionHeader(sheet, currentDivision, "F");
        }
        sheet.addRow([
          "",
          student.id,
          student.fullName,
          `الشعبة ${student.divisionCode}`,
          statusLabel(student.status),
          student.notes ||
            (statusLabel(student.status) === "غائب"
              ? "لم يحضر - يتم التواصل مع ولي الأمر"
              : statusLabel(student.status) === "مستأذن"
                ? "خرج بإذن بعد التحقق من تصريح الخروج"
                : "حضور منتظم"),
        ]);
      });
    styleTable(sheet, [5]);
  });
  ["الحالة الأسبوعية (الجميع)", "الغائبون أسبوعياً فقط"].forEach(
    (name, index) => {
      const sheet = workbook.addWorksheet(name);
      setup(sheet, true, images, profile, divisionCodes);
      sheet.columns = [
        { width: 3 },
        { width: 18 },
        { width: 30 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 15 },
        { width: 15 },
        { width: 16 },
        { width: 42 },
      ];
      sheet.getRow(9).values = [
        "",
        "رقم الطالب",
        "اسم الطالب",
        "الشعبة / الفصل",
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "مجموع الحضور",
        "مجموع الغياب",
        "نسبة الحضور",
        "ملاحظات المعلم / الإجراء",
      ];
      let currentDivision = "";
      records
        .filter((student) => index === 0 || weekDates.some((weekDate) => statusLabel(weeklyStatuses.get(weekDate)?.get(student.studentId ?? student.id)) === "غائب"))
        .forEach((student) => {
          if (student.divisionCode !== currentDivision) {
            currentDivision = student.divisionCode ?? "";
            addDivisionHeader(sheet, currentDivision, "M");
          }
          const status = statusLabel(student.status);
          const dailyStatuses = weekDates.map((weekDate) => statusLabel(weeklyStatuses.get(weekDate)?.get(student.studentId ?? student.id)));
          const row = sheet.addRow([
            "",
            student.id,
            student.fullName,
            `الشعبة ${student.divisionCode}`,
            ...dailyStatuses,
            null,
            null,
            null,
            student.notes ||
              (status === "غائب"
                ? "لم يحضر - يتم التواصل مع ولي الأمر"
                : status === "مستأذن"
                  ? "خرج بإذن بعد التحقق من تصريح الخروج"
                  : "حضور منتظم"),
          ]);
          const number = row.number;
          sheet.getCell(`J${number}`).value = {
            formula: `COUNTIF(E${number}:I${number}, "حاضر")`,
          };
          sheet.getCell(`K${number}`).value = {
            formula: `COUNTIF(E${number}:I${number}, "غائب")`,
          };
          sheet.getCell(`L${number}`).value = {
            formula: `IFERROR(J${number}/COUNTA(E${number}:I${number}),0)`,
          };
          sheet.getCell(`L${number}`).numFmt = "0%";
        });
      styleTable(sheet, [5, 6, 7, 8, 9]);
    },
  );
  workbook.worksheets.forEach((sheet) => {
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `حضور_ثانوية_النجاح_${date}.xlsx`,
  );
}
