'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone || null } }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-gray-50"
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-3xl mb-4 backdrop-blur-sm border border-white/20 shadow-xl">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Egyptian Ballers Berlin</h1>
          <p className="text-green-200 mt-1 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+49 123 456 789"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 text-sm mt-2"
            >
              {loading ? 'Creating account…' : 'Join the Squad →'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
