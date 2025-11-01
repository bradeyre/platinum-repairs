'use client'

import React, { useState, useEffect } from 'react'
import { triggerCelebration } from './CelebrationSystem'

interface Ticket {
  ticketId: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  ticketType: 'PR' | 'DD'
}

interface TicketClaimingModalProps {
  onClose: () => void
  tickets: Ticket[]
  onTicketClaimed: (ticketId: string, techName: string) => void
}

export default function TicketClaimingModal({ onClose, tickets, onTicketClaimed }: TicketClaimingModalProps) {
  const [selectedTech, setSelectedTech] = useState<string>('')
  const [authenticatedTech, setAuthenticatedTech] = useState<string>('')
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([])
  const [claimingTicket, setClaimingTicket] = useState<string | null>(null)

  const technicians = ['Ben', 'Alex', 'Sarah', 'Mike']

  useEffect(() => {
    // No localStorage - technicians must authenticate each session
    // const storedTech = localStorage.getItem('authenticatedTech')
    // if (storedTech && technicians.includes(storedTech)) {
    //   setAuthenticatedTech(storedTech)
    //   setSelectedTech(storedTech)
    //   setShowAuthModal(false)
    // }
  }, [])

  useEffect(() => {
    // Filter unassigned tickets
    const unassigned = tickets.filter(ticket => 
      !ticket.assignedTo || ticket.assignedTo === 'Unassigned' || ticket.assignedTo === ''
    )
    setUnassignedTickets(unassigned)
  }, [tickets])

  const handleTechAuthentication = () => {
    if (!selectedTech) {
      alert('Please select your name first.')
      return
    }

    setAuthenticatedTech(selectedTech)
    // No localStorage - session only authentication
    // localStorage.setItem('authenticatedTech', selectedTech)
    setShowAuthModal(false)
    
    // Show welcome celebration
    triggerCelebration(selectedTech, 'logged in', { action: 'authentication' })
  }

  const handleClaimTicket = async (ticket: Ticket) => {
    if (!authenticatedTech) {
      alert('Please authenticate first.')
      return
    }

    setClaimingTicket(ticket.ticketId)
    
    try {
      // Call API to assign ticket
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ticketId: ticket.ticketId, 
          technician: authenticatedTech 
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to claim ticket')
      }
      
      // Update local state and trigger celebration
      onTicketClaimed(ticket.ticketId, authenticatedTech)
      
      // Remove from unassigned list
      setUnassignedTickets(prev => prev.filter(t => t.ticketId !== ticket.ticketId))
      
      // Show celebration
      triggerCelebration(authenticatedTech, 'ticket claimed', { 
        ticketId: ticket.ticketId,
        count: unassignedTickets.length - 1 
      })
      
      // Show success message
      alert(`Ticket ${ticket.ticketId} claimed by ${authenticatedTech}!`)
      
    } catch (error) {
      console.error('Error claiming ticket:', error)
      alert('Failed to claim ticket. Please try again.')
    } finally {
      setClaimingTicket(null)
    }
  }

  const getWaitTimeColor = (timeAgo: string) => {
    if (timeAgo.includes('d') || timeAgo.includes('h') && parseInt(timeAgo) > 4) {
      return 'text-red-600 bg-red-100 animate-pulse'
    } else if (timeAgo.includes('h') && parseInt(timeAgo) > 2) {
      return 'text-orange-600 bg-orange-100'
    } else {
      return 'text-green-600 bg-green-100'
    }
  }

  if (showAuthModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Technician Authentication</h2>
            <p className="text-gray-600">Please select your name to continue</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Technician
              </label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose your name...</option>
                {technicians.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleTechAuthentication}
                disabled={!selectedTech}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🎯 Available Tickets</h2>
              <p className="text-green-100">
                Welcome {authenticatedTech}! Claim tickets to work on
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm bg-white bg-opacity-20 rounded px-3 py-1">
                {unassignedTickets.length} available tickets
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {unassignedTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No unassigned tickets available right now.</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for new tickets.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select a ticket to claim:
                </h3>
                <div className="text-sm text-gray-600">
                  Logged in as: <span className="font-medium text-green-600">{authenticatedTech}</span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {unassignedTickets.map((ticket) => (
                  <div
                    key={ticket.ticketId}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{ticket.ticketId}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.ticketType === 'PR' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {ticket.ticketType}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getWaitTimeColor(ticket.timeAgo)}`}>
                            ⚠️ {ticket.timeAgo}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <div className="font-medium text-gray-900">{ticket.deviceInfo}</div>
                          <div className="text-sm text-gray-600 mt-1">{ticket.description}</div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'Awaiting Rework' ? 'bg-red-100 text-red-800' :
                            ticket.status === 'Awaiting Workshop Repairs' ? 'bg-orange-100 text-orange-800' :
                            ticket.status === 'Awaiting Damage Report' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'Awaiting Repair' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleClaimTicket(ticket)}
                          disabled={claimingTicket === ticket.ticketId}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {claimingTicket === ticket.ticketId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Claiming...
                            </>
                          ) : (
                            <>
                              🎯 Claim Ticket
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            💡 Tip: Claim tickets based on urgency (red = &gt;4hrs, orange = 2-4hrs)
          </div>
          <button
            onClick={() => {
              // No localStorage - just clear session state
              // localStorage.removeItem('authenticatedTech')
              setAuthenticatedTech('')
              setShowAuthModal(true)
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Switch Technician
          </button>
        </div>
      </div>
    </div>
  )
}