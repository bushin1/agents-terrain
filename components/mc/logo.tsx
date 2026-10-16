import { BRAND_NAME } from '@/lib/brand'
import { PIN_BODY_PATH } from './pin'

// Marque provisoire : le pin de marque à côté du nom en Bricolage Grotesque 800. Port de MapCrew.logo.
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <a className="lp-logo" href={href} aria-label={`${BRAND_NAME} home`}>
      <svg className="lp-logo__mark" viewBox="0 0 34 44" aria-hidden="true">
        <path className="p-body" d={PIN_BODY_PATH} />
        <circle className="p-eye" cx="17" cy="16.5" r="5.5" />
      </svg>
      <span>{BRAND_NAME}</span>
    </a>
  )
}
