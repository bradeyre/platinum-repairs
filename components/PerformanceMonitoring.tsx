'use client'

import React, { useState, useEffect } from 'react'

interface PerformanceAlert {
  id: string
  type: 'warning' | 'critical' | 'info' | 'success'
  title: string
  message: string
  timestamp: Date
  technicianId?: string
  ticketId?: string
  acknowledged: boolean
}

interface TechnicianPerformance {
  technicianId: string
  technicianName: string
  totalTickets: number
  averageWaitTime: number
  efficiencyScore: number
  performanceGrade: string
  todayTickets: number
  todayHours: number
  isOnline: boolean
  lastActivity: Date
}

interface PerformanceMonitoringProps {
  refreshInterval?: number // in milliseconds
}

export default function PerformanceMonitoring({ refreshInterval = 30000 }: PerformanceMonitoringProps) {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [technicianPerformance, setTechnicianPerformance] = useState<TechnicianPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Fetch technician performance data
      const performanceResponse = await fetch('/api/performance-analytics')
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json()
        setTechnicianPerformance(performanceData.analytics?.technicianStats || [])
      }

      // Generate alerts based on performance data
      generateAlerts()

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate performance alerts
  const generateAlerts = () => {
    const newAlerts: PerformanceAlert[] = []

    technicianPerformance.forEach(tech => {
      // Critical alerts
      if (tech.averageWaitTime > 8) {
        newAlerts.push({
          id: `critical-wait-${tech.technicianId}`,
          type: 'critical',
          title: 'Critical Wait Time Alert',
          message: `${tech.technicianName} has an average wait time of ${tech.averageWaitTime.toFixed(1)} hours. Immediate attention required.`,
          timestamp: new Date(),
          technicianId: tech.technicianId,
          acknowledged: false
        })
      }

      // Warning alerts
      if (tech.averageWaitTime > 4 && tech.averageWaitTime <= 8) {
        newAlerts.push({
          id: `warning-wait-${tech.technicianId}`,
          type: 'warning',
          title: 'High Wait Time Warning',
          message: `${tech.technicianName} has an average wait time of ${tech.averageWaitTime.toFixed(1)} hours. Consider providing support.`,
          timestamp: new Date(),
          technicianId: tech.technicianId,
          acknowledged: false
        })
      }

      // Efficiency alerts
      if (tech.efficiencyScore < 40) {
        newAlerts.push({
          id: `efficiency-${tech.technicianId}`,
          type: 'warning',
          title: 'Low Efficiency Alert',
          message: `${tech.technicianName} has a low efficiency score of ${tech.efficiencyScore}%. Consider training or support.`,
          timestamp: new Date(),
          technicianId: tech.technicianId,
          acknowledged: false
        })
      }

      // Success alerts
      if (tech.efficiencyScore >= 90 && tech.averageWaitTime < 2) {
        newAlerts.push({
          id: `success-${tech.technicianId}`,
          type: 'success',
          title: 'Excellent Performance',
          message: `${tech.technicianName} is performing excellently with ${tech.efficiencyScore}% efficiency and ${tech.averageWaitTime.toFixed(1)}h average wait time.`,
          timestamp: new Date(),
          technicianId: tech.technicianId,
          acknowledged: false
        })
      }

      // Offline alerts
      if (!tech.isOnline && tech.lastActivity) {
        const hoursOffline = (new Date().getTime() - new Date(tech.lastActivity).getTime()) / (1000 * 60 * 60)
        if (hoursOffline > 2) {
          newAlerts.push({
            id: `offline-${tech.technicianId}`,
            type: 'warning',
            title: 'Technician Offline',
            message: `${tech.technicianName} has been offline for ${hoursOffline.toFixed(1)} hours.`,
            timestamp: new Date(),
            technicianId: tech.technicianId,
            acknowledged: false
          })
        }
      }
    })

    // Remove duplicate alerts and update state
    setAlerts(prevAlerts => {
      const existingIds = new Set(prevAlerts.map(alert => alert.id))
      const newUniqueAlerts = newAlerts.filter(alert => !existingIds.has(alert.id))
      return [...prevAlerts, ...newUniqueAlerts].slice(-50) // Keep last 50 alerts
    })
  }

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  // Clear all acknowledged alerts
  const clearAcknowledgedAlerts = () => {
    setAlerts(prev => prev.filter(alert => !alert.acknowledged))
  }

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'success': return '✅'
      default: return '📢'
    }
  }

  // Get alert color classes
  const getAlertClasses = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  // Initial load and setup refresh interval
  useEffect(() => {
    fetchPerformanceData()
    
    const interval = setInterval(fetchPerformanceData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  const criticalAlerts = unacknowledgedAlerts.filter(alert => alert.type === 'critical')
  const warningAlerts = unacknowledgedAlerts.filter(alert => alert.type === 'warning')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitoring</h2>
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {loading && <span className="ml-2 text-blue-600">Updating...</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
          {alerts.some(alert => alert.acknowledged) && (
            <button
              onClick={clearAcknowledgedAlerts}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Acknowledged
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="text-2xl">🚨</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="text-2xl">⚠️</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="text-2xl">👥</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Technicians</p>
              <p className="text-2xl font-bold text-blue-600">
                {technicianPerformance.filter(tech => tech.isOnline).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="text-2xl">📊</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-bold text-green-600">
                {technicianPerformance.length > 0 
                  ? Math.round(technicianPerformance.reduce((sum, tech) => sum + tech.efficiencyScore, 0) / technicianPerformance.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {unacknowledgedAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className={`p-4 border-l-4 ${getAlertClasses(alert.type)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="text-xl mr-3">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs mt-2 text-gray-500">
                        {alert.timestamp.toLocaleString()}
                        {alert.technicianId && ` • Technician: ${alert.technicianId}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-4 px-3 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technician Performance Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Technician Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Wait Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Today's Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {technicianPerformance.map((tech) => (
                <tr key={tech.technicianId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        tech.isOnline ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tech.technicianName}</div>
                        <div className="text-sm text-gray-500">{tech.technicianId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tech.isOnline 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tech.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            tech.efficiencyScore >= 80 ? 'bg-green-500' :
                            tech.efficiencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${tech.efficiencyScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{tech.efficiencyScore}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tech.averageWaitTime.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tech.todayTickets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tech.performanceGrade === 'Excellent' ? 'bg-green-100 text-green-800' :
                      tech.performanceGrade === 'Good' ? 'bg-blue-100 text-blue-800' :
                      tech.performanceGrade === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tech.performanceGrade}
                    </span>
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
