'use client'

import React, { useState, useEffect } from 'react'

interface TimeTrackingEntry {
  id: string
  ticketId: string
  technicianId: string
  technicianName: string
  startTime: Date
  endTime?: Date
  duration?: number // in seconds
  status: 'active' | 'paused' | 'completed'
  workType: 'repair' | 'damage_report' | 'testing' | 'other'
  description: string
  productivityScore?: number
}

interface ProductivityMetrics {
  technicianId: string
  technicianName: string
  totalActiveTime: number // in seconds
  totalPausedTime: number // in seconds
  totalCompletedTime: number // in seconds
  averageSessionLength: number // in seconds
  productivityScore: number // 0-100
  efficiencyRating: string
  todayHours: number
  weeklyHours: number
  monthlyHours: number
  ticketsCompleted: number
  averageTimePerTicket: number // in seconds
}

interface EnhancedTimeTrackingProps {
  technicianId?: string
  showAllTechnicians?: boolean
}

export default function EnhancedTimeTracking({ technicianId, showAllTechnicians = false }: EnhancedTimeTrackingProps) {
  const [timeEntries, setTimeEntries] = useState<TimeTrackingEntry[]>([])
  const [productivityMetrics, setProductivityMetrics] = useState<ProductivityMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTechnician, setSelectedTechnician] = useState(technicianId || '')

  // Fetch time tracking data
  const fetchTimeTrackingData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (selectedDate) params.append('date', selectedDate)
      if (selectedTechnician) params.append('technicianId', selectedTechnician)
      if (showAllTechnicians) params.append('showAll', 'true')

      const response = await fetch(`/api/time-tracking?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTimeEntries(data.entries || [])
        setProductivityMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error('Error fetching time tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate productivity insights
  const calculateProductivityInsights = () => {
    if (productivityMetrics.length === 0) return null

    const totalTechnicians = productivityMetrics.length
    const avgProductivity = productivityMetrics.reduce((sum, tech) => sum + tech.productivityScore, 0) / totalTechnicians
    const topPerformer = productivityMetrics.reduce((top, tech) => 
      tech.productivityScore > top.productivityScore ? tech : top
    )
    const needsImprovement = productivityMetrics.filter(tech => tech.productivityScore < 60)

    return {
      averageProductivity: Math.round(avgProductivity),
      topPerformer,
      needsImprovement: needsImprovement.length,
      totalActiveHours: productivityMetrics.reduce((sum, tech) => sum + tech.todayHours, 0)
    }
  }

  // Format time duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get productivity color
  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // Get efficiency rating color
  const getEfficiencyColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Average': return 'bg-yellow-100 text-yellow-800'
      case 'Needs Improvement': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    fetchTimeTrackingData()
  }, [selectedDate, selectedTechnician, showAllTechnicians])

  const insights = calculateProductivityInsights()

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Time Tracking</h2>
          <p className="text-sm text-gray-600">Monitor productivity and work efficiency</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {showAllTechnicians && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Technicians</option>
                {productivityMetrics.map(tech => (
                  <option key={tech.technicianId} value={tech.technicianId}>
                    {tech.technicianName}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-end">
            <button
              onClick={fetchTimeTrackingData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Productivity Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="text-2xl">📊</div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Productivity</p>
                <p className="text-2xl font-bold text-blue-600">{insights.averageProductivity}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="text-2xl">🏆</div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-green-600">{insights.topPerformer.technicianName}</p>
                <p className="text-xs text-gray-500">{insights.topPerformer.productivityScore}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="text-2xl">⚠️</div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Need Improvement</p>
                <p className="text-2xl font-bold text-yellow-600">{insights.needsImprovement}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="text-2xl">⏱️</div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Active Hours</p>
                <p className="text-2xl font-bold text-purple-600">{insights.totalActiveHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productivity Metrics Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Productivity Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Today's Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time/Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productivity Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency Rating
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productivityMetrics.map((tech) => (
                <tr key={tech.technicianId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tech.technicianName}</div>
                    <div className="text-sm text-gray-500">{tech.technicianId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tech.todayHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tech.ticketsCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(tech.averageTimePerTicket)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            tech.productivityScore >= 80 ? 'bg-green-500' :
                            tech.productivityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${tech.productivityScore}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium px-2 py-1 rounded ${getProductivityColor(tech.productivityScore)}`}>
                        {tech.productivityScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(tech.efficiencyRating)}`}>
                      {tech.efficiencyRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Time Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Time Entries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {timeEntries.filter(entry => entry.status === 'active').map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.technicianName} - {entry.ticketId}
                    </div>
                    <div className="text-sm text-gray-500">{entry.description}</div>
                    <div className="text-xs text-gray-400">
                      Started: {new Date(entry.startTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDuration(Math.floor((new Date().getTime() - new Date(entry.startTime).getTime()) / 1000))}
                  </div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
              </div>
            </div>
          ))}
          
          {timeEntries.filter(entry => entry.status === 'active').length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">⏸️</div>
              <p>No active time entries</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Completed Entries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Completed Work</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {timeEntries.filter(entry => entry.status === 'completed').slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.technicianName} - {entry.ticketId}
                    </div>
                    <div className="text-sm text-gray-500">{entry.description}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(entry.startTime).toLocaleString()} - {entry.endTime ? new Date(entry.endTime).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {entry.duration ? formatDuration(entry.duration) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{entry.workType.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
          ))}
          
          {timeEntries.filter(entry => entry.status === 'completed').length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No completed entries for this date</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
