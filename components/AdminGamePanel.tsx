'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import type { Game } from '@/lib/types'
import PlayerBadge from './PlayerBadge'

interface Profile {
  id: string
  full_name: string
  xp: number
  consecutive_misses: number
  is_banned: boolean
}

interface Registration {
  id: string
  game_id: string
  user_id: string
  list_type: 'main' | 'waiting'
  position: number
  profiles?: { id: string; full_name: string }
}

interface Props {
  game: Game
  registrations: Registration[]
  allProfiles: Profile[]
}

export default function AdminGamePanel({ game, registrations, allProfiles }: Props) {
  const [regs, setRegs] = useState(registrations)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [gameStatus, setGameStatus] = useState(game.status)

  const mainList = regs.filter(r => r.list_type === 'main')
  const waitingList = regs.filter(r => r.list_type === 'waiting')
  const registeredIds = new Set(regs.map(r => r.user_id))
  const unregisteredProfiles = allProfiles.filter(p => !registeredIds.has(p.id))

  async function addPlayer() {
    if (!selectedUserId) return
    setAdding(true)
    setMessage('')
    const res = await fetch('/api/admin/add-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id, userId: selectedUserId }),
    })
    const data = await res.json()
    if (res.ok) {
      setRegs(prev => [...prev, data.registration])
      setSelectedUserId('')
    } else {
      setMessage(data.error ?? 'Failed to add player')
    }
    setAdding(false)
  }

  async function removePlayer(registrationId: string) {
    const res = await fetch('/api/admin/remove-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId }),
    })
    if (res.ok) {
      setRegs(prev => prev.filter(r => r.id !== registrationId))
    }
  }

  async function processGame() {
    if (!confirm('Process this game? This will calculate XP and issue cards based on check-ins.')) return
    setProcessing(true)
    setMessage('')
    const res = await fetch('/api/admin/process-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setGameStatus('completed')
      setMessage(`Game processed! ${data.results?.length ?? 0} players updated.`)
    } else {
      setMessage(data.error ?? 'Failed to process game')
    }
    setProcessing(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="font-bold text-gray-900">
            {format(new Date(game.game_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {mainList.length}/{game.max_players} players · {waitingList.length} waiting
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${gameStatus === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {gameStatus}
          </span>
          {gameStatus === 'upcoming' && (
            <button
              onClick={processGame}
              disabled={processing}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
            >
              {processing ? 'Processing...' : '✅ Process Game'}
            </button>
          )}
        </div>
      </div>

      {/* Add player */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
        <select
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Add a player...</option>
          {unregisteredProfiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
        <button
          onClick={addPlayer}
          disabled={adding || !selectedUserId}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
        >
          {adding ? '...' : 'Add'}
        </button>
      </div>

      {message && (
        <div className="px-5 py-2 text-sm text-gray-700 bg-yellow-50 border-b border-yellow-100">{message}</div>
      )}

      {/* Main list */}
      <div className="p-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Main List ({mainList.length})</div>
        <div className="space-y-1">
          {mainList.map(reg => (
            <div key={reg.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <span className="text-sm text-gray-400 w-5">{reg.position}</span>
              <div className="w-7 h-7 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold">
                {(reg.profiles as any)?.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800">{(reg.profiles as any)?.full_name}</span>
              <button
                onClick={() => removePlayer(reg.id)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
              >
                Remove
              </button>
            </div>
          ))}
          {mainList.length === 0 && <p className="text-sm text-gray-400">No players</p>}
        </div>

        {/* Waiting list */}
        {waitingList.length > 0 && (
          <>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">Waiting List ({waitingList.length})</div>
            <div className="space-y-1">
              {waitingList.map(reg => (
                <div key={reg.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-sm text-gray-400 w-5">{reg.position}</span>
                  <div className="w-7 h-7 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-xs font-bold">
                    {(reg.profiles as any)?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800">{(reg.profiles as any)?.full_name}</span>
                  <button
                    onClick={() => removePlayer(reg.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
