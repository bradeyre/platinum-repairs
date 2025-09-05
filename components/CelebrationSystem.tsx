'use client'

import React, { useState, useEffect } from 'react'

interface CelebrationProps {
  techName: string
  action: string
  context?: any
  onComplete?: () => void
}

export function CelebrationSystem({ techName, action, context, onComplete }: CelebrationProps) {
  const [message, setMessage] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationType, setCelebrationType] = useState<'completion' | 'milestone' | 'efficiency'>('completion')

  useEffect(() => {
    if (techName && action) {
      generateCelebration()
    }
  }, [techName, action, context])

  const encouragementMessages = {
    completion: [
      "🎉 {name}, another one bites the dust!",
      "⚡ {name}, you're on fire today!",
      "🚀 {name}, crushing it as always!",
      "💪 {name}, that's how it's done!",
      "🌟 {name}, you make it look easy!",
      "🎯 {name}, bullseye! Another one completed!",
      "🏆 {name}, champion level work!",
      "🔥 {name}, you're unstoppable!",
      "💎 {name}, pure excellence!",
      "🎊 {name}, celebrate this win!"
    ],
    milestone: [
      "🏆 {name} just hit {count} completions! Legend!",
      "🎉 {name} is crushing it with {count} assessments!",
      "⭐ {name}, {count} down and counting!",
      "🚀 {name}, {count} tickets conquered!",
      "💪 {name}, {count} victories and still going!",
      "🎯 {name}, {count} perfect shots!",
      "🌟 {name}, {count} stars earned today!",
      "🔥 {name}, {count} fires extinguished!",
      "🎉 {name} is crushing it with {count} assessments!"
    ],
    efficiency: [
      "⚡ {name}, you're working at superhero speed!",
      "🚀 {name}, your efficiency is off the charts!",
      "💨 {name}, you're faster than a speeding bullet!",
      "🎯 {name}, you're hitting every target perfectly!",
      "🔥 {name}, you're burning through tasks like wildfire!",
      "🌟 {name}, your productivity is stellar!",
      "💪 {name}, you're a productivity powerhouse!",
      "🏆 {name}, you're the efficiency champion!",
      "🎊 {name}, you're making productivity look fun!",
      "🎉 {name}, you're the speed demon of repairs!"
    ]
  }

  const generateCelebration = () => {
    let type: 'completion' | 'milestone' | 'efficiency' = 'completion'
    
    if (action.includes('milestone') || action.includes('count')) {
      type = 'milestone'
    } else if (action.includes('efficiency') || action.includes('speed')) {
      type = 'efficiency'
    }
    
    setCelebrationType(type)
    
    const messages = encouragementMessages[type]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    
    let processedMessage = randomMessage
      .replace('{name}', techName)
      .replace('{count}', context?.count?.toString() || '1')
      .replace('{action}', action)
    
    setMessage(processedMessage)
    setShowCelebration(true)
    
    // Play success sound
    playSuccessSound()
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setShowCelebration(false)
      if (onComplete) onComplete()
    }, 4000)
  }

  const playSuccessSound = () => {
    // Create audio context and play success sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Success sound: C-E-G chord
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Fallback: no sound if audio context fails
      console.log('Audio not supported')
    }
  }

  const triggerConfetti = () => {
    // Create confetti particles
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a55eea']
    const particles = []
    
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div')
      particle.className = 'confetti-particle'
      particle.style.cssText = `
        position: fixed;
        width: 8px;
        height: 8px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        z-index: 10000;
        pointer-events: none;
        border-radius: 50%;
        left: ${Math.random() * window.innerWidth}px;
        top: -10px;
        animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
      `
      
      document.body.appendChild(particle)
      particles.push(particle)
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
        }
      }, 5000)
    }
  }

  useEffect(() => {
    if (showCelebration && celebrationType === 'milestone') {
      triggerConfetti()
    }
  }, [showCelebration, celebrationType])

  if (!showCelebration) return null

  return (
    <>
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        
        @keyframes celebration-bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-30px); }
          60% { transform: translateY(-15px); }
        }
        
        @keyframes celebration-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
        }
      `}</style>
      
      <div className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none ${
        celebrationType === 'milestone' ? 'bg-black bg-opacity-20' : ''
      }`}>
        <div className={`
          bg-gradient-to-r from-yellow-400 to-orange-500 
          text-white text-xl font-bold p-6 rounded-lg shadow-2xl
          transform transition-all duration-500 animate-bounce
          ${celebrationType === 'efficiency' ? 'from-blue-400 to-purple-500' : ''}
          ${celebrationType === 'milestone' ? 'from-purple-400 to-pink-500 text-2xl p-8' : ''}
        `} style={{
          animation: 'celebration-bounce 0.6s ease-in-out, celebration-glow 2s ease-in-out infinite'
        }}>
          <div className="text-center">
            {celebrationType === 'milestone' && (
              <div className="text-4xl mb-2">🏆</div>
            )}
            {celebrationType === 'efficiency' && (
              <div className="text-4xl mb-2">⚡</div>
            )}
            {celebrationType === 'completion' && (
              <div className="text-4xl mb-2">🎉</div>
            )}
            <div>{message}</div>
          </div>
        </div>
      </div>
    </>
  )
}

// Global celebration trigger function
let celebrationInstance: any = null

export const triggerCelebration = (techName: string, action: string, context?: any) => {
  // Create celebration component and mount it
  const container = document.createElement('div')
  container.id = 'celebration-container'
  document.body.appendChild(container)
  
  // Import React and render celebration
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(container)
    root.render(
      React.createElement(CelebrationSystem, {
        techName,
        action,
        context,
        onComplete: () => {
          root.unmount()
          if (container.parentNode) {
            container.parentNode.removeChild(container)
          }
        }
      })
    )
  })
}

export default CelebrationSystem