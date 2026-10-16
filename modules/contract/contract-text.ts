import { BRAND_NAME } from '@/lib/brand'

export const CONTRACT_VERSION = '2026-10-draft-1'
export const CONTRACT_IS_DRAFT = true

export const CONTRACT_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Independent contractor',
    body: `You work as an independent contractor, not as an employee of ${BRAND_NAME}. You choose which missions you accept, when, and where. There are no quotas and no required hours.`,
  },
  {
    title: 'What you are paid for',
    body: 'You are paid per mission, according to the payout steps shown in the app at the time you accept the mission. Payouts are sent weekly. You are responsible for your own taxes; we provide the tax forms required by law.',
  },
  {
    title: 'How you represent us',
    body: `You introduce yourself as a field agent with ${BRAND_NAME}. ${BRAND_NAME} is an independent company, not affiliated with Google. You never say or suggest that you work for, or on behalf of, Google.`,
  },
  {
    title: 'Owners’ accounts and passwords',
    body: 'The business owner creates and controls their own profile and Google account. You never ask for, type, store or write down an owner’s password or verification code.',
  },
  {
    title: 'No reviews',
    body: 'You never write, ask for, offer or discuss reviews or ratings of any business, and you are never paid for reviews.',
  },
  {
    title: 'Accurate information',
    body: 'Everything you submit (check-in, photos, answers) must be true and collected during the visit. Submitting false information ends this agreement and voids unpaid earnings for the missions concerned.',
  },
  {
    title: 'Ending the agreement',
    body: 'Either party can end this agreement at any time. Earnings already validated remain payable.',
  },
]
