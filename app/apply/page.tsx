import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { ApplyForm } from './apply-form'
import '@/app/agent/agent.css'

export const metadata: Metadata = { title: `Apply · ${BRAND_NAME}`, robots: { index: false } }

export default function ApplyPage() {
  return (
    <div className="mc mc-app" data-theme="light">
      <ApplyForm />
    </div>
  )
}
