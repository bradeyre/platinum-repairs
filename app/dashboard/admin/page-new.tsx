'use client'

import React, { useState, useEffect } from 'react'
import DashboardNavigation from '@/components/DashboardNavigation'

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
}

interface Technician {
  id: string
  full_name: string
  username: string
  role: string
  bio?: string
  is_clocked_in: boolean
  clock_in_time?: string
  total_hours_today: number
  total_hours_this_week: number
  total_hours_this_month: number
  tickets_completed_today: number
  tickets_completed_this_week: number
  tickets_completed_this_month: number
}

interface DashboardStats {
  totalTickets: number
  waitingTickets: number
  completedToday: number
  overdueTickets: number
  unassignedTickets: number
  clockedInTechnicians: number
  totalTechnicians: number
  averageCompletionTime: number
  totalRevenue: number
  monthlyGrowth: number
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    waitingTickets: 0,
    completedToday: 0,
    overdueTickets: 0,
    unassignedTickets: 0,
    clockedInTechnicians: 0,
    totalTechnicians: 0,
    averageCompletionTime: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today')

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch tickets
        const ticketsResponse = await fetch('/api/tickets')
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          setTickets(ticketsData.tickets || [])
        }

        // Fetch technicians and their work data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          const techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }

        // Fetch dashboard stats
        const statsResponse = await fetch('/api/admin/dashboard-stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleClockInOut = async (technicianId: string, isClockedIn: boolean) => {
    try {
      const response = await fetch('/api/technicians/clock-in-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianId,
          action: isClockedIn ? 'clock_out' : 'clock_in'
        })
      })

      if (response.ok) {
        // Refresh technician data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          const techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }
      }
    } catch (error) {
      console.error('Error updating clock status:', error)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getTimeframeLabel = () => {
    switch (selectedTimeframe) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      default: return 'Today'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation currentSection="admin" userRole="admin" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Comprehensive overview of repair operations and technician performance</p>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['today', 'week', 'month'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalTickets || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Waiting</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.waitingTickets || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed {getTimeframeLabel()}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.completedToday || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.overdueTickets || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clocked In</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.clockedInTechnicians || 0}/{stats?.totalTechnicians || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview & Stats', icon: '📊' },
                { id: 'technicians', name: 'Technician Management', icon: '👥' },
                { id: 'tickets', name: `RepairShopr Tickets (${tickets.length})`, icon: '🎫' },
                { id: 'analytics', name: 'Performance Analytics', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {tickets.slice(0, 5).map((ticket) => (
                        <div key={ticket.ticketId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{ticket.deviceInfo}</p>
                            <p className="text-xs text-gray-500">#{ticket.ticketNumber}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-2">🔄</div>
                          <p className="text-sm font-medium">Sync RepairShopr</p>
                        </div>
                      </button>
                      <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-2">📊</div>
                          <p className="text-sm font-medium">View Reports</p>
                        </div>
                      </button>
                      <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-2">👥</div>
                          <p className="text-sm font-medium">Manage Users</p>
                        </div>
                      </button>
                      <button className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-2">⚙️</div>
                          <p className="text-sm font-medium">Settings</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Technicians Tab */}
            {activeTab === 'technicians' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Technician Management</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Add Technician
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{tech.full_name}</h4>
                          <p className="text-sm text-gray-500">@{tech.username}</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          tech.is_clocked_in ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className={tech.is_clocked_in ? 'text-green-600' : 'text-gray-600'}>
                            {tech.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
                          </span>
                        </div>

                        {tech.is_clocked_in && tech.clock_in_time && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Since:</span>
                            <span className="text-gray-900">
                              {new Date(tech.clock_in_time).toLocaleTimeString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hours {getTimeframeLabel()}:</span>
                          <span className="text-gray-900">
                            {selectedTimeframe === 'today' ? formatTime(tech.total_hours_today * 60) :
                             selectedTimeframe === 'week' ? formatTime(tech.total_hours_this_week * 60) :
                             formatTime(tech.total_hours_this_month * 60)}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tickets {getTimeframeLabel()}:</span>
                          <span className="text-gray-900">
                            {selectedTimeframe === 'today' ? tech.tickets_completed_today :
                             selectedTimeframe === 'week' ? tech.tickets_completed_this_week :
                             tech.tickets_completed_this_month}
                          </span>
                        </div>

                        <button
                          onClick={() => handleClockInOut(tech.id, tech.is_clocked_in)}
                          className={`w-full py-2 px-4 rounded-lg font-medium ${
                            tech.is_clocked_in
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {tech.is_clocked_in ? 'Clock Out' : 'Clock In'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">RepairShopr Tickets</h3>
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Refresh
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      Get Ticket
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Ago
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickets.map((ticket) => (
                        <tr key={ticket.ticketId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{ticket.ticketNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {ticket.ticketType}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{ticket.deviceInfo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                              ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ticket.assignedTo || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              ticket.aiPriority === 'High' ? 'bg-red-100 text-red-800' :
                              ticket.aiPriority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {ticket.aiPriority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {ticket.timeAgo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Performance Analytics</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Productivity Metrics */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Productivity Metrics</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Completion Time:</span>
                        <span className="font-medium">{formatTime(stats?.averageCompletionTime || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Revenue:</span>
                        <span className="font-medium">R{(stats?.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Growth:</span>
                        <span className={`font-medium ${(stats?.monthlyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(stats?.monthlyGrowth || 0) >= 0 ? '+' : ''}{stats?.monthlyGrowth || 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Top Performers {getTimeframeLabel()}</h4>
                    <div className="space-y-3">
                      {technicians
                        .sort((a, b) => {
                          const aTickets = selectedTimeframe === 'today' ? a.tickets_completed_today :
                                          selectedTimeframe === 'week' ? a.tickets_completed_this_week :
                                          a.tickets_completed_this_month
                          const bTickets = selectedTimeframe === 'today' ? b.tickets_completed_today :
                                          selectedTimeframe === 'week' ? b.tickets_completed_this_week :
                                          b.tickets_completed_this_month
                          return bTickets - aTickets
                        })
                        .slice(0, 3)
                        .map((tech, index) => {
                          const tickets = selectedTimeframe === 'today' ? tech.tickets_completed_today :
                                        selectedTimeframe === 'week' ? tech.tickets_completed_this_week :
                                        tech.tickets_completed_this_month
                          return (
                            <div key={tech.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                  {index + 1}
                                </div>
                                <span className="ml-3 text-sm font-medium">{tech.full_name}</span>
                              </div>
                              <span className="text-sm text-gray-600">{tickets} tickets</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
