import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getLevel, getCardStatus, LEVELS, XP_ATTENDED, XP_NO_SHOW } from '@/lib/gamification'
import { format } from 'date-fns'

const statusConfig = {
  attended:         { label: 'Attended',        bg: 'bg-green-50',  text: 'text-green-700',  icon: '✅' },
  'no-show':        { label: 'No-show',          bg: 'bg-red-50',    text: 'text-red-700',    icon: '❌' },
  'not-registered': { label: 'Not registered',   bg: 'bg-gray-50',   text: 'text-gray-400',   icon: '—'  },
  waiting:          { label: 'Waiting list',     bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
  deregistered:     { label: 'Deregistered',     bg: 'bg-orange-50', text: 'text-orange-700', icon: '🔄' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'completed')
    .order('game_date', { ascending: false })

  const gameIds = games?.map(g => g.id) ?? []

  const { data: registrations } = await supabase
    .from('registrations')
    .select('game_id, list_type, registered_at, deregistered_at, is_active')
    .eq('user_id', user.id)
    .in('game_id', gameIds.length ? gameIds : ['none'])

  const { data: attendance } = await supabase
    .from('attendance')
    .select('game_id, checked_in, checked_in_at')
    .eq('user_id', user.id)
    .in('game_id', gameIds.length ? gameIds : ['none'])

  const level = getLevel(profile.xp ?? 0)
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1] ?? null
  const progress = nextLevel
    ? Math.round(((profile.xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100)
    : 100
  const card = getCardStatus(profile.consecutive_misses ?? 0, profile.is_banned ?? false, profile.is_permanently_banned ?? false)

  const history = games?.map(game => {
    const reg = registrations?.find(r => r.game_id === game.id)
    const att = attendance?.find(a => a.game_id === game.id)
    let status: keyof typeof statusConfig
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

  return (
    <div>
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin ?? false} />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-4">

        {/* Profile header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Green hero */}
          <div className="bg-gradient-to-br from-green-700 to-green-600 px-6 pt-6 pb-8 text-white relative">
            <div className="absolute right-4 top-4 text-7xl opacity-10 select-none">{level.icon}</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-3xl font-black text-white shadow-lg">
                {profile.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-0.5">My Profile</div>
                <div className="text-2xl font-extrabold tracking-tight">{profile.full_name}</div>
                <div className={`text-sm font-semibold text-green-100 mt-0.5`}>{level.icon} {level.name}</div>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                {nextLevel ? (
                  <>
                    <div className="text-xs text-green-200 mb-1.5">Progress to {nextLevel.icon} {nextLevel.name}</div>
                    <div className="w-48 bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-green-200 mt-1">{nextLevel.minXp - (profile.xp ?? 0)} XP to go</div>
                  </>
                ) : (
                  <div className="text-sm text-green-200 font-semibold">👑 Maximum level reached!</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-4xl font-black">{profile.xp ?? 0}</div>
                <div className="text-green-200 text-xs font-semibold">XP</div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{totalRegistered}</div>
              <div className="text-xs text-gray-400 mt-0.5">Registered</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{totalAttended}</div>
              <div className="text-xs text-gray-400 mt-0.5">Attended</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{showRate ?? '—'}{showRate !== null ? '%' : ''}</div>
              <div className="text-xs text-gray-400 mt-0.5">Show rate</div>
            </div>
          </div>
        </div>

        {/* Card / ban status */}
        {card && (
          <div className={`rounded-3xl p-4 flex items-center gap-3 border ${
            card.type === 'permanent' ? 'bg-gray-100 border-gray-200 text-gray-700' :
            card.type === 'red'       ? 'bg-red-50 border-red-200 text-red-700' :
                                        'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            <span className="text-2xl">{card.icon}</span>
            <div>
              <div className="font-bold text-sm">{card.type === 'permanent' ? 'Permanent Ban' : card.type === 'red' ? 'Red Card' : 'Yellow Card'}</div>
              <div className="text-xs mt-0.5 opacity-80" dir={card.type === 'permanent' ? 'rtl' : undefined}>{card.label}</div>
            </div>
          </div>
        )}

        {/* Red card tally */}
        {((profile.total_red_cards ?? 0) > 0 || (profile.consecutive_misses ?? 0) > 0) && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-3">Card History</h2>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-black text-red-500">{profile.total_red_cards ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Red cards total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-yellow-500">{profile.consecutive_misses ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Consecutive misses</div>
              </div>
            </div>
          </div>
        )}

        {/* Game history */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Game History</h2>
            <span className="text-xs text-gray-400">{history.filter(h => h.status !== 'not-registered').length} games</span>
          </div>
          {history.length === 0 && (
            <div className="p-8 text-center text-gray-300 text-sm">No games yet</div>
          )}
          <div className="divide-y divide-gray-50">
            {history.map(({ game, status, xpChange, checkedInAt }) => {
              const cfg = statusConfig[status]
              if (status === 'not-registered') return null
              return (
                <div key={game.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {format(new Date(game.game_date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
                    </div>
                    {checkedInAt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Checked in {format(new Date(checkedInAt), 'HH:mm')}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  {xpChange !== 0 && (
                    <span className={`text-sm font-bold w-14 text-right shrink-0 ${xpChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {xpChange > 0 ? '+' : ''}{xpChange}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
