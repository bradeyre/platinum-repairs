'use client'

import React, { useState, useEffect } from 'react'

interface TicketLifecycleData {
  ticket_id: string
  ticket_number: string
  current_status: string
  assigned_technician_name: string
  created_at: string
  completed_at: string
  total_duration_seconds: number
  active_work_time_seconds: number
  waiting_time_seconds: number
  is_rework: boolean
  rework_count: number
  repair_type: string
  device_info: string
  total_hours: number
  active_work_hours: number
  waiting_hours: number
  status_change_count: number
  comment_count: number
}

interface TechnicianPerformanceData {
  assigned_technician_name: string
  total_tickets: number
  completed_tickets: number
  rework_tickets: number
  avg_completion_hours: number
  avg_active_work_hours: number
  avg_waiting_hours: number
  total_work_hours: number
  completion_rate: number
  rework_rate: number
  device_expertise: Record<string, number>
}

interface ComprehensiveAnalyticsData {
  summary: {
    totalTickets: number
    completedTickets: number
    activeTickets: number
    reworkTickets: number
    avgCompletionTime: number
    avgActiveWorkTime: number
    avgWaitingTime: number
    totalWorkHours: number
    overallReworkRate: number
    totalTechnicians: number
  }
  technicianPerformance: TechnicianPerformanceData[]
  deviceAnalytics: {
    [deviceType: string]: {
      totalRepairs: number
      avgCompletionTime: number
      reworkRate: number
      topTechnicians: string[]
    }
  }
  repairTypeAnalytics: {
    [repairType: string]: {
      totalRepairs: number
      avgCompletionTime: number
      reworkRate: number
      difficulty: 'easy' | 'medium' | 'hard'
    }
  }
  timeAnalytics: {
    dailyPerformance: Record<string, {
      ticketsCompleted: number
      avgCompletionTime: number
      reworkRate: number
    }>
    hourlyPatterns: Record<string, number>
    peakHours: string[]
  }
  reworkAnalytics: {
    totalReworks: number
    reworkRate: number
    topReworkReasons: string[]
    reworkByTechnician: Record<string, number>
    reworkByDevice: Record<string, number>
    avgReworkTime: number
  }
}

export default function ComprehensiveAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<ComprehensiveAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [lastSyncTime, setLastSyncTime] = useState<string>('')
  const [schemaStatus, setSchemaStatus] = useState<string>('')

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, check if we have ticket lifecycle data
      const response = await fetch('/api/analytics/ticket-lifecycle-summary')
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Database schema not set up. Please run the SQL schema first.')
          setSchemaStatus('Schema missing - run ticket-lifecycle-schema-working.sql in Supabase')
        } else if (response.status === 401 || response.status === 403) {
          setError('Authentication required. Please disable Vercel deployment protection or use bypass token.')
          setSchemaStatus('Authentication issue - check Vercel deployment settings')
        } else {
          throw new Error('Failed to fetch analytics data')
        }
        return
      }
      
      const data = await response.json()
      setAnalyticsData(data)
      setSchemaStatus('Schema ready')
      
    } catch (err) {
      console.error('Error fetching comprehensive analytics:', err)
      setError('Failed to load analytics data. You may need to sync RepairShopr data first.')
      setSchemaStatus('Error - check database connection')
    } finally {
      setLoading(false)
    }
  }

  const testSchema = async () => {
    try {
      setSchemaStatus('Testing schema...')
      const response = await fetch('/api/analytics/test-schema')
      const result = await response.json()
      
      if (result.success) {
        setSchemaStatus('✅ Schema is ready')
        setError(null)
        // Refresh analytics data
        await fetchAnalyticsData()
      } else {
        setSchemaStatus('❌ Schema issue: ' + result.message)
        setError(result.message)
      }
    } catch (err) {
      setSchemaStatus('❌ Schema test failed')
      setError('Failed to test schema')
    }
  }

  const syncRepairShoprData = async (syncType: string = 'smart') => {
    try {
      setSyncStatus('Syncing RepairShopr data...')
      
      const response = await fetch('/api/sync/smart-repairshopr-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: syncType,
          maxAge: 7, // Only sync tickets completed at least 1 week ago
          priority: 'all'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync RepairShopr data')
      }
      
      const result = await response.json()
      setSyncStatus(`Sync completed: ${result.stats.processed} tickets processed`)
      setLastSyncTime(new Date().toLocaleString())
      
      // Refresh analytics data after sync
      await fetchAnalyticsData()
      
    } catch (err) {
      console.error('Error syncing RepairShopr data:', err)
      setSyncStatus('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-gray-600">Loading comprehensive analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="text-red-600 mr-2">⚠️</div>
          <span className="text-red-800 font-semibold">Analytics Data Not Available</span>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">📋 Setup Instructions</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Go to your <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
              <li>Copy and paste the contents of <strong>ticket-lifecycle-schema-safe.sql</strong></li>
              <li>Execute the script to create the database schema</li>
              <li><strong>Note:</strong> If you get "already exists" errors, use the <strong>safe</strong> version which handles existing objects</li>
              <li>Click the <strong>"🔍 Test Schema"</strong> button below to verify</li>
              <li>Once schema is ready, use <strong>"🧠 Smart Sync"</strong> to sync data</li>
            </ol>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={testSchema}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔍 Test Schema
            </button>
            <button
              onClick={() => syncRepairShoprData('smart')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🧠 Smart Sync
            </button>
          </div>
          
          {syncStatus && (
            <div className="text-sm text-gray-600">
              {syncStatus}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-yellow-600 mr-2">ℹ️</div>
          <span className="text-yellow-800">No analytics data available</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Info */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📊 Comprehensive Analytics</h2>
            <p className="text-gray-600 mt-1">
              Complete analysis of all RepairShopr ticket data with full lifecycle tracking
            </p>
            {lastSyncTime && (
              <p className="text-sm text-gray-500 mt-1">
                Last synced: {lastSyncTime}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={testSchema}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔍 Test Schema
            </button>
            <button
              onClick={() => syncRepairShoprData('smart')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🧠 Smart Sync
            </button>
            <button
              onClick={() => syncRepairShoprData('completed_only')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Completed Only
            </button>
            <button
              onClick={() => syncRepairShoprData('full')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              🔄 Full Sync
            </button>
            <button
              onClick={fetchAnalyticsData}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        {syncStatus && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">{syncStatus}</div>
          </div>
        )}
        
        {schemaStatus && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-sm text-purple-800">
              <strong>Schema Status:</strong> {schemaStatus}
            </div>
          </div>
        )}
        
        {/* Smart Sync Information */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">🧠 Smart Sync Strategy</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-blue-600">Smart Sync</div>
              <div className="text-gray-600">Only completed tickets at least 1 week old</div>
            </div>
            <div>
              <div className="font-medium text-green-600">Completed Only</div>
              <div className="text-gray-600">All completed tickets regardless of age</div>
            </div>
            <div>
              <div className="font-medium text-orange-600">Full Sync</div>
              <div className="text-gray-600">All tickets including active ones</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            💡 Smart sync ensures we only analyze finalized data while building comprehensive historical knowledge
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Tickets</h3>
          <div className="text-3xl font-bold text-blue-600">{analyticsData?.summary?.totalTickets || 0}</div>
          <div className="text-sm text-gray-500">{analyticsData?.summary?.completedTickets || 0} completed</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Tickets</h3>
          <div className="text-3xl font-bold text-orange-600">{analyticsData?.summary?.activeTickets || 0}</div>
          <div className="text-sm text-gray-500">Currently in progress</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rework Rate</h3>
          <div className={`text-3xl font-bold ${(analyticsData.summary?.overallReworkRate || 0) > 10 ? 'text-red-600' : (analyticsData.summary?.overallReworkRate || 0) > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
            {(analyticsData.summary?.overallReworkRate || 0).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">{analyticsData.summary?.reworkTickets || 0} reworks</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Completion</h3>
          <div className="text-3xl font-bold text-green-600">{(analyticsData.summary?.avgCompletionTime || 0).toFixed(1)}h</div>
          <div className="text-sm text-gray-500">Total time per ticket</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Technicians</h3>
          <div className="text-3xl font-bold text-purple-600">{analyticsData.summary?.totalTechnicians || 0}</div>
          <div className="text-sm text-gray-500">Active technicians</div>
        </div>
      </div>

      {/* Technician Performance */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Technician Performance Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rework Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(analyticsData.technicianPerformance || []).map((tech) => (
                <tr key={tech.assigned_technician_name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tech.assigned_technician_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.total_tickets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.completed_tickets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.avg_completion_hours.toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tech.completion_rate >= 90 ? 'bg-green-100 text-green-800' :
                      tech.completion_rate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tech.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tech.rework_rate > 10 ? 'bg-red-100 text-red-800' :
                      tech.rework_rate > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {tech.rework_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tech.total_work_hours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Analytics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Device Performance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analyticsData.deviceAnalytics || {}).map(([device, data]) => (
            <div key={device} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{device}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Repairs:</span>
                  <span className="font-medium">{data.totalRepairs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="font-medium">{data.avgCompletionTime.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rework Rate:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    data.reworkRate > 10 ? 'bg-red-100 text-red-800' :
                    data.reworkRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {data.reworkRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rework Analytics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Rework Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">Total Reworks</h4>
            <div className="text-2xl font-bold text-red-600">{analyticsData.reworkAnalytics?.totalReworks || 0}</div>
            <div className="text-sm text-red-700">{(analyticsData.reworkAnalytics?.reworkRate || 0).toFixed(1)}% rework rate</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Avg Rework Time</h4>
            <div className="text-2xl font-bold text-orange-600">{(analyticsData.reworkAnalytics?.avgReworkTime || 0).toFixed(1)}h</div>
            <div className="text-sm text-orange-700">Per rework</div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Top Rework Reasons</h4>
            <div className="text-sm text-yellow-700">
              {(analyticsData.reworkAnalytics?.topReworkReasons || []).slice(0, 3).map((reason, index) => (
                <div key={index} className="mb-1">
                  {index + 1}. {reason}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Rework by Device</h4>
            <div className="text-sm text-blue-700">
              {Object.entries(analyticsData.reworkAnalytics?.reworkByDevice || {})
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 3)
                .map(([device, count], index) => (
                  <div key={index} className="mb-1">
                    {device}: {count}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
