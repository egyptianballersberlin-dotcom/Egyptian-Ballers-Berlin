import { getLevel, getCardStatus } from '@/lib/gamification'

interface Props {
  xp: number
  consecutiveMisses: number
  isBanned: boolean
  isPermanentlyBanned?: boolean
  showXp?: boolean
}

export default function PlayerBadge({ xp, consecutiveMisses, isBanned, isPermanentlyBanned = false, showXp = false }: Props) {
  const level = getLevel(xp)
  const card = getCardStatus(consecutiveMisses, isBanned, isPermanentlyBanned)

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg ${level.color}`} title={`${level.name} — ${xp} XP`}>
        {level.icon}
      </span>
      {showXp && (
        <span className="text-xs font-semibold text-gray-500">{xp} XP</span>
      )}
      {card && (
        <span title={card.label}>{card.icon}</span>
      )}
    </div>
  )
}
