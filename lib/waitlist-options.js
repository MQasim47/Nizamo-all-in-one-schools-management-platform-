// Plain constants (no zod) so client components can import them without pulling in validation code.
export const STUDENT_RANGES = {
  under_100: 'Under 100',
  '100_300': '100 – 300',
  '300_600': '300 – 600',
  '600_1000': '600 – 1,000',
  over_1000: 'Over 1,000',
}

export const WAITLIST_STATUSES = ['new', 'contacted', 'demo', 'converted']
