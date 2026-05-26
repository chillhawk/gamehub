// AI Bot Generation Logic

const BOT_NAMES = [
  'yvng_pluto', 'kai_cenat_fan', 'slatt99', 'rxze_fps', 'opium_vamp',
  'starboy_x', 'NoCapFr', 'drippy_demon', 'vvs_diamond', 'W_Rizzler',
  'sigma_male_007', 'based_god', 'Goku_Uchiha', 'sweaty_ttv', 'Aura_King'
]

const BOT_AVATARS = ['Ghost', 'Skull']

export interface LobbyPlayer {
  id: string
  name: string
  avatar: string
  isBot: boolean
  skillLevel: number
  isReady: boolean
}

export function generateBot(targetSkillLevel: number): LobbyPlayer {
  const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  const randomAvatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)]
  
  // Skill is +/- 3 levels from the target (host) to simulate skill-based matchmaking
  const skillVariance = Math.floor(Math.random() * 7) - 3
  const botSkill = Math.max(1, targetSkillLevel + skillVariance)

  return {
    id: 'bot-' + Math.random().toString(36).substring(2, 9),
    name: randomName,
    avatar: randomAvatar,
    isBot: true,
    skillLevel: botSkill,
    isReady: true // Bots are always ready when they join
  }
}
