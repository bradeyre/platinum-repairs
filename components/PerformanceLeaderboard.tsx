'use client'

import React, { useState, useEffect } from 'react'
import TimeTrackingReport from './TimeTrackingReport'
import ResetStatsModal from './ResetStatsModal'

interface TechnicianStats {
  name: string
  workMinutes: number
  efficiency: number
  ticketsCompleted: number
  avgRepairTime: number
  monthlyHours: number
  rank: number
  isTopPerformer?: boolean
}

interface PerformanceLeaderboardProps {
  onClose?: () => void
}

export default function PerformanceLeaderboard({ onClose }: PerformanceLeaderboardProps) {
  const [techStats, setTechStats] = useState<TechnicianStats[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())
  const [showCelebration, setShowCelebration] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTimeTrackingModal, setShowTimeTrackingModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  useEffect(() => {
    fetchPerformanceData()
  }, [selectedMonth, selectedYear])

  const fetchPerformanceData = async () => {
    setLoading(true)
    try {
      // Fetch real performance data from API
      const response = await fetch(`/api/performance?month=${selectedMonth}&year=${selectedYear}`)
      if (!response.ok) {
        throw new Error('Failed to fetch performance data')
      }
      
      const data = await response.json()
      setTechStats(data.technicians || [])
      
      // Trigger celebration for top performer
      if (data.technicians?.[0]?.isTopPerformer) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      setTechStats([]) // No mock data - show empty if API fails
    } finally {
      setLoading(false)
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return 'text-green-600 bg-green-100'
    if (efficiency >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading performance data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Celebration Animation */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="celebration-animation flex items-center justify-center h-full">
              <div className="text-6xl animate-bounce">🎉</div>
              <div className="text-4xl font-bold text-yellow-500 ml-4 animate-pulse">
                Top Performer!
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Technician Performance Leaderboard</h2>
              <p className="text-blue-100">
                {monthNames[selectedMonth]} {selectedYear} - 8 Hour Activity Monitoring
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white text-gray-900 rounded px-3 py-1 text-sm"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Performance Stats Overview */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Active Hours</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatMinutesToHours(techStats.reduce((sum, tech) => sum + tech.workMinutes, 0))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Efficiency</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(techStats.reduce((sum, tech) => sum + tech.efficiency, 0) / techStats.length)}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Tickets Completed</div>
              <div className="text-2xl font-bold text-purple-600">
                {techStats.reduce((sum, tech) => sum + tech.ticketsCompleted, 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Repair Time</div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(techStats.reduce((sum, tech) => sum + tech.avgRepairTime, 0) / techStats.length)}m
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Technician</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Daily Activity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Efficiency</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tickets</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Repair</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Monthly Hours</th>
                </tr>
              </thead>
              <tbody>
                {techStats.map((tech, index) => (
                  <tr
                    key={tech.name}
                    className={`border-b hover:bg-gray-50 ${
                      tech.rank === 1 ? 'bg-yellow-50 border-yellow-200' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${
                          tech.rank === 1 ? 'text-yellow-500' :
                          tech.rank === 2 ? 'text-gray-400' :
                          tech.rank === 3 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {tech.rank}
                        </span>
                        {tech.rank === 1 && <span className="ml-2 text-yellow-500">🏆</span>}
                        {tech.rank === 2 && <span className="ml-2 text-gray-400">🥈</span>}
                        {tech.rank === 3 && <span className="ml-2 text-orange-600">🥉</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{tech.name}</div>
                      {tech.isTopPerformer && (
                        <div className="text-xs text-yellow-600 font-semibold">⭐ Top Performer</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium">{formatMinutesToHours(tech.workMinutes)}</div>
                      <div className="text-sm text-gray-500">of 8h day</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            tech.efficiency >= 85 ? 'bg-green-500' :
                            tech.efficiency >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${(tech.workMinutes / 480) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getEfficiencyColor(tech.efficiency)}`}>
                        {tech.efficiency}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{tech.ticketsCompleted}</div>
                      <div className="text-sm text-gray-500">completed</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{tech.avgRepairTime}m</div>
                      <div className="text-sm text-gray-500">average</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{tech.monthlyHours}h</div>
                      <div className="text-sm text-gray-500">this month</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowTimeTrackingModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              ⏱️ Time Tracking Report
            </button>
            <button
              onClick={() => {
                // Export functionality could be added here
                console.log('Export performance data')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              📊 Export Report
            </button>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑️ Reset All Data
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Time Tracking Modal */}
      {showTimeTrackingModal && (
        <TimeTrackingReport onClose={() => setShowTimeTrackingModal(false)} />
      )}
      
      {/* Reset Modal */}
      {showResetModal && (
        <ResetStatsModal onClose={() => setShowResetModal(false)} />
      )}
      </div>
    </div>
  )
}