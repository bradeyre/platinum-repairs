'use client'

import React, { useState, useEffect } from 'react'
import { triggerCelebration } from './CelebrationSystem'

interface Ticket {
  ticketId: string
  description: string
  status: string
  deviceInfo: string
  ticketType: 'PR' | 'DD'
}

interface DamageReportModalProps {
  ticket: Ticket
  onClose: () => void
  onSave?: (reportData: any) => void
}

export default function DamageReportModal({ ticket, onClose, onSave }: DamageReportModalProps) {
  const [currentTech, setCurrentTech] = useState('')
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerTime, setTimerTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState({
    ticket: ticket.ticketId,
    claim: '',
    deviceType: '',
    make: '',
    model: '',
    color: '',
    storage: '',
    imei: '',
    lastUsed: '',
    lastUsedUnknown: false,
    deviceRepairable: true,
    repairExplanation: '',
    suggestedParts: [] as string[],
    noPartsNeeded: false,
    photos: [] as File[],
    additionalNotes: ''
  })

  const [aiAnalysis, setAiAnalysis] = useState({
    deviceInfo: '',
    estimatedCost: '',
    repairability: '',
    recommendedActions: [],
    riskFactors: []
  })

  const technicians = ['Ben', 'Alex', 'Sarah', 'Mike']
  const commonParts = [
    'Screen Assembly',
    'Battery',
    'Charging Port',
    'Back Glass',
    'Camera Module',
    'Speaker',
    'Vibrator',
    'Flex Cable',
    'Home Button',
    'Volume Buttons'
  ]

  useEffect(() => {
    // Auto-populate some fields from ticket data
    populateFromTicket()
    
    // Get authenticated technician
    const authenticatedTech = localStorage.getItem('authenticatedTech')
    if (authenticatedTech) {
      setCurrentTech(authenticatedTech)
    }

    // Perform AI analysis of the ticket
    performAiAnalysis()
  }, [])

  const populateFromTicket = () => {
    setFormData(prev => ({
      ...prev,
      ticket: ticket.ticketId,
      deviceType: extractDeviceType(ticket.deviceInfo),
      make: extractMake(ticket.deviceInfo),
      model: extractModel(ticket.deviceInfo)
    }))
  }

  const extractDeviceType = (deviceInfo: string): string => {
    const lower = deviceInfo.toLowerCase()
    if (lower.includes('iphone')) return 'Phone'
    if (lower.includes('ipad') || lower.includes('tablet')) return 'Tablet'
    if (lower.includes('macbook') || lower.includes('laptop')) return 'Laptop'
    if (lower.includes('watch')) return 'Watch'
    return 'Phone' // Default
  }

  const extractMake = (deviceInfo: string): string => {
    const makes = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google']
    for (const make of makes) {
      if (deviceInfo.toLowerCase().includes(make.toLowerCase())) {
        return make
      }
    }
    return ''
  }

  const extractModel = (deviceInfo: string): string => {
    // Extract model from device info - simplified
    const match = deviceInfo.match(/(iPhone\s*\d+|Galaxy\s*S\d+|iPad\s*Pro|MacBook\s*Pro)/i)
    return match ? match[0] : ''
  }

  const performAiAnalysis = () => {
    // Simulate AI analysis based on ticket data
    const analysis = {
      deviceInfo: `Device: ${ticket.deviceInfo}`,
      estimatedCost: 'R1,200 - R2,500',
      repairability: 'Repairable',
      recommendedActions: [
        'Visual inspection for damage',
        'Functionality testing',
        'Parts compatibility check',
        'Cost assessment'
      ],
      riskFactors: [
        'Water damage indicators to check',
        'Previous repair history unknown',
        'Parts availability may vary'
      ]
    }
    setAiAnalysis(analysis)
  }

  const startTimer = () => {
    if (!currentTech) {
      alert('Please select your name first')
      return
    }
    
    const start = Date.now()
    setTimerStarted(true)
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setTimerTime(elapsed)
    }, 1000)
    
    setTimerInterval(interval)
    
    // Show celebration for starting work
    triggerCelebration(currentTech, 'damage report started', { ticketId: ticket.ticketId })
  }

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setTimerStarted(false)
    
    if (currentTech && timerTime > 0) {
      triggerCelebration(currentTech, 'damage report completed', { 
        ticketId: ticket.ticketId,
        timeSpent: formatTime(timerTime)
      })
    }
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / (1000 * 60)) % 60
    const hours = Math.floor(ms / (1000 * 60 * 60))
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB limit
      return isValidType && isValidSize
    })
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles].slice(0, 5) // Max 5 photos
    }))
  }

  const handlePartsChange = (part: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      suggestedParts: checked 
        ? [...prev.suggestedParts, part]
        : prev.suggestedParts.filter(p => p !== part)
    }))
  }

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.ticket || !currentTech) {
        alert('Please fill in all required fields')
        return
      }
      
      // Stop timer
      stopTimer()
      
      const reportData = {
        ...formData,
        technician: currentTech,
        timeSpent: timerTime,
        timestamp: new Date().toISOString(),
        aiAnalysis
      }
      
      // Save to localStorage (in real implementation, this would go to API)
      const savedReports = JSON.parse(localStorage.getItem('damage_reports') || '[]')
      savedReports.push(reportData)
      localStorage.setItem('damage_reports', JSON.stringify(savedReports))
      
      // Call parent callback
      if (onSave) {
        onSave(reportData)
      }
      
      // Show success message
      alert(`Damage Report saved successfully!\nTime spent: ${formatTime(timerTime)}\nTechnician: ${currentTech}`)
      
      // Celebration for completion
      if (currentTech) {
        triggerCelebration(currentTech, 'DR saved successfully', { 
          ticketId: ticket.ticketId,
          action: 'damage report completed'
        })
      }
      
      onClose()
      
    } catch (error) {
      console.error('Error saving damage report:', error)
      alert('Error saving damage report. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📝 Damage Report Builder</h2>
              <p className="text-orange-100">
                Ticket: {ticket.ticketId} - {ticket.deviceInfo}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 rounded px-3 py-1">
                {timerStarted ? `⏱️ ${formatTime(timerTime)}` : 'Timer Ready'}
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
          {/* Timer and Technician Section */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technician
                  </label>
                  <select
                    value={currentTech}
                    onChange={(e) => setCurrentTech(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                    disabled={timerStarted}
                  >
                    <option value="">Select technician...</option>
                    {technicians.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timer
                  </label>
                  <button
                    onClick={timerStarted ? stopTimer : startTimer}
                    disabled={!currentTech}
                    className={`px-4 py-2 rounded font-medium ${
                      timerStarted
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    {timerStarted ? '⏹️ Stop Timer' : '▶️ Start Timer'}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(timerTime)}
                </div>
                <div className="text-sm text-gray-600">Time Elapsed</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Device & Damage Info */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
                    <input
                      type="text"
                      value={formData.claim}
                      onChange={(e) => setFormData(prev => ({ ...prev, claim: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                    <select
                      value={formData.deviceType}
                      onChange={(e) => setFormData(prev => ({ ...prev, deviceType: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select type...</option>
                      <option value="Phone">Phone</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Watch">Watch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Parts</h3>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.noPartsNeeded}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        noPartsNeeded: e.target.checked,
                        suggestedParts: e.target.checked ? [] : prev.suggestedParts
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">No parts needed</span>
                  </label>
                </div>

                {!formData.noPartsNeeded && (
                  <div className="grid grid-cols-2 gap-2">
                    {commonParts.map(part => (
                      <label key={part} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.suggestedParts.includes(part)}
                          onChange={(e) => handlePartsChange(part, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{part}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                {formData.photos.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {formData.photos.length} photo(s) selected
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: AI Analysis & Assessment */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">🤖 AI Analysis</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-blue-800">Device Assessment</div>
                    <div className="text-sm text-blue-700">{aiAnalysis.deviceInfo}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Estimated Cost</div>
                    <div className="text-sm text-blue-700">{aiAnalysis.estimatedCost}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Recommended Actions</div>
                    <ul className="text-sm text-blue-700">
                      {aiAnalysis.recommendedActions.map((action, index) => (
                        <li key={index}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Risk Factors</div>
                    <ul className="text-sm text-blue-700">
                      {aiAnalysis.riskFactors.map((risk, index) => (
                        <li key={index}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.deviceRepairable}
                        onChange={(e) => setFormData(prev => ({ ...prev, deviceRepairable: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Device is repairable</span>
                    </label>
                  </div>

                  {!formData.deviceRepairable && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Explanation (if not repairable)
                      </label>
                      <textarea
                        value={formData.repairExplanation}
                        onChange={(e) => setFormData(prev => ({ ...prev, repairExplanation: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      rows={4}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Any additional observations or notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-600">
            💡 Tip: Start the timer when beginning assessment for accurate time tracking
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
            >
              💾 Save Damage Report
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}