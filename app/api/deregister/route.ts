import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendSpotAvailableEmail } from '@/lib/email'
import { format } from 'date-fns'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await req.json()

  const { data: reg } = await supabase
    .from('registrations')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!reg) return NextResponse.json({ error: 'Not registered' }, { status: 404 })

  const wasOnMainList = reg.list_type === 'main'
  const leavingPosition = reg.position

  // Deactivate the registration
  await supabase
    .from('registrations')
    .update({ is_active: false, deregistered_at: new Date().toISOString() })
    .eq('id', reg.id)

  if (wasOnMainList) {
    // Shift remaining main list positions down
    const { data: mainAfter } = await supabase
      .from('registrations')
      .select('id, position')
      .eq('game_id', gameId)
      .eq('list_type', 'main')
      .eq('is_active', true)
      .gt('position', leavingPosition)

    for (const r of mainAfter ?? []) {
      await supabase.from('registrations').update({ position: r.position - 1 }).eq('id', r.id)
    }

    // Get all waiting list players and email them all simultaneously
    const { data: waitingList } = await supabase
      .from('registrations')
      .select('user_id, profiles(id, full_name)')
      .eq('game_id', gameId)
      .eq('list_type', 'waiting')
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (waitingList?.length) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: game } = await supabase.from('games').select('game_date').eq('id', gameId).single()
      const friendlyDate = game ? format(new Date(game.game_date + 'T12:00:00'), 'EEEE, MMMM d') : 'this Saturday'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

      // Email all waiting list players at once — first to click claims the spot
      await Promise.all(
        waitingList.map(async (entry) => {
          const { data: authUser } = await serviceSupabase.auth.admin.getUserById(entry.user_id)
          const email = authUser.user?.email
          const name = (entry.profiles as any)?.full_name ?? 'Player'
          if (email) {
            await sendSpotAvailableEmail(email, name, friendlyDate, appUrl)
          }
        })
      )
    }
  } else {
    // Player was on waiting list — just shift positions down
    const { data: waitingAfter } = await supabase
      .from('registrations')
      .select('id, position')
      .eq('game_id', gameId)
      .eq('list_type', 'waiting')
      .eq('is_active', true)
      .gt('position', leavingPosition)

    for (const r of waitingAfter ?? []) {
      await supabase.from('registrations').update({ position: r.position - 1 }).eq('id', r.id)
    }
  }

  return NextResponse.json({ success: true })
}
