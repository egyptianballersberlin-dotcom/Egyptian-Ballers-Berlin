'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LiftBanButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLift() {
    if (!confirm('Lift permanent ban and reset all red cards for this player?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/lift-permanent-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error('Failed')
      router.refresh()
    } catch {
      alert('Failed to lift ban. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLift}
      disabled={loading}
      className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 disabled:opacity-50 shrink-0"
    >
      {loading ? '...' : 'Lift Ban'}
    </button>
  )
}
