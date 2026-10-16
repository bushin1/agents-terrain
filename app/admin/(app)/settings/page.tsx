import { PageHeader } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/lib/session'
import { getSettings } from '@/modules/settings'
import { SettingsForm } from './settings-form'
import { settingsToFormDefaults } from './settings-form-data'

export default async function SettingsPage() {
  await requireAdmin(['ADMIN'])
  const settings = await getSettings()
  return (
    <>
      <PageHeader title="Réglages" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-gray-600">
        Montants versés aux agents (saisis en dollars, enregistrés en cents), bonus de niveau et rayon du bouton « Élargir ». Chaque enregistrement est tracé dans le journal.
      </p>
      <SettingsForm defaults={settingsToFormDefaults(settings)} />
    </>
  )
}
