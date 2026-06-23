import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function GamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const BLOCKED_DATES = ['2026-06-27']

  const { data: allGames } = await supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false })
    .limit(20)

  const games = allGames?.filter(g => !BLOCKED_DATES.includes(g.game_date))

  const gameIds = games?.map(g => g.id) ?? []
  const { data: regCounts } = await supabase
    .from('registrations')
    .select('game_id, list_type, user_id')
    .in('game_id', gameIds)
    .eq('is_active', true)

  const { data: attCounts } = await supabase
    .from('attendance')
    .select('game_id, checked_in')
    .in('game_id', gameIds)
    .eq('checked_in', true)

  return (
    <div>
      <Navbar userName={profile?.full_name ?? user.email ?? 'Player'} isAdmin={profile?.is_admin ?? false} />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Games</h1>
        <div className="space-y-3">
          {games?.map(game => {
            const mainCount = regCounts?.filter(r => r.game_id === game.id && r.list_type === 'main').length ?? 0
            const waitingCount = regCounts?.filter(r => r.game_id === game.id && r.list_type === 'waiting').length ?? 0
            const checkedIn = attCounts?.filter(a => a.game_id === game.id).length ?? 0
            const myReg = regCounts?.find(r => r.game_id === game.id && r.user_id === user.id)

            return (
              <Link key={game.id} href={`/games/${game.id}`}>
                <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {format(new Date(game.game_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {mainCount}/{game.max_players} players
                      {waitingCount > 0 && ` · ${waitingCount} waiting`}
                      {game.status === 'completed' && ` · ${checkedIn} attended`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {myReg && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${myReg.list_type === 'main' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {myReg.list_type === 'main' ? 'Registered' : 'Waiting'}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${game.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : game.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                      {game.status}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
