'use client'

import React, { useState } from 'react'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tickets')

  // Real ticket data with correct 5 statuses distributed across tickets
  const rawTickets = [
    {
      ticketId: 'PR #89022',
      description: 'PPS 00404395+001+009 / SPM 11642/7/25 GeekPls Laptop (S/N: GHH1C16T1A0013...',
      status: 'Awaiting Rework',
      timeAgo: '48h ago',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      deviceInfo: 'Unknown Device',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'DD #12845',
      description: 'MacBook Pro 14" M3 - Liquid damage from coffee spill, keyboard not responding...',
      status: 'Awaiting Rework',
      timeAgo: '36h ago',
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
      deviceInfo: 'MacBook Pro 14" M3',
      aiPriority: 'P4',
      estimatedTime: '3h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'OUT #15678',
      description: 'Dell XPS 13 - Won\'t power on, suspected motherboard issue...',
      status: 'Awaiting Workshop Repairs',
      timeAgo: '72h ago',
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
      deviceInfo: 'Dell XPS 13',
      aiPriority: 'P4',
      estimatedTime: '4h',
      ticketType: 'OUT' as const
    },
    {
      ticketId: 'PPS #23456',
      description: 'Surface Pro 9 - Type cover connection issues, not detecting keyboard...',
      status: 'Awaiting Workshop Repairs',
      timeAgo: '24h ago',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      deviceInfo: 'Surface Pro 9',
      aiPriority: 'P4',
      estimatedTime: '1.5h',
      ticketType: 'PPS' as const
    },
    {
      ticketId: 'DD #12811',
      description: 'Naked Insurance DR - iPhone 15 Pro, Rear casing cracked & pieces fell out. Camera...',
      status: 'Awaiting Damage Report',
      timeAgo: '21.7h ago',
      timestamp: new Date(Date.now() - 21.7 * 60 * 60 * 1000),
      deviceInfo: 'iPhone 15 Pro',
      assignedTo: 'Ben', // Only real assignment
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89674',
      description: 'OUT Mobile DR | iPad Pro 4 Chip 11 Inch - Storage 256Gb grey liquid damaged |...',
      status: 'Awaiting Damage Report',
      timeAgo: '16.4h ago',
      timestamp: new Date(Date.now() - 16.4 * 60 * 60 * 1000),
      deviceInfo: 'iPad Pro 4 Chip 11 Inch - Storage 256Gb grey liquid damaged',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'DD #12892',
      description: 'iPad Air 5th Gen - Cracked screen and bent frame from drop...',
      status: 'Awaiting Damage Report',
      timeAgo: '9.8h ago',
      timestamp: new Date(Date.now() - 9.8 * 60 * 60 * 1000),
      deviceInfo: 'iPad Air 5th Gen',
      aiPriority: 'P4',
      estimatedTime: '2.5h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89456',
      description: 'iPhone 14 Pro Max - Battery replacement, experiencing rapid drain...',
      status: 'Awaiting Repair',
      timeAgo: '18h ago',
      timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
      deviceInfo: 'iPhone 14 Pro Max',
      aiPriority: 'P4',
      estimatedTime: '1h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89789',
      description: 'Google Pixel 8 Pro - Camera module replacement, rear camera not functioning...',
      status: 'Awaiting Repair',
      timeAgo: '12h ago',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      deviceInfo: 'Google Pixel 8 Pro',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'PR #89123',
      description: 'Samsung Galaxy S24 Ultra - Screen replacement needed after drop damage...',
      status: 'In Progress',
      timeAgo: '8.2h ago',
      timestamp: new Date(Date.now() - 8.2 * 60 * 60 * 1000),
      deviceInfo: 'Samsung Galaxy S24 Ultra',
      aiPriority: 'P4',
      estimatedTime: '1.5h',
      ticketType: 'DR' as const
    },
    {
      ticketId: 'OUT #15702',
      description: 'Nintendo Switch OLED - Joy-Con drift issues, both controllers affected...',
      status: 'In Progress',
      timeAgo: '4h ago',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      deviceInfo: 'Nintendo Switch OLED',
      aiPriority: 'P4',
      estimatedTime: '1h',
      ticketType: 'OUT' as const
    }
  ]

  // Status priority for sorting (lower number = higher priority)
  const statusPriority: Record<string, number> = {
    'Awaiting Rework': 1,
    'Awaiting Workshop Repairs': 2,
    'Awaiting Damage Report': 3,
    'Awaiting Repair': 4,
    'In Progress': 5
  }

  // Sort tickets by status priority first, then by timestamp (oldest first)
  const tickets = rawTickets.sort((a, b) => {
    const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999)
    if (statusDiff !== 0) return statusDiff
    return a.timestamp.getTime() - b.timestamp.getTime()
  })

  // Calculate stats
  const stats = {
    total: tickets.length,
    activeReports: tickets.filter(t => t.status !== 'In Progress').length,
    completedReports: 0, // None completed in this sample
    overdueReports: tickets.filter(t => t.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    totalRSTickets: tickets.length,
    unassigned: tickets.filter(t => !t.assignedTo).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Platinum Repairs - Admin Dashboard</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Switch to:</span>
                <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                  <option value="admin">Admin</option>
                  <option value="tech">Technician</option>
                  <option value="claim-manager">Claim Manager</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Welcome, Andre</span>
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


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`pb-2 border-b-2 ${
                activeTab === 'overview' 
                  ? 'text-blue-600 border-blue-600 font-medium' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              Overview & Stats
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`pb-2 border-b-2 ${
                activeTab === 'tickets' 
                  ? 'text-blue-600 border-blue-600 font-medium' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              RepairShopper Tickets ({tickets.length})
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' ? (
          /* Overview & Stats View */
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Reports</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Active Reports</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeReports}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Completed Reports</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completedReports}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Overdue Reports</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stats.overdueReports}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-purple-600 font-bold text-sm">RS</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Unassigned</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stats.unassigned}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Management Sections */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">RepairShopper Sync</h3>
                <p className="text-sm text-gray-600 mb-4">Manage RepairShopper ticket synchronization and status.</p>
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                  🔄 Sync Controls
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Technician Management</h3>
                <p className="text-sm text-gray-600 mb-4">Manage technician profiles, skills, and performance tracking.</p>
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                  👥 Manage Users
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Parts Pricing</h3>
                <p className="text-sm text-gray-600 mb-4">Manage parts pricing from Google Sheets integration.</p>
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                  🔧 Parts Pricing
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">Configure system settings and scoring algorithms.</p>
                <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                  ⚙️ System Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tickets View */
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">RepairShopper Tickets</h2>
              <div className="text-sm text-gray-600">
                {stats.totalRSTickets} tickets • {stats.unassigned} unassigned
              </div>
            </div>

            {/* Tickets Table - Clean list view */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ⚠️ WAITING TIME
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Est. Time
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
                              ticket.ticketType === 'DR' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.ticketType === 'OUT' ? 'bg-blue-100 text-blue-800' :
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
                          <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold ${
                            // Color coding based on waiting time to create urgency
                            ticket.timestamp < new Date(Date.now() - 48 * 60 * 60 * 1000) 
                              ? 'bg-red-200 text-red-900 border-2 border-red-500 animate-pulse' // 48+ hours - CRITICAL
                              : ticket.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)
                              ? 'bg-orange-200 text-orange-900 border-2 border-orange-500' // 24+ hours - URGENT  
                              : ticket.timestamp < new Date(Date.now() - 12 * 60 * 60 * 1000)
                              ? 'bg-yellow-200 text-yellow-900 border border-yellow-500' // 12+ hours - HIGH
                              : 'bg-blue-100 text-blue-800' // Less than 12 hours - NORMAL
                          }`}>
                            <span className="mr-1">🚨</span>
                            {ticket.timeAgo}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.assignedTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {ticket.assignedTo}
                            </span>
                          ) : (
                            <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                              <option>Select technician...</option>
                              <option>Ben</option>
                              <option>Alex</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-500 text-white">
                            AI: {ticket.aiPriority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>🕒</span>
                            {ticket.estimatedTime}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}