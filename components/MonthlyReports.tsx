'use client'

import React, { useState, useEffect } from 'react'
import { DailyStats, TechnicianPerformance, DailyWorkLog, fetchActivityLogs, processActivityLogs, calculateMonthlyPerformance, generateDailyWorkLogs } from '@/lib/performance'

interface MonthlyReportsProps {
  onClose?: () => void
}

export default function MonthlyReports({ onClose }: MonthlyReportsProps) {
  const [performanceData, setPerformanceData] = useState<TechnicianPerformance[]>([])
  const [dailyWorkLogs, setDailyWorkLogs] = useState<DailyWorkLog[]>([])
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [showWorkLogs, setShowWorkLogs] = useState(false)

  useEffect(() => {
    fetchMonthlyData()
  }, [selectedMonth, selectedYear])

  const fetchMonthlyData = async () => {
    setLoading(true)
    try {
      // Calculate date range for the month
      const startDate = new Date(selectedYear, selectedMonth, 1)
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
      
      // Fetch real activity logs
      const activityLogs = await fetchActivityLogs(startDate, endDate)
      const dailyStats = processActivityLogs(activityLogs)
      const monthlyPerformance = calculateMonthlyPerformance(dailyStats)
      const workLogs = generateDailyWorkLogs(activityLogs)
      
      setPerformanceData(monthlyPerformance)
      setDailyWorkLogs(workLogs)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
      setPerformanceData([])
      setDailyWorkLogs([])
    } finally {
      setLoading(false)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDetailedStats = () => {
    if (selectedTechnician === 'all') {
      return performanceData
    }
    return performanceData.filter(tech => tech.name === selectedTechnician)
  }

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getEfficiencyTrend = (dailyStats: DailyStats[]) => {
    const recent = dailyStats.slice(-7) // Last 7 days
    const avg = recent.reduce((sum, day) => sum + day.efficiency, 0) / recent.length
    const firstWeek = dailyStats.slice(0, 7).reduce((sum, day) => sum + day.efficiency, 0) / 7
    
    return avg > firstWeek ? 'trending-up' : avg < firstWeek ? 'trending-down' : 'stable'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading monthly reports...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Monthly Performance Report</h2>
              <p className="text-green-100">
                {monthNames[selectedMonth]} {selectedYear} - Detailed Analytics
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
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="bg-white text-gray-900 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Technicians</option>
                {performanceData.map(tech => (
                  <option key={tech.name} value={tech.name}>{tech.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowWorkLogs(!showWorkLogs)}
                className={`px-3 py-1 text-sm rounded ${
                  showWorkLogs ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700'
                }`}
              >
                {showWorkLogs ? 'Hide' : 'Show'} Daily Logs
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Work Hours</div>
              <div className="text-2xl font-bold text-blue-600">
                {performanceData.reduce((sum, tech) => sum + tech.monthlyTotals.totalActiveHours, 0)}h
              </div>
              <div className="text-xs text-gray-500">Across all technicians</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Avg Team Efficiency</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(performanceData.reduce((sum, tech) => sum + tech.monthlyTotals.avgEfficiency, 0) / performanceData.length)}%
              </div>
              <div className="text-xs text-gray-500">8-hour work day basis</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Tickets</div>
              <div className="text-2xl font-bold text-purple-600">
                {performanceData.reduce((sum, tech) => sum + tech.monthlyTotals.ticketsCompleted, 0)}
              </div>
              <div className="text-xs text-gray-500">Completed this month</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Team Avg Repair</div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(performanceData.reduce((sum, tech) => sum + tech.monthlyTotals.avgRepairTime, 0) / performanceData.length)}m
              </div>
              <div className="text-xs text-gray-500">Per ticket average</div>
            </div>
          </div>
        </div>

        {/* Detailed Performance Table */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Performance Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Technician</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Work Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Efficiency</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tickets</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Repair</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Performance Score</th>
                </tr>
              </thead>
              <tbody>
                {getDetailedStats().map((tech) => {
                  const trend = getEfficiencyTrend(tech.dailyStats)
                  const performanceScore = Math.round((tech.monthlyTotals.avgEfficiency * 0.4) + 
                    (tech.monthlyTotals.ticketsCompleted * 2) + 
                    (Math.max(0, 60 - tech.monthlyTotals.avgRepairTime) * 0.5))
                  
                  return (
                    <tr key={tech.name} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{tech.name}</div>
                        <div className="text-sm text-gray-500">Rank #{tech.monthlyTotals.rank}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{tech.monthlyTotals.totalActiveHours}h</div>
                        <div className="text-sm text-gray-500">
                          {tech.dailyStats.length} active days
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            tech.monthlyTotals.avgEfficiency >= 85 ? 'bg-green-100 text-green-800' :
                            tech.monthlyTotals.avgEfficiency >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tech.monthlyTotals.avgEfficiency}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Avg daily activity
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{tech.monthlyTotals.ticketsCompleted}</div>
                        <div className="text-sm text-gray-500">
                          {(tech.monthlyTotals.ticketsCompleted / tech.dailyStats.length).toFixed(1)}/day avg
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{tech.monthlyTotals.avgRepairTime}m</div>
                        <div className="text-sm text-gray-500">per ticket</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          {trend === 'trending-up' && (
                            <span className="text-green-600">📈 Improving</span>
                          )}
                          {trend === 'trending-down' && (
                            <span className="text-red-600">📉 Declining</span>
                          )}
                          {trend === 'stable' && (
                            <span className="text-blue-600">➡️ Stable</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`text-lg font-bold ${
                          performanceScore >= 80 ? 'text-green-600' :
                          performanceScore >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {performanceScore}
                        </div>
                        <div className="text-xs text-gray-500">composite score</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Work Logs Section */}
        {showWorkLogs && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Work Logs</h3>
            <p className="text-sm text-gray-600 mb-4">
              Technician start/finish times and daily work tracking
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Technician</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Start Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Finish Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Total Hours</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyWorkLogs
                    .filter(log => selectedTechnician === 'all' || log.technicianName === selectedTechnician)
                    .slice(0, 30) // Show last 30 days
                    .map((log, index) => (
                    <tr key={`${log.technicianName}-${log.date}`} className="border-b border-gray-100">
                      <td className="py-2 px-3">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-medium">{log.technicianName}</td>
                      <td className="py-2 px-3">
                        {log.startTime ? new Date(log.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                      </td>
                      <td className="py-2 px-3">
                        {log.endTime ? new Date(log.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {log.totalHours > 0 ? `${log.totalHours.toFixed(1)}h` : '-'}
                      </td>
                      <td className="py-2 px-3">
                        {log.startTime && log.endTime ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Complete
                          </span>
                        ) : log.startTime ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            No Activity
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dailyWorkLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 px-3 text-center text-gray-500">
                        No work log data available. Activity tracking may not be enabled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Breakdown (if single technician selected) */}
        {selectedTechnician !== 'all' && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Activity Breakdown - {selectedTechnician}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Active Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Break Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Idle Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Efficiency</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.find(tech => tech.name === selectedTechnician)?.dailyStats
                    .slice(-14) // Show last 14 days
                    .map((day) => (
                    <tr key={day.date} className="border-b border-gray-100">
                      <td className="py-2 px-3">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-medium">{formatHours(day.totalActiveMinutes)}</td>
                      <td className="py-2 px-3">{formatHours(day.breakMinutes)}</td>
                      <td className="py-2 px-3">{formatHours(day.idleMinutes)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          day.efficiency >= 85 ? 'bg-green-100 text-green-800' :
                          day.efficiency >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {day.efficiency}%
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium">{day.ticketsCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Export functionality
                console.log('Export monthly report')
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export Report
            </button>
            <button
              onClick={() => {
                // Print functionality
                window.print()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print Report
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
    </div>
  )
}