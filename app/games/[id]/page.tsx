import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GameCard from '@/components/GameCard'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const BLOCKED_DATES = ['2026-06-27']

  const { data: game } = await supabase.from('games').select('*').eq('id', id).single()
  if (!game) notFound()
  if (BLOCKED_DATES.includes(game.game_date)) notFound()

  const gameDate = new Date(game.game_date + 'T12:00:00')
  const wednesday = new Date(gameDate)
  wednesday.setDate(gameDate.getDate() - 3)
  wednesday.setHours(0, 0, 0, 0)
  const registrationOpen = new Date() >= wednesday

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, profiles(id, full_name, phone)')
    .eq('game_id', id)
    .eq('is_active', true)
    .order('position', { ascending: true })

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*, profiles(id, full_name)')
    .eq('game_id', id)

  const mainList = registrations?.filter(r => r.list_type === 'main') ?? []
  const waitingList = registrations?.filter(r => r.list_type === 'waiting') ?? []
  const myReg = registrations?.find(r => r.user_id === user.id) ?? null
  const myAttendance = attendance?.find(a => a.user_id === user.id) ?? null

  return (
    <div>
      <Navbar userName={profile?.full_name ?? user.email ?? 'Player'} isAdmin={profile?.is_admin ?? false} />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-8">
        <GameCard
          game={game}
          mainList={mainList}
          waitingList={waitingList}
          attendance={attendance ?? []}
          currentUserId={user.id}
          myRegistration={myReg}
          myAttendance={myAttendance}
          registrationOpen={registrationOpen}
        />
      </main>
    </div>
  )
}
