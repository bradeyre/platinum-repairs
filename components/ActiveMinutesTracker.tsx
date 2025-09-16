'use client'

import React, { useState, useEffect } from 'react'

interface ActiveMinutesData {
  date: string
  totalActiveMinutes: number
  totalHours: number
  remainingMinutes: number
  efficiency: number
  workDayHours: number
  workDayMinutes: number
  breakdown: {
    systemActiveMinutes: number
    repairShoprActiveMinutes: number
    technicianBreakdown: Array<{
      name: string
      activeMinutes: number
    }>
  }
}

export default function ActiveMinutesTracker() {
  const [data, setData] = useState<ActiveMinutesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTechnician, setSelectedTechnician] = useState('')

  const fetchActiveMinutes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate
      })
      
      if (selectedTechnician) {
        params.append('technicianId', selectedTechnician)
      }
      
      const response = await fetch(`/api/technician-active-minutes?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        console.error('Failed to fetch active minutes:', result.error)
      }
    } catch (error) {
      console.error('Error fetching active minutes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveMinutes()
  }, [selectedDate, selectedTechnician])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600'
    if (efficiency >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEfficiencyBarColor = (efficiency: number) => {
    if (efficiency >= 90) return 'bg-green-500'
    if (efficiency >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Minutes Tracker</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Active Minutes Tracker</h3>
        <div className="flex gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Technicians</option>
            <option value="thasveer">Thasveer</option>
            <option value="reece">Reece</option>
            {/* Add other technicians as needed */}
          </select>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(data.totalActiveMinutes)}
          </div>
          <div className="text-sm text-gray-600">Total Active Time</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className={`text-2xl font-bold ${getEfficiencyColor(data.efficiency)}`}>
            {data.efficiency.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Efficiency</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {formatTime(data.workDayMinutes - data.totalActiveMinutes)}
          </div>
          <div className="text-sm text-gray-600">Remaining Time</div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {data.workDayHours}h
          </div>
          <div className="text-sm text-gray-600">Work Day Target</div>
        </div>
      </div>

      {/* Efficiency Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Efficiency</span>
          <span className={`text-sm font-bold ${getEfficiencyColor(data.efficiency)}`}>
            {data.efficiency.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getEfficiencyBarColor(data.efficiency)}`}
            style={{ width: `${Math.min(data.efficiency, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3">System Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Online System</span>
              <span className="font-medium">{formatTime(data.breakdown.systemActiveMinutes)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">RepairShopr Tracking</span>
              <span className="font-medium">{formatTime(data.breakdown.repairShoprActiveMinutes)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Technician Breakdown</h4>
          <div className="space-y-2">
            {data.breakdown.technicianBreakdown.map((tech, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{tech.name}</span>
                <span className="font-medium">{formatTime(tech.activeMinutes)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={fetchActiveMinutes}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}
