import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { XP_ATTENDED, XP_NO_SHOW, XP_ABSENT } from '@/lib/gamification'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { gameId } = await req.json()

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Mark game as completed
  await serviceSupabase.from('games').update({ status: 'completed' }).eq('id', gameId)

  // Get all registered players (main list only)
  const { data: mainRegs } = await serviceSupabase
    .from('registrations')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('list_type', 'main')
    .eq('is_active', true)

  // Get attendance
  const { data: attendanceRecords } = await serviceSupabase
    .from('attendance')
    .select('user_id, checked_in')
    .eq('game_id', gameId)

  // Get ALL players
  const { data: allProfiles } = await serviceSupabase
    .from('profiles')
    .select('id, xp, consecutive_misses, is_banned, banned_until_game_id, total_red_cards, is_permanently_banned')

  const registeredIds = new Set(mainRegs?.map(r => r.user_id) ?? [])
  const attendedIds = new Set(
    attendanceRecords?.filter(a => a.checked_in).map(a => a.user_id) ?? []
  )

  const results = []

  // Next upcoming game for red card bans
  const { data: nextGame } = await serviceSupabase
    .from('games')
    .select('id')
    .eq('status', 'upcoming')
    .gt('game_date', new Date().toISOString().split('T')[0])
    .order('game_date', { ascending: true })
    .limit(1)
    .single()

  for (const p of allProfiles ?? []) {
    const registered = registeredIds.has(p.id)
    const attended = attendedIds.has(p.id)

    // Skip permanently banned players — they can't earn/lose XP
    if (p.is_permanently_banned) continue

    let xpChange = 0
    let newMisses = p.consecutive_misses
    let newBanned = p.is_banned
    let bannedUntilGameId = p.banned_until_game_id
    let totalRedCards = p.total_red_cards ?? 0
    let isPermanentlyBanned = false

    if (attended) {
      xpChange = XP_ATTENDED
      newMisses = 0
      newBanned = false
      bannedUntilGameId = null
    } else if (registered) {
      xpChange = XP_NO_SHOW
      newMisses = p.consecutive_misses + 1
      if (newMisses >= 2) {
        totalRedCards += 1
        if (totalRedCards >= 3) {
          // 3rd red card — permanent ban
          isPermanentlyBanned = true
          newBanned = false
          bannedUntilGameId = null
        } else {
          newBanned = true
          bannedUntilGameId = nextGame?.id ?? null
        }
      }
    } else {
      xpChange = 0
    }

    const newXp = Math.max(0, p.xp + xpChange)

    await serviceSupabase.from('profiles').update({
      xp: newXp,
      consecutive_misses: newMisses,
      is_banned: newBanned,
      banned_until_game_id: bannedUntilGameId,
      total_red_cards: totalRedCards,
      is_permanently_banned: isPermanentlyBanned,
    }).eq('id', p.id)

    const outcome = attended ? 'attended' : registered ? 'no-show' : 'absent'
    results.push({ userId: p.id, outcome, xpChange, newXp, newMisses, totalRedCards, isPermanentlyBanned })
  }

  // Lift bans for players whose ban was specifically for THIS game
  await serviceSupabase
    .from('profiles')
    .update({ is_banned: false, banned_until_game_id: null })
    .eq('banned_until_game_id', gameId)
    .eq('is_banned', true)

  return NextResponse.json({ success: true, results })
}
