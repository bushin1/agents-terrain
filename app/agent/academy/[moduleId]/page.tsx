import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { requireAgentIn } from '@/lib/agent-guard'
import { ACADEMY_MODULES } from '@/modules/academy'

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  await requireAgentIn(['TRAINING', 'CERTIFIED', 'ACTIVE'])
  const { moduleId } = await params
  const i = ACADEMY_MODULES.findIndex((m) => m.id === moduleId)
  if (i < 0) notFound()
  const m = ACADEMY_MODULES[i]
  const next = ACADEMY_MODULES[i + 1]
  return (
    <>
      <AppBar title={`Leçon ${i + 1} sur ${ACADEMY_MODULES.length}`} back="/agent/academy" />
      <main className="mc-scroll">
        <h1 className="h1">{m.title}</h1>
        {m.videoUrl ? (
          <video src={m.videoUrl} controls playsInline style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginTop: 16 }} />
        ) : (
          <p className="mc-badge mc-badge--outline" style={{ marginTop: 12 }}><Icon name="video" /> Vidéo bientôt disponible</p>
        )}
        <ul className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {m.summary.map((line) => (
            <li key={line} className="mc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--success)' }}><Icon name="check" /></span>
              <span style={{ fontSize: 15, lineHeight: '22px' }}>{line}</span>
            </li>
          ))}
        </ul>
      </main>
      <div className="mc-bottom">
        <Link href={next ? `/agent/academy/${next.id}` : '/agent/academy/quiz'} className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">
          {next ? `Suivant : ${next.title}` : 'Commencer le quiz'}
        </Link>
      </div>
    </>
  )
}
