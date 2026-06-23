import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { registrationId } = await req.json()

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reg } = await serviceSupabase
    .from('registrations').select('*').eq('id', registrationId).single()

  if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  await serviceSupabase.from('registrations')
    .update({ is_active: false, deregistered_at: new Date().toISOString() })
    .eq('id', registrationId)

  // Shift positions
  const { data: after } = await serviceSupabase
    .from('registrations').select('id, position')
    .eq('game_id', reg.game_id).eq('list_type', reg.list_type).eq('is_active', true)
    .gt('position', reg.position)

  for (const r of after ?? []) {
    await serviceSupabase.from('registrations').update({ position: r.position - 1 }).eq('id', r.id)
  }

  return NextResponse.json({ success: true })
}
