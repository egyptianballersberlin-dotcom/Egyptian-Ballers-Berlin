'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import type { Game, Registration, Attendance } from '@/lib/types'

interface Props {
  game: Game
  mainList: (Registration & { profiles?: any })[]
  waitingList: (Registration & { profiles?: any })[]
  attendance: (Attendance & { profiles?: any })[]
  currentUserId: string
  myRegistration: Registration | null
  myAttendance: Attendance | null
  registrationOpen?: boolean
}

const AVATAR_COLORS = [
  'bg-emerald-200 text-emerald-800',
  'bg-sky-200 text-sky-800',
  'bg-violet-200 text-violet-800',
  'bg-amber-200 text-amber-800',
  'bg-rose-200 text-rose-800',
  'bg-teal-200 text-teal-800',
  'bg-orange-200 text-orange-800',
  'bg-indigo-200 text-indigo-800',
]

function avatarColor(name: string) {
  const i = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

export default function GameCard({ game, mainList, waitingList, attendance, currentUserId, myRegistration, myAttendance, registrationOpen = true }: Props) {
  const [loading, setLoading] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [localMain, setLocalMain] = useState(mainList)
  const [localWaiting, setLocalWaiting] = useState(waitingList)
  const [localAttendance, setLocalAttendance] = useState(attendance)
  const [localMyReg, setLocalMyReg] = useState(myRegistration)
  const [localMyAtt, setLocalMyAtt] = useState(myAttendance)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [claimLoading, setClaimLoading] = useState(false)

  const isCompleted = game.status === 'completed'
  const gameDate = new Date(game.game_date + 'T12:00:00')
  const isGameDay = new Date().toDateString() === gameDate.toDateString()
  const gameHasPassed = new Date() > gameDate
  const fillPct = Math.min((localMain.length / game.max_players) * 100, 100)
  const spotsLeft = game.max_players - localMain.length

  function showMsg(text: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage(text)
    setMessageType(type)
  }

  async function register() {
    setLoading(true)
    showMsg('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalMyReg(data.registration)
        if (data.registration.list_type === 'main') {
          setLocalMain(prev => [...prev, data.registration])
          showMsg(`You're in! Spot #${data.registration.position} secured.`, 'success')
        } else {
          setLocalWaiting(prev => [...prev, data.registration])
          showMsg(`You're on the waiting list at #${data.registration.position}.`, 'info')
        }
      } else {
        showMsg(data.error ?? 'Failed to register', 'error')
      }
    } catch {
      showMsg('Something went wrong. Please try again.', 'error')
    }
    setLoading(false)
  }

  async function deregister() {
    setLoading(true)
    showMsg('')
    try {
      const res = await fetch('/api/deregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalMyReg(null)
        setLocalMain(prev => prev.filter(r => r.user_id !== currentUserId))
        setLocalWaiting(prev => prev.filter(r => r.user_id !== currentUserId))
        showMsg('You have been removed from the list.', 'info')
      } else {
        showMsg(data.error ?? 'Failed to deregister', 'error')
      }
    } catch {
      showMsg('Something went wrong. Please try again.', 'error')
    }
    setLoading(false)
  }

  async function claimSpot() {
    setClaimLoading(true)
    showMsg('')
    try {
      const res = await fetch('/api/claim-spot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalMyReg(data.registration)
        setLocalMain(prev => [...prev, data.registration])
        setLocalWaiting(prev => prev.filter(r => r.user_id !== currentUserId))
        showMsg("You got it! You're now on the main list.", 'success')
      } else {
        showMsg(data.error ?? 'Could not claim the spot.', 'error')
      }
    } catch {
      showMsg('Something went wrong. Please try again.', 'error')
    }
    setClaimLoading(false)
  }

  async function checkIn() {
    setCheckInLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalMyAtt(data.attendance)
        setLocalAttendance(prev => {
          const exists = prev.find(a => a.user_id === currentUserId)
          if (exists) return prev.map(a => a.user_id === currentUserId ? data.attendance : a)
          return [...prev, data.attendance]
        })
      }
    } catch {}
    setCheckInLoading(false)
  }

  const checkedInCount = localAttendance.filter(a => a.checked_in).length

  return (
    <div className="space-y-4">
      {/* Hero game card */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
        {/* Green header */}
        <div className="bg-gradient-to-br from-green-700 to-green-600 px-6 pt-6 pb-8 text-white relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10 text-8xl select-none">⚽</div>
          <div className="text-xs font-bold uppercase tracking-widest text-green-200 mb-1">
            {isCompleted ? 'Last Game' : 'Next Game'}
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {format(gameDate, 'EEEE')}
          </div>
          <div className="text-green-100 text-lg font-medium mt-0.5">
            {format(gameDate, 'MMMM d, yyyy')}
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-green-100">
            <span>🕗 8:00 AM</span>
            {game.location && game.location !== 'TBD' && (
              <span>📍 {game.location}</span>
            )}
          </div>
          {/* Player count */}
          <div className="absolute right-6 bottom-5 text-right">
            <div className="text-4xl font-black text-white">{localMain.length}</div>
            <div className="text-green-200 text-xs font-semibold">/ {game.max_players} players</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className={`h-1.5 transition-all duration-500 ${fillPct >= 100 ? 'bg-green-500' : 'bg-green-400'}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-5 space-y-3">
          {spotsLeft > 0 && !localMyReg && !isCompleted && (
            <p className="text-xs text-gray-400 text-center">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining</p>
          )}

          {!isCompleted && (
            <>
              {!localMyReg ? (
                <button
                  onClick={register}
                  disabled={loading || !registrationOpen}
                  className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white py-3.5 rounded-2xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all text-base"
                >
                  {loading ? '…' : !registrationOpen ? '⏳ Registration not open yet' : localMain.length < game.max_players ? '✅ I\'m In!' : '📋 Join Waiting List'}
                </button>
              ) : (
                <div className="space-y-2">
                  {localMyReg.list_type === 'main' ? (
                    <div className="text-center py-3 rounded-2xl font-semibold bg-green-50 text-green-700 border border-green-200 text-sm">
                      ✅ You&apos;re in — Spot #{localMyReg.position}
                    </div>
                  ) : localMain.length < game.max_players ? (
                    <div className="space-y-2">
                      <div className="text-center py-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium">
                        ⏳ Waiting list — a spot just opened!
                      </div>
                      <button
                        onClick={claimSpot}
                        disabled={claimLoading}
                        className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white py-3.5 rounded-2xl font-bold shadow-md disabled:opacity-50 transition-all animate-pulse"
                      >
                        {claimLoading ? 'Claiming…' : '🟢 Claim the Open Spot!'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-3 rounded-2xl font-semibold bg-amber-50 text-amber-700 border border-amber-200 text-sm">
                      ⏳ On waiting list — you&apos;ll be emailed if a spot opens
                    </div>
                  )}
                  <button
                    onClick={deregister}
                    disabled={loading}
                    className="w-full bg-gray-50 text-red-500 border border-red-100 py-2.5 rounded-2xl font-medium hover:bg-red-50 disabled:opacity-50 transition text-sm"
                  >
                    {loading ? '…' : "❌ Can't Make It — Remove Me"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Check-in */}
          {(isGameDay || isCompleted || gameHasPassed) && localMyReg?.list_type === 'main' && (
            <div>
              {localMyAtt?.checked_in ? (
                <div className="text-center py-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-sm">
                  ✔️ Checked in — see you on the pitch!
                </div>
              ) : (
                <button
                  onClick={checkIn}
                  disabled={checkInLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3.5 rounded-2xl font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {checkInLoading ? '…' : '📍 Check In — I Arrived!'}
                </button>
              )}
            </div>
          )}

          {message && (
            <div className={`text-center text-sm py-2.5 px-4 rounded-xl font-medium ${
              messageType === 'success' ? 'bg-green-50 text-green-700' :
              messageType === 'error' ? 'bg-red-50 text-red-600' :
              'bg-gray-50 text-gray-600'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Player lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main list */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Main List</h2>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {localMain.length} / {game.max_players}
            </span>
          </div>
          <div className="space-y-1.5">
            {localMain.map((reg, i) => {
              const att = localAttendance.find(a => a.user_id === reg.user_id)
              const isMe = reg.user_id === currentUserId
              const name = reg.profiles?.full_name ?? 'Unknown'
              return (
                <div key={reg.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${isMe ? 'bg-green-50 border border-green-100' : 'hover:bg-gray-50'}`}>
                  <span className="text-xs text-gray-300 font-mono w-4 shrink-0">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(name)}`}>
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm ${isMe ? 'font-bold text-green-800' : 'font-medium text-gray-800'}`}>
                    {name}{isMe ? ' (you)' : ''}
                  </span>
                  {att?.checked_in && (
                    <span className="text-green-500 text-xs font-semibold">✔</span>
                  )}
                </div>
              )
            })}
            {localMain.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-4">No players yet — be the first!</p>
            )}
          </div>
        </div>

        {/* Waiting list */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Waiting List</h2>
            {localWaiting.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {localWaiting.length}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {localWaiting.map((reg, i) => {
              const isMe = reg.user_id === currentUserId
              const name = reg.profiles?.full_name ?? 'Unknown'
              return (
                <div key={reg.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${isMe ? 'bg-amber-50 border border-amber-100' : 'hover:bg-gray-50'}`}>
                  <span className="text-xs text-gray-300 font-mono w-4 shrink-0">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(name)}`}>
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm ${isMe ? 'font-bold text-amber-800' : 'font-medium text-gray-800'}`}>
                    {name}{isMe ? ' (you)' : ''}
                  </span>
                </div>
              )
            })}
            {localWaiting.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-4">No one waiting</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance summary */}
      {isCompleted && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Attendance</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {checkedInCount} / {localMain.length} showed up
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {localMain.map(reg => {
              const att = localAttendance.find(a => a.user_id === reg.user_id)
              return (
                <div key={reg.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${att?.checked_in ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  <span>{att?.checked_in ? '✅' : '❌'}</span>
                  <span className="font-medium truncate">{reg.profiles?.full_name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
