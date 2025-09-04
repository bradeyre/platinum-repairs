'use client'

import React, { useState, useEffect } from 'react'

interface ProcessedTicket {
  ticketId: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'P' | 'DD'
}

export default function TechnicianDashboard() {
  const [tickets, setTickets] = useState<ProcessedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tickets assigned to current technician (for now, show all)
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/tickets')
        if (!response.ok) {
          throw new Error('Failed to fetch tickets')
        }
        const data = await response.json()
        // Filter for assigned tickets only (technician view)
        const assignedTickets = data.tickets.filter((ticket: ProcessedTicket) => ticket.assignedTo)
        setTickets(assignedTickets)
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
  }, [])

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
                <span className="text-gray-600">Welcome, Technician</span>
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
          ) : tickets.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg font-medium">No tickets assigned</p>
              <p className="text-sm">You don't have any tickets assigned to you yet.</p>
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
                            ticket.ticketType === 'P' ? 'bg-blue-100 text-blue-800' :
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