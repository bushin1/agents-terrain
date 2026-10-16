import { PageHeader } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/lib/session'
import { createProAction } from '../actions'
import { ProForm } from '../pro-form'

export default async function NewProPage() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Nouveau pro" back={{ href: '/admin/pros', label: 'Pros' }} />
      <ProForm action={createProAction} initial={{}} submitLabel="Créer le pro" />
    </>
  )
}
