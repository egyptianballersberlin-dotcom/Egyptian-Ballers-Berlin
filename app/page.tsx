import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GameCard from '@/components/GameCard'
import Link from 'next/link'
import { format, nextSaturday, isSaturday, previousSaturday } from 'date-fns'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Upcoming Saturday — skip blocked dates
  const BLOCKED_DATES = ['2026-06-27']
  const today = new Date()
  let satDate = isSaturday(today) ? today : nextSaturday(today)
  while (BLOCKED_DATES.includes(format(satDate, 'yyyy-MM-dd'))) {
    satDate = nextSaturday(satDate)
  }
  const satStr = format(satDate, 'yyyy-MM-dd')

  // Wednesday registration opens check
  const wednesday = new Date(satDate)
  wednesday.setDate(satDate.getDate() - 10)
  wednesday.setHours(0, 0, 0, 0)
  const registrationOpen = today >= wednesday

  // Get or create upcoming game
  let { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('game_date', satStr)
    .single()

  if (!game) {
    const { data: newGame } = await supabase
      .from('games')
      .insert({ game_date: satStr })
      .select()
      .single()
    game = newGame
  }

  if (!game) return <div>Error loading game</div>

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, profiles(id, full_name, phone)')
    .eq('game_id', game.id)
    .eq('is_active', true)
    .order('position', { ascending: true })

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*, profiles(id, full_name)')
    .eq('game_id', game.id)

  const mainList = registrations?.filter(r => r.list_type === 'main') ?? []
  const waitingList = registrations?.filter(r => r.list_type === 'waiting') ?? []
  const myReg = registrations?.find(r => r.user_id === user.id)
  const myAttendance = attendance?.find(a => a.user_id === user.id)

  // Last Saturday — check if there's a game that needs check-in
  const lastSat = isSaturday(today) ? previousSaturday(today) : previousSaturday(today)
  const lastSatStr = format(lastSat, 'yyyy-MM-dd')

  const { data: lastGame } = await supabase
    .from('games')
    .select('id, game_date')
    .eq('game_date', lastSatStr)
    .single()

  let lastGameMyReg = null
  let lastGameMyAtt = null

  if (lastGame) {
    const { data: lastRegs } = await supabase
      .from('registrations')
      .select('*')
      .eq('game_id', lastGame.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const { data: lastAtt } = await supabase
      .from('attendance')
      .select('*')
      .eq('game_id', lastGame.id)
      .eq('user_id', user.id)
      .single()

    lastGameMyReg = lastRegs ?? null
    lastGameMyAtt = lastAtt ?? null
  }

  const showLastWeekCheckin =
    lastGame &&
    lastGameMyReg?.list_type === 'main' &&
    !lastGameMyAtt?.checked_in

  return (
    <div>
      <Navbar userName={profile?.full_name ?? user.email ?? 'Player'} isAdmin={profile?.is_admin ?? false} />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Last week check-in reminder */}
        {showLastWeekCheckin && (
          <Link href={`/games/${lastGame.id}`}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-3xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-600 transition-all cursor-pointer">
              <div>
                <div className="font-bold text-sm">Did you play last Saturday?</div>
                <div className="text-xs text-blue-100 mt-0.5">
                  Tap to check in for {format(new Date(lastGame.game_date + 'T12:00:00'), 'MMMM d')}
                </div>
              </div>
              <div className="text-2xl">📍</div>
            </div>
          </Link>
        )}

{!registrationOpen && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <div className="font-bold text-amber-800 text-sm">Registration not open yet</div>
              <div className="text-xs text-amber-700 mt-0.5">
                Opens Wednesday {wednesday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
        )}

        <GameCard
          game={game}
          mainList={mainList}
          waitingList={waitingList}
          attendance={attendance ?? []}
          currentUserId={user.id}
          myRegistration={myReg ?? null}
          myAttendance={myAttendance ?? null}
          registrationOpen={registrationOpen}
        />

        {/* Location */}
        <a
          href="https://maps.app.goo.gl/vXKUPiMTZ73yLuRh7"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-4 hover:border-green-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-xl shrink-0">📍</div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Poststadion Berlin, Platz 6</div>
            <div className="text-xs text-green-600 group-hover:underline mt-0.5">Open in Google Maps →</div>
          </div>
          <div className="text-gray-300 text-lg">›</div>
        </a>

        {/* Game rules */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="font-bold text-gray-900 mb-4">📋 قواعد اللعب</h2>
          <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
            <p>⚽ أول فريقين بييجوا بيبدأوا يلعبوا على طول ووقتهم مش بيتحسب. لما الفريق التالت يكتمل، الراوند بيبدأ يتحسب.</p>
            <p>⏱️ كل مباراة ١٥ دقيقة.</p>
            <p>🏆 الفريق الكسبان بيفضل يلعب لحد ٣ مباريات بالكتير.</p>
          </div>
        </div>

        {/* Registration rules */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="font-bold text-gray-900 mb-4">📝 التسجيل والإلغاء</h2>
          <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
            <p>📅 التسجيل بيفتح كل أسبوع يوم الأربعاء.</p>
            <p>❌ لو سجلت وعايز تلغي، لازم تلغي بحد أقصى يوم الجمعة الساعة ٩ بالليل عشان حد من قايمة الانتظار يقدر ياخد مكانك.</p>
            <p>📧 اللي على قايمة الانتظار هيوصلهم إيميل لما حد يلغي، وأول واحد يسجل منهم هياخد المكان.</p>
            <p>⚠️ لو سجلت ومجيتش من غير إلغاء، هيبقى عليك جزاء.</p>
            <p>✅ بعد كل مباراة لازم تعمل self check-in على التطبيق عشان تأكد حضورك، لو معملتش هتتحسب غايب.</p>
          </div>
        </div>

        {/* Cards rules */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="font-bold text-gray-900 mb-4">🃏 نظام الكروت</h2>
          <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
            <p>🟨 لو فاتتك مباراة من غير إلغاء: <span className="font-bold text-yellow-600">كارت أصفر — تحذير</span></p>
            <p>🟥 لو فاتتك مباراتين متتاليين من غير إلغاء: <span className="font-bold text-red-600">كارت أحمر — محظور من المباراة الجاية</span></p>
            <p>✅ لو حضرت: الكروت بتتمسح وبترجع تبدأ من الأول.</p>
            <p>🚫 لو اتجمعلك ٣ كروت حمرا على مدار تاريخك في الجروب: <span className="font-bold text-gray-800">حظر نهائي من اللعب للأبد</span> — الوحيدة اللي تعمل رجعة هي إنك تتبرع بـ <span className="font-bold">€50 لجمعية خيرية</span> وتتواصل مع الأدمن.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
