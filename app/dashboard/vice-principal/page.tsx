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
import { getGatePasses, getIncidents } from "@/lib/vp-operations";
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
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const session = getSession();
    if (!session || !can(session.role, "can_approve_gate_passes"))
      window.location.href = "/dashboard";
    else
      void fetchCached<{ data?: Student[] }>("dashboard:students:all", "/api/students")
        .then((json) => setStudents(json.data ?? []));
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
  const passes = getGatePasses();
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
      {gateOpen && (
        <GatePassModal
          students={students}
          onClose={() => {
            setGateOpen(false);
            setRefresh(refresh + 1);
          }}
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
