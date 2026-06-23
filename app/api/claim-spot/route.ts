import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await req.json()

  // Call the atomic DB function — handles locking and race conditions
  const { data, error } = await supabase.rpc('claim_spot', {
    p_game_id: gameId,
    p_user_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    return NextResponse.json(
      { error: 'Sorry, the spot was already claimed by someone else.' },
      { status: 409 }
    )
  }

  // Return the updated registration so the UI can refresh
  const { data: registration } = await supabase
    .from('registrations')
    .select('*, profiles(id, full_name)')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return NextResponse.json({ registration })
}
