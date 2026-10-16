import { revalidatePath } from 'next/cache'
import { actionError, type ActionState } from './forms'

/** Exécute une mutation, renvoie l'erreur affichable ou le message de succès, et rafraîchit le back-office. */
export async function runAction(task: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await task()
  } catch (e) {
    return { error: actionError(e) }
  }
  revalidatePath('/admin', 'layout')
  return { ok }
}
