'use client'

import React from 'react'

interface TicketCardProps {
  ticketId: string
  description: string
  status: string
  timeAgo: string
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'DR' | 'OUT' | 'PPS'
}

export default function CompactTicketCard({
  ticketId,
  description,
  status,
  timeAgo,
  deviceInfo,
  assignedTo,
  aiPriority,
  estimatedTime,
  ticketType
}: TicketCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DR': return 'bg-yellow-100 text-yellow-800'
      case 'OUT': return 'bg-blue-100 text-blue-800'
      case 'PPS': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P4': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header with ticket ID and type */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{ticketId}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(ticketType)}`}>
            {ticketType}
          </span>
        </div>
        <span className="text-sm text-gray-500">{timeAgo}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {description}
      </p>

      {/* Status */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {status}
        </span>
      </div>

      {/* Device info */}
      <div className="mb-3">
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          {deviceInfo}
        </div>
      </div>

      {/* Bottom row with AI priority, time estimate, and assignment */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(aiPriority)}`}>
            AI: {aiPriority}
          </span>
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <span className="text-blue-600">🕒</span>
            {estimatedTime}
          </span>
        </div>
        
        <div className="text-right">
          {assignedTo ? (
            <div className="text-xs">
              <span className="text-gray-500">Assigned to:</span>
              <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                {assignedTo}
              </span>
            </div>
          ) : (
            <select className="text-xs border border-gray-300 rounded px-2 py-1">
              <option>Select technician...</option>
            </select>
          )}
        </div>
      </div>
    </div>
  )
}