import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { getConfiguredSchoolName } from '@/lib/school-settings'

export type AttendancePdfStudent = { id: string; fullName: string; divisionCode?: string | null; status?: string; notes?: string }
type AttendancePdfProfile = { name: string; role: string }

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
const label = (status?: string) => status === 'PRESENT' ? 'حاضر' : status === 'ABSENT_EXCUSED' || status === 'ABSENT_UNEXCUSED' ? 'غائب' : status === 'LATE' ? 'متأخر' : 'غير محدد'

export async function exportAttendancePdf(students: AttendancePdfStudent[], divisionCodes: string[], date: string, profile: AttendancePdfProfile) {
  const schoolName = getConfiguredSchoolName()
  const selected = new Set(divisionCodes)
  const records = students.filter((student) => student.divisionCode && selected.has(student.divisionCode)).sort((left, right) => (left.divisionCode ?? '').localeCompare(right.divisionCode ?? '', 'en', { numeric: true }) || left.fullName.localeCompare(right.fullName, 'ar'))
  const report = document.createElement('section')
  report.dir = 'rtl'
  report.style.cssText = 'position:absolute;left:0;top:0;width:1100px;padding:42px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;pointer-events:none;'
  const rows = records.map((student, index) => {
    const status = label(student.status)
    return `<tr style="background:${status === 'غائب' ? '#fef2f2' : index % 2 ? '#f8fafc' : '#fff'};color:${status === 'غائب' ? '#b91c1c' : '#172554'}"><td style="padding:10px;border:1px solid #cbd5e1;text-align:center">${index + 1}</td><td style="padding:10px;border:1px solid #cbd5e1;text-align:center">${escapeHtml(student.id)}</td><td style="padding:10px;border:1px solid #cbd5e1">${escapeHtml(student.fullName)}</td><td style="padding:10px;border:1px solid #cbd5e1;text-align:center">${escapeHtml(student.divisionCode ?? '')}</td><td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-weight:700">${status}</td><td style="padding:10px;border:1px solid #cbd5e1">${escapeHtml(student.notes ?? '')}</td></tr>`
  }).join('')
  report.innerHTML = `<header style="display:grid;grid-template-columns:120px 1fr 140px;align-items:center;border-bottom:4px solid #10b981;padding-bottom:20px"><img src="/attendance/ministry.jpg" style="width:65px;height:65px;object-fit:contain;margin:auto"><div style="text-align:center"><h1 style="font-size:28px;margin:4px;font-weight:700">${escapeHtml(schoolName)}</h1><h2 style="font-size:18px;margin:4px;color:#475569">سجل الحضور والغياب</h2><p style="font-size:14px;margin:8px;color:#475569">تاريخ التقرير: ${escapeHtml(date)}</p></div><img src="/attendance/crest.jpeg" style="width:75px;height:55px;object-fit:contain;margin:auto"></header><div style="display:flex;justify-content:space-around;margin:20px 0;padding:14px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:14px;font-weight:700"><span>تعيين الدور: ${escapeHtml(profile.role)}</span><span>المعلم المصدّر: ${escapeHtml(profile.name)}</span><span>الشعب: ${escapeHtml(divisionCodes.join(' , '))}</span></div><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#047857;color:#fff"><th style="padding:12px;border:1px solid #cbd5e1">م</th><th style="padding:12px;border:1px solid #cbd5e1">رقم الطالب</th><th style="padding:12px;border:1px solid #cbd5e1">اسم الطالب</th><th style="padding:12px;border:1px solid #cbd5e1">الشعبة / الفصل</th><th style="padding:12px;border:1px solid #cbd5e1">حالة الحضور</th><th style="padding:12px;border:1px solid #cbd5e1">ملاحظات المعلم / الإجراء</th></tr></thead><tbody>${rows}</tbody></table>`
  document.body.appendChild(report)
  try {
    await Promise.all(Array.from(report.querySelectorAll('img')).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve() })))
    const canvas = await html2canvas(report, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const fontBytes = new Uint8Array(await (await fetch('/fonts/arial.ttf')).arrayBuffer())
    let fontBinary = ''
    fontBytes.forEach((byte) => { fontBinary += String.fromCharCode(byte) })
    pdf.addFileToVFS('ArialArabic.ttf', btoa(fontBinary))
    pdf.addFont('ArialArabic.ttf', 'ArialArabic', 'normal')
    pdf.setFont('ArialArabic', 'normal')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const pagePixelHeight = Math.floor((pageHeight / pageWidth) * canvas.width)
    let sourceY = 0
    let pageNumber = 0
    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pagePixelHeight, canvas.height - sourceY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceHeight
      slice.getContext('2d')?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, slice.width, slice.height)
      if (pageNumber > 0) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, (slice.height * pageWidth) / slice.width)
      pdf.setFontSize(1)
      pdf.setTextColor(255, 255, 255)
      const searchableText = [`${schoolName} - ${date}`, `المعلم المصدّر: ${profile.name}`, `تعيين الدور: ${profile.role}`, `الشعب: ${divisionCodes.join(' , ')}`, ...records.map((student) => `${student.id} ${student.fullName} ${student.divisionCode ?? ''} ${label(student.status)} ${student.notes ?? ''}`)].join(' | ')
      pdf.text(searchableText, 1, 1)
      sourceY += sliceHeight
      pageNumber += 1
    }
    pdf.save(`حضور_${schoolName}_${date}.pdf`)
  } finally {
    report.remove()
  }
}
