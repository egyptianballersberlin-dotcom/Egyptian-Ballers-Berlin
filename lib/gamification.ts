export interface PlayerLevel {
  name: string
  icon: string
  color: string
  minXp: number
}

export const XP_ATTENDED = 15
export const XP_NO_SHOW = -20
export const XP_ABSENT = -2   // didn't register at all

export const LEVELS: PlayerLevel[] = [
  { name: 'هاوي',         icon: '⚽', color: 'text-gray-500',   minXp: 0   },
  { name: 'لعيب',         icon: '🥉', color: 'text-orange-500', minXp: 45  },
  { name: 'نجم',          icon: '🥈', color: 'text-slate-500',  minXp: 150 },
  { name: 'فخر العرب',   icon: '🥇', color: 'text-yellow-500', minXp: 300 },
  { name: 'عالمي',        icon: '👑', color: 'text-purple-500', minXp: 600 },
]

export function getLevel(xp: number): PlayerLevel {
  return [...LEVELS].reverse().find(l => xp >= l.minXp) ?? LEVELS[0]
}

export function getXpToNextLevel(xp: number): { next: PlayerLevel | null; remaining: number; progress: number } {
  const currentIdx = [...LEVELS].reverse().findIndex(l => xp >= l.minXp)
  const current = LEVELS[LEVELS.length - 1 - currentIdx]
  const nextLevel = LEVELS[LEVELS.indexOf(current) + 1] ?? null
  if (!nextLevel) return { next: null, remaining: 0, progress: 100 }
  const remaining = nextLevel.minXp - xp
  const progress = Math.round(((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100)
  return { next: nextLevel, remaining, progress }
}

export function getCardStatus(consecutiveMisses: number, isBanned: boolean, isPermanentlyBanned?: boolean) {
  if (isPermanentlyBanned) return { type: 'permanent' as const, label: 'محظور بشكل دائم — تبرع بـ €50 لعمل خيري للعودة', icon: '🚫' }
  if (isBanned) return { type: 'red' as const, label: 'Red card — banned next game', icon: '🟥' }
  if (consecutiveMisses === 1) return { type: 'yellow' as const, label: 'Yellow card — 1 no-show', icon: '🟨' }
  return null
}
