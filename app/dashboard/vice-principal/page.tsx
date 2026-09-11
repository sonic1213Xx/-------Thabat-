"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, FileWarning, LogOut, Search, ShieldAlert, Trash2, User, Users } from "lucide-react";
import { GatePassModal } from "@/components/gate-pass-modal";
import { IncidentLogger } from "@/components/incident-logger";
import { EducationValidationPanel } from "@/components/dashboard/education-validation-panel";
import { deleteGatePass, getGatePasses, getIncidents, type GatePass } from "@/lib/vp-operations";
import { getGradeLevelArabic } from "@/lib/utils";
import { can } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";
import { fetchCached } from "@/lib/client-cache";

type Student = { id: string; fullName: string; academicId?: string | null; divisionCode?: string | null; gradeLevel?: number | null; behaviorScore?: number };
type ApiPass = { id: string; studentId: string; parentName: string | null; reason: string; departureDate: string; departureTime: string; createdAt: string; qrToken: string; status: string; student: { fullName: string; divisionCode: string | null } };

export default function VicePrincipalPage() {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const session = getSession();
  const today = new Date().toISOString().slice(0, 10);
  const [students, setStudents] = useState<Student[]>([]);
  const [passes, setPasses] = useState<GatePass[]>(() => getGatePasses());
  const [query, setQuery] = useState("");
  const [passDate, setPassDate] = useState(today);
  const [gateOpen, setGateOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [deletingPassId, setDeletingPassId] = useState<string | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const requestedStudentId = searchParams.get("studentId");
  const incidents = getIncidents();

  useEffect(() => {
    if (!session || !can(session.role, "can_approve_gate_passes")) { window.location.href = "/dashboard"; return; }
    void fetchCached<{ data?: Student[] }>("dashboard:students:all", "/api/students", session?.id ? { headers: { "x-thabat-user-id": session.id } } : undefined).then((json) => setStudents(json.data ?? []));
  }, []);

  useEffect(() => {
    if (!session || !can(session.role, "can_approve_gate_passes")) return;
    void fetch(`/api/gate-passes?date=${encodeURIComponent(passDate)}`, { headers: { "x-thabat-role": session.role } })
      .then((response) => response.ok ? response.json() as Promise<{ data?: ApiPass[] }> : Promise.reject(new Error("Unable to load permits")))
      .then((json) => setPasses((current) => {
        const stored = (json.data ?? []).map((pass) => ({ id: pass.id, studentId: pass.studentId, studentName: pass.student.fullName, divisionCode: pass.student.divisionCode ?? "غير معين", parentName: pass.parentName ?? "", reason: pass.reason, departureDate: pass.departureDate, departureTime: pass.departureTime, createdAt: pass.createdAt, qrToken: pass.qrToken, status: pass.status }));
        return [...stored, ...current.filter((localPass) => !stored.some((storedPass) => storedPass.id === localPass.id && storedPass.departureDate === passDate))];
      })).catch(() => undefined);
  }, [passDate, session?.id, session?.role]);

  useEffect(() => { if (requestedStudentId && students.some((student) => student.id === requestedStudentId)) setGateOpen(true); }, [requestedStudentId, students]);
  const matches = useMemo(() => students.filter((student) => `${student.fullName} ${student.academicId ?? ""} ${student.divisionCode ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, students]);
  const visiblePasses = useMemo(() => passes.filter((pass) => pass.departureDate === passDate), [passes, passDate]);

  const deletePass = async (pass: GatePass) => {
    if (!session || !window.confirm(locale === "ar" ? `إلغاء تصريح ${pass.studentName}؟` : `Cancel the permit for ${pass.studentName}?`)) return;
    setDeletingPassId(pass.id);
    try {
      const response = await fetch(`/api/gate-passes/${encodeURIComponent(pass.id)}`, { method: "DELETE", headers: { "x-thabat-role": session.role, "x-thabat-user-id": session.id } });
      if (!response.ok) throw new Error("Unable to cancel permit");
      deleteGatePass(pass.id);
      setPasses((current) => current.filter((item) => item.id !== pass.id));
      if (selectedPass?.id === pass.id) setSelectedPass(null);
    } catch { window.alert(locale === "ar" ? "تعذر إلغاء التصريح." : "Unable to cancel the permit."); } finally { setDeletingPassId(null); }
  };

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-emerald-600">{t("vicePrincipalCenter")}</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("vpOperations")}</h1><p className="text-slate-600 dark:text-slate-400">{t("vpDescription")}</p></div><div className="flex gap-2"><button onClick={() => setGateOpen(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><LogOut className="inline h-4 w-4" /> {t("gatePass")}</button><button onClick={() => setIncidentOpen(true)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><FileWarning className="inline h-4 w-4" /> {t("logIncident")}</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={ShieldAlert} label={t("pendingBehaviorTransfers")} value={String(incidents.filter((incident) => incident.action === "استدعاء ولي الأمر").length)} /><Metric icon={Users} label={t("lineupAndLeavingToday")} value="0" /><Metric icon={LogOut} label={t("gatePassesToday")} value={String(visiblePasses.length)} /><Metric icon={User} label={t("attendanceEscalations")} value="0" /></div>
    <EducationValidationPanel />
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{locale === "ar" ? "سجل تصاريح الخروج" : "Exit permit log"}</h2><p className="mt-1 text-sm text-slate-500">{locale === "ar" ? "اختر اليوم لعرض تصاريحه." : "Choose a day to view its permits."}</p></div><LogOut className="h-5 w-5 text-emerald-600" /></div><div className="mt-4 flex items-center gap-3"><CalendarDays className="h-4 w-4 text-emerald-600" /><label className="text-sm font-semibold">{locale === "ar" ? "يوم التصاريح" : "Permit day"}</label><input type="date" value={passDate} onChange={(event) => setPassDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></div>{visiblePasses.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 dark:border-slate-800"><tr><th className="px-3 py-3 text-start">{locale === "ar" ? "الطالب" : "Student"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "الفصل" : "Division"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "الحالة" : "Status"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "الإجراء" : "Action"}</th></tr></thead><tbody>{visiblePasses.map((pass) => <tr key={pass.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3 font-semibold">{pass.studentName}</td><td className="px-3 py-3 text-slate-500">{pass.divisionCode}</td><td className="px-3 py-3 text-slate-500">{pass.status === "USED" ? (locale === "ar" ? "غادر" : "Left") : pass.status === "CANCELED" ? (locale === "ar" ? "ملغى" : "Canceled") : (locale === "ar" ? "معلق" : "Pending")}</td><td className="flex flex-wrap gap-2 px-3 py-3"><button type="button" onClick={() => setSelectedPass(pass)} className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{locale === "ar" ? "عرض التصريح" : "View permit"}</button><button type="button" disabled={deletingPassId === pass.id || pass.status === "CANCELED"} onClick={() => void deletePass(pass)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:border-red-700 dark:text-red-300"><Trash2 className="h-4 w-4" />{locale === "ar" ? "إلغاء" : "Cancel"}</button></td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">{locale === "ar" ? "لا توجد تصاريح لهذا اليوم." : "No permits for this day."}</p>}</section>
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchStudentDetails")} className="w-full rounded-lg border border-slate-300 py-3 ps-10 pe-3 dark:border-slate-700 dark:bg-slate-950" /></div><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{query && matches.map((student) => <div key={student.id} className="flex items-center justify-between py-3"><div><p className="font-semibold">{student.fullName}</p><p className="text-xs text-slate-500">{student.academicId ?? t("noStudentId")} · {student.divisionCode ?? t("unassigned")} · {student.gradeLevel ? locale === "ar" ? getGradeLevelArabic(student.gradeLevel) : `Grade ${student.gradeLevel}` : t("unassigned")}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">{t("behaviorScore")} {student.behaviorScore ?? 100}</span></div>)}</div></div>
    {(gateOpen || selectedPass) && <GatePassModal students={students} initialPass={selectedPass} initialStudentId={requestedStudentId ?? undefined} onClose={() => { setGateOpen(false); setSelectedPass(null); }} onSaved={(pass) => setPasses((current) => [pass, ...current.filter((item) => item.id !== pass.id)])} />}
    {incidentOpen && <IncidentLogger students={students} onClose={() => setIncidentOpen(false)} />}
  </div>;
}
function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>; }
