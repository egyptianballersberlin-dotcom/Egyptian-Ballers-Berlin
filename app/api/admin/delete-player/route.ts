import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (userId === user.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Delete in order: attendance → registrations → profile → auth user
  await serviceSupabase.from('attendance').delete().eq('user_id', userId)
  await serviceSupabase.from('registrations').delete().eq('user_id', userId)
  await serviceSupabase.from('profiles').delete().eq('id', userId)
  await serviceSupabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ success: true })
}
