// ============================================
// Grade calculation — matches PHP MVP logic exactly
// ============================================

export function calculateGrade(marks, maxMarks = 100) {
  if (!maxMarks || maxMarks === 0) return 'N/A'
  const pct = (marks / maxMarks) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

export function calculatePercentage(marks, maxMarks) {
  if (!maxMarks || maxMarks === 0) return 0
  return Math.round((marks / maxMarks) * 100 * 100) / 100
}

export function getRemarks(percentage) {
  if (percentage >= 90) return 'Outstanding'
  if (percentage >= 80) return 'Excellent'
  if (percentage >= 70) return 'Very Good'
  if (percentage >= 60) return 'Good'
  if (percentage >= 50) return 'Satisfactory'
  if (percentage >= 40) return 'Pass'
  return 'Needs Improvement'
}

export const EXAM_LABELS = {
  unit_test:   'Unit Test',
  midterm:     'Midterm',
  quarterly:   'Quarterly',
  half_yearly: 'Half Yearly',
  final:       'Final Exam',
}
