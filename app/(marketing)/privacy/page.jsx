// DRAFT — to be reviewed (ideally by a lawyer) before launch. Fill the TODO operator details in lib/site.js.
import LegalPage from '@/components/marketing/LegalPage'
import { CONTACT_EMAIL } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

const TITLE = 'Privacy Policy'
const DESCRIPTION =
  'How Nizamo handles school and student data: what we collect, who can see it, where it is stored, and how schools can export or delete it.'

export function generateMetadata() {
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: '/privacy' })
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title={TITLE}
      intro="Schools trust Nizamo with information about children and families. This page explains in plain English what we do with it. “We” means Nizamo; “the school” means the school that uses Nizamo."
      sections={[
        {
          heading: 'Who is responsible for the data',
          body: [
            'Each school decides what student and staff information goes into Nizamo, and is responsible for having the right to use it. We process that information on the school’s behalf, only to run Nizamo for that school.',
          ],
        },
        {
          heading: 'Children’s data',
          body: [
            'Most of the information in Nizamo is about children. We treat it with extra care: we collect only what a school needs to run its register, attendance, results and fees, we mask sensitive numbers in lists, and we never use children’s data for advertising.',
            'We do not let children or parents create accounts on their own. A school invites them, and a parent can only see their own children.',
          ],
        },
        {
          heading: 'What we collect',
          body: [
            'Information the school enters:',
            [
              'Student records: name, date of birth, class, GR number, B-Form number, parents’ names and CNIC, contact numbers, address, previous school, attendance, exam marks and fee records.',
              'Staff and account details: name, email, phone, role, and a securely hashed password (we never store or see the password itself).',
            ],
            'Information from people who visit our website or join our waitlist:',
            [
              'School name, contact name, city, approximate number of students, WhatsApp number and optional email, plus the campaign link (for example utm_source) that brought you here.',
            ],
            'We keep security logs, such as failed sign-in attempts and an audit trail of changes to marks, fees, General Register records, roles and settings. These logs do not contain passwords.',
          ],
        },
        {
          heading: 'Who can see it',
          body: [
            'Access depends on role, and is enforced in our database, not only on screen:',
            [
              'Principals see their own school’s data.',
              'Teachers see only the classes and subjects they are assigned to.',
              'Accountants see fee information, not exam marks.',
              'Parents and students see only their own records.',
              'Nobody can see another school’s data.',
              'A small number of Nizamo staff can access data when a school asks for support or when we must keep the service secure. That access is limited and recorded.',
            ],
            'Sensitive fields such as CNIC and B-Form numbers are masked in lists and shown in full only on a student’s detail page, to roles permitted to see them.',
          ],
        },
        {
          heading: 'Where it is stored',
          body: [
            'Nizamo’s database and file storage are provided by Supabase, a hosted database service, in a cloud data centre. Data is encrypted while it travels over the internet. Student photos and documents, when added, are kept in private storage and are never public.',
          ],
        },
        {
          heading: 'We do not sell data',
          body: [
            'We do not sell or rent personal data, and we do not show advertising. We share data only with service providers that help us run Nizamo (for example hosting and, when you choose to use them, WhatsApp messaging and payment providers), under the same purpose limits, or when the law requires it.',
          ],
        },
        {
          heading: 'Exporting and deleting your data',
          body: [
            'A school can ask for an export of its data in common formats (Excel or CSV) at any time.',
            'When a school stops using Nizamo, it can ask us to delete its data. We will confirm the request with the school’s principal or owner, delete the school’s records, and remove them from backups within a reasonable period. Some security logs may be kept for a limited time where we need them to prevent fraud or meet legal duties.',
            'Parents and students who want to see or correct a record should ask their school first; the school can update it in Nizamo.',
          ],
        },
        {
          heading: 'Security',
          body: [
            'Passwords are hashed. Sign-in attempts are rate-limited. Each school’s data is separated from other schools in the database. Changes to marks, fees and the General Register are recorded in an audit log that school administrators cannot edit. No system is perfectly secure, but we work to protect your information and will tell affected schools promptly if something goes wrong.',
          ],
        },
        {
          heading: 'Changes to this policy',
          body: ['If we change this policy in a meaningful way we will update this page and tell schools before the change applies.'],
        },
        {
          heading: 'Contact',
          body: [
            CONTACT_EMAIL
              ? `Questions, export or deletion requests: ${CONTACT_EMAIL}.`
              : 'Questions, export or deletion requests: please contact us through the details on our website.',
          ],
        },
      ]}
    />
  )
}
