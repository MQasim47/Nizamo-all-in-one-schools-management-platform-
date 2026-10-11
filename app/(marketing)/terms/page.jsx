// DRAFT — to be reviewed (ideally by a lawyer) before launch. Fill the TODO operator details in lib/site.js.
import LegalPage from '@/components/marketing/LegalPage'
import { CONTACT_EMAIL } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

const TITLE = 'Terms of Service'
const DESCRIPTION =
  'The terms for using Nizamo: who can use it, how schools are responsible for their data, acceptable use, payment, and what happens when a school leaves.'

export function generateMetadata() {
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: '/terms' })
}

export default function TermsPage() {
  return (
    <LegalPage
      title={TITLE}
      intro="These terms are an agreement between Nizamo and the school that uses it. By creating a school account or using Nizamo, you accept them."
      sections={[
        {
          heading: 'Who can use Nizamo',
          body: [
            'A school account must be created by someone with authority to act for the school, such as the principal or owner. Each person using Nizamo must keep their sign-in details private and tell us if they think an account has been misused.',
          ],
        },
        {
          heading: 'The school’s data and responsibilities',
          body: [
            'The school owns the information it puts into Nizamo and is responsible for its accuracy and for having the right to use it, including permission to process children’s data. The school decides which staff get which role. Please read our Privacy Policy, which explains how we handle that data.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'You agree not to:',
            [
              'try to access another school’s data or break the security of the service;',
              'upload unlawful or harmful content;',
              'use Nizamo to harass or mislead anyone;',
              'resell the service without our written permission.',
            ],
            'We may suspend an account that breaks these rules or puts others at risk.',
          ],
        },
        {
          heading: 'Founding Schools and pricing',
          body: [
            'Some modules are still being built. Founding Schools receive early access and the founding price and benefits we offer them in writing. Features may change as we improve Nizamo. Prices, billing periods and any founding price lock will be set out in the school’s order or agreement before it is charged.',
          ],
        },
        {
          heading: 'Availability and support',
          body: [
            'We work to keep Nizamo available and to fix problems quickly, but we cannot promise it will never be interrupted. We will give notice of planned maintenance where we can.',
          ],
        },
        {
          heading: 'Leaving Nizamo',
          body: [
            'A school can stop using Nizamo at any time. On request we will provide an export of its data (Excel or CSV) and, once confirmed by the school, delete its data as described in the Privacy Policy.',
          ],
        },
        {
          heading: 'Limits of our responsibility',
          body: [
            'We provide Nizamo with reasonable care and skill. To the extent the law allows, we are not responsible for indirect or consequential losses, or for losses caused by information that was entered incorrectly, by sharing sign-in details, or by events outside our control. Nothing in these terms limits responsibility that cannot legally be limited.',
          ],
        },
        {
          heading: 'Changes and governing law',
          body: [
            'We may update these terms and will tell schools before a meaningful change applies. These terms are governed by the laws of Pakistan.',
          ],
        },
        {
          heading: 'Contact',
          body: [CONTACT_EMAIL ? `Questions about these terms: ${CONTACT_EMAIL}.` : 'Questions about these terms: please contact us through the details on our website.'],
        },
      ]}
    />
  )
}
