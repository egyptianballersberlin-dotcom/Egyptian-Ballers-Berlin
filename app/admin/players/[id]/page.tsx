import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PlayerBadge from '@/components/PlayerBadge'
import { getLevel, getCardStatus, LEVELS, XP_ATTENDED, XP_NO_SHOW } from '@/lib/gamification'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function PlayerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!adminProfile?.is_admin) redirect('/')

  const { data: player } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!player) notFound()

  // All completed games
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'completed')
    .order('game_date', { ascending: false })

  const gameIds = games?.map(g => g.id) ?? []

  const { data: registrations } = await supabase
    .from('registrations')
    .select('game_id, list_type, registered_at, deregistered_at, is_active')
    .eq('user_id', id)
    .in('game_id', gameIds.length ? gameIds : ['none'])

  const { data: attendance } = await supabase
    .from('attendance')
    .select('game_id, checked_in, checked_in_at')
    .eq('user_id', id)
    .in('game_id', gameIds.length ? gameIds : ['none'])

  const level = getLevel(player.xp ?? 0)
  const card = getCardStatus(player.consecutive_misses ?? 0, player.is_banned ?? false)

  // Build game-by-game history
  const history = games?.map(game => {
    const reg = registrations?.find(r => r.game_id === game.id)
    const att = attendance?.find(a => a.game_id === game.id)

    let status: 'attended' | 'no-show' | 'not-registered' | 'waiting' | 'deregistered'
    let xpChange = 0

    if (!reg) {
      status = 'not-registered'
    } else if (!reg.is_active && reg.deregistered_at) {
      status = 'deregistered'
    } else if (reg.list_type === 'waiting') {
      status = 'waiting'
    } else if (att?.checked_in) {
      status = 'attended'
      xpChange = XP_ATTENDED
    } else {
      status = 'no-show'
      xpChange = XP_NO_SHOW
    }

    return { game, status, xpChange, checkedInAt: att?.checked_in_at }
  }) ?? []

  const totalAttended = history.filter(h => h.status === 'attended').length
  const totalRegistered = history.filter(h => h.status === 'attended' || h.status === 'no-show').length
  const showRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : null

  const statusConfig = {
    attended:       { label: 'Attended',       bg: 'bg-green-50',  text: 'text-green-700',  icon: '✅' },
    'no-show':      { label: 'No-show',         bg: 'bg-red-50',    text: 'text-red-700',    icon: '❌' },
    'not-registered': { label: 'Not registered', bg: 'bg-gray-50',   text: 'text-gray-500',   icon: '—'  },
    waiting:        { label: 'Waiting list',    bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
    deregistered:   { label: 'Deregistered',    bg: 'bg-orange-50', text: 'text-orange-700', icon: '🚫' },
  }

  return (
    <div>
      <Navbar userName={adminProfile.full_name} isAdmin={true} />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-4">

        {/* Back */}
        <Link href="/admin" className="text-sm text-green-600 hover:underline">← Back to Admin</Link>

        {/* Player header */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{player.full_name}</h1>
                <PlayerBadge xp={player.xp ?? 0} consecutiveMisses={player.consecutive_misses ?? 0} isBanned={player.is_banned ?? false} showXp />
              </div>
              <div className={`text-lg font-semibold ${level.color}`}>{level.icon} {level.name}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{player.xp ?? 0}</div>
              <div className="text-sm text-gray-500">XP</div>
            </div>
          </div>

          {/* XP progress bar */}
          {(() => {
            const currentLevel = level
            const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1]
            if (!nextLevel) return (
              <div className="mt-4 text-sm text-purple-600 font-medium">👑 Maximum level reached</div>
            )
            const progress = Math.round(((player.xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100)
            return (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to {nextLevel.icon} {nextLevel.name}</span>
                  <span>{nextLevel.minXp - (player.xp ?? 0)} XP to go</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )
          })()}

          {/* Card status */}
          {card && (
            <div className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${card.type === 'red' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {card.icon} {card.label}
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 text-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{totalRegistered}</div>
              <div className="text-xs text-gray-500">Registered</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalAttended}</div>
              <div className="text-xs text-gray-500">Attended</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{showRate ?? '—'}{showRate !== null ? '%' : ''}</div>
              <div className="text-xs text-gray-500">Show rate</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{player.consecutive_misses ?? 0}</div>
              <div className="text-xs text-gray-500">Streak misses</div>
            </div>
          </div>
        </div>

        {/* Game history */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Game History ({history.length} games)</h2>
          </div>
          {history.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No completed games yet</div>
          )}
          <div className="divide-y divide-gray-100">
            {history.map(({ game, status, xpChange, checkedInAt }) => {
              const cfg = statusConfig[status]
              return (
                <div key={game.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">
                      {format(new Date(game.game_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                    </div>
                    {checkedInAt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Checked in at {format(new Date(checkedInAt), 'HH:mm')}
                      </div>
                    )}
                  </div>
                  <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon} {cfg.label}
                  </div>
                  {xpChange !== 0 && (
                    <div className={`text-sm font-bold w-14 text-right ${xpChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {xpChange > 0 ? '+' : ''}{xpChange} XP
                    </div>
                  )}
                  {xpChange === 0 && <div className="w-14" />}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
