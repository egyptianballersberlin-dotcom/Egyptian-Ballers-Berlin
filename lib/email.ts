import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const FROM = `Saturday Football <${process.env.GMAIL_USER}>`

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('Gmail not configured, skipping email to', to)
    return
  }
  await transporter.sendMail({ from: FROM, to, subject, html })
}

export async function sendSpotAvailableEmail(to: string, name: string, gameDate: string, appUrl: string) {
  await sendEmail(
    to,
    '🟢 A spot just opened — claim it now!',
    `
      <p>Hi ${name},</p>
      <p>A player just dropped out of Saturday football on <strong>${gameDate}</strong> and a spot is now available!</p>
      <p><strong>First person to claim it gets it.</strong></p>
      <p>
        <a href="${appUrl}" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          Claim your spot now
        </a>
      </p>
      <p style="color:#888;font-size:12px;">This email was sent to everyone on the waiting list. Only one person can claim the spot.</p>
    `
  )
}

export async function sendRegistrationOpenEmail(to: string, name: string, gameDate: string, appUrl: string) {
  await sendEmail(
    to,
    `⚽ Registration is open — Saturday ${gameDate}`,
    `
      <p>Hi ${name},</p>
      <p>Registration is now open for <strong>Saturday football on ${gameDate}</strong>!</p>
      <p>Spots fill up fast — max 24 players, first come first served.</p>
      <p>
        <a href="${appUrl}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Sign up now
        </a>
      </p>
      <p style="color:#888;font-size:12px;">You're receiving this because you have an account on the Saturday Football app.</p>
    `
  )
}
