import { beforeEach } from 'vitest'
import { memorySmsDriver, setSmsDriver } from '@/modules/sms/driver'

// Chaque test part d'une boîte d'envoi SMS vide, sans jamais appeler Twilio.
beforeEach(() => {
  memorySmsDriver.sent.length = 0
  setSmsDriver(memorySmsDriver)
})
