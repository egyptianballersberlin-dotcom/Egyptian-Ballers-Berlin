import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { gameId, userId, listType } = await req.json()

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if already registered
  const { data: existing } = await serviceSupabase
    .from('registrations')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (existing) return NextResponse.json({ error: 'Player already registered' }, { status: 400 })

  const { data: game } = await serviceSupabase.from('games').select('max_players').eq('id', gameId).single()
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const { count: mainCount } = await serviceSupabase
    .from('registrations').select('id', { count: 'exact' })
    .eq('game_id', gameId).eq('list_type', 'main').eq('is_active', true)

  const { count: waitingCount } = await serviceSupabase
    .from('registrations').select('id', { count: 'exact' })
    .eq('game_id', gameId).eq('list_type', 'waiting').eq('is_active', true)

  const resolvedListType = listType ?? ((mainCount ?? 0) < game.max_players ? 'main' : 'waiting')
  const position = resolvedListType === 'main' ? (mainCount ?? 0) + 1 : (waitingCount ?? 0) + 1

  const { data: registration, error } = await serviceSupabase
    .from('registrations')
    .insert({ game_id: gameId, user_id: userId, list_type: resolvedListType, position })
    .select('*, profiles(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registration })
}
