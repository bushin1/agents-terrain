import { expect, test } from '@playwright/test'
import { AGENT_PHONE, forceLatestOtp, seed, validateAsTeam } from './helpers'

test('agent : connexion, acceptation, visite complète, validation, gain visible', async ({ page }) => {
  const { missionId } = await seed()

  // Connexion par code SMS
  await page.goto('/login')
  await page.getByLabel('Mobile number').fill('(617) 555-0100')
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByRole('heading', { name: 'Check your texts' })).toBeVisible()
  await forceLatestOtp(AGENT_PHONE, '246810')
  await page.getByLabel('Digit 1').fill('246810') // un collage remplit les 6 cases
  await page.getByRole('button', { name: 'Verify' }).click()
  await page.waitForURL('**/agent/missions')

  // Acceptation
  await page.getByRole('link', { name: /Concrete contractor/ }).first().click()
  await expect(page.getByText('The owner agreed to this visit')).toBeVisible()
  await page.getByRole('button', { name: 'Accept mission' }).click()
  await expect(page.getByText('Delgado Concrete & Masonry Restoration Services LLC')).toBeVisible()
  await page.getByRole('link', { name: 'Start visit' }).click()

  // Checklist
  await page.getByRole('button', { name: 'Check in here' }).click()
  await expect(page.getByRole('button', { name: /^Check in/ })).toContainText('Done')
  const pad = page.getByRole('img', { name: /Signature area/ })
  await pad.evaluate((el) => el.scrollIntoView({ block: 'center' })) // la barre « Submit visit » fixée en bas masquerait le bas de la zone
  const box = (await pad.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 90)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 })
  await page.mouse.move(box.x + 220, box.y + 120, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save signature' }).click()
  await page.getByRole('button', { name: 'Save profile details' }).click()
  await page.getByRole('button', { name: 'Owner sent the invite' }).click()

  // 10 photos : un vrai JPEG produit par le navigateur (décodable par createImageBitmap)
  const jpeg = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 48
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#1f3b2f'
    ctx.fillRect(0, 0, 64, 48)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  const files = Array.from({ length: 10 }, (_, i) => ({ name: `p${i}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(jpeg) }))
  await page.locator('input[type="file"]').setInputFiles(files)
  await expect(page.getByRole('button', { name: /^Photos/ })).toContainText('Done') // l'étape se referme dès que les 10 photos sont envoyées

  await page.getByText('Not offered yet').click()
  await page.getByRole('button', { name: 'Save verification' }).click()
  await page.getByRole('button', { name: 'Check out now' }).click()
  await expect(page.getByText('All steps done. Ready to submit.')).toBeVisible()
  await page.getByRole('button', { name: 'Submit visit' }).click()
  await page.waitForURL(`**/agent/missions/${missionId}`)
  await expect(page.getByText('Payout steps')).toBeVisible()

  // Validation par l'équipe, puis le gain apparaît
  await validateAsTeam(missionId)
  await page.goto('/agent/earnings')
  await expect(page.getByText('$40.00').first()).toBeVisible()
})
