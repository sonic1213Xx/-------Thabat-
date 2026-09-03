const ExcelJS = require('exceljs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'Al_Najah_Attendance_Complete.xlsx');
const ministry = path.join(root, '978363fd-e71f-4deb-af9c-30c76d3c59b9.jpg');
const kingdom = path.join(root, '015ea206-94b0-48a0-904b-5ce96b899a09.png');
const crest = path.join(root, 'WhatsApp Image 2026-09-03 at 4.53.01 PM.jpeg');
const green = 'FF10B981';
const redFill = 'FFFEF2F2';
const redText = 'FFB91C1C';
const slate = 'FFF8FAFC';
const white = 'FFFFFFFF';
const border = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const edge = { top: border, left: border, bottom: border, right: border };

function image(workbook, filename, extension) {
  return workbook.addImage({ filename, extension });
}

function styleBanner(sheet, weekly, workbook) {
  const lastColumn = weekly ? 'L' : 'F';
  sheet._media = [];
  sheet.views = [{ rightToLeft: true, showGridLines: false, zoomScale: 90 }];
  sheet.getRow(1).height = 45;
  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 22;
  sheet.getRow(5).height = 24;
  sheet.mergeCells(`B2:${lastColumn}2`);
  sheet.mergeCells(`B3:${lastColumn}3`);
  const title = sheet.getCell('B2');
  title.value = 'ثانوية النجاح بالقطيف';
  title.font = { name: 'Arial', size: 18, bold: true, color: 'FF0F172A' };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  const subtitle = sheet.getCell('B3');
  subtitle.value = sheet.name.includes('أسبوع') ? 'سجل الحالة الأسبوعية للحضور والغياب' : 'سجل الحالة اليومية للحضور والغياب';
  subtitle.font = { name: 'Arial', size: 11, color: 'FF475569', italic: true };
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(5).values = ['', 'تعيين الدور:', 'معلم مادة', 'المعلم المصدّر:', 'أ. عبدالله السلمان', 'الشعب / القاعات:', '101 , 102 , 103 , 104'];
  sheet.getRow(5).eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: 'FF334155' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    cell.border = edge;
  });
  sheet.mergeCells(`B7:${weekly ? 'C7' : 'B7'}`);
  sheet.getCell('B7').value = '📄 تصدير التقرير PDF';
  sheet.getCell('B7').font = { name: 'Arial', size: 10, bold: true, color: white };
  sheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
  sheet.getCell('B7').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('B7').border = edge;
  const ministryId = image(workbook, ministry, 'jpeg');
  const kingdomId = image(workbook, kingdom, 'png');
  const crestId = image(workbook, crest, 'jpeg');
  sheet.addImage(ministryId, { tl: { col: 0, row: 0 }, ext: { width: 65, height: 65 } });
  sheet.addImage(kingdomId, { tl: { col: 2, row: 0 }, ext: { width: 180, height: 35 } });
  sheet.addImage(crestId, { tl: { col: weekly ? 10 : 4, row: 0 }, ext: { width: 75, height: 55 } });
}

function styleTable(sheet, headerRow, firstDataRow, lastDataRow, statusColumns) {
  sheet.getRow(headerRow).height = 30;
  sheet.getRow(headerRow).eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: white };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = edge;
  });
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const absent = statusColumns.some((column) => row.getCell(column).value === 'غائب');
    row.height = 24;
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: absent ? redText : 'FF1E293B' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = edge;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: absent ? redFill : (rowNumber % 2 ? slate : white) } };
    });
  }
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(output);
  const daily = workbook.getWorksheet('الحالة اليومية (الجميع)');
  const dailyAbsent = workbook.getWorksheet('الغائبون اليوم فقط');
  const weekly = workbook.getWorksheet('الحالة الأسبوعية (الجميع)');
  const weeklyAbsent = workbook.getWorksheet('الغائبون أسبوعياً فقط');
  let lastWeeklyAbsentRow = 9;
  for (let rowNumber = 10; rowNumber <= weeklyAbsent.rowCount; rowNumber += 1) if (weeklyAbsent.getCell(`B${rowNumber}`).value) lastWeeklyAbsentRow = rowNumber;
  if (weeklyAbsent.rowCount > lastWeeklyAbsentRow) weeklyAbsent.spliceRows(lastWeeklyAbsentRow + 1, weeklyAbsent.rowCount - lastWeeklyAbsentRow);
  [daily, dailyAbsent, weekly, weeklyAbsent].forEach((sheet) => {
    if (sheet) Object.keys(sheet._merges).forEach((range) => sheet.unMergeCells(range));
  });
  styleBanner(daily, false, workbook);
  styleBanner(dailyAbsent, false, workbook);
  styleBanner(weekly, true, workbook);
  styleBanner(weeklyAbsent, true, workbook);
  daily.columns = [{ width: 3 }, { width: 15 }, { width: 30 }, { width: 18 }, { width: 22 }, { width: 42 }];
  dailyAbsent.columns = daily.columns;
  weekly.columns = [{ width: 3 }, { width: 15 }, { width: 30 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 15 }, { width: 15 }, { width: 16 }, { width: 42 }];
  weeklyAbsent.columns = weekly.columns;
  weekly.getCell('M9').value = 'ملاحظات المعلم / الإجراء';
  weeklyAbsent.getCell('M9').value = 'ملاحظات المعلم / الإجراء';
  styleTable(daily, 9, 10, daily.rowCount, [5]);
  styleTable(dailyAbsent, 9, 10, dailyAbsent.rowCount, [5]);
  styleTable(weekly, 9, 10, weekly.rowCount, [5, 6, 7, 8, 9]);
  styleTable(weeklyAbsent, 9, 10, weeklyAbsent.rowCount, [5, 6, 7, 8, 9]);
  const weeklyLastRow = weekly.rowCount;
  const weeklyAbsentLastRow = weeklyAbsent.rowCount;
  for (let rowNumber = 10; rowNumber <= weeklyLastRow; rowNumber += 1) {
    weekly.getCell(`J${rowNumber}`).value = { formula: `COUNTIF(D${rowNumber}:H${rowNumber}, "حاضر")` };
    weekly.getCell(`K${rowNumber}`).value = { formula: `COUNTIF(D${rowNumber}:H${rowNumber}, "غائب")` };
    weekly.getCell(`L${rowNumber}`).value = { formula: `IFERROR(J${rowNumber}/COUNTA(D${rowNumber}:H${rowNumber}),0)` };
    weekly.getCell(`L${rowNumber}`).numFmt = '0%';
    weekly.getCell(`M${rowNumber}`).value = 'لم يحضر - يتم التواصل مع ولي الأمر';
  }
  for (let rowNumber = 10; rowNumber <= weeklyAbsentLastRow; rowNumber += 1) {
    weeklyAbsent.getCell(`J${rowNumber}`).value = { formula: `COUNTIF(D${rowNumber}:H${rowNumber}, "حاضر")` };
    weeklyAbsent.getCell(`K${rowNumber}`).value = { formula: `COUNTIF(D${rowNumber}:H${rowNumber}, "غائب")` };
    weeklyAbsent.getCell(`L${rowNumber}`).value = { formula: `IFERROR(J${rowNumber}/COUNTA(D${rowNumber}:H${rowNumber}),0)` };
    weeklyAbsent.getCell(`L${rowNumber}`).numFmt = '0%';
    weeklyAbsent.getCell(`M${rowNumber}`).value = 'لم يحضر - يتم التواصل مع ولي الأمر';
  }
  daily.autoFilter = { from: 'B9', to: 'F' + daily.rowCount };
  weekly.autoFilter = { from: 'B9', to: 'L' + weekly.rowCount };
  [daily, dailyAbsent, weekly, weeklyAbsent].forEach((sheet) => { sheet.freezePanes = { xSplit: 3, ySplit: 9 }; sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }; });
  await workbook.xlsx.writeFile(output);
  console.log(`Rebuilt ${output}`);
}

main().catch((error) => { console.error(error); process.exit(1); });