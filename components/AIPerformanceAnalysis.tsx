'use client'

import React, { useState, useEffect } from 'react'

interface TechnicianPerformance {
  technician: string
  totalTickets: number
  currentLoad: number
  averageWaitTime: number
  completionRate: number
  averageCompletionTime?: number
  qualityScore?: number
}

interface PerformanceAnalysis {
  overallInsights: string[]
  topPerformers: string[]
  needsTraining: string[]
  recommendations: string[]
  efficiencyTrends: string[]
  workloadDistribution: string[]
}

export default function AIPerformanceAnalysis() {
  const [performanceData, setPerformanceData] = useState<TechnicianPerformance[]>([])
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Fetch tickets data to calculate performance metrics
      const ticketsResponse = await fetch('/api/tickets')
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch tickets')
      }
      const ticketsData = await ticketsResponse.json()
      
      // Calculate performance metrics from tickets
      const performanceMetrics = calculatePerformanceMetrics(ticketsData.tickets || [])
      setPerformanceData(performanceMetrics)
      
      // Generate AI analysis
      const aiAnalysis = await generateAIAnalysis(performanceMetrics)
      setAnalysis(aiAnalysis)
      
    } catch (err) {
      console.error('Error fetching performance data:', err)
      setError('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const calculatePerformanceMetrics = (tickets: any[]): TechnicianPerformance[] => {
    const technicianStats: Record<string, any> = {}
    const now = new Date()
    
    tickets.forEach(ticket => {
      const tech = ticket.assignedTo || 'Unassigned'
      if (!technicianStats[tech]) {
        technicianStats[tech] = {
          totalTickets: 0,
          completedTickets: 0,
          currentTickets: 0,
          waitTimes: [],
          completionTimes: []
        }
      }
      
      technicianStats[tech].totalTickets++
      
      if (ticket.status === 'Completed') {
        technicianStats[tech].completedTickets++
      } else {
        technicianStats[tech].currentTickets++
      }
      
      // Calculate wait time
      const ticketDate = new Date(ticket.timestamp)
      const waitTime = getBusinessHours(ticketDate, now)
      technicianStats[tech].waitTimes.push(waitTime)
    })
    
    return Object.entries(technicianStats).map(([tech, stats]) => ({
      technician: tech,
      totalTickets: stats?.totalTickets || 0,
      currentLoad: stats.currentTickets,
      averageWaitTime: stats.waitTimes.length > 0 
        ? stats.waitTimes.reduce((sum: number, time: number) => sum + time, 0) / stats.waitTimes.length 
        : 0,
      completionRate: (stats?.totalTickets || 0) > 0 ? (stats.completedTickets / (stats?.totalTickets || 1)) * 100 : 0
    }))
  }

  const getBusinessHours = (startDate: Date, endDate: Date): number => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    let hours = 0
    const current = new Date(start)
    
    while (current < end) {
      const dayOfWeek = current.getDay()
      const hour = current.getHours()
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17) {
        const nextHour = new Date(current)
        nextHour.setHours(current.getHours() + 1)
        
        if (nextHour > end) {
          hours += (end.getTime() - current.getTime()) / (1000 * 60 * 60)
        } else {
          hours += 1
        }
      }
      
      current.setHours(current.getHours() + 1)
    }
    
    return hours
  }

  const generateAIAnalysis = async (metrics: TechnicianPerformance[]): Promise<PerformanceAnalysis> => {
    try {
      const response = await fetch('/api/ai-performance-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceData: metrics })
      })

      if (response.ok) {
        return await response.json()
      } else {
        // Fallback analysis if AI API fails
        return generateFallbackAnalysis(metrics)
      }
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error)
      return generateFallbackAnalysis(metrics)
    }
  }

  const generateFallbackAnalysis = (metrics: TechnicianPerformance[]): PerformanceAnalysis => {
    const sortedByCompletion = [...metrics].sort((a, b) => b.completionRate - a.completionRate)
    const sortedByLoad = [...metrics].sort((a, b) => b.currentLoad - a.currentLoad)
    const sortedByWaitTime = [...metrics].sort((a, b) => a.averageWaitTime - b.averageWaitTime)
    
    const topPerformers = sortedByCompletion.slice(0, 2).map(tech => tech.technician)
    const needsTraining = sortedByCompletion.slice(-2).filter(tech => tech.completionRate < 70).map(tech => tech.technician)
    
    return {
      overallInsights: [
        `Total technicians: ${metrics.length}`,
        `Average completion rate: ${(metrics.reduce((sum, tech) => sum + tech.completionRate, 0) / metrics.length).toFixed(1)}%`,
        `Total active tickets: ${metrics.reduce((sum, tech) => sum + tech.currentLoad, 0)}`,
        `Average wait time: ${(metrics.reduce((sum, tech) => sum + tech.averageWaitTime, 0) / metrics.length).toFixed(1)} hours`
      ],
      topPerformers,
      needsTraining,
      recommendations: [
        'Implement peer mentoring between top and bottom performers',
        'Consider workload redistribution to balance technician capacity',
        'Set up regular performance review meetings',
        'Create training modules for common repair types'
      ],
      efficiencyTrends: [
        'Monitor completion rates weekly',
        'Track average wait times by technician',
        'Identify patterns in ticket types and completion times'
      ],
      workloadDistribution: [
        `Heaviest load: ${sortedByLoad[0]?.technician} (${sortedByLoad[0]?.currentLoad} tickets)`,
        `Lightest load: ${sortedByLoad[sortedByLoad.length - 1]?.technician} (${sortedByLoad[sortedByLoad.length - 1]?.currentLoad} tickets)`,
        'Consider redistributing tickets for better balance'
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-gray-600">Analyzing technician performance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Performance Analysis</h2>
            <p className="text-gray-600 mt-1">Intelligent insights into technician performance</p>
          </div>
          <button
            onClick={fetchPerformanceData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Analysis
          </button>
        </div>
      </div>

      {/* Overall Insights */}
      {analysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Overall Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.overallInsights.map((insight, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <span className="text-blue-800">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      {analysis && analysis.topPerformers.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">🏆 Top Performers</h3>
          <div className="space-y-2">
            {analysis.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  {index + 1}
                </div>
                <span className="text-green-800 font-medium">{performer}</span>
                <span className="text-green-600 ml-2">- Excellent performance</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Needs */}
      {analysis && analysis.needsTraining.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">📚 Training Recommendations</h3>
          <div className="space-y-2">
            {analysis.needsTraining.map((tech, index) => (
              <div key={index} className="flex items-center">
                <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  !
                </div>
                <span className="text-yellow-800 font-medium">{tech}</span>
                <span className="text-yellow-600 ml-2">- Would benefit from additional training</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">💡 AI Recommendations</h3>
          <div className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start">
                <div className="w-2 h-2 bg-purple-600 rounded-full mr-3 mt-2"></div>
                <span className="text-purple-800">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workload Distribution */}
      {analysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚖️ Workload Distribution</h3>
          <div className="space-y-2">
            {analysis.workloadDistribution.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2 h-2 bg-gray-600 rounded-full mr-3"></div>
                <span className="text-gray-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Detailed Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Load</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Wait Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.map((tech) => (
                <tr key={tech.technician}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tech.technician}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech?.totalTickets || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.currentLoad}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.averageWaitTime.toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tech.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                      tech.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tech.completionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tech.completionRate >= 80 ? '🟢 Excellent' :
                     tech.completionRate >= 60 ? '🟡 Good' : '🔴 Needs Improvement'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}