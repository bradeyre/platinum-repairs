'use client'

import React, { useState, useEffect } from 'react'
import AIRepairAssistantComponent from './AIRepairAssistant'
import RepairChecklistComponent from './RepairChecklist'

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

  // Photo upload state
  const [repairPhotos, setRepairPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  
  // Repair Checklist state
  const [showRepairChecklist, setShowRepairChecklist] = useState(true) // Auto-show by default
  const [repairChecklist, setRepairChecklist] = useState<any>(null)

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

  const startTimer = async () => {
    if (!timerStarted) {
      setTimerStartTime(new Date())
      setTimerStarted(true)
      setTimerPaused(false)
      setPausedTime(0)
      
      // Record time tracking entry
      try {
        await fetch('/api/time-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.ticketId,
            technicianId: ticket.assignedTo || 'unknown',
            technicianName: ticket.assignedTo || 'unknown',
            workType: 'repair',
            description: `Repair work on ${ticket.deviceInfo}`,
            startTime: new Date().toISOString(),
            status: 'active'
          })
        })
        console.log('✅ Time tracking started for repair work')
      } catch (error) {
        console.error('❌ Failed to start time tracking:', error)
      }
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

  // Photo handling functions
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`${file.name} is too large. Maximum size is 5MB`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Check total photo limit (max 10 photos)
    if (repairPhotos.length + validFiles.length > 10) {
      alert('Maximum 10 photos allowed')
      return
    }

    setRepairPhotos(prev => [...prev, ...validFiles])

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setRepairPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const convertPhotosToBase64 = async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }))
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

    setUploadingPhotos(true)

    try {
      // Convert photos to base64
      const photoBase64s = await convertPhotosToBase64(repairPhotos)

      // Complete time tracking entry
      try {
        await fetch('/api/time-tracking', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.ticketId,
            technicianId: ticket.assignedTo || 'unknown',
            endTime: new Date().toISOString(),
            duration: elapsedTime,
            status: 'completed',
            productivityScore: 85 // Default score, could be calculated based on time vs expected
          })
        })
        console.log('✅ Time tracking completed for repair work')
      } catch (error) {
        console.error('❌ Failed to complete time tracking:', error)
      }

      const repairData = {
        ...formData,
        timeSpent: formatTime(elapsedTime),
        ticketId: ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        completedAt: new Date().toISOString(),
        repairPhotos: photoBase64s,
        photoCount: repairPhotos.length,
        repairChecklist: repairChecklist,
        aiAnalysis: aiAnalysis
      }

      await onSave(repairData)
      onClose()
    } catch (error) {
      console.error('Error saving repair completion:', error)
      alert('Failed to save repair completion')
    } finally {
      setUploadingPhotos(false)
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Work Timer</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRepairChecklist(!showRepairChecklist)}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    showRepairChecklist 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  📋 Smart Checklist {showRepairChecklist ? '(Auto-loaded)' : '(Click to load)'}
                </button>
                <button
                  onClick={() => setShowAIAssistant(!showAIAssistant)}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                >
                  🤖 AI Assistant
                </button>
              </div>
            </div>
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

          {/* Repair Checklist Section */}
          {showRepairChecklist && (
            <div className="mb-6">
              <RepairChecklistComponent
                ticketId={ticket.ticketId}
                deviceInfo={ticket.deviceInfo}
                description={ticket.description}
                onChecklistUpdate={(checklist) => {
                  setRepairChecklist(checklist)
                  console.log('📋 Repair Checklist updated:', checklist)
                }}
              />
            </div>
          )}

          {/* AI Assistant Section */}
          {showAIAssistant && (
            <div className="mb-6">
              <AIRepairAssistantComponent
                ticketId={ticket.ticketId}
                deviceInfo={ticket.deviceInfo}
                description={ticket.description}
                onAnalysisComplete={(analysis) => {
                  setAiAnalysis(analysis)
                  console.log('🤖 AI Analysis received:', analysis)
                }}
              />
            </div>
          )}

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

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repair Photos (Optional)
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={!timerStarted || repairPhotos.length >= 10}
                    className="hidden"
                    id="repair-photo-upload"
                  />
                  <label
                    htmlFor="repair-photo-upload"
                    className={`cursor-pointer px-4 py-2 rounded-md border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors ${
                      !timerStarted || repairPhotos.length >= 10 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                  >
                    📷 Add Photos ({repairPhotos.length}/10)
                  </label>
                  {repairPhotos.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {repairPhotos.length} photo{repairPhotos.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>

                {/* Photo Previews */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Repair photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <button
                            onClick={() => window.open(preview, '_blank')}
                            className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-80 text-gray-800 px-2 py-1 rounded text-xs transition-opacity"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Guidelines */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <p><strong>Photo Guidelines:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Maximum 10 photos per repair</li>
                    <li>Maximum 5MB per photo</li>
                    <li>Supported formats: JPG, PNG, GIF</li>
                    <li>Photos help document the repair process and results</li>
                  </ul>
                </div>
              </div>
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
              disabled={!timerStarted || uploadingPhotos}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadingPhotos ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  ✅ Complete Repair
                  {repairPhotos.length > 0 && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                      +{repairPhotos.length} photos
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
