'use client'

import React from 'react'
import { Ghost, Skull, Bot, Cat, Zap, Crown, Swords, Gamepad2 } from 'lucide-react'

interface AvatarIconProps {
  name: string
  size?: number
  color?: string
  style?: React.CSSProperties
}

export function AvatarIcon({ name, size = 24, color = 'currentColor', style }: AvatarIconProps) {
  const props = { size, color, style }
  
  switch (name) {
    case 'Ghost':
      return <Ghost {...props} />
    case 'Skull':
      return <Skull {...props} />
    case 'Robot':
      return <Bot {...props} />
    case 'Cat':
      return <Cat {...props} />
    case 'Zap':
      return <Zap {...props} />
    case 'Crown':
      return <Crown {...props} />
    case 'Swords':
      return <Swords {...props} />
    case 'Gamepad':
      return <Gamepad2 {...props} />
    default:
      // Fallback in case name matches an emoji or other string
      if (name === '👻') return <Ghost {...props} />
      if (name === '👾' || name === '💀') return <Skull {...props} />
      if (name === '🤖') return <Bot {...props} />
      if (name === '🐱') return <Cat {...props} />
      if (name === '⚡') return <Zap {...props} />
      if (name === '👑') return <Crown {...props} />
      if (name === '⚔️') return <Swords {...props} />
      if (name === '🎮') return <Gamepad2 {...props} />
      
      return <Ghost {...props} />
  }
}
