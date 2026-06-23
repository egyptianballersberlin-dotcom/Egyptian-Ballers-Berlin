'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeletePlayerButton({ userId, playerName }: { userId: string; playerName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Permanently delete "${playerName}"? This removes all their data and cannot be undone.`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/delete-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to delete player')
      } else {
        router.refresh()
      }
    } catch {
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 disabled:opacity-50 shrink-0 font-medium"
    >
      {loading ? '…' : 'Delete'}
    </button>
  )
}
