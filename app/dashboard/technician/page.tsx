'use client'

import React, { useState, useEffect } from 'react'

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

export default function TechnicianDashboard() {
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [allTickets, setAllTickets] = useState<ProcessedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState<string>('')
  const [showTechSelector, setShowTechSelector] = useState(true)
  const [showClaimModal, setShowClaimModal] = useState(false)

  // Fetch all tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/tickets')
        if (!response.ok) {
          throw new Error('Failed to fetch tickets')
        }
        const data = await response.json()
        setAllTickets(data.tickets)
        
        // Filter for assigned tickets if technician is selected
        if (selectedTechnician) {
          const assignedTickets = data.tickets.filter((ticket: ProcessedTicket) => 
            ticket.assignedTo === selectedTechnician
          )
          setTickets(assignedTickets)
        } else {
          setTickets([])
        }
        setError(null)
      } catch (err) {
        console.error('Error fetching tickets:', err)
        setError('Failed to load tickets from RepairShopr')
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
    const interval = setInterval(fetchTickets, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedTechnician])

  const handleTechnicianSelect = (techName: string) => {
    setSelectedTechnician(techName)
    setShowTechSelector(false)
    
    // Filter tickets for selected technician
    const assignedTickets = allTickets.filter(ticket => ticket.assignedTo === techName)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platinum Repairs - Technician Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  Welcome, {selectedTechnician || 'Technician'}
                </span>
                {selectedTechnician && (
                  <button 
                    onClick={() => setShowClaimModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
                  >
                    🎯 Claim Tickets
                  </button>
                )}
                <button 
                  onClick={() => window.location.href = '/login'} 
                  className="text-blue-600 hover:text-blue-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Selector Modal */}
      {showTechSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your Technician Profile</h3>
            <p className="text-sm text-gray-600 mb-4">Please select which technician you are to access your assigned tickets.</p>
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
            <div className="overflow-x-auto">
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket, index) => (
                    <tr key={ticket.ticketId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}