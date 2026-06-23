import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PlayerBadge from '@/components/PlayerBadge'
import { getLevel, getXpToNextLevel, getCardStatus, LEVELS, XP_ATTENDED, XP_NO_SHOW } from '@/lib/gamification'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: completedGames } = await supabase
    .from('games')
    .select('id, game_date')
    .eq('status', 'completed')
    .order('game_date', { ascending: false })

  const gameIds = completedGames?.map(g => g.id) ?? []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, xp, consecutive_misses, is_banned, is_permanently_banned')
    .order('xp', { ascending: false })

  const { data: registrations } = await supabase
    .from('registrations')
    .select('game_id, user_id, list_type')
    .in('game_id', gameIds.length ? gameIds : ['none'])
    .eq('list_type', 'main')

  const { data: attendance } = await supabase
    .from('attendance')
    .select('game_id, user_id, checked_in')
    .in('game_id', gameIds.length ? gameIds : ['none'])

  const { data: upcomingGames } = await supabase
    .from('games')
    .select('id')
    .eq('status', 'upcoming')
    .order('game_date')
    .limit(1)

  const upcomingRegs = upcomingGames?.length ? (await supabase
    .from('registrations')
    .select('user_id, list_type')
    .eq('game_id', upcomingGames[0].id)
    .eq('is_active', true)).data : []

  const stats = profiles?.map(p => {
    const myRegs = registrations?.filter(r => r.user_id === p.id) ?? []
    const myAtt = attendance?.filter(a => a.user_id === p.id && a.checked_in) ?? []
    const gamesRegistered = myRegs.length
    const gamesAttended = myAtt.length
    const attendanceRate = gamesRegistered > 0 ? Math.round((gamesAttended / gamesRegistered) * 100) : null
    const upcomingStatus = upcomingRegs?.find((r: any) => r.user_id === p.id)
    const level = getLevel(p.xp ?? 0)
    const card = getCardStatus(p.consecutive_misses ?? 0, p.is_banned ?? false, (p as any).is_permanently_banned ?? false)
    return { ...p, gamesRegistered, gamesAttended, attendanceRate, upcomingStatus, level, card }
  }) ?? []

  const myStats = stats.find(s => s.id === user.id)
  const { next: nextLevel, remaining, progress } = myStats ? getXpToNextLevel(myStats.xp ?? 0) : { next: null, remaining: 0, progress: 100 }

  return (
    <div>
      <Navbar userName={profile?.full_name ?? user.email ?? 'Player'} isAdmin={profile?.is_admin ?? false} />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* My stats card */}
        {myStats && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">Your level</div>
                <div className={`text-2xl font-bold ${myStats.level.color} flex items-center gap-2`}>
                  {myStats.level.icon} {myStats.level.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{myStats.xp ?? 0}</div>
                <div className="text-sm text-gray-500">XP</div>
              </div>
            </div>
            {nextLevel && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to {nextLevel.icon} {nextLevel.name}</span>
                  <span>{remaining} XP to go</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {myStats.card && (
              <div className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${myStats.card.type === 'permanent' ? 'bg-gray-100 text-gray-700' : myStats.card.type === 'red' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {myStats.card.icon} {myStats.card.label}
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div><div className="text-xl font-bold text-gray-900">{myStats.gamesRegistered}</div><div className="text-xs text-gray-500">Registered</div></div>
              <div><div className="text-xl font-bold text-gray-900">{myStats.gamesAttended}</div><div className="text-xs text-gray-500">Attended</div></div>
              <div><div className="text-xl font-bold text-gray-900">{myStats.attendanceRate ?? '—'}%</div><div className="text-xs text-gray-500">Show rate</div></div>
            </div>
            <a href="/profile" className="mt-4 block text-center text-sm text-green-600 font-semibold hover:underline">
              View full stats & game history →
            </a>
          </div>
        )}

        {/* Levels legend */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-900 mb-3">Levels</h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            {LEVELS.map(l => (
              <div key={l.name} className={`p-2 rounded-xl ${myStats && getLevel(myStats.xp ?? 0).name === l.name ? 'bg-green-50 ring-2 ring-green-400' : 'bg-gray-50'}`}>
                <div className="text-2xl">{l.icon}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">{l.name}</div>
                <div className="text-xs text-gray-400">{l.minXp}+ XP</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamification explanation in Egyptian Arabic */}
        <div className="bg-white rounded-2xl shadow p-6" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="font-bold text-gray-900 mb-4">🏅 نظام النقاط والمستويات</h2>
          <div className="space-y-4 text-gray-700 text-sm leading-relaxed">

            <div>
              <p className="font-semibold text-gray-900 mb-2">⭐ إزاي بتكسب وبتخسر نقاط؟</p>
              <div className="space-y-2 mr-2">
                <p>✅ لو حضرت المباراة: <span className="font-bold text-green-600">+{XP_ATTENDED} نقطة</span></p>
                <p>❌ لو سجلت ومجيتش من غير إلغاء: <span className="font-bold text-red-500">نقطة {XP_NO_SHOW}</span></p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-2">🃏 نظام الكروت</p>
              <div className="space-y-2 mr-2">
                <p>🟨 لو فاتتك مباراة من غير إلغاء: <span className="font-bold text-yellow-600">كارت أصفر — تحذير</span></p>
                <p>🟥 لو فاتتك مباراتين متتاليين من غير إلغاء: <span className="font-bold text-red-600">كارت أحمر — محظور من المباراة الجاية</span></p>
                <p>✅ لو حضرت: الكروت بتتمسح وبترجع تبدأ من الأول.</p>
                <p>🚫 لو اتجمعلك ٣ كروت حمرا على مدار تاريخك في الجروب: <span className="font-bold text-gray-800">حظر نهائي من اللعب للأبد</span> — الوحيدة اللي تعمل رجعة هي إنك تتبرع بـ <span className="font-bold">€50 لجمعية خيرية</span> وتتواصل مع الأدمن.</p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-2">🏆 المستويات</p>
              <div className="space-y-1.5 mr-2">
                <p>⚽ <span className="font-bold">هاوي</span> — من ٠ نقطة</p>
                <p>🥉 <span className="font-bold">لعيب</span> — من ٤٥ نقطة</p>
                <p>🥈 <span className="font-bold">نجم</span> — من ١٥٠ نقطة</p>
                <p>🥇 <span className="font-bold">فخر العرب</span> — من ٣٠٠ نقطة</p>
                <p>👑 <span className="font-bold">عالمي</span> — من ٦٠٠ نقطة</p>
              </div>
            </div>

          </div>
        </div>

        {/* Next game commitment */}
        {upcomingGames?.length ? (() => {
          const mainPlayers = profiles?.filter(p => upcomingRegs?.find((r: any) => r.user_id === p.id && r.list_type === 'main')) ?? []
          const waitingPlayers = profiles?.filter(p => upcomingRegs?.find((r: any) => r.user_id === p.id && r.list_type === 'waiting')) ?? []
          return (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Next Saturday — Who&apos;s In?</h2>
                <span className="text-xs text-gray-400">{mainPlayers.length} confirmed</span>
              </div>
              <div className="divide-y divide-gray-50">
                {mainPlayers.map((p, i) => {
                  const card = getCardStatus(p.consecutive_misses ?? 0, p.is_banned ?? false, (p as any).is_permanently_banned ?? false)
                  const isMe = p.id === user.id
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? 'bg-green-50' : ''}`}>
                      <span className="text-xs text-gray-300 font-mono w-4">{i + 1}</span>
                      <span className="text-green-500">✅</span>
                      <span className={`flex-1 text-sm ${isMe ? 'font-bold text-green-800' : 'font-medium text-gray-800'}`}>
                        {p.full_name}{isMe ? ' (you)' : ''}
                      </span>
                      {card && <span className="text-sm" title={card.label}>{card.icon}</span>}
                    </div>
                  )
                })}
                {waitingPlayers.map((p, i) => {
                  const isMe = p.id === user.id
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? 'bg-amber-50' : 'bg-gray-50/50'}`}>
                      <span className="text-xs text-gray-300 font-mono w-4">{i + 1}</span>
                      <span className="text-amber-500">⏳</span>
                      <span className={`flex-1 text-sm ${isMe ? 'font-bold text-amber-800' : 'font-medium text-gray-500'}`}>
                        {p.full_name}{isMe ? ' (you)' : ''}
                      </span>
                      <span className="text-xs text-gray-400">waiting</span>
                    </div>
                  )
                })}
                {mainPlayers.length === 0 && waitingPlayers.length === 0 && (
                  <div className="px-5 py-6 text-center text-sm text-gray-300">No one registered yet</div>
                )}
              </div>
            </div>
          )
        })() : null}

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Leaderboard</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.map((s, i) => (
              <div key={s.id} className={`px-5 py-3 flex items-center gap-3 ${s.id === user.id ? 'bg-green-50' : ''}`}>
                <span className="text-gray-400 text-sm w-6 font-mono">{i + 1}</span>
                <PlayerBadge xp={s.xp ?? 0} consecutiveMisses={s.consecutive_misses ?? 0} isBanned={s.is_banned ?? false} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{s.full_name}{s.id === user.id ? ' (you)' : ''}</div>
                  <div className="text-xs text-gray-400">{s.gamesAttended} attended · {s.attendanceRate ?? '—'}% rate</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{s.xp ?? 0} XP</div>
                  <div className={`text-xs font-medium ${s.level.color}`}>{s.level.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
