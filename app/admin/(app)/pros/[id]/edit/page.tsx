import { notFound } from 'next/navigation'
import { PageHeader } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/lib/session'
import { getPro } from '@/modules/missions'
import { updateProAction } from '../../actions'
import { ProForm } from '../../pro-form'

export default async function EditProPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const pro = await getPro((await params).id)
  if (!pro) notFound()
  const initial = {
    proId: pro.id, businessName: pro.businessName, contactName: pro.contactName ?? '', phone: pro.phone,
    address: pro.address, city: pro.city, state: pro.state, zip: pro.zip, trade: pro.trade, timeZone: pro.timeZone,
    lat: pro.lat?.toString() ?? '', lng: pro.lng?.toString() ?? '', existingPlaceId: pro.existingPlaceId ?? '', notes: pro.notes ?? '',
  }
  return (
    <>
      <PageHeader title={`Modifier ${pro.businessName}`} back={{ href: `/admin/pros/${pro.id}`, label: pro.businessName }} />
      <ProForm action={updateProAction} initial={initial} submitLabel="Enregistrer" />
    </>
  )
}
