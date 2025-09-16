'use client'

import React, { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import DamageReportModal from '@/components/DamageReportModal'
import RepairCompletionModal from '@/components/RepairCompletionModal'
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

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
  bio?: string
}

export default function TechnicianDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [allTickets, setAllTickets] = useState<ProcessedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState<string>('')
  const [showTechSelector, setShowTechSelector] = useState(true)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<ProcessedTicket | null>(null)
  const [showDamageModal, setShowDamageModal] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const router = useRouter()

  // Auto clock-in function
  const handleAutoClockIn = async (technicianId: string) => {
    try {
      const response = await fetch('/api/technicians/clock-in-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianId,
          action: 'clock_in'
        })
      })

      if (response.ok) {
        console.log('✅ Auto clocked in successfully')
      } else {
        const errorData = await response.json()
        if (errorData.error === 'Technician is already clocked in') {
          console.log('ℹ️ Already clocked in')
        } else {
          console.warn('⚠️ Auto clock-in failed:', errorData.error)
        }
      }
    } catch (error) {
      console.error('❌ Auto clock-in failed:', error)
    }
  }

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      console.log('🔍 Current user:', currentUser)
      
      // Allow both technicians and admins to access this page
      if (!currentUser || (currentUser.role !== 'technician' && currentUser.role !== 'admin')) {
        router.push('/login')
        return
      }
      
      setUser(currentUser)
      
      // Auto clock-in technicians on login
      if (currentUser.role === 'technician') {
        await handleAutoClockIn(currentUser.id)
      }
      
      // If user is a technician, auto-select them and hide selector
      if (currentUser.role === 'technician') {
        const techName = currentUser.full_name || currentUser.username
        console.log('🔍 Setting selected technician to:', techName)
        setSelectedTechnician(techName)
        setShowTechSelector(false)
      } else if (currentUser.role === 'admin') {
        // If user is admin, show technician selector for impersonation
        console.log('🔍 Admin user - showing technician selector')
        setShowTechSelector(true)
      }
    }
    checkAuth()
  }, [router])

  // Fetch all tickets function
  const fetchTickets = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const response = await fetch('/api/tickets')
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }
      const data = await response.json()
      setAllTickets(data.tickets)
      
      // Filter for assigned tickets if technician is selected
      if (selectedTechnician) {
        console.log('🔍 Filtering tickets for technician:', selectedTechnician)
        const assignedTickets = data.tickets.filter((ticket: ProcessedTicket) => {
          // Case-insensitive matching for technician names
          const selectedTechLower = selectedTechnician.toLowerCase()
          const assignedToLower = ticket.assignedTo?.toLowerCase() || ''
          
          const matches = assignedToLower === selectedTechLower || 
                 assignedToLower === selectedTechLower.charAt(0).toUpperCase() + selectedTechLower.slice(1) ||
                 (user && (ticket.assignedTo === user.full_name || ticket.assignedTo === user.username))
          
          if (ticket.assignedTo) {
            console.log(`🔍 Ticket ${ticket.ticketNumber}: assignedTo="${ticket.assignedTo}", selectedTech="${selectedTechnician}", matches=${matches}`)
          }
          
          return matches
        })
        console.log('🔍 Filtered tickets count:', assignedTickets.length)
        setTickets(assignedTickets)
      } else {
        setTickets([])
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError('Failed to load tickets from RepairShopr')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Fetch all tickets
  // Initial data fetch (with loading screen)
  useEffect(() => {
    fetchTickets(true)
  }, [selectedTechnician])

  // Background data refresh (no loading screen)
  useEffect(() => {
    const fetchBackgroundTickets = async () => {
      try {
        const response = await fetch('/api/tickets')
        if (!response.ok) {
          throw new Error('Failed to fetch tickets')
        }
        const data = await response.json()
        setAllTickets(data.tickets)
        
        // Filter for assigned tickets if technician is selected
        if (selectedTechnician) {
          console.log('🔄 Background refresh - filtering for technician:', selectedTechnician)
          const assignedTickets = data.tickets.filter((ticket: ProcessedTicket) => {
            // Case-insensitive matching for technician names
            const selectedTechLower = selectedTechnician.toLowerCase()
            const assignedToLower = ticket.assignedTo?.toLowerCase() || ''
            
            const matches = assignedToLower === selectedTechLower || 
                   assignedToLower === selectedTechLower.charAt(0).toUpperCase() + selectedTechLower.slice(1) ||
                   (user && (ticket.assignedTo === user.full_name || ticket.assignedTo === user.username))
            
            if (ticket.assignedTo) {
              console.log(`🔄 Ticket ${ticket.ticketNumber}: assignedTo="${ticket.assignedTo}", selectedTech="${selectedTechnician}", matches=${matches}`)
            }
            
            return matches
          })
          console.log('🔄 Background refresh - filtered tickets count:', assignedTickets.length)
          setTickets(assignedTickets)
        } else {
          setTickets([])
        }
        setError(null)
      } catch (err) {
        console.error('Error refreshing tickets:', err)
        // Don't set error for background refreshes
      }
    }

    // Start background refresh after initial load
    let interval: NodeJS.Timeout | null = null
    const timeout = setTimeout(() => {
      // Refresh data every minute in background
      interval = setInterval(fetchBackgroundTickets, 1 * 60 * 1000)
    }, 5000) // Wait 5 seconds after initial load

    return () => {
      clearTimeout(timeout)
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [selectedTechnician])

  const handleTechnicianSelect = (techName: string) => {
    setSelectedTechnician(techName)
    setShowTechSelector(false)
    
    // Filter tickets for selected technician
    const assignedTickets = allTickets.filter(ticket => 
      ticket.assignedTo === techName ||
      (user && (ticket.assignedTo === user.full_name || ticket.assignedTo === user.username))
    )
    setTickets(assignedTickets)
  }

  const handleClaimTicket = async (ticketId: string) => {
    try {
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticketId,
          technician: selectedTechnician
        })
      })

      if (!response.ok) {
        throw new Error('Failed to claim ticket')
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.ticketId === ticketId 
          ? { ...ticket, assignedTo: selectedTechnician }
          : ticket
      ))
      
      setAllTickets(prev => prev.map(ticket => 
        ticket.ticketId === ticketId 
          ? { ...ticket, assignedTo: selectedTechnician }
          : ticket
      ))

      setShowClaimModal(false)
    } catch (err) {
      console.error('Error claiming ticket:', err)
      setError('Failed to claim ticket')
    }
  }

  const handleTicketClick = (ticket: ProcessedTicket) => {
    setSelectedTicket(ticket)
    setShowRepairModal(true)
  }

  const handleDamageReportClick = (ticket: ProcessedTicket) => {
    setSelectedTicket(ticket)
    setShowDamageModal(true)
  }

  const handleStartWork = (ticket: ProcessedTicket) => {
    setSelectedTicket(ticket)
    setShowRepairModal(true)
  }

  const handleDamageReportSave = (reportData: any) => {
    console.log('Damage report saved:', reportData)
    // Here you would typically save the damage report to the database
    setShowDamageModal(false)
    setSelectedTicket(null)
  }

  const handleRepairCompletionSave = async (repairData: any) => {
    try {
      console.log('🔧 Saving repair completion:', repairData)
      
      // Save repair completion with photos to database
      const response = await fetch('/api/repair-completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: repairData.ticketId,
          ticketNumber: repairData.ticketNumber,
          technician: selectedTechnician,
          workCompleted: repairData.workCompleted,
          partsUsed: repairData.partsUsed,
          testingResults: repairData.testingResults,
          finalStatus: repairData.finalStatus,
          notes: repairData.notes,
          timeSpent: repairData.timeSpent,
          repairPhotos: repairData.repairPhotos || [],
          photoCount: repairData.photoCount || 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save repair completion')
      }

      const result = await response.json()
      console.log('✅ Repair completion saved successfully:', result)

      // Update the ticket status in RepairShopr
      try {
        const statusResponse = await fetch('/api/tickets/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: repairData.ticketId,
            status: 'Repair Completed'
          })
        })

        if (statusResponse.ok) {
          console.log('✅ RepairShopr status updated successfully')
        }
      } catch (statusError) {
        console.error('⚠️ Failed to update RepairShopr status:', statusError)
        // Don't fail the entire operation if RepairShopr update fails
      }

      // Refresh the tickets list
      await fetchTickets(false)
      
      setShowRepairModal(false)
      setSelectedTicket(null)
      
      // Show success message
      alert(`✅ Repair completed successfully! ${result.photosSaved} photos saved.`)
      
    } catch (error) {
      console.error('❌ Error saving repair completion:', error)
      alert(`Failed to save repair completion: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDamageReportClose = () => {
    setShowDamageModal(false)
    setSelectedTicket(null)
  }

  const handleRepairModalClose = () => {
    setShowRepairModal(false)
    setSelectedTicket(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <DashboardNavigation currentSection="technician" userRole={user?.role} />
      
      {/* Header - Mobile Optimized */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-6 space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Technician Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, {selectedTechnician || 'Technician'}</p>
            </div>
            
            {/* Mobile-First Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              {/* Role Switcher - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Switch to:</label>
                <select 
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  onChange={(e) => {
                    if (e.target.value === 'admin') {
                      window.location.href = '/dashboard/admin'
                    } else if (e.target.value === 'claim-manager') {
                      window.location.href = '/dashboard/claim-manager'  
                    }
                  }}
                  defaultValue="technician"
                >
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="claim-manager">Claim Manager</option>
                </select>
              </div>
              
              {/* Primary Actions */}
              <div className="flex gap-2">
                {selectedTechnician && (
                  <button 
                    onClick={() => setShowClaimModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">🎯 Claim Tickets</span>
                    <span className="sm:hidden">🎯 Claim</span>
                  </button>
                )}
                <button 
                  onClick={() => window.location.href = '/login'} 
                  className="text-blue-600 hover:text-blue-800 px-2 py-2 text-sm"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">🚪</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Selector Modal */}
      {showTechSelector && user && user.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Technician to View</h3>
            <p className="text-sm text-gray-600 mb-4">Choose a technician to view their assigned tickets and work as them.</p>
            <div className="space-y-2">
              {['ben', 'marshal', 'malvin', 'francis'].map((tech) => (
                <button
                  key={tech}
                  onClick={() => handleTechnicianSelect(tech)}
                  className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 capitalize"
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Claim Tickets Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Claim Unassigned Tickets</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select tickets to claim as {selectedTechnician}
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device & Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTickets
                    .filter(ticket => !ticket.assignedTo)
                    .map((ticket, index) => (
                    <tr key={ticket.ticketId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>#{ticket.ticketNumber}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.ticketType === 'PR' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.ticketType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 mb-1">{ticket.deviceInfo}</div>
                          <div className="text-gray-600 text-sm truncate">
                            {ticket.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'Awaiting Rework' ? 'bg-red-100 text-red-800' :
                          ticket.status === 'Awaiting Workshop Repairs' ? 'bg-orange-100 text-orange-800' :
                          ticket.status === 'Awaiting Damage Report' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'Awaiting Repair' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleClaimTicket(ticket.ticketId)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          Claim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Assigned Tickets</h2>
            <p className="text-sm text-gray-600 mt-1">
              {tickets.length} tickets assigned to you
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading your tickets...</span>
              </div>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-red-600">
              <p className="font-semibold">Error loading tickets</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : !selectedTechnician ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg font-medium">Please select your technician profile</p>
              <p className="text-sm">Click the technician selector to access your assigned tickets.</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg font-medium">No tickets assigned</p>
              <p className="text-sm">You don't have any tickets assigned to you yet. Use the "Claim Tickets" button to claim unassigned tickets.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device & Description  
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        ⚠️ Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket, index) => (
                      <tr 
                        key={ticket.ticketId} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                        onClick={() => {
                          if (ticket.status === 'Awaiting Damage Report') {
                            handleDamageReportClick(ticket)
                          } else {
                            handleTicketClick(ticket)
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{ticket.ticketId}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.ticketType === 'PR' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {ticket.ticketType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{ticket.deviceInfo}</div>
                            <div className="text-gray-500 text-sm">{ticket.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ticket.status === 'Awaiting Rework' ? 'bg-red-100 text-red-800' :
                            ticket.status === 'Awaiting Workshop Repairs' ? 'bg-orange-100 text-orange-800' :
                            ticket.status === 'Awaiting Damage Report' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'Awaiting Repair' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap w-20">
                          <div className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                            {ticket.timeAgo}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {ticket.status !== 'Awaiting Damage Report' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartWork(ticket)
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                              >
                                Start Work
                              </button>
                            )}
                            {ticket.status === 'Awaiting Damage Report' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDamageReportClick(ticket)
                                }}
                                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                              >
                                Damage Report
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {tickets.map((ticket, index) => (
                  <div 
                    key={ticket.ticketId}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      if (ticket.status === 'Awaiting Damage Report') {
                        handleDamageReportClick(ticket)
                      } else {
                        handleTicketClick(ticket)
                      }
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{ticket.ticketId}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.ticketType === 'PR' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {ticket.ticketType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          {ticket.timeAgo}
                        </span>
                      </div>
                    </div>

                    {/* Device Info */}
                    <div className="mb-3">
                      <div className="font-medium text-gray-900 mb-1">{ticket.deviceInfo}</div>
                      <div className="text-gray-500 text-sm line-clamp-2">{ticket.description}</div>
                    </div>

                    {/* Status */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === 'Awaiting Rework' ? 'bg-red-100 text-red-800' :
                        ticket.status === 'Awaiting Workshop Repairs' ? 'bg-orange-100 text-orange-800' :
                        ticket.status === 'Awaiting Damage Report' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Awaiting Repair' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {ticket.status !== 'Awaiting Damage Report' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartWork(ticket)
                          }}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          Start Work
                        </button>
                      )}
                      {ticket.status === 'Awaiting Damage Report' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDamageReportClick(ticket)
                          }}
                          className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
                        >
                          Damage Report
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Damage Report Modal */}
      {showDamageModal && selectedTicket && (
        <DamageReportModal
          ticket={selectedTicket}
          onClose={handleDamageReportClose}
          onSave={handleDamageReportSave}
        />
      )}

      {/* Repair Completion Modal */}
      {showRepairModal && selectedTicket && (
        <RepairCompletionModal
          ticket={selectedTicket}
          onClose={handleRepairModalClose}
          onSave={handleRepairCompletionSave}
        />
      )}
    </div>
  )
}