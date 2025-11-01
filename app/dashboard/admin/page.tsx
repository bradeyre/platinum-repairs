'use client'

import React, { useState, useEffect } from 'react'
import DashboardNavigation from '@/components/DashboardNavigation'
import ConsolidatedAnalytics from '@/components/ConsolidatedAnalytics'
import DeepAnalyticsReport from '@/components/DeepAnalyticsReport'
import ComprehensiveAnalytics from '@/components/ComprehensiveAnalytics'
import ActiveMinutesTracker from '@/components/ActiveMinutesTracker'

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
  email?: string
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
  monthlyGrowth: number
  // New performance metrics
  averageWaitTimeHours: number
  totalActiveWorkHours: number
  averageActiveWorkHours: number
  waitTimeByTech: Record<string, { total: number; count: number }>
  waitTimeByStatus: Record<string, { total: number; count: number }>
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

// Helper functions to get date ranges for filtering
function getDateRanges(timeframe: 'today' | 'week' | 'month') {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date
  
  switch (timeframe) {
    case 'today':
      startDate = today
      break
    case 'week':
      // Week starts on Sunday
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startDate = startOfWeek
      break
    case 'month':
      // First day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = today
  }
  
  return { startDate, endDate: now }
}

// Function to calculate dashboard stats from tickets data
function calculateDashboardStats(
  tickets: ProcessedTicket[], 
  technicians: Technician[], 
  timeframe: 'today' | 'week' | 'month' = 'today'
): Partial<DashboardStats> {
  const { startDate, endDate } = getDateRanges(timeframe)
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  
  // Filter tickets by creation date based on timeframe
  const filteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.timestamp)
    return ticketDate >= startDate && ticketDate <= endDate
  })
  
  // Calculate core stats from filtered tickets
  const totalTickets = filteredTickets.length
  
  // Get tickets completed within the timeframe (status = 'Completed')
  const completedToday = filteredTickets.filter(ticket =>
    ticket.status === 'Completed'
  ).length
  
  // Get overdue tickets (older than 4 business hours and not completed)
  const overdueTickets = filteredTickets.filter(ticket => {
    if (ticket.status === 'Completed') return false
    const ticketDate = new Date(ticket.timestamp)
    const businessHoursWaiting = getBusinessHours(ticketDate, now)
    return businessHoursWaiting > 4
  }).length
  
  // Get waiting tickets (not in progress, not troubleshooting, and not completed)
  const waitingTickets = filteredTickets.filter(ticket => 
    ticket.status !== 'In Progress' && ticket.status !== 'Troubleshooting' && ticket.status !== 'Completed'
  ).length
  
  // Get unassigned tickets
  const unassignedTickets = filteredTickets.filter(ticket =>
    !ticket.assignedTo || ticket.assignedTo === 'Unassigned'
  ).length
  
  // Calculate average wait time from actual tickets
  const ticketWaitTimes = filteredTickets
    .filter(ticket => ticket.status !== 'Completed')
    .map(ticket => {
      const ticketDate = new Date(ticket.timestamp)
      return getBusinessHours(ticketDate, now)
    })
  
  const averageWaitTimeHours = ticketWaitTimes.length > 0
    ? ticketWaitTimes.reduce((sum, hours) => sum + hours, 0) / ticketWaitTimes.length
    : 0
  
  // Calculate technician stats
  const clockedInTechnicians = technicians.filter(tech => tech.is_clocked_in).length
  const totalTechnicians = technicians.length
  
  return {
    totalTickets,
    waitingTickets,
    completedToday,
    overdueTickets,
    unassignedTickets,
    clockedInTechnicians,
    totalTechnicians,
    averageWaitTimeHours,
    // Keep existing values for metrics that require database queries
    averageCompletionTime: 0,
    monthlyGrowth: 0,
    totalActiveWorkHours: 0,
    averageActiveWorkHours: 0,
    waitTimeByTech: {},
    waitTimeByStatus: {}
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tickets')
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
    monthlyGrowth: 0,
    // New performance metrics
    averageWaitTimeHours: 0,
    totalActiveWorkHours: 0,
    averageActiveWorkHours: 0,
    waitTimeByTech: {},
    waitTimeByStatus: {}
  })
  const [loading, setLoading] = useState(true)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [assigningTicket, setAssigningTicket] = useState<string | null>(null)
  
  // Technician management state
  const [showAddTechnicianModal, setShowAddTechnicianModal] = useState(false)
  const [showEditTechnicianModal, setShowEditTechnicianModal] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null)
  const [technicianForm, setTechnicianForm] = useState({
    full_name: '',
    username: '',
    email: '',
    bio: '',
    role: 'technician'
  })

  // Initial data fetch (with loading screen)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        
        let ticketsData = { tickets: [] }
        let techData = { technicians: [] }
        
        // Fetch tickets
        const ticketsResponse = await fetch('/api/tickets')
        if (ticketsResponse.ok) {
          ticketsData = await ticketsResponse.json()
          setTickets(ticketsData.tickets || [])
        }

        // Fetch technicians and their work data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }

        // Calculate dashboard stats from tickets data (no separate API call needed)
        const calculatedStats = calculateDashboardStats(ticketsData.tickets || [], techData.technicians || [], selectedTimeframe)
        setStats(prevStats => ({ ...prevStats, ...calculatedStats }))

        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Recalculate stats when timeframe changes
  useEffect(() => {
    if (tickets.length > 0 || technicians.length > 0) {
      const calculatedStats = calculateDashboardStats(tickets, technicians, selectedTimeframe)
      setStats(prevStats => ({ ...prevStats, ...calculatedStats }))
    }
  }, [selectedTimeframe, tickets, technicians])

  // Background data refresh (no loading screen)
  useEffect(() => {
    const fetchBackgroundData = async () => {
      try {
        setBackgroundLoading(true)
        
        let ticketsData = { tickets: [] }
        let techData = { technicians: [] }
        
        // Fetch tickets
        const ticketsResponse = await fetch('/api/tickets')
        if (ticketsResponse.ok) {
          ticketsData = await ticketsResponse.json()
          setTickets(ticketsData.tickets || [])
        }

        // Fetch technicians and their work data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }

        // Calculate dashboard stats from tickets data (no separate API call needed)
        const calculatedStats = calculateDashboardStats(ticketsData.tickets || [], techData.technicians || [], selectedTimeframe)
        setStats(prevStats => ({ ...prevStats, ...calculatedStats }))

        setError(null)
      } catch (err) {
        console.error('Error refreshing dashboard data:', err)
        // Don't set error for background refreshes to avoid disrupting user
      } finally {
        setBackgroundLoading(false)
      }
    }

    // Start background refresh after initial load
    let interval: NodeJS.Timeout | null = null
    const timeout = setTimeout(() => {
      // Refresh data every 30 seconds in background
      interval = setInterval(fetchBackgroundData, 30000)
    }, 5000) // Wait 5 seconds after initial load

    return () => {
      clearTimeout(timeout)
      if (interval) {
        clearInterval(interval)
      }
    }
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

  const handleAddTechnician = async () => {
    try {
      const response = await fetch('/api/technicians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(technicianForm)
      })

      if (response.ok) {
        // Refresh technician data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          const techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }
        
        // Reset form and close modal
        setTechnicianForm({
          full_name: '',
          username: '',
          email: '',
          bio: '',
          role: 'technician'
        })
        setShowAddTechnicianModal(false)
        alert('Technician added successfully!')
      } else {
        alert('Failed to add technician')
      }
    } catch (error) {
      console.error('Error adding technician:', error)
      alert('Failed to add technician')
    }
  }

  const handleEditTechnician = async () => {
    if (!editingTechnician) return

    try {
      const response = await fetch(`/api/technicians/${editingTechnician.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(technicianForm)
      })

      if (response.ok) {
        // Refresh technician data
        const techResponse = await fetch('/api/technicians/work-data')
        if (techResponse.ok) {
          const techData = await techResponse.json()
          setTechnicians(techData.technicians || [])
        }
        
        // Reset form and close modal
        setTechnicianForm({
          full_name: '',
          username: '',
          email: '',
          bio: '',
          role: 'technician'
        })
        setEditingTechnician(null)
        setShowEditTechnicianModal(false)
        alert('Technician updated successfully!')
      } else {
        alert('Failed to update technician')
      }
    } catch (error) {
      console.error('Error updating technician:', error)
      alert('Failed to update technician')
    }
  }

  const openEditTechnician = (technician: Technician) => {
    setEditingTechnician(technician)
    setTechnicianForm({
      full_name: technician.full_name,
      username: technician.username,
      email: technician.email || '',
      bio: technician.bio || '',
      role: technician.role || 'technician'
    })
    setShowEditTechnicianModal(true)
  }

  // Handle ticket assignment
  const handleAssignTicket = async (ticketId: string, technician: string) => {
    if (technician === 'Select technician...' || !technician) return
    
    setAssigningTicket(ticketId)
    try {
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, technician })
      })
      
      if (!response.ok) {
        throw new Error('Failed to assign ticket')
      }
      
      // Update the ticket assignment in local state
      setTickets(prev => prev.map(ticket => 
        ticket.ticketId === ticketId 
          ? { ...ticket, assignedTo: technician }
          : ticket
      ))
      
      alert(`Ticket ${ticketId} assigned to ${technician}`)
      
    } catch (err) {
      console.error('Error assigning ticket:', err)
      alert('Failed to assign ticket. Please try again.')
    } finally {
      setAssigningTicket(null)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Function to calculate business hours between two dates
  const getBusinessHours = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    let businessHours = 0
    
    // Business hours: 8 AM to 6 PM, Monday to Friday
    const businessStart = 8 // 8 AM
    const businessEnd = 18 // 6 PM
    
    while (start < end) {
      const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Only count Monday (1) through Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayStart = new Date(start)
        dayStart.setHours(businessStart, 0, 0, 0)
        
        const dayEnd = new Date(start)
        dayEnd.setHours(businessEnd, 0, 0, 0)
        
        // Calculate overlap with business hours for this day
        const overlapStart = new Date(Math.max(start.getTime(), dayStart.getTime()))
        const overlapEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()))
        
        if (overlapStart < overlapEnd) {
          businessHours += (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60)
        }
      }
      
      // Move to next day
      start.setDate(start.getDate() + 1)
      start.setHours(0, 0, 0, 0)
    }
    
    return businessHours
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-gray-600">Comprehensive overview of repair operations and technician performance</p>
              </div>
            {backgroundLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Updating...
              </div>
            )}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets {getTimeframeLabel()}</p>
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
                <p className="text-sm font-medium text-gray-600">Waiting {getTimeframeLabel()}</p>
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
                <p className="text-sm font-medium text-gray-600">Overdue {getTimeframeLabel()}</p>
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

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Wait Time {getTimeframeLabel()}</p>
                <p className="text-2xl font-bold text-gray-900">{(stats?.averageWaitTimeHours || 0).toFixed(1)}h</p>
              </div>
            </div>
          </div>
              </div>

        {/* Main Content Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'tickets', name: `RepairShopr Tickets (${tickets.length})`, icon: '🎫' },
                { id: 'comprehensive-analytics', name: 'Comprehensive Analytics', icon: '📊' },
                { id: 'analytics', name: 'Analytics Dashboard', icon: '📈' },
                { id: 'deep-analytics', name: 'Deep Analytics Report', icon: '🔍' },
                { id: 'active-minutes', name: 'Active Minutes Tracker', icon: '⏱️' },
                { id: 'repair-archive', name: 'Repair Archive', icon: '🔧' },
                { id: 'technicians', name: 'Technician Management', icon: '👥' }
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
            {/* Comprehensive Analytics Tab */}
            {activeTab === 'comprehensive-analytics' && (
              <div className="p-6">
                <ComprehensiveAnalytics />
              </div>
            )}

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
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">🚀</div>
                      <p className="text-gray-500 text-sm">Quick actions will be added here as needed</p>
                    </div>
                  </div>
                </div>

                {/* Wait Time Analytics */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Wait Time by Technician */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Average Wait Time by Technician</h4>
                    <div className="space-y-3">
                      {Object.entries(stats?.waitTimeByTech || {}).map(([techId, data]) => {
                        const tech = technicians.find(t => t.id === techId)
                        const avgWaitTime = data.count > 0 ? data.total / data.count : 0
                        return (
                          <div key={techId} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{tech?.full_name || techId}</span>
                            <div className="text-right">
                              <span className="text-sm font-medium">{avgWaitTime.toFixed(1)}h</span>
                              <div className="text-xs text-gray-500">{data.count} tickets</div>
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(stats?.waitTimeByTech || {}).length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No wait time data available</div>
                      )}
                    </div>
                  </div>

                  {/* Wait Time by Status */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Average Wait Time by Status</h4>
                    <div className="space-y-3">
                      {Object.entries(stats?.waitTimeByStatus || {}).map(([status, data]) => {
                        const avgWaitTime = data.count > 0 ? data.total / data.count : 0
                        return (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{status}</span>
                            <div className="text-right">
                              <span className="text-sm font-medium">{avgWaitTime.toFixed(1)}h</span>
                              <div className="text-xs text-gray-500">{data.count} tickets</div>
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(stats?.waitTimeByStatus || {}).length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No wait time data available</div>
                      )}
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
                <button 
                    onClick={() => setShowAddTechnicianModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
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

                        <div className="space-y-2">
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
                <button 
                            onClick={() => openEditTechnician(tech)}
                            className="w-full py-2 px-4 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                            Edit Technician
                </button>
                        </div>
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
                        Time Ago
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {tickets.filter(ticket => {
                        const { startDate, endDate } = getDateRanges(selectedTimeframe)
                        const ticketDate = new Date(ticket.timestamp)
                        return ticketDate >= startDate && ticketDate <= endDate
                      }).map((ticket) => (
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
                            <select
                              value={ticket.assignedTo || ''}
                              onChange={(e) => handleAssignTicket(ticket.ticketId, e.target.value)}
                              disabled={assigningTicket === ticket.ticketId}
                              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="">Unassigned</option>
                              <option value="Ben">Ben</option>
                              <option value="Marshal">Marshal</option>
                              <option value="Malvin">Malvin</option>
                              <option value="Francis">Francis</option>
                            </select>
                            {assigningTicket === ticket.ticketId && (
                              <span className="ml-2 text-xs text-blue-600">Assigning...</span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${
                            (() => {
                              // Ensure timestamp is a Date object
                              const ticketDate = ticket.timestamp instanceof Date ? ticket.timestamp : new Date(ticket.timestamp)
                              const businessHoursWaiting = getBusinessHours(ticketDate, new Date())
                              if (businessHoursWaiting > 4) {
                                return 'bg-red-200 text-red-900 border-2 border-red-500 animate-pulse' // >4 business hours - RED
                              } else if (businessHoursWaiting > 2) {
                                return 'bg-orange-200 text-orange-900 border-2 border-orange-500' // 2-4 business hours - ORANGE
                              } else {
                                return 'bg-green-100 text-green-800' // <2 business hours - GREEN
                              }
                            })()
                          }`}>
                            {ticket.timeAgo}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
            )}

            {/* Analytics Dashboard Tab */}
            {activeTab === 'analytics' && (
              <div className="p-6">
                <ConsolidatedAnalytics />
              </div>
            )}

            {/* Deep Analytics Report Tab */}
            {activeTab === 'deep-analytics' && (
              <div className="p-6">
                <DeepAnalyticsReport />
              </div>
            )}

            {/* Active Minutes Tracker Tab */}
            {activeTab === 'active-minutes' && (
              <div className="p-6">
                <ActiveMinutesTracker />
              </div>
            )}

            {/* Repair Archive Tab */}
            {activeTab === 'repair-archive' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Repair Archive</h3>
                  <button 
                    onClick={() => window.open('/dashboard/admin/repair-archive', '_blank')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Open Full Archive
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">🔧</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-blue-900">Completed Repairs Archive</h4>
                      <p className="text-blue-700 mt-1">
                        View and manage all completed repairs with detailed information, photos, and AI analysis.
                      </p>
                      <div className="mt-3">
                        <button 
                          onClick={() => window.open('/dashboard/admin/repair-archive', '_blank')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Access Repair Archive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Archive Features</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Search and filter completed repairs
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        View detailed repair information
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Access repair photos and documentation
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Review AI analysis and checklists
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Track technician performance
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Quick Stats</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Completed:</span>
                        <span className="font-medium">{stats?.completedToday || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">This Month:</span>
                        <span className="font-medium">-</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Time:</span>
                        <span className="font-medium">{formatTime(stats?.averageCompletionTime || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Technician Modal */}
      {showAddTechnicianModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Technician</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={technicianForm.full_name}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={technicianForm.username}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={technicianForm.email}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={technicianForm.bio}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter technician bio (for PDF reports)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddTechnicianModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTechnician}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Technician
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Technician Modal */}
      {showEditTechnicianModal && editingTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Technician</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={technicianForm.full_name}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={technicianForm.username}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={technicianForm.email}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={technicianForm.bio}
                  onChange={(e) => setTechnicianForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter technician bio (for PDF reports)"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditTechnicianModal(false)
                  setEditingTechnician(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTechnician}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Technician
              </button>
            </div>
          </div>
      </div>
      )}
    </div>
  )
}
