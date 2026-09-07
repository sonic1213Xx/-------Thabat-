"use client";

import AttendancePage from "../attendance/page";
import { ClassroomAttendanceLogs } from "@/components/attendance/classroom-attendance-logs";
import { getSession } from "@/lib/auth";

export default function ClassroomAttendancePage() {
  return getSession()?.role === "TEACHER" ? <AttendancePage /> : <ClassroomAttendanceLogs />;
}
