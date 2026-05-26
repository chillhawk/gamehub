// Confetti celebration utility using canvas-confetti
import confetti from 'canvas-confetti'

export function celebrate() {
  // Party burst
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#a8e63d', '#c084fc', '#f87171', '#38bdf8', '#facc15'],
    ticks: 200
  })
  
  // Side cannons
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors: ['#a8e63d', '#c084fc'] })
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors: ['#f87171', '#facc15'] })
  }, 250)
}

export function shootStar() {
  // Single star burst for minor achievements
  confetti({
    particleCount: 30,
    spread: 40,
    origin: { y: 0.5 },
    colors: ['#facc15', '#fbbf24', '#f59e0b'],
    shapes: ['star'],
    gravity: 0.8
  })
}
