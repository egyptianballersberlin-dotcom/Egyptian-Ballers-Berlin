'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSubmitted(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-3xl mb-4 backdrop-blur-sm border border-white/20 shadow-xl">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Egyptian Ballers Berlin</h1>
          <p className="text-green-200 mt-1 text-sm">Reset your password</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <div className="font-bold text-gray-900">Check your email</div>
              <p className="text-sm text-gray-500">
                We sent a password reset link to <span className="font-semibold">{email}</span>. Click the link in the email to set a new password.
              </p>
              <Link href="/login" className="block text-sm text-green-600 font-semibold hover:underline mt-4">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition shadow-md disabled:opacity-50 text-sm"
              >
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
              <p className="text-center text-sm text-gray-400 mt-2">
                <Link href="/login" className="text-green-600 font-semibold hover:underline">← Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
