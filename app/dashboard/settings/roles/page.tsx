"use client";

import { useEffect, useState } from "react";
import { Check, Lock, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { StyledSelect } from "@/components/ui/styled-select";
import {
  DEFAULT_ROLES,
  PERMISSIONS,
  getRoles,
  saveRoles,
  type Permission,
  type RoleDefinition,
} from "@/lib/roles";
import {
  deleteProfile,
  getProfiles,
  getSession,
  saveProfile,
  type AppRole,
  type Profile,
  type TeachingAssignment,
} from "@/lib/auth";
import { TeachingAssignmentEditor } from "@/components/dashboard/teaching-assignment-editor";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { ROLE_DEFINITIONS } from "@/types/roles";
import { useLanguage } from "@/components/language-provider";
import { Modal } from "@/components/ui/modal";
import { isCreatorRole } from "@/lib/permissions";

export default function RolesPage() {
  const { t, locale } = useLanguage();
  const currentSession = getSession();
  const roleOptions: Array<{ value: AppRole; label: string }> =
    ROLE_DEFINITIONS.filter(({ key }) => !isCreatorRole(key) && (currentSession?.role !== "PRINCIPAL" || key !== "PRINCIPAL")).map((role) => ({
      value: role.key,
      label: locale === "ar" ? `${role.nameAr} / ${role.nameEn}` : role.nameEn,
    }));
  const permissionLabels: Partial<Record<Permission, string>> = {
    can_issue_warnings: t("warnings"),
    can_approve_gate_passes: locale === "ar" ? "تصاريح الخروج" : "Gate passes",
    can_delete_records: locale === "ar" ? "حذف السجلات" : "Delete records",
    can_export_data: t("reports"),
    can_edit_students: locale === "ar" ? "تعديل الطلاب" : "Edit students",
  };
  useEffect(() => {
    if (!isCreatorRole(getSession()?.role) && getSession()?.role !== "PRINCIPAL") window.location.href = "/dashboard";
    void fetch("/api/divisions")
      .then((response) => response.json())
      .then((json) =>
        setDivisions(
          (json.data ?? []).map((item: { code: string }) => item.code),
        ),
      )
      .catch(() => setDivisions([]));
  }, []);
  const [roles, setRoles] = useState<RoleDefinition[]>(getRoles());
  const [permissionRoleKey, setPermissionRoleKey] = useState<AppRole | string>(
    "PRINCIPAL",
  );
  const [profiles, setProfiles] = useState<Profile[]>(getProfiles());
  const [divisions, setDivisions] = useState<string[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [resettingProfile, setResettingProfile] = useState<Profile | null>(
    null,
  );
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const gradeOptions = [1, 2, 3].map((value) => ({
    value: String(value),
    label: locale === "ar" ? `الصف ${value} الثانوي` : `Grade ${value}`,
  }));
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [verificationActive, setVerificationActive] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    password: "",
    role: "" as AppRole | "",
    subject: "",
    gradeLevel: "",
    assigned_divisions: [] as string[],
    teachingAssignments: [] as TeachingAssignment[],
  });
  useEffect(() => {
    const loadDatabaseProfiles = async () => {
      try {
        const response = await fetch('/api/users', { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json() as { data?: Array<{ id: string; name: string; role: AppRole; assigned_divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: TeachingAssignment[] }> };
        const localProfiles = getProfiles();
        const databaseProfiles: Profile[] = (json.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          role: item.role,
          password: localProfiles.find((localProfile) => localProfile.id === item.id)?.password ?? '',
          createdAt: '',
          lastActivity: '',
          assigned_divisions: item.assigned_divisions ?? [],
          subjectsTaught: item.subjectsTaught ?? [],
          teachingAssignments: item.teachingAssignments ?? [],
          subject: item.subjectsTaught?.[0] ?? '',
        }));
        const localOnlyProfiles = localProfiles.filter((localProfile) => !databaseProfiles.some((databaseProfile) => databaseProfile.id === localProfile.id));
        setProfiles([...databaseProfiles, ...localOnlyProfiles]);
      } catch {
        setProfiles(getProfiles());
      }
    };
    void loadDatabaseProfiles();
  }, []);
  const selectedRole = ROLE_DEFINITIONS.find(
    (role) => role.key === profile.role,
  );
  const filteredDivisions = profile.gradeLevel
    ? divisions.filter((code) => code.startsWith(profile.gradeLevel))
    : [];
  const authorized = currentSession?.role === "PRINCIPAL" || verificationActive;
  const canEditPermissions = isCreatorRole(currentSession?.role) && verificationActive;
  const activateCreatorMode = async () => {
    setVerificationActive(false);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: adminId.trim(), password: adminPassword }) });
      const result = await response.json() as { data?: { id: string; role: string } };
      if (response.ok && result.data?.id === "10" && isCreatorRole(result.data.role)) {
        setVerificationActive(true);
        setVerificationMessage(locale === "ar" ? "تم تفعيل وضع المُنشئ." : "Creator mode activated.");
        return;
      }
    } catch {
      // Keep the permission matrix locked when verification cannot reach the server.
    }
    setVerificationMessage(locale === "ar" ? "تعذر التحقق من بيانات المُنشئ." : "Creator verification failed.");
  };
  const permissionRole =
    roles.find((role) => role.key === permissionRoleKey) ?? roles[0];
  const permissionGroups = Array.from(
    new Set(PERMISSIONS.map((permission) => permission.key.includes(":") ? permission.key.split(":")[0] : "general")),
  );
  const resourceNames: Record<string, string> = {
    general: locale === "ar" ? "صلاحيات عامة" : "General permissions",
    students: locale === "ar" ? "الطلاب" : "Students",
    attendance: locale === "ar" ? "الحضور" : "Attendance",
    gradebooks: locale === "ar" ? "الكشوفات" : "Gradebooks",
    warnings: locale === "ar" ? "الإنذارات" : "Warnings",
    incidents: locale === "ar" ? "الوقائع" : "Incidents",
    gate_passes: locale === "ar" ? "تصاريح الخروج" : "Gate passes",
    counseling: locale === "ar" ? "الإرشاد" : "Counseling",
    activities: locale === "ar" ? "الأنشطة" : "Activities",
    transportation: locale === "ar" ? "النقل" : "Transportation",
    facilities: locale === "ar" ? "المرافق" : "Facilities",
    reports: locale === "ar" ? "التقارير" : "Reports",
    audit_log: locale === "ar" ? "سجل التدقيق" : "Audit log",
    roles: locale === "ar" ? "الأدوار" : "Roles",
  };
  const updateRoles = (next: RoleDefinition[]) => {
    setRoles(next);
    saveRoles(next);
  };
  const toggle = (role: RoleDefinition, permission: Permission) =>
    !canEditPermissions || isCreatorRole(role.key) ? undefined : updateRoles(
      roles.map((item) =>
        item.key === role.key
          ? {
              ...item,
              permissions: item.permissions.includes(permission)
                ? item.permissions.filter((value) => value !== permission)
                : [...item.permissions, permission],
            }
          : item,
      ),
    );
  const createProfile = async () => {
    const id = profile.id.trim();
    const role = profile.role;
    if (
      !authorized ||
      !id ||
      !profile.name.trim() ||
      !profile.password ||
      !role
    )
      return;
    if (id === "10" || profiles.some((item) => item.id === id) || (currentSession?.role === "PRINCIPAL" && role === "PRINCIPAL")) {
      alert(t("userIdUsed"));
      return;
    }
    const teachingAssignments = profile.teachingAssignments.filter((assignment) => assignment.subject.trim()).map((assignment) => ({ ...assignment, subject: assignment.subject.trim() }));
    const nextProfile = {
      ...profile,
      id,
      role,
      name: profile.name.trim(),
      createdAt: new Date().toISOString(),
      lastActivity: t("notLoggedInYet"),
      teachingAssignments,
      subject: teachingAssignments[0]?.subject ?? "",
      gradeLevel: teachingAssignments[0]?.gradeLevel ?? null,
      assigned_divisions: Array.from(new Set(teachingAssignments.flatMap((assignment) => assignment.divisions))),
      subjectsTaught: teachingAssignments.map((assignment) => assignment.subject),
    };
    const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: nextProfile.name, password: nextProfile.password, role, divisions: nextProfile.assigned_divisions, subjectsTaught: nextProfile.subjectsTaught, teachingAssignments }) });
    if (!response.ok) {
      alert(locale === 'ar' ? 'تعذر حفظ الملف في قاعدة البيانات.' : 'Unable to save the profile to the database.');
      return;
    }
    saveProfile(nextProfile);
    setProfiles(getProfiles());
    setProfile({
      id: "",
      name: "",
      password: "",
      role: "",
      subject: "",
      gradeLevel: "",
      assigned_divisions: [],
      teachingAssignments: [],
    });
  };
  const openEditProfile = (item: Profile) => {
    if (currentSession?.role === "PRINCIPAL" && item.role === "PRINCIPAL") return;
    setEditingProfile(item);
    setProfile({
      id: item.id,
      name: item.name,
      password: item.password,
      role: item.role,
      subject: item.subject ?? "",
      gradeLevel: String(item.gradeLevel ?? ""),
      assigned_divisions: item.assigned_divisions ?? [],
      teachingAssignments: item.teachingAssignments ?? (item.subject ? [{ id: `assignment-${item.id}`, subject: item.subject, gradeLevel: item.gradeLevel ?? null, divisions: item.assigned_divisions ?? [], attendance: true, gradebook: true }] : []),
    });
  };
  const saveEditedProfile = async () => {
    if (!authorized || !editingProfile || !profile.name.trim() || (currentSession?.role === "PRINCIPAL" && (editingProfile.role === "PRINCIPAL" || profile.role === "PRINCIPAL"))) return;
    if (!profile.role) return;
    const teachingAssignments = profile.teachingAssignments.filter((assignment) => assignment.subject.trim()).map((assignment) => ({ ...assignment, subject: assignment.subject.trim() }));
    const nextProfile = {
      ...editingProfile,
      name: profile.name.trim(),
      password: profile.password,
      role: profile.role,
      subject: teachingAssignments[0]?.subject ?? "",
      gradeLevel: teachingAssignments[0]?.gradeLevel ?? null,
      assigned_divisions: Array.from(new Set(teachingAssignments.flatMap((assignment) => assignment.divisions))),
      teachingAssignments,
      subjectsTaught: teachingAssignments.map((assignment) => assignment.subject),
    };
    const response = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: nextProfile.id, name: nextProfile.name, password: nextProfile.password, role: nextProfile.role, divisions: nextProfile.assigned_divisions, subjectsTaught: nextProfile.subjectsTaught, teachingAssignments }) });
    if (!response.ok) return;
    saveProfile(nextProfile);
    setProfiles(getProfiles());
    setEditingProfile(null);
  };
  const resetPassword = (item: Profile) => {
    if (!authorized || (currentSession?.role === "PRINCIPAL" && item.role === "PRINCIPAL")) return;
    setResettingProfile(item);
    setNewPassword("");
  };
  const saveResetPassword = async () => {
    if (!authorized || !resettingProfile || !newPassword) return;
    const response = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resettingProfile.id, name: resettingProfile.name, password: newPassword, role: resettingProfile.role, divisions: resettingProfile.assigned_divisions, subjectsTaught: resettingProfile.subjectsTaught ?? [] }) });
    if (!response.ok) return;
    saveProfile({
      ...resettingProfile,
      password: newPassword,
      lastActivity: `تم تحديث كلمة المرور ${new Date().toLocaleString()}`,
    });
    setProfiles(getProfiles());
    setResettingProfile(null);
    setNewPassword("");
  };
  const removeProfile = (id: string) => {
    const target = profiles.find((item) => item.id === id);
    if (authorized && target && target.role !== "PRINCIPAL") setDeletingProfile(target);
  };
  const confirmRemoveProfile = () => {
    if (!deletingProfile) return;
    deleteProfile(deletingProfile.id);
    setProfiles(getProfiles());
    setDeletingProfile(null);
  };
  return (
    <div className="space-y-7" dir="rtl">
      <header>
        <p className="text-sm font-bold text-emerald-600">
          {t("systemManagement")}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
          {t("rolesAndPermissions")}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {locale === "ar"
            ? "مصفوفة واضحة توضح الوظائف المتاحة لكل دور."
            : "A clear matrix of capabilities available to each role."}
        </p>
      </header>
      {verificationMessage && <div role="status" className={`animate-[slideInUp_0.35s_ease-out] rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${verificationActive ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"}`}>{verificationMessage}</div>}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100/80 p-5 dark:border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><Lock className="h-5 w-5" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{locale === "ar" ? "مركز الإدارة" : "Administration center"}</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{t("creatorMode")}</h2></div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold text-white ${verificationActive ? "bg-emerald-600" : "bg-slate-500"}`}>{verificationActive ? (locale === "ar" ? "تم التحقق" : "Verified") : (locale === "ar" ? "يتطلب التحقق" : "Verification required")}</span>
        </div>
        <div className="p-5">
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{currentSession?.role === "PRINCIPAL" ? (locale === "ar" ? "لديك صلاحية المدير لإدارة الأدوار وملفات الموظفين وإعدادات النظام." : "You have Principal access to manage roles, employee profiles, and system settings.") : t("creatorInstructions")}</p>
          {currentSession?.role !== "PRINCIPAL" && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input value={adminId} onChange={(event) => setAdminId(event.target.value)} placeholder={t("creatorId")} className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5 dark:border-emerald-900 dark:bg-slate-950/60" /><input value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} type="password" placeholder={locale === "ar" ? "كلمة المرور" : "Password"} className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5 dark:border-emerald-900 dark:bg-slate-950/60" /><button type="button" onClick={activateCreatorMode} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">{locale === "ar" ? "تفعيل" : "Activate"}</button></div>}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-card-foreground">
            {t("permissionMatrix")}
          </h2>
          <p className="mt-1 text-xs text-card-foreground/60">
            {locale === "ar"
              ? "اختر دوراً لمراجعة صلاحياته وتعديلها بشكل منظم."
              : "Choose a role to review and edit its permissions in a focused view."}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
          {roles.map((role) => (
            <button
              key={role.key}
              type="button"
              disabled={!verificationActive}
              onClick={() => setPermissionRoleKey(role.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${permissionRole?.key === role.key ? "bg-emerald-600 text-white" : "bg-muted text-card-foreground/70 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"}`}
            >
              {isCreatorRole(role.key)
                ? locale === "ar"
                  ? "المُنشئ"
                  : "Creator"
                : locale === "ar"
                  ? role.name
                  : role.nameEn}
            </button>
          ))}
        </div>
        {permissionRole && (
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-card-foreground">
                  {isCreatorRole(permissionRole.key)
                    ? locale === "ar"
                      ? "المُنشئ"
                      : "Creator"
                    : locale === "ar"
                      ? permissionRole.name
                      : permissionRole.nameEn}
                </h3>
                <p className="text-xs text-card-foreground/60">
                  {permissionRole.permissions.length}{" "}
                  {locale === "ar" ? "صلاحية مفعلة" : "enabled permissions"}
                </p>
              </div>
              {isCreatorRole(permissionRole.key) && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {locale === "ar" ? "صلاحيات كاملة" : "Full access"}
                </span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {permissionGroups.map((resource) => (
                <div
                  key={resource}
                  className="rounded-xl border border-border bg-background/50 p-3"
                >
                  <h4 className="mb-2 text-sm font-bold text-card-foreground">
                    {resourceNames[resource] ?? resource}
                  </h4>
                  <div className="space-y-2">
                    {PERMISSIONS.filter((permission) => resource === "general" ? !permission.key.includes(":") : permission.key.startsWith(`${resource}:`)).map((permission) => {
                      const enabled =
                          isCreatorRole(permissionRole.key) ||
                        permissionRole.permissions.includes(permission.key);
                      return (
                        <button
                          key={permission.key}
                          type="button"
                          disabled={!verificationActive || !canEditPermissions || isCreatorRole(permissionRole.key)}
                          onClick={() => toggle(permissionRole, permission.key)}
                          aria-pressed={enabled}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-start text-sm transition ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-border bg-card text-card-foreground/60 hover:border-emerald-300"} disabled:cursor-default disabled:opacity-80`}
                        >
                          <span>
                            {permissionLabels[permission.key] ??
                              (locale === "ar"
                                ? permission.label
                                    .split(": ")
                                    .slice(1)
                                    .join(": ")
                                : permission.labelEn
                                    .split(": ")
                                    .slice(1)
                                    .join(": "))}
                          </span>
                          <span className="text-xs font-semibold">
                            {enabled
                              ? locale === "ar"
                                ? "مفعلة"
                                : "Enabled"
                              : locale === "ar"
                                ? "غير مفعلة"
                                : "Disabled"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b p-4 dark:border-slate-800">
          <h2 className="font-bold">
            {locale === "ar" ? "إنشاء ملف موظف" : "Create employee profile"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {locale === "ar"
              ? "أنشئ ID وكلمة مرور ودوراً مستقلاً لكل موظف."
              : "Create a separate ID, password, and role for each employee."}
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <input
            value={profile.name}
            onChange={(event) =>
              setProfile({ ...profile, name: event.target.value })
            }
            placeholder={locale === "ar" ? "اسم الموظف" : "Employee name"}
            className="rounded-lg border px-3 py-2"
          />
          <input
            value={profile.id}
            onChange={(event) =>
              setProfile({ ...profile, id: event.target.value })
            }
            placeholder={locale === "ar" ? "الرقم الوظيفي / ID" : "Employee ID"}
            className="rounded-lg border px-3 py-2"
          />
          <input
            value={profile.password}
            onChange={(event) =>
              setProfile({ ...profile, password: event.target.value })
            }
            type="password"
            placeholder={locale === "ar" ? "كلمة المرور" : "Password"}
            className="rounded-lg border px-3 py-2"
          />
          <StyledSelect
            value={profile.role}
            onValueChange={(value) =>
              setProfile({
                ...profile,
                role: value as AppRole | "",
                gradeLevel: "",
                assigned_divisions: [],
              })
            }
            placeholder={locale === "ar" ? "اختر الدور" : "Select a role"}
            options={roleOptions}
            aria-label={locale === "ar" ? "دور الموظف" : "Employee role"}
          />
          {selectedRole && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-slate-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-slate-200 sm:col-span-2">
              <p className="font-bold">
                {locale === "ar" ? selectedRole.nameAr : selectedRole.nameEn}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {locale === "ar"
                  ? selectedRole.descriptionAr
                  : selectedRole.descriptionEn}
              </p>
            </div>
          )}
          {profile.role === "TEACHER" && <TeachingAssignmentEditor assignments={profile.teachingAssignments} divisions={divisions} locale={locale} onChange={(teachingAssignments) => setProfile({ ...profile, teachingAssignments })} />}
          {false && profile.role === "TEACHER" && (
            <div className="dropdown-animation col-span-2 grid gap-3 sm:grid-cols-2">
              <input
                value={profile.subject}
                onChange={(event) =>
                  setProfile({ ...profile, subject: event.target.value })
                }
                placeholder={
                  locale === "ar" ? "المادة الدراسية" : "Subject taught"
                }
                className="rounded-lg border px-3 py-2"
              />
              <StyledSelect
                value={profile.gradeLevel}
                onValueChange={(value) =>
                  setProfile({
                    ...profile,
                    gradeLevel: value,
                    assigned_divisions: [],
                  })
                }
                placeholder={
                  locale === "ar" ? "اختر الصف الدراسي" : "Select grade level"
                }
                options={gradeOptions}
                aria-label={locale === "ar" ? "الصف الدراسي" : "Grade level"}
              />
              <div className="rounded-lg border p-3 sm:col-span-2">
                <p className="mb-2 text-sm font-semibold">
                  {locale === "ar" ? "الشعب المخصصة" : "Assigned divisions"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredDivisions.map((code) => (
                    <label
                      key={code}
                      className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={profile.assigned_divisions.includes(code)}
                        onChange={() =>
                          setProfile({
                            ...profile,
                            assigned_divisions:
                              profile.assigned_divisions.includes(code)
                                ? profile.assigned_divisions.filter(
                                    (item) => item !== code,
                                  )
                                : [...profile.assigned_divisions, code],
                          })
                        }
                      />
                      {code}
                    </label>
                  ))}
                </div>
                {!profile.gradeLevel && (
                  <p className="text-xs text-slate-500">
                    {locale === "ar"
                      ? "اختر الصف أولاً لعرض شعبه."
                      : "Select a grade first to show its divisions."}
                  </p>
                )}
                {profile.gradeLevel && !filteredDivisions.length && (
                  <p className="text-xs text-slate-500">
                    {locale === "ar"
                      ? "لا توجد شعب لهذا الصف بعد."
                      : "No divisions exist for this grade yet."}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            disabled={
              !authorized ||
              !profile.id ||
              !profile.name ||
              !profile.password ||
              !profile.role
            }
            onClick={createProfile}
            className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-40 sm:col-span-2"
          >
            <UserPlus className="me-1 inline h-4 w-4" />{" "}
            {locale === "ar" ? "إنشاء ملف الموظف" : "Create employee profile"}
          </button>
        </div>
      </section>
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b p-4 dark:border-slate-800">
          <h2 className="font-bold">
            {locale === "ar" ? "الملفات الحالية" : "Current profiles"}
          </h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-start">
                {locale === "ar" ? "الموظف" : "Employee"}
              </th>
              <th className="p-4 text-start">
                {locale === "ar" ? "الدور" : "Role"}
              </th>
              <th className="p-4 text-start">
                {locale === "ar" ? "النشاط" : "Activity"}
              </th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-4">
                {locale === "ar" ? "حسين" : "Hussein"}
                <span className="block text-xs text-slate-500">ID: 10</span>
              </td>
              <td className="p-4">
                {locale === "ar" ? "المُنشئ / Creator" : "Creator"}
              </td>
              <td className="p-4 text-slate-500">
                {locale === "ar" ? "الحساب الأساسي" : "Primary account"}
              </td>
              <td />
            </tr>
            {profiles.filter((item) => item.id !== "10" && !isCreatorRole(item.role)).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-4">
                  {item.name}
                  <span className="block text-xs text-slate-500">
                    ID: {item.id}
                  </span>
                </td>
                <td className="p-4">
                  {
                    roleOptions.find((option) => option.value === item.role)
                      ?.label
                  }
                </td>
                <td className="p-4 text-slate-500">{item.lastActivity}</td>
                <td className="flex gap-2 p-4">
                  <button
                    disabled={!authorized || (currentSession?.role === "PRINCIPAL" && item.role === "PRINCIPAL")}
                    onClick={() => openEditProfile(item)}
                    className="rounded border p-2 text-slate-600 disabled:opacity-40"
                    aria-label={
                      locale === "ar" ? "تعديل الملف" : "Edit profile"
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    disabled={!authorized || (currentSession?.role === "PRINCIPAL" && item.role === "PRINCIPAL")}
                    onClick={() => resetPassword(item)}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                  >
                    {locale === "ar" ? "إعادة كلمة المرور" : "Reset password"}
                  </button>
                  <button
                    disabled={!authorized || (currentSession?.role === "PRINCIPAL" && item.role === "PRINCIPAL")}
                    onClick={() => removeProfile(item.id)}
                    className="text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {editingProfile && (
        <Modal
          open={true}
          onOpenChange={(open) => !open && setEditingProfile(null)}
          className="max-w-lg"
        >
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {locale === "ar" ? "تعديل ملف المعلم" : "Edit teacher profile"}
              </h2>
            </div>
            <input
              value={profile.name}
              onChange={(event) =>
                setProfile({ ...profile, name: event.target.value })
              }
              placeholder={locale === "ar" ? "اسم المعلم" : "Teacher name"}
              className="w-full rounded-lg border px-3 py-2"
            />
            {profile.role === "TEACHER" && <TeachingAssignmentEditor assignments={profile.teachingAssignments} divisions={divisions} locale={locale} onChange={(teachingAssignments) => setProfile({ ...profile, teachingAssignments })} />}
            {false && profile.role === "TEACHER" && (
              <div className="dropdown-animation space-y-4">
                <StyledSelect
                  value={profile.gradeLevel}
                  onValueChange={(value) =>
                    setProfile({
                      ...profile,
                      gradeLevel: value,
                      assigned_divisions: [],
                    })
                  }
                  placeholder={
                    locale === "ar" ? "اختر الصف الدراسي" : "Select grade level"
                  }
                  options={gradeOptions}
                  aria-label={locale === "ar" ? "الصف الدراسي" : "Grade level"}
                />
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">
                    {locale === "ar" ? "الشعب المخصصة" : "Assigned divisions"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredDivisions.map((code) => (
                      <label
                        key={code}
                        className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={profile.assigned_divisions.includes(code)}
                          onChange={() =>
                            setProfile({
                              ...profile,
                              assigned_divisions:
                                profile.assigned_divisions.includes(code)
                                  ? profile.assigned_divisions.filter(
                                      (item) => item !== code,
                                    )
                                  : [...profile.assigned_divisions, code],
                            })
                          }
                        />
                        {code}
                      </label>
                    ))}
                  </div>
                  {!profile.gradeLevel && (
                    <p className="text-xs text-slate-500">
                      {locale === "ar"
                        ? "اختر الصف أولاً لعرض شعبه."
                        : "Select a grade first to show its divisions."}
                    </p>
                  )}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={saveEditedProfile}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
            >
              {locale === "ar" ? "حفظ التعيينات" : "Save assignments"}
            </button>
          </div>
        </Modal>
      )}
      {resettingProfile && (
        <Modal
          open={true}
          onOpenChange={(open) => !open && setResettingProfile(null)}
          className="max-w-md"
        >
          <div className="space-y-4" dir="rtl">
            <h2 className="text-xl font-bold">
              {locale === "ar" ? "إعادة تعيين كلمة المرور" : "Reset password"}
            </h2>
            <p className="text-sm text-slate-500">{resettingProfile.name}</p>
            <input
              autoFocus
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder={
                locale === "ar" ? "كلمة المرور الجديدة" : "New password"
              }
              className="w-full rounded-lg border px-3 py-2"
            />
            <button
              type="button"
              onClick={saveResetPassword}
              disabled={!newPassword}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
            >
              {locale === "ar" ? "حفظ كلمة المرور" : "Save password"}
            </button>
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={Boolean(deletingProfile)}
        title={locale === "ar" ? "حذف ملف الموظف" : "Delete employee profile"}
        message={deletingProfile ? `${t("confirmDeleteProfile")}\n\n${deletingProfile.name} (ID: ${deletingProfile.id})` : ""}
        onCancel={() => setDeletingProfile(null)}
        onConfirm={confirmRemoveProfile}
      />
    </div>
  );
}
