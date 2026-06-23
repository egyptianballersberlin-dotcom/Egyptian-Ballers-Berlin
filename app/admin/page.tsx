import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AdminGamePanel from '@/components/AdminGamePanel'
import PlayerBadge from '@/components/PlayerBadge'
import { getLevel, getCardStatus } from '@/lib/gamification'
import Link from 'next/link'
import LiftBanButton from '@/components/LiftBanButton'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .order('game_date', { ascending: false })
    .limit(10)

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, xp, consecutive_misses, is_banned, total_red_cards, is_permanently_banned')
    .order('xp', { ascending: false })

  const gameIds = games?.map(g => g.id) ?? []
  const { data: allRegistrations } = await supabase
    .from('registrations')
    .select('*, profiles(id, full_name)')
    .in('game_id', gameIds)
    .eq('is_active', true)
    .order('position', { ascending: true })

  const { data: allAttendance } = await supabase
    .from('attendance')
    .select('game_id, user_id, checked_in')
    .in('game_id', gameIds)

  // Per-player stats
  const playerStats = allProfiles?.map(p => {
    const regs = allRegistrations?.filter(r => r.user_id === p.id && r.list_type === 'main') ?? []
    const attended = allAttendance?.filter(a => a.user_id === p.id && a.checked_in) ?? []
    const gamesRegistered = regs.length
    const gamesAttended = attended.length
    const showRate = gamesRegistered > 0 ? Math.round((gamesAttended / gamesRegistered) * 100) : null
    const level = getLevel(p.xp ?? 0)
    const card = getCardStatus(p.consecutive_misses ?? 0, p.is_banned ?? false, p.is_permanently_banned ?? false)
    return { ...p, gamesRegistered, gamesAttended, showRate, level, card }
  }) ?? []

  return (
    <div>
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin ?? false} />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">ADMIN</span>
        </div>

        {/* Players overview */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">All Players ({playerStats.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {playerStats.map((p, i) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-gray-400 text-sm w-6 font-mono">{i + 1}</span>
                <PlayerBadge xp={p.xp ?? 0} consecutiveMisses={p.consecutive_misses ?? 0} isBanned={p.is_banned ?? false} isPermanentlyBanned={p.is_permanently_banned ?? false} />
                <div className="flex-1">
                  <Link href={`/admin/players/${p.id}`} className="font-medium text-gray-900 text-sm hover:text-green-600 hover:underline">
                    {p.full_name}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {p.gamesRegistered} registered · {p.gamesAttended} attended · {p.showRate ?? '—'}% show rate
                    {(p.total_red_cards ?? 0) > 0 && <span className="ml-1 text-red-500">· {p.total_red_cards} 🟥</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${p.level.color}`}>{p.level.icon} {p.level.name}</div>
                  <div className="text-xs text-gray-500">{p.xp ?? 0} XP</div>
                </div>
                {p.is_permanently_banned ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                      🚫 Perm ban
                    </div>
                    <LiftBanButton userId={p.id} />
                  </div>
                ) : p.card && (
                  <div className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${p.card.type === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.card.icon} {p.card.type === 'red' ? 'Red card' : 'Yellow card'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Games */}
        <h2 className="font-bold text-gray-900 text-lg">Games</h2>
        {games?.map(game => (
          <AdminGamePanel
            key={game.id}
            game={game}
            registrations={allRegistrations?.filter(r => r.game_id === game.id) ?? []}
            allProfiles={allProfiles ?? []}
          />
        ))}
      </main>
    </div>
  )
}
