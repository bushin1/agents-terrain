import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { addPhoto } from '@/modules/missions'

const num = (v: FormDataEntryValue | null) => (typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

export async function POST(req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonError(400, 'Invalid form data')
  }
  const file = form.get('file')
  if (!(file instanceof File)) return jsonError(400, 'Missing file')
  const { id } = await params
  return visitResponse(
    await addPhoto(agent, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      category: String(form.get('category') ?? ''),
      clientAt: String(form.get('clientAt') ?? ''),
      exifTakenAt: typeof form.get('exifTakenAt') === 'string' ? String(form.get('exifTakenAt')) || null : null,
      exifLat: num(form.get('exifLat')),
      exifLng: num(form.get('exifLng')),
    }),
  )
}
