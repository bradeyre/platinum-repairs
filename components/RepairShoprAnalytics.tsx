'use client'

import React, { useState, useEffect } from 'react'
import AIPerformanceAnalysis from './AIPerformanceAnalysis'

interface ProcessedTicket {
  ticketId: string
  ticketNumber: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'PR' | 'DD'
  claimNumber?: string
}

interface AnalyticsData {
  totalTickets: number
  ticketsByStatus: Record<string, number>
  ticketsByTechnician: Record<string, number>
  ticketsByType: Record<string, number>
  averageWaitTimeByStatus: Record<string, number>
  averageWaitTimeByTechnician: Record<string, number>
  deviceBreakdown: Record<string, number>
  brandBreakdown: Record<string, number>
  statusFlow: Record<string, Record<string, number>>
  timeDistribution: {
    under1Hour: number
    under4Hours: number
    under8Hours: number
    over8Hours: number
  }
  technicianEfficiency: Record<string, {
    totalTickets: number
    averageWaitTime: number
    completionRate: number
    currentLoad: number
    averageDamageReportTime: number
    averageRepairTime: number
    ticketsByDeviceType: Record<string, number>
    performanceByDeviceType: Record<string, {
      count: number
      averageTime: number
    }>
  }>
}

// Helper function to calculate business hours between two dates
function getBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let hours = 0
  const current = new Date(start)
  
  while (current < end) {
    const dayOfWeek = current.getDay()
    const hour = current.getHours()
    
    // Only count business hours (8 AM - 5 PM, Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17) {
      const nextHour = new Date(current)
      nextHour.setHours(current.getHours() + 1)
      
      if (nextHour > end) {
        // Partial hour
        hours += (end.getTime() - current.getTime()) / (1000 * 60 * 60)
      } else {
        hours += 1
      }
    }
    
    current.setHours(current.getHours() + 1)
  }
  
  return hours
}

// Function to extract device brand from device info
function extractBrand(deviceInfo: string): string {
  const brands = ['iPhone', 'Samsung', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'iPad', 'MacBook', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI']
  
  for (const brand of brands) {
    if (deviceInfo.toLowerCase().includes(brand.toLowerCase())) {
      return brand
    }
  }
  
  return 'Other'
}

// Function to extract device type from device info
function extractDeviceType(deviceInfo: string): string {
  const lower = deviceInfo.toLowerCase()
  
  if (lower.includes('iphone') || lower.includes('samsung galaxy') || lower.includes('huawei') || lower.includes('oneplus')) {
    return 'Smartphone'
  } else if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('tab')) {
    return 'Tablet'
  } else if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) {
    return 'Laptop'
  } else if (lower.includes('desktop') || lower.includes('pc')) {
    return 'Desktop'
  } else if (lower.includes('watch') || lower.includes('band')) {
    return 'Wearable'
  } else {
    return 'Other'
  }
}

// Function to calculate analytics from tickets data
function calculateAnalytics(tickets: ProcessedTicket[]): AnalyticsData {
  const now = new Date()
  
  // Basic counts
  const totalTickets = tickets.length
  const ticketsByStatus: Record<string, number> = {}
  const ticketsByTechnician: Record<string, number> = {}
  const ticketsByType: Record<string, number> = {}
  const deviceBreakdown: Record<string, number> = {}
  const brandBreakdown: Record<string, number> = {}
  
  // Wait time tracking
  const waitTimesByStatus: Record<string, number[]> = {}
  const waitTimesByTechnician: Record<string, number[]> = {}
  const technicianStats: Record<string, { total: number; completed: number; current: number }> = {}
  
  // Time distribution
  const timeDistribution = {
    under1Hour: 0,
    under4Hours: 0,
    under8Hours: 0,
    over8Hours: 0
  }
  
  tickets.forEach(ticket => {
    const ticketDate = new Date(ticket.timestamp)
    const waitTimeHours = getBusinessHours(ticketDate, now)
    
    // Basic counts
    ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1
    ticketsByTechnician[ticket.assignedTo || 'Unassigned'] = (ticketsByTechnician[ticket.assignedTo || 'Unassigned'] || 0) + 1
    ticketsByType[ticket.ticketType] = (ticketsByType[ticket.ticketType] || 0) + 1
    
    // Device analysis
    const deviceType = extractDeviceType(ticket.deviceInfo)
    const brand = extractBrand(ticket.deviceInfo)
    deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1
    brandBreakdown[brand] = (brandBreakdown[brand] || 0) + 1
    
    // Wait time analysis
    if (!waitTimesByStatus[ticket.status]) waitTimesByStatus[ticket.status] = []
    if (!waitTimesByTechnician[ticket.assignedTo || 'Unassigned']) waitTimesByTechnician[ticket.assignedTo || 'Unassigned'] = []
    
    waitTimesByStatus[ticket.status].push(waitTimeHours)
    waitTimesByTechnician[ticket.assignedTo || 'Unassigned'].push(waitTimeHours)
    
    // Time distribution
    if (waitTimeHours < 1) timeDistribution.under1Hour++
    else if (waitTimeHours < 4) timeDistribution.under4Hours++
    else if (waitTimeHours < 8) timeDistribution.under8Hours++
    else timeDistribution.over8Hours++
    
    // Technician stats
    const tech = ticket.assignedTo || 'Unassigned'
    if (!technicianStats[tech]) {
      technicianStats[tech] = { total: 0, completed: 0, current: 0 }
    }
    technicianStats[tech].total++
    if (ticket.status === 'Completed') technicianStats[tech].completed++
    if (ticket.status !== 'Completed') technicianStats[tech].current++
  })
  
  // Calculate averages
  const averageWaitTimeByStatus: Record<string, number> = {}
  const averageWaitTimeByTechnician: Record<string, number> = {}
  
  Object.keys(waitTimesByStatus).forEach(status => {
    const times = waitTimesByStatus[status]
    averageWaitTimeByStatus[status] = times.reduce((sum, time) => sum + time, 0) / times.length
  })
  
  Object.keys(waitTimesByTechnician).forEach(tech => {
    const times = waitTimesByTechnician[tech]
    averageWaitTimeByTechnician[tech] = times.reduce((sum, time) => sum + time, 0) / times.length
  })
  
  // Calculate detailed technician efficiency
  const technicianEfficiency: Record<string, any> = {}
  Object.keys(technicianStats).forEach(tech => {
    const stats = technicianStats[tech]
    const avgWaitTime = averageWaitTimeByTechnician[tech] || 0
    const completionRate = (stats?.total || 0) > 0 ? (stats.completed / stats.total) * 100 : 0
    
    // Get tickets for this technician
    const techTickets = tickets.filter(ticket => (ticket.assignedTo || 'Unassigned') === tech)
    
    // Calculate device type breakdown
    const ticketsByDeviceType: Record<string, number> = {}
    const performanceByDeviceType: Record<string, { count: number; averageTime: number }> = {}
    
    techTickets.forEach(ticket => {
      const deviceType = extractDeviceType(ticket.deviceInfo)
      ticketsByDeviceType[deviceType] = (ticketsByDeviceType[deviceType] || 0) + 1
      
      if (!performanceByDeviceType[deviceType]) {
        performanceByDeviceType[deviceType] = { count: 0, averageTime: 0 }
      }
      performanceByDeviceType[deviceType].count++
    })
    
    // Calculate average times by device type
    Object.keys(performanceByDeviceType).forEach(deviceType => {
      const deviceTickets = techTickets.filter(ticket => extractDeviceType(ticket.deviceInfo) === deviceType)
      const totalTime = deviceTickets.reduce((sum, ticket) => {
        const ticketDate = new Date(ticket.timestamp)
        return sum + getBusinessHours(ticketDate, now)
      }, 0)
      performanceByDeviceType[deviceType].averageTime = deviceTickets.length > 0 ? totalTime / deviceTickets.length : 0
    })
    
    // Estimate damage report and repair times based on status transitions
    // This is an approximation since we don't have exact timestamps for status changes
    const damageReportTickets = techTickets.filter(ticket => 
      ticket.status === 'Awaiting Damage Report' || ticket.status === 'Awaiting Repair'
    )
    const repairTickets = techTickets.filter(ticket => 
      ticket.status === 'In Progress' || ticket.status === 'Completed'
    )
    
    const averageDamageReportTime = damageReportTickets.length > 0 
      ? damageReportTickets.reduce((sum, ticket) => {
          const ticketDate = new Date(ticket.timestamp)
          return sum + getBusinessHours(ticketDate, now)
        }, 0) / damageReportTickets.length
      : 0
    
    const averageRepairTime = repairTickets.length > 0
      ? repairTickets.reduce((sum, ticket) => {
          const ticketDate = new Date(ticket.timestamp)
          return sum + getBusinessHours(ticketDate, now)
        }, 0) / repairTickets.length
      : 0
    
    technicianEfficiency[tech] = {
      totalTickets: stats?.total || 0,
      averageWaitTime: avgWaitTime,
      completionRate: completionRate,
      currentLoad: stats?.current || 0,
      averageDamageReportTime: averageDamageReportTime,
      averageRepairTime: averageRepairTime,
      ticketsByDeviceType: ticketsByDeviceType,
      performanceByDeviceType: performanceByDeviceType
    }
  })
  
  return {
    totalTickets,
    ticketsByStatus,
    ticketsByTechnician,
    ticketsByType,
    averageWaitTimeByStatus,
    averageWaitTimeByTechnician,
    deviceBreakdown,
    brandBreakdown,
    statusFlow: {}, // Could be enhanced with historical data
    timeDistribution,
    technicianEfficiency
  }
}

export default function RepairShoprAnalytics() {
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFrame, setTimeFrame] = useState('all')
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // Function to filter tickets by time frame
  const filterTicketsByTimeFrame = (tickets: ProcessedTicket[]): ProcessedTicket[] => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (timeFrame) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'thisWeek':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        startDate = startOfWeek
        break
      case 'lastWeek':
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
        lastWeekStart.setHours(0, 0, 0, 0)
        startDate = lastWeekStart
        endDate = new Date(now)
        endDate.setDate(now.getDate() - now.getDay())
        endDate.setHours(0, 0, 0, 0)
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last30Days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last90Days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (customDateRange.startDate && customDateRange.endDate) {
          startDate = new Date(customDateRange.startDate)
          endDate = new Date(customDateRange.endDate)
          endDate.setHours(23, 59, 59, 999) // Include the entire end date
        } else {
          return tickets // Return all if custom dates not set
        }
        break
      default: // 'all'
        return tickets
    }

    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.timestamp)
      return ticketDate >= startDate && ticketDate <= endDate
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/tickets')
        if (response.ok) {
          const data = await response.json()
          setTickets(data.tickets || [])
          
          // Filter tickets by time frame and calculate analytics
          const filteredTickets = filterTicketsByTimeFrame(data.tickets || [])
          const calculatedAnalytics = calculateAnalytics(filteredTickets)
          setAnalytics(calculatedAnalytics)
        } else {
          setError('Failed to fetch tickets data')
        }
      } catch (err) {
        setError('Error loading analytics data')
        console.error('Error fetching analytics data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Recalculate analytics when time frame changes
  useEffect(() => {
    if (tickets.length > 0) {
      const filteredTickets = filterTicketsByTimeFrame(tickets)
      const calculatedAnalytics = calculateAnalytics(filteredTickets)
      setAnalytics(calculatedAnalytics)
    }
  }, [timeFrame, customDateRange, tickets])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-gray-600">Loading RepairShopr Analytics...</span>
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

  if (!analytics) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-yellow-600 mr-2">ℹ️</div>
          <span className="text-yellow-800">No analytics data available</span>
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
            <h2 className="text-2xl font-bold text-gray-900">RepairShopr Analytics</h2>
            <p className="text-gray-600 mt-1">Insights from existing ticket data</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{analytics?.totalTickets || 0}</div>
            <div className="text-sm text-gray-500">Total Tickets</div>
          </div>
        </div>
        
        {/* Time Frame Selector */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Time Frame:</label>
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="last30Days">Last 30 Days</option>
                <option value="last90Days">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {timeFrame === 'custom' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              {timeFrame === 'all' && 'Showing all tickets'}
              {timeFrame === 'today' && 'Showing tickets from today'}
              {timeFrame === 'yesterday' && 'Showing tickets from yesterday'}
              {timeFrame === 'thisWeek' && 'Showing tickets from this week'}
              {timeFrame === 'lastWeek' && 'Showing tickets from last week'}
              {timeFrame === 'thisMonth' && 'Showing tickets from this month'}
              {timeFrame === 'lastMonth' && 'Showing tickets from last month'}
              {timeFrame === 'last30Days' && 'Showing tickets from last 30 days'}
              {timeFrame === 'last90Days' && 'Showing tickets from last 90 days'}
              {timeFrame === 'custom' && customDateRange.startDate && customDateRange.endDate && 
                `Showing tickets from ${new Date(customDateRange.startDate).toLocaleDateString()} to ${new Date(customDateRange.endDate).toLocaleDateString()}`}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tickets by Status */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
          <div className="space-y-2">
            {Object.entries(analytics.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{status}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets by Type */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Type</h3>
          <div className="space-y-2">
            {Object.entries(analytics.ticketsByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{type}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types</h3>
          <div className="space-y-2">
            {Object.entries(analytics.deviceBreakdown).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{type}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Brands</h3>
          <div className="space-y-2">
            {Object.entries(analytics.brandBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([brand, count]) => (
              <div key={brand} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{brand}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wait Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Wait Time by Status */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Wait Time by Status</h3>
          <div className="space-y-3">
            {Object.entries(analytics.averageWaitTimeByStatus).map(([status, avgTime]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{status}</span>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-900 mr-2">{avgTime.toFixed(1)}h</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((avgTime / 8) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wait Time Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Under 1 hour</span>
              <span className="font-semibold text-green-600">{analytics.timeDistribution.under1Hour}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">1-4 hours</span>
              <span className="font-semibold text-yellow-600">{analytics.timeDistribution.under4Hours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">4-8 hours</span>
              <span className="font-semibold text-orange-600">{analytics.timeDistribution.under8Hours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Over 8 hours</span>
              <span className="font-semibold text-red-600">{analytics.timeDistribution.over8Hours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Performance */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technician Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Load</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Wait Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Damage Report Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Repair Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analytics.technicianEfficiency).map(([tech, stats]) => (
                <tr key={tech}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tech}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats?.totalTickets || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats?.currentLoad || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(stats?.averageWaitTime || 0).toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(stats?.averageDamageReportTime || 0).toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(stats?.averageRepairTime || 0).toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      (stats?.completionRate || 0) >= 80 ? 'bg-green-100 text-green-800' :
                      (stats?.completionRate || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(stats?.completionRate || 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Type Performance by Technician */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Device Type</h3>
        <div className="space-y-4">
          {Object.entries(analytics.technicianEfficiency).map(([tech, stats]) => (
            <div key={tech} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{tech}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.performanceByDeviceType).map(([deviceType, performance]) => (
                  <div key={deviceType} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{deviceType}</span>
                      <span className="text-xs text-gray-500">{performance.count} tickets</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Avg Time: {performance.averageTime.toFixed(1)}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Key Insights</h3>
        <div className="space-y-2 text-blue-800">
          <p>• <strong>Most Common Device:</strong> {Object.entries(analytics.deviceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(analytics.deviceBreakdown).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} tickets)</p>
          <p>• <strong>Top Brand:</strong> {Object.entries(analytics.brandBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} ({Object.entries(analytics.brandBreakdown).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} tickets)</p>
          <p>• <strong>Average Wait Time:</strong> {(Object.values(analytics.averageWaitTimeByStatus).reduce((sum, time) => sum + time, 0) / Object.keys(analytics.averageWaitTimeByStatus).length).toFixed(1)} hours</p>
          <p>• <strong>Busiest Technician:</strong> {Object.entries(analytics.technicianEfficiency).sort(([,a], [,b]) => b.currentLoad - a.currentLoad)[0]?.[0] || 'N/A'} ({Object.entries(analytics.technicianEfficiency).sort(([,a], [,b]) => b.currentLoad - a.currentLoad)[0]?.[1]?.currentLoad || 0} active tickets)</p>
        </div>
      </div>

      {/* AI Performance Analysis - Available in Admin Dashboard */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">🤖 AI Performance Analysis</h3>
        <p className="text-blue-800 mb-4">
          For detailed AI-powered performance insights, visit the "AI Performance Analysis" tab in the Admin Dashboard.
        </p>
        <div className="text-sm text-blue-700">
          <p>• <strong>Who's doing what:</strong> Detailed technician workload analysis</p>
          <p>• <strong>Training needs:</strong> AI-identified areas for improvement</p>
          <p>• <strong>Performance insights:</strong> Actionable recommendations</p>
          <p>• <strong>Efficiency trends:</strong> Pattern recognition and optimization</p>
        </div>
      </div>
    </div>
  )
}
