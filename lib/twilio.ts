import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendWhatsAppNotification(to: string, message: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio not configured, skipping WhatsApp:', message)
    return
  }
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: `whatsapp:${to}`,
      body: message,
    })
  } catch (err) {
    console.error('WhatsApp send error:', err)
  }
}
