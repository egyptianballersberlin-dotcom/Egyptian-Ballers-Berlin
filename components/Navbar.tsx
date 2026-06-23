'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  userName: string
  isAdmin?: boolean
}

export default function Navbar({ userName, isAdmin = false }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/',          label: 'This Week',   icon: '⚽' },
    { href: '/games',     label: 'Games',       icon: '📅' },
    { href: '/dashboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/profile',   label: 'My Stats',    icon: '👤' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: '🔧' }] : []),
  ]

  return (
    <nav className="bg-gradient-to-r from-green-800 to-green-700 text-white shadow-lg sticky top-0 z-50">
      {/* Main bar */}
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">⚽</span>
          <span className="font-extrabold text-base tracking-tight">Egyptian Ballers Berlin</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                pathname === l.href
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {l.icon} {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop user + signout */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {userName[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-green-100">{userName}</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition font-medium border border-white/20"
          >
            Sign out
          </button>
        </div>

        {/* Mobile: sign out */}
        <button
          onClick={handleSignOut}
          className="sm:hidden text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition font-medium border border-white/20"
        >
          Sign out
        </button>
      </div>

      {/* Mobile tab row — sits directly below the main bar */}
      <div className="sm:hidden flex border-t border-white/10">
        {links.map(l => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all ${
                active ? 'bg-white/20 text-white' : 'text-green-200'
              }`}
            >
              <span className="text-lg leading-none">{l.icon}</span>
              <span className="text-[10px] font-semibold leading-none">{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
