"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileWarning,
  LogOut,
  Search,
  ShieldAlert,
  User,
  Users,
} from "lucide-react";
import { GatePassModal } from "@/components/gate-pass-modal";
import { IncidentLogger } from "@/components/incident-logger";
import { EducationValidationPanel } from "@/components/dashboard/education-validation-panel";
import { getGatePasses, getIncidents, type GatePass } from "@/lib/vp-operations";
import { getGradeLevelArabic } from "@/lib/utils";
import { can } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";
import { fetchCached } from "@/lib/client-cache";

type Student = {
  id: string;
  fullName: string;
  academicId?: string | null;
  divisionCode?: string | null;
  gradeLevel?: number | null;
  behaviorScore?: number;
};
export default function VicePrincipalPage() {
  const { t, locale } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const session = getSession();
    if (!session || !can(session.role, "can_approve_gate_passes"))
      window.location.href = "/dashboard";
    else {
      void fetchCached<{ data?: Student[] }>("dashboard:students:all", "/api/students")
        .then((json) => setStudents(json.data ?? []));
      void fetch(`/api/gate-passes`, { headers: { "x-thabat-role": session.role } })
        .then((response) => response.ok ? response.json() as Promise<{ data?: Array<{ id: string; studentId: string; issuedBy: string; parentName: string | null; reason: string; departureDate: string; departureTime: string; createdAt: string; qrToken: string; status: string; student: { fullName: string; divisionCode: string | null } }> }> : Promise.reject(new Error("Unable to load permits")))
        .then((json) => setPasses((current) => {
          const stored = (json.data ?? []).map((pass) => ({ id: pass.id, studentId: pass.studentId, studentName: pass.student.fullName, divisionCode: pass.student.divisionCode ?? "غير معين", parentName: pass.parentName ?? "", reason: pass.reason, departureDate: pass.departureDate, departureTime: pass.departureTime, createdAt: pass.createdAt, qrToken: pass.qrToken, status: pass.status }));
          return [...stored, ...current.filter((localPass) => !stored.some((storedPass) => storedPass.id === localPass.id))];
        }))
        .catch(() => undefined);
    }
  }, []);
  const matches = useMemo(
    () =>
      students.filter((student) =>
        `${student.fullName} ${student.academicId ?? ""} ${student.divisionCode ?? ""}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ),
    [query, students],
  );
  const [passes, setPasses] = useState<GatePass[]>(() => getGatePasses());
  const incidents = getIncidents();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            {t("vicePrincipalCenter")}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t("vpOperations")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("vpDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGateOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <LogOut className="inline h-4 w-4" /> {t("gatePass")}
          </button>
          <button
            onClick={() => setIncidentOpen(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <FileWarning className="inline h-4 w-4" /> {t("logIncident")}
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={ShieldAlert}
          label={t("pendingBehaviorTransfers")}
          value={String(
            incidents.filter(
              (incident) => incident.action === "استدعاء ولي الأمر",
            ).length,
          )}
        />
        <Metric icon={Users} label={t("lineupAndLeavingToday")} value="0" />
        <Metric
          icon={LogOut}
          label={t("gatePassesToday")}
          value={String(
            passes.filter((pass) => pass.createdAt.startsWith(today)).length,
          )}
        />
        <Metric icon={User} label={t("attendanceEscalations")} value="0" />
      </div>
      <EducationValidationPanel />
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{locale === "ar" ? "سجل تصاريح الخروج" : "Exit permit log"}</h2>
            <p className="mt-1 text-sm text-slate-500">{locale === "ar" ? "افتح أي تصريح لإعادة عرضه أو طباعته." : "Open any permit to view or print it again."}</p>
          </div>
          <LogOut className="h-5 w-5 text-emerald-600" />
        </div>
        {passes.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 text-start dark:border-slate-800"><tr><th className="px-3 py-3 text-start">{locale === "ar" ? "الطالب" : "Student"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "الفصل" : "Division"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "التاريخ" : "Date"}</th><th className="px-3 py-3 text-start">{locale === "ar" ? "الإجراء" : "Action"}</th></tr></thead><tbody>{passes.map((pass) => <tr key={pass.id} role="button" tabIndex={0} onClick={() => setSelectedPass(pass)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedPass(pass) } }} className="cursor-pointer border-b border-slate-100 transition hover:bg-emerald-50 dark:border-slate-800 dark:hover:bg-emerald-950/20"><td className="px-3 py-3 font-semibold">{pass.studentName}</td><td className="px-3 py-3 text-slate-500">{pass.divisionCode}</td><td className="px-3 py-3 text-slate-500">{pass.departureDate} · {pass.departureTime}</td><td className="px-3 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedPass(pass) }} className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300">{locale === "ar" ? "عرض التصريح" : "View permit"}</button></td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">{locale === "ar" ? "لا توجد تصاريح مسجلة بعد." : "No permits have been issued yet."}</p>}
      </section>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchStudentDetails")}
            className="w-full rounded-lg border border-slate-300 py-3 ps-10 pe-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {query &&
            matches.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-semibold">{student.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {student.academicId ?? t("noStudentId")} ·{" "}
                    {student.divisionCode ?? t("unassigned")} ·{" "}
                    {student.gradeLevel
                      ? locale === "ar" ? getGradeLevelArabic(student.gradeLevel) : `Grade ${student.gradeLevel}`
                      : t("unassigned")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                  {t("behaviorScore")} {student.behaviorScore ?? 100}
                </span>
              </div>
            ))}
        </div>
      </div>
      {(gateOpen || selectedPass) && (
        <GatePassModal
          students={students}
          initialPass={selectedPass}
          onClose={() => {
            setGateOpen(false);
            setSelectedPass(null);
          }}
          onSaved={(pass) => setPasses((current) => [pass, ...current.filter((item) => item.id !== pass.id)])}
        />
      )}
      {incidentOpen && (
        <IncidentLogger
          students={students}
          onClose={() => {
            setIncidentOpen(false);
            setRefresh(refresh + 1);
          }}
        />
      )}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="h-5 w-5 text-emerald-600" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
