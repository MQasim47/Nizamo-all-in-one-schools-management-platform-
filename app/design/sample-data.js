// Sample data for the /design preview only. Invented names; nothing here is real or stored.
import { LayoutDashboard, Users, CalendarCheck, GraduationCap, Banknote, MessageSquare, Settings, School, ListChecks, Building2 } from 'lucide-react'

export const SCHOOL = { name: 'Allama Iqbal Public School', city: 'Gulberg, Lahore' }
export const PRINCIPAL = { name: 'Nasreen Akhtar', email: 'principal@aips.edu.pk', roleLabel: 'Principal' }

// Principal's menu: grouped, icon-only-thin, only built modules would appear in the real app.
export const NAV_PRINCIPAL = [
  { label: 'Overview', items: [{ href: '/school/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Academics',
    items: [
      { href: '/school/students', label: 'Students', icon: Users },
      { href: '/school/classes', label: 'Classes', icon: School },
      { href: '/school/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/school/results', label: 'Exams & Results', icon: GraduationCap, badge: 3 },
    ],
  },
  { label: 'Finance', items: [{ href: '/school/fees', label: 'Fees', icon: Banknote }] },
  { label: 'Communication', items: [{ href: '/school/messages', label: 'Messages', icon: MessageSquare }] },
  { label: 'Settings', items: [{ href: '/school/settings', label: 'School settings', icon: Settings }] },
]

export const NAV_SUPERADMIN = [
  { label: 'Platform', items: [{ href: '/admin/schools', label: 'Schools', icon: Building2 }, { href: '/admin/waitlist', label: 'Waitlist', icon: ListChecks }] },
  { label: 'Settings', items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }] },
]

export const STUDENTS = [
  { id: 1, gr: '2041', name: 'Ayesha Siddiqui', cls: '7-A', guardian: 'Tariq Siddiqui', phone: '0300-••••412', fee: 'Paid' },
  { id: 2, gr: '2042', name: 'Hamza Qureshi', cls: '7-A', guardian: 'Imran Qureshi', phone: '0321-••••907', fee: 'Pending' },
  { id: 3, gr: '2043', name: 'Fatima Zahra', cls: '8-B', guardian: 'Syed Ali Raza', phone: '0333-••••158', fee: 'Paid' },
  { id: 4, gr: '2044', name: 'Muhammad Bilal', cls: '8-B', guardian: 'Abdul Rehman', phone: '0345-••••276', fee: 'Overdue' },
  { id: 5, gr: '2045', name: 'Zainab Malik', cls: '9-Science', guardian: 'Khalid Malik', phone: '0301-••••633', fee: 'Paid' },
  { id: 6, gr: '2046', name: 'Usman Tariq', cls: '9-Science', guardian: 'Tariq Mehmood', phone: '0312-••••840', fee: 'Partial' },
]

export const GLANCE = [
  { label: 'Attendance today', value: '41 of 46', detail: '5 classes not marked yet: 6-B, 7-B, 8-A, 9-Arts, 10-Science', href: '/school/attendance', action: true },
  { label: 'Students present', value: '94%', detail: '1,128 of 1,200 students', progress: 94, href: '/school/attendance' },
  { label: 'Fee collected this month', value: 'Rs. 18,40,000', detail: 'of Rs. 24,00,000 expected (77%)', progress: 77, href: '/school/fees' },
  { label: 'Result approvals waiting', value: '3', detail: 'Class 8-B Maths, Class 9 Physics, Class 7-A English', href: '/school/results', action: true },
  { label: 'Families with unpaid fees', value: '27', detail: 'Rs. 3,10,000 overdue by more than 30 days', href: '/school/fees', action: true },
]

export const ACTIVITY = [
  { id: 1, text: 'Ayesha Khan updated marks for Class 7-A, Maths', when: '12 minutes ago' },
  { id: 2, text: 'Sana Javed marked attendance for Class 8-B', when: '38 minutes ago' },
  { id: 3, text: 'Mr. Rizwan collected Rs. 6,500 from Hamza Qureshi’s family', when: 'Today, 9:05 am' },
  { id: 4, text: 'Ahmed Raza added 2 new students to Class 6-A', when: 'Yesterday, 2:40 pm' },
  { id: 5, text: 'Nasreen Akhtar approved Class 9 Chemistry results', when: 'Yesterday, 11:15 am' },
]

export const CHECKLIST_EMPTY = [
  { id: 'session', label: 'Choose the academic session', done: true },
  { id: 'classes', label: 'Add your classes', done: false, comingSoon: true },
  { id: 'subjects', label: 'Add subjects', done: false, comingSoon: true },
  { id: 'staff', label: 'Add teachers and staff', done: false, comingSoon: true },
  { id: 'students', label: 'Add or import students', done: false, comingSoon: true },
]

export const WAITLIST = [
  { id: 1, school: 'Beaconhouse Garden Town Campus', contact: 'Sadia Nawaz', city: 'Lahore', students: '300–1000', status: 'New' },
  { id: 2, school: 'Al-Noor Grammar School', contact: 'Hafiz Waqas', city: 'Faisalabad', students: '100–300', status: 'Contacted' },
  { id: 3, school: 'The Educators, Johar Town', contact: 'Maryam Aslam', city: 'Lahore', students: '1000+', status: 'New' },
]
