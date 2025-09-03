'use client'

import React, { useState } from 'react'
import CompactTicketCard from '@/components/CompactTicketCard'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tickets')

  // Original real ticket data - NO MOCK DATA, only what was actually in the system
  const rawTickets = [
    {
      ticketId: 'PR #89022',
      description: 'PPS 00404395+001+009 / SPM 11642/7/25 GeekPls Laptop (S/N: GHH1C16T1A0013...',
      status: 'Awaiting Damage Report',
      timeAgo: '14.5h ago',
      timestamp: new Date(Date.now() - 14.5 * 60 * 60 * 1000),
      deviceInfo: 'Unknown Device',
      aiPriority: 'P4',
      estimatedTime: '2h',
      ticketType: 'DR' as const
      // NO assignedTo - this ticket is unassigned
    },
    {
      ticketId: 'DD #12811',
      description: 'Naked Insurance DR - iPhone 15 Pro, Rear casing cracked & pieces fell out. Camera...',
      status: 'Awaiting Damage Report',
      timeAgo: '21.7h ago',
      timestamp: new Date(Date.now() - 21.7 * 60 * 60 * 1000),
      deviceInfo: 'iPhone 15 Pro',
      assignedTo: 'Ben', // This was the ONLY real assignment you mentioned
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
      // NO assignedTo - this ticket is unassigned
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
        )}
      </div>
    </div>
  )
}