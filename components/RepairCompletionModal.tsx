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

interface RepairCompletionModalProps {
  ticket: ProcessedTicket
  onClose: () => void
  onSave: (repairData: any) => void
}

export default function RepairCompletionModal({ ticket, onClose, onSave }: RepairCompletionModalProps) {
  const [formData, setFormData] = useState({
    workCompleted: '',
    partsUsed: '',
    testingResults: '',
    finalStatus: 'Repaired',
    notes: '',
    timeSpent: ''
  })

  const [timerStarted, setTimerStarted] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerStarted && !timerPaused && timerStartTime) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - timerStartTime.getTime()) / 1000) + pausedTime
        setElapsedTime(elapsed)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerStarted, timerPaused, timerStartTime, pausedTime])

  const startTimer = () => {
    if (!timerStarted) {
      setTimerStartTime(new Date())
      setTimerStarted(true)
      setTimerPaused(false)
      setPausedTime(0)
    } else if (timerPaused) {
      // Resume from pause
      setTimerStartTime(new Date())
      setTimerPaused(false)
    }
  }

  const pauseTimer = () => {
    if (timerStarted && !timerPaused) {
      setPausedTime(elapsedTime)
      setTimerPaused(true)
    }
  }

  const stopTimer = () => {
    setTimerStarted(false)
    setTimerPaused(false)
    setTimerStartTime(null)
    setPausedTime(0)
    setElapsedTime(0)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = async () => {
    if (!timerStarted) {
      alert('Please start the timer before completing the repair')
      return
    }

    if (!formData.workCompleted.trim()) {
      alert('Please describe the work completed')
      return
    }

    if (!formData.testingResults.trim()) {
      alert('Please provide testing results')
      return
    }

    const repairData = {
      ...formData,
      timeSpent: formatTime(elapsedTime),
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      completedAt: new Date().toISOString()
    }

    try {
      await onSave(repairData)
      onClose()
    } catch (error) {
      console.error('Error saving repair completion:', error)
      alert('Failed to save repair completion')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Repair Completion Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Ticket Information */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2">Ticket Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Ticket ID:</span> {ticket.ticketId}
              </div>
              <div>
                <span className="font-medium">Device:</span> {ticket.deviceInfo}
              </div>
              <div>
                <span className="font-medium">Status:</span> {ticket.status}
              </div>
              <div>
                <span className="font-medium">Type:</span> {ticket.ticketType}
              </div>
            </div>
          </div>

          {/* Timer Section */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-3">Work Timer</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-mono font-bold text-blue-600">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex gap-2">
                {!timerStarted ? (
                  <button
                    onClick={startTimer}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Start Timer
                  </button>
                ) : timerPaused ? (
                  <button
                    onClick={startTimer}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                  >
                    Pause
                  </button>
                )}
                {timerStarted && (
                  <button
                    onClick={stopTimer}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Completed *
              </label>
              <textarea
                value={formData.workCompleted}
                onChange={(e) => setFormData({ ...formData, workCompleted: e.target.value })}
                disabled={!timerStarted}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={4}
                placeholder="Describe what work was performed on the device..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parts Used
              </label>
              <textarea
                value={formData.partsUsed}
                onChange={(e) => setFormData({ ...formData, partsUsed: e.target.value })}
                disabled={!timerStarted}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={3}
                placeholder="List any parts that were replaced or used..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Testing Results *
              </label>
              <textarea
                value={formData.testingResults}
                onChange={(e) => setFormData({ ...formData, testingResults: e.target.value })}
                disabled={!timerStarted}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={4}
                placeholder="Describe the testing performed and results..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Status
                </label>
                <select
                  value={formData.finalStatus}
                  onChange={(e) => setFormData({ ...formData, finalStatus: e.target.value })}
                  disabled={!timerStarted}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="Repaired">Repaired</option>
                  <option value="Partially Repaired">Partially Repaired</option>
                  <option value="Cannot Repair">Cannot Repair</option>
                  <option value="Needs Further Testing">Needs Further Testing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Spent
                </label>
                <input
                  type="text"
                  value={formatTime(elapsedTime)}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!timerStarted}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={3}
                placeholder="Any additional notes or observations..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!timerStarted}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ✅ Complete Repair
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
