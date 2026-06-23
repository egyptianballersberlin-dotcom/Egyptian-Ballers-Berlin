export interface Profile {
  id: string
  full_name: string
  phone: string | null
  created_at: string
  xp: number
  consecutive_misses: number
  is_banned: boolean
  is_admin: boolean
  banned_until_game_id: string | null
}

export interface Game {
  id: string
  game_date: string
  max_players: number
  status: 'upcoming' | 'completed' | 'cancelled'
  location: string
  created_at: string
}

export interface Registration {
  id: string
  game_id: string
  user_id: string
  list_type: 'main' | 'waiting'
  position: number
  registered_at: string
  is_active: boolean
  profiles?: Profile
}

export interface Attendance {
  id: string
  game_id: string
  user_id: string
  checked_in: boolean
  checked_in_at: string | null
  profiles?: Profile
}

export interface GameWithStats extends Game {
  registrations: Registration[]
  attendance: Attendance[]
  mainList: Registration[]
  waitingList: Registration[]
}
