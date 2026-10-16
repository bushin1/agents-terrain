import { PageHeader } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/lib/session'
import { MAX_IMPORT_ROWS } from '@/modules/missions'
import { ImportForm } from './import-form'

export default async function ImportProsPage() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Importer des pros" back={{ href: '/admin/pros', label: 'Pros' }} />
      <div className="mb-6 max-w-3xl space-y-2 text-sm text-gray-700">
        <p>
          Colonnes : <code>business_name</code>, <code>contact_name</code> (facultatif), <code>phone</code>, <code>address</code>, <code>city</code>,{' '}
          <code>state</code>, <code>zip</code>, <code>trade</code>. Les en-têtes d’un export Sheets ou Excel (« Business Name ») sont acceptés.
        </p>
        <p>
          Chaque ligne devient un pro « à appeler », géocodé depuis son adresse (environ 1 s par ligne). Les téléphones déjà connus sont ignorés.{' '}
          {MAX_IMPORT_ROWS} lignes au plus par import.
        </p>
      </div>
      <ImportForm />
    </>
  )
}
