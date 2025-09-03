'use client'

import React from 'react'
import CompactTicketCard from '@/components/CompactTicketCard'

export default function AdminDashboard() {

  // Sample ticket data - 11 tickets to match the dashboard count
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
    },
    {
      ticketId: 'PR #89123',
      description: 'Samsung Galaxy S24 Ultra - Screen replacement needed after drop damage...',
      status: 'Awaiting Damage Report',
      timeAgo: '8.2h ago',
      deviceInfo: 'Samsung Galaxy S24 Ultra',
      aiPriority: 'P4',
      estimatedTime: '1.5h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'DD #12845',
      description: 'MacBook Pro 14" M3 - Liquid damage from coffee spill, keyboard not responding...',
      status: 'Awaiting Damage Report',
      timeAgo: '12.1h ago',
      deviceInfo: 'MacBook Pro 14" M3',
      assignedTo: 'Alex',
      aiPriority: 'P4',
      estimatedTime: '3h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89456',
      description: 'iPhone 14 Pro Max - Battery replacement, experiencing rapid drain...',
      status: 'Awaiting Damage Report',
      timeAgo: '5.7h ago',
      deviceInfo: 'iPhone 14 Pro Max',
      aiPriority: 'P4',
      estimatedTime: '1h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'OUT #15678',
      description: 'Dell XPS 13 - Won\'t power on, suspected motherboard issue...',
      status: 'Awaiting Damage Report',
      timeAgo: '18.3h ago',
      deviceInfo: 'Dell XPS 13',
      aiPriority: 'P4',
      estimatedTime: '4h',
      ticketType: 'OUT' as const
    },
    {
      ticketId: 'DD #12892',
      description: 'iPad Air 5th Gen - Cracked screen and bent frame from drop...',
      status: 'Awaiting Damage Report',
      timeAgo: '9.8h ago',
      deviceInfo: 'iPad Air 5th Gen',
      assignedTo: 'Ben',
      aiPriority: 'P4',
      estimatedTime: '2.5h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89789',
      description: 'Google Pixel 8 Pro - Camera module replacement, rear camera not functioning...',
      status: 'Awaiting Damage Report',
      timeAgo: '6.4h ago',
      deviceInfo: 'Google Pixel 8 Pro',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PPS #23456',
      description: 'Surface Pro 9 - Type cover connection issues, not detecting keyboard...',
      status: 'Awaiting Damage Report',
      timeAgo: '15.6h ago',
      deviceInfo: 'Surface Pro 9',
      aiPriority: 'P4',
      estimatedTime: '1.5h',
      ticketType: 'PPS' as const
    },
    {
      ticketId: 'OUT #15702',
      description: 'Nintendo Switch OLED - Joy-Con drift issues, both controllers affected...',
      status: 'Awaiting Damage Report',
      timeAgo: '11.2h ago',
      deviceInfo: 'Nintendo Switch OLED',
      assignedTo: 'Alex',
      aiPriority: 'P4',
      estimatedTime: '1h',
      ticketType: 'OUT' as const
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