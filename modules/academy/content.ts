import { BRAND_NAME } from '@/lib/brand'

export interface QuizQuestion { id: string; prompt: string; options: string[]; correctIndex: number }
export interface AcademyModule {
  id: string
  title: string
  minutes: number
  videoUrl: string | null
  summary: string[]
  questions: QuizQuestion[]
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 'why',
    title: 'Why a Google Business Profile matters',
    minutes: 4,
    videoUrl: null,
    summary: [
      'Most people find local contractors on Google Maps.',
      'A verified profile shows the business with its phone number, hours and photos.',
      'The profile is free and always belongs to the business owner.',
      'You help owners set it up correctly, on their own phone and their own Google account.',
    ],
    questions: [
      { id: 'why-1', prompt: 'Who owns the profile you help set up?', options: ['The business owner', `${BRAND_NAME}`, 'You, the field agent', 'A Google employee'], correctIndex: 0 },
      { id: 'why-2', prompt: 'How much does a Google Business Profile cost the owner?', options: ['$99 setup fee', 'Nothing, it is free', '$25 per month', 'It depends on the city'], correctIndex: 1 },
      { id: 'why-3', prompt: 'Whose Google account is the profile created with?', options: ['Yours', `${BRAND_NAME}’s`, 'The owner’s own account', 'Any account works'], correctIndex: 2 },
    ],
  },
  {
    id: 'visit',
    title: 'How a visit works',
    minutes: 5,
    videoUrl: null,
    summary: [
      'Open the mission in the app before you leave, so it works even with poor signal.',
      'Check in when you arrive, then ask the owner to sign the consent on your screen.',
      'The owner creates (or claims) the profile on their own phone. You guide; they type.',
      'The owner invites our manager email, you take at least 10 photos, then you help with verification and check out.',
      'If the owner has no Google account, help them create one on their own phone, with their own password.',
    ],
    questions: [
      { id: 'visit-1', prompt: 'What do you do first when you arrive?', options: ['Take photos', 'Check in in the app', 'Ask for the owner’s password', 'Call support'], correctIndex: 1 },
      { id: 'visit-2', prompt: 'The owner has no Google account. What do you do?', options: ['Create one for them with your email', `Use the ${BRAND_NAME} account`, 'Help them create one on their own phone, with their own password', 'Cancel the visit'], correctIndex: 2 },
      { id: 'visit-3', prompt: 'How many photos do you need at minimum?', options: ['3', '5', '10', '25'], correctIndex: 2 },
    ],
  },
  {
    id: 'photos',
    title: 'Photos that work',
    minutes: 4,
    videoUrl: null,
    summary: [
      'Real photos of the business, taken during the visit: logo or sign, branded vehicle, team, equipment, finished jobs.',
      'No stock images, no screenshots, no text added on top.',
      'Ask people before you photograph them.',
      'Landscape, well lit, in focus.',
    ],
    questions: [
      { id: 'photos-1', prompt: 'Which photo is fine to submit?', options: ['The owner’s branded truck, taken today', 'A stock image of a nice patio', 'A screenshot of a competitor’s work', 'A blurry photo of the sign'], correctIndex: 0 },
      { id: 'photos-2', prompt: 'Before photographing team members, you…', options: ['Ask for their consent', 'Blur their faces later', 'Take it quickly', 'Ask the owner only'], correctIndex: 0 },
      { id: 'photos-3', prompt: 'Can you add the business phone number as text on a photo?', options: ['Yes, it helps', 'No, never add text on photos', 'Only on the logo', 'Only in big cities'], correctIndex: 1 },
    ],
  },
  {
    id: 'verification',
    title: 'Helping with verification',
    minutes: 5,
    videoUrl: null,
    summary: [
      'Google decides how a profile is verified. Sometimes it asks for a short video.',
      'The owner records the video from their own account. Never from yours.',
      'A good video shows where the business is (street, signage), its equipment or branded vehicle, and proof the owner runs it (opening the shop, using the tools).',
      'If Google does not offer verification yet, select “Not offered yet”. That is normal.',
    ],
    questions: [
      { id: 'verif-1', prompt: 'Who records the verification video?', options: ['You, from your account', 'The owner, from their own account', `${BRAND_NAME} support`, 'Nobody, it is optional'], correctIndex: 1 },
      { id: 'verif-2', prompt: 'Google does not offer verification during your visit. What do you do?', options: ['Select “Not offered yet” and finish the visit', 'Leave without checking out', 'Ask the owner to pay for faster verification', 'Try from your own phone'], correctIndex: 0 },
      { id: 'verif-3', prompt: 'What should a verification video show?', options: ['Only the owner’s face', 'The location, the equipment, and proof the owner runs the business', 'Your ID card', 'The inside of your car'], correctIndex: 1 },
    ],
  },
  {
    id: 'rules',
    title: 'The rules',
    minutes: 4,
    videoUrl: null,
    summary: [
      `You never say you are from Google. You are an independent field agent with ${BRAND_NAME}.`,
      'You never ask for, type or write down an owner’s password.',
      'You never talk about or ask for reviews. Agents are never involved with reviews.',
      'The profile always uses the business’s real name and real address or service area.',
      'If something feels wrong, leave and contact support.',
    ],
    questions: [
      { id: 'rules-1', prompt: 'How do you introduce yourself?', options: ['“I’m from Google.”', '“I’m a Google partner.”', `“I’m a field agent with ${BRAND_NAME}, helping local contractors set up their free Google profile.”`, '“I’m calling on behalf of Google Maps.”'], correctIndex: 2 },
      { id: 'rules-2', prompt: 'The owner asks you to type their password for them.', options: ['Type it quickly', 'Hand the phone back and let them type it', 'Write it down for later', 'Ask them to text it to you'], correctIndex: 1 },
      { id: 'rules-3', prompt: 'The owner asks if you can leave them a 5-star review.', options: ['Agree, it helps them', 'Explain that agents never handle reviews', 'Ask a friend to do it', 'Do it after the visit'], correctIndex: 1 },
      { id: 'rules-4', prompt: 'Which business name goes on the profile?', options: ['The real name on their sign or license', 'Their name plus keywords like “Best Concrete Boston”', 'A shorter, catchier name', `${BRAND_NAME}’s name`], correctIndex: 0 },
    ],
  },
]

export function allQuestions(): QuizQuestion[] {
  return ACADEMY_MODULES.flatMap((m) => m.questions)
}

/** Questions sans les bonnes réponses, pour la page du quiz. */
export function quizForClient() {
  return ACADEMY_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    questions: m.questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
  }))
}
