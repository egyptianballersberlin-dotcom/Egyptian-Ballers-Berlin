import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await req.json()

  const { data: attendance, error } = await supabase
    .from('attendance')
    .upsert({
      game_id: gameId,
      user_id: user.id,
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    }, { onConflict: 'game_id,user_id' })
    .select('*, profiles(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ attendance })
}
