import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendRegistrationOpenEmail } from '@/lib/email'
import { format, nextSaturday, isSaturday } from 'date-fns'

// Called every Wednesday at 8am UTC by Vercel Cron (see vercel.json)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ensure next Saturday's game exists
  const today = new Date()
  const satDate = isSaturday(today) ? today : nextSaturday(today)
  const satStr = format(satDate, 'yyyy-MM-dd')
  const friendlyDate = format(satDate, 'EEEE, MMMM d')

  let { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('game_date', satStr)
    .single()

  if (!game) {
    const { data: newGame } = await supabase
      .from('games')
      .insert({ game_date: satStr })
      .select('id')
      .single()
    game = newGame
  }

  // Get all auth users (has emails) joined with their profile name
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const { data: profiles } = await supabase.from('profiles').select('id, full_name')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'your-app-url'
  let sent = 0

  for (const u of users ?? []) {
    if (!u.email) continue
    const profile = profiles?.find(p => p.id === u.id)
    const name = profile?.full_name ?? u.email
    await sendRegistrationOpenEmail(u.email, name, friendlyDate, appUrl)
    sent++
  }

  return NextResponse.json({ sent, gameDate: satStr })
}
