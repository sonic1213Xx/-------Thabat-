"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExcelParser } from "./excel-parser";
import { StyledSelect } from "@/components/ui/styled-select";
import { useLanguage } from "@/components/language-provider";

interface Student {
  id: string;
  name: string;
  nationalId: string;
  gradeLevel: number;
  divisionCode: string;
  behaviorScore: number;
  attendanceScore: number;
}

const mockStudents: Student[] = [
  {
    id: "1",
    name: "فاطمة محمد أحمد",
    nationalId: "1234567890",
    gradeLevel: 1,
    divisionCode: "101",
    behaviorScore: 95,
    attendanceScore: 100,
  },
  {
    id: "2",
    name: "علي سعود أحمد",
    nationalId: "1234567891",
    gradeLevel: 1,
    divisionCode: "102",
    behaviorScore: 88,
    attendanceScore: 95,
  },
  {
    id: "3",
    name: "مريم خالد سلمان",
    nationalId: "1234567892",
    gradeLevel: 2,
    divisionCode: "201",
    behaviorScore: 92,
    attendanceScore: 100,
  },
];

export function StudentManagement() {
  const { t, locale } = useLanguage();
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState<number | "all">("all");

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.includes(searchQuery) ||
      student.nationalId.includes(searchQuery);
    const matchesGrade =
      filterGrade === "all" || student.gradeLevel === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t("studentManagement")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredStudents.length} {locale === "ar" ? "طالب/طالبة" : "students"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
              "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
              "text-slate-900 dark:text-white",
              "transition-all duration-200",
            )}
          >
            <Upload className="h-4 w-4" />
            {t("importAction")}
          </button>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
              "bg-emerald-school-600 hover:bg-emerald-school-700 text-white",
              "transition-all duration-200",
            )}
          >
            <Plus className="h-4 w-4" />
            {t("addStudent")}
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 flex-wrap"
      >
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={locale === "ar" ? "ابحث عن طالب أو رقم هوية..." : "Search by student or ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg border",
                "border-slate-300 dark:border-slate-700",
                "bg-white dark:bg-slate-900",
                "text-slate-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-emerald-school-500",
                "transition-all duration-200",
              )}
            />
          </div>
        </div>

        <StyledSelect
          value={String(filterGrade)}
          onValueChange={(value) =>
            setFilterGrade(value === "all" ? "all" : Number(value))
          }
          options={[
            { value: "all", label: t("allGrades") },
            { value: "1", label: t("firstSecondary") },
            { value: "2", label: t("secondSecondary") },
            { value: "3", label: t("thirdSecondary") },
          ]}
          className="min-w-44"
        />
      </motion.div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-lg p-8 max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("importStudents")}
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
              <ExcelParser onParsed={() => setShowImportModal(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("studentName")}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("nationalId")}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("gradeLevel")}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("division")}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("behavior")}
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {t("attendanceScore")}
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student, idx) => (
                  <motion.tr
                    key={student.id}
                    layoutId={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: idx * 0.05,
                    }}
                    className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {student.nationalId}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {locale === "ar" ? `ث${student.gradeLevel}` : `Grade ${student.gradeLevel}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {student.divisionCode}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-emerald-school-500 h-2 rounded-full"
                            style={{ width: `${student.behaviorScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">
                          {student.behaviorScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${student.attendanceScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">
                          {student.attendanceScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-emerald-school-600 hover:text-emerald-school-700 dark:text-emerald-school-400 dark:hover:text-emerald-school-300 text-sm font-medium">
                        {t("open")}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center"
          >
            <p className="text-slate-600 dark:text-slate-400">
              لم يتم العثور على نتائج
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
