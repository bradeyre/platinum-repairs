'use client'

import React from 'react'
import CompactTicketCard from '@/components/CompactTicketCard'

export default function AdminDashboard() {

  // Sample ticket data based on the screenshot
  const tickets = [
    {
      ticketId: 'PR #89022',
      description: 'PPS 00404395+001+009 / SPM 11642/7/25 GeekPls Laptop (S/N: GHH1C16T1A0013...',
      status: 'Awaiting Damage Report',
      timeAgo: '14.5h ago',
      deviceInfo: 'Unknown Device',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'DD #12811',
      description: 'Naked Insurance DR - iPhone 15 Pro, Rear casing cracked & pieces fell out. Camera...',
      status: 'Awaiting Damage Report',
      timeAgo: '21.7h ago',
      deviceInfo: 'iPhone 15 Pro',
      assignedTo: 'Ben',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89674',
      description: 'OUT Mobile DR | iPad Pro 4 Chip 11 Inch - Storage 256Gb grey liquid damaged |...',
      status: 'Awaiting Damage Report',
      timeAgo: '16.4h ago',
      deviceInfo: 'iPad Pro 4 Chip 11 Inch - Storage 256Gb grey liquid damaged',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Platinum Repairs - Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, Andre</span>
              <button className="text-blue-600 hover:text-blue-800">Logout</button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button className="text-gray-500 hover:text-gray-700 pb-2 border-b-2 border-transparent hover:border-gray-300">
              Overview & Stats
            </button>
            <button className="text-blue-600 pb-2 border-b-2 border-blue-600 font-medium">
              RepairShopper Tickets (11)
            </button>
          </nav>
        </div>

        {/* Tickets Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">RepairShopper Tickets</h2>
            <div className="text-sm text-gray-600">
              11 tickets • 11 unassigned
            </div>
          </div>

          {/* Tickets Grid - More compact layout */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <CompactTicketCard
                key={ticket.ticketId}
                {...ticket}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}