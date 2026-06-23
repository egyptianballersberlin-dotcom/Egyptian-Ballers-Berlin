import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await req.json()

  // Check if already registered
  const { data: existing } = await supabase
    .from('registrations')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

  // Check if banned
  const { data: playerProfile } = await supabase
    .from('profiles')
    .select('is_banned, banned_until_game_id, is_permanently_banned')
    .eq('id', user.id)
    .single()

  if (playerProfile?.is_permanently_banned) {
    return NextResponse.json(
      { error: '🚫 أنت محظور بشكل دائم. للعودة للعب، تبرع بـ €50 لعمل خيري وتواصل مع الأدمن.' },
      { status: 403 }
    )
  }

  if (playerProfile?.is_banned && playerProfile?.banned_until_game_id === gameId) {
    return NextResponse.json(
      { error: '🟥 You have a red card and are banned from this game. You can register again next week.' },
      { status: 403 }
    )
  }

  // Get game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  // Block specific dates
  const BLOCKED_DATES = ['2026-06-27']
  if (BLOCKED_DATES.includes(game.game_date)) {
    return NextResponse.json({ error: 'This game has been cancelled. No registrations allowed.' }, { status: 403 })
  }

  // Registration only opens on Wednesday of that week
  const gameDate = new Date(game.game_date + 'T12:00:00')
  const wednesday = new Date(gameDate)
  wednesday.setDate(gameDate.getDate() - 10) // Saturday - 10 days = Wednesday of previous week
  wednesday.setHours(0, 0, 0, 0)
  const now = new Date()
  if (now < wednesday) {
    const wedStr = wednesday.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    return NextResponse.json(
      { error: `⏳ Registration not open yet. It opens on ${wedStr}.` },
      { status: 403 }
    )
  }

  // Count current main list
  const { count: mainCount } = await supabase
    .from('registrations')
    .select('id', { count: 'exact' })
    .eq('game_id', gameId)
    .eq('list_type', 'main')
    .eq('is_active', true)

  const { count: waitingCount } = await supabase
    .from('registrations')
    .select('id', { count: 'exact' })
    .eq('game_id', gameId)
    .eq('list_type', 'waiting')
    .eq('is_active', true)

  const isMain = (mainCount ?? 0) < game.max_players
  const listType = isMain ? 'main' : 'waiting'
  const position = isMain ? (mainCount ?? 0) + 1 : (waitingCount ?? 0) + 1

  const { data: registration, error } = await supabase
    .from('registrations')
    .insert({
      game_id: gameId,
      user_id: user.id,
      list_type: listType,
      position,
    })
    .select('*, profiles(id, full_name, phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ registration })
}
