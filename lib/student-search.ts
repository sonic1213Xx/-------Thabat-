type StudentSearchEntry = {
  academicId?: string | null;
  arabicName?: string | null;
  divisionCode?: string | null;
  fullName?: string | null;
  name?: string | null;
  nationalId?: string | null;
  studentName?: string | null;
};

export const STUDENT_SEARCH_RESULT_LIMIT = 50;

export function searchStudents<T extends StudentSearchEntry>(
  students: readonly T[],
  query: string,
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return students.slice(0, limit);

  return students
    .filter((student) => {
      const fields = [
        student.fullName,
        student.arabicName,
        student.studentName,
        student.name,
        student.academicId,
        student.nationalId,
        student.divisionCode,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLocaleLowerCase());
      return terms.every((term) => fields.some((field) => field.includes(term)));
    })
    .slice(0, limit);
}
