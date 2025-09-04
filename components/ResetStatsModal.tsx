'use client'

import React, { useState } from 'react'

interface ResetStatsModalProps {
  onClose: () => void
}

export default function ResetStatsModal({ onClose }: ResetStatsModalProps) {
  const [password, setPassword] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handlePasswordSubmit = () => {
    if (password === 'BradEyre') {
      setShowConfirmation(true)
    } else {
      alert('Incorrect password. Access denied.')
      setPassword('')
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    
    try {
      // Clear all localStorage data
      const keysToRemove = [
        'ticket_assignments',
        'tech_completions',
        'monthly_stats',
        'completed_damage_reports',
        'action_items',
        'checklist_data',
        'authenticatedTech',
        'performance_data',
        'activity_logs',
        'time_tracking_data',
        'technician_stats'
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      // Clear any cached API data
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }
      
      // Clear session storage as well
      sessionStorage.clear()
      
      // Show success message
      alert(`✅ SYSTEM RESET COMPLETE!

All data has been cleared:
• Ticket assignments
• Technician completion counts  
• Monthly performance stats
• Damage report data
• Action item progress
• Checklist data
• Authentication tokens
• Performance tracking data

The system is now ready for team handover.

Page will reload to reflect changes...`)
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('Error during reset:', error)
      alert('Error occurred during reset. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-600 mb-4">FINAL CONFIRMATION</h2>
            <p className="text-gray-700 mb-4">
              Password correct! Are you absolutely sure you want to reset ALL stats and data?
            </p>
            <div className="text-left bg-red-50 p-4 rounded-lg mb-4">
              <p className="font-semibold text-red-800 mb-2">This action will permanently delete:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All ticket assignments</li>
                <li>• All completion counts</li>
                <li>• All action item progress</li>
                <li>• All checklist data</li>
                <li>• All monthly stats</li>
                <li>• All performance tracking data</li>
                <li>• All authentication tokens</li>
              </ul>
              <p className="font-semibold text-red-800 mt-3">
                This cannot be undone and should only be done before handing over to the team.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Resetting...
                </>
              ) : (
                '🗑️ YES, DELETE ALL DATA'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isResetting}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reset All Stats & Data</h2>
          <p className="text-gray-600">Enter password to proceed with system reset</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter reset password..."
              autoFocus
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handlePasswordSubmit}
              disabled={!password}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          This action is irreversible. Only proceed if you're certain.
        </div>
      </div>
    </div>
  )
}