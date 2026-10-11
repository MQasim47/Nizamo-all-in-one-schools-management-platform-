// Marketing copy in one place. The FAQ here also feeds the FAQPage JSON-LD, so the visible text
// and the structured data can never drift apart. Be honest: most modules are still being built.

export const PAINS = [
  {
    pain: 'The General Register lives in a heavy book, and one SLC takes half a day.',
    solution: 'One digital General Register with B-Form and CNIC fields. A School Leaving Certificate comes from the record in one click.',
  },
  {
    pain: 'Result sheets are copied by hand from marks registers and Excel files, and one wrong cell spoils the gazette.',
    solution: 'Teachers enter marks, the principal approves them, and the class gazette builds itself from approved results only.',
  },
  {
    pain: 'Fee dues are chased on paper, defaulters are guessed, and parents hear about absences days late.',
    solution: 'Fee records with defaulter lists, and attendance and notices that reach parents on WhatsApp, where they already are.',
  },
]

export const MODULES = [
  {
    id: 'gr',
    title: 'General Register + SLC',
    text: 'The complete legal record: B-Form, caste, previous school, admission and leaving details. Generate School Leaving Certificates from it.',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    text: 'Teachers mark present, absent or late in seconds. Parents of absent students can be told on WhatsApp.',
  },
  {
    id: 'results',
    title: 'Results + class gazette',
    text: 'Marks entry by teachers, approval by the principal, marksheets for each student and the traditional class gazette for the whole class.',
  },
  {
    id: 'fees',
    title: 'Fees + defaulters',
    text: 'Fee structures, challans, discounts and fines, family accounts for siblings, receipts, and a clear list of who has not paid.',
  },
  {
    id: 'parents',
    title: 'Parent portal',
    text: 'Parents see only their own children: attendance, approved results and fee status, on a simple app that works on any phone.',
  },
]

export const WHY = [
  {
    title: 'Made for Pakistani schools',
    text: 'GR numbers, B-Form, CNIC, SLC, class gazettes and rupee challans are the starting point, not an afterthought.',
  },
  {
    title: 'WhatsApp first',
    text: 'Parents already live on WhatsApp. Nizamo meets them there instead of asking them to learn a new app.',
  },
  {
    title: 'Urdu and English',
    text: 'Printouts and key screens in both languages, so a certificate or marksheet is ready to hand over.',
  },
  {
    title: 'Security and privacy',
    text: 'Every school’s data is kept separate at the database level. People only see what their role needs, every change to marks, fees and the register is logged, and we never sell data.',
  },
]

export const FAQ = [
  {
    q: 'Is Nizamo ready to use today?',
    a: 'We are onboarding Founding Schools now. Sign-in, school accounts and the security foundations are in place, and the modules (General Register, attendance, results, fees, parent portal) are being rolled out to Founding Schools first, in that order of priority.',
  },
  {
    q: 'How much does it cost?',
    a: 'Pricing will be announced soon. Founding Schools get a special founding price that is locked in. Join the waitlist and we will share the details with you directly.',
  },
  {
    q: 'We already keep our records in registers and Excel. Do we have to type everything again?',
    a: 'No. Founding Schools get free data setup: send us your registers or Excel sheets and we help load them.',
  },
  {
    q: 'Is our students’ data safe?',
    a: 'Each school’s data is isolated from every other school at the database level. Staff and parents only see what their role allows, sensitive fields such as CNIC and B-Form are masked in lists, and changes to marks, fees and the General Register are recorded in an audit log. Data is stored with Supabase, and we never sell it.',
  },
  {
    q: 'Do parents need to install an app?',
    a: 'Not to get started. Nizamo is designed around WhatsApp messages first. A simple parent portal that works on any phone comes after the core school modules.',
  },
  {
    q: 'What happens to our data if we leave Nizamo?',
    a: 'You can export your school’s data, and you can ask us to delete it. See our Privacy Policy for the details.',
  },
]
