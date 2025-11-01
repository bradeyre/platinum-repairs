'use client'

import React, { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { triggerCelebration } from './CelebrationSystem'

interface Ticket {
  ticketId: string
  description: string
  status: string
  deviceInfo: string
  ticketType: 'PR' | 'DD'
  claimNumber?: string
  customFields?: Array<{
    id: number
    name: string
    value: string
  }>
}

interface DamageReportModalProps {
  ticket: Ticket
  onClose: () => void
  onSave?: (reportData: any) => void
}

export default function DamageReportModal({ ticket, onClose, onSave }: DamageReportModalProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [timerTime, setTimerTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [formData, setFormData] = useState({
    ticket: ticket.ticketId,
    claim: '',
    clientName: '',
    deviceType: '',
    make: '',
    model: '',
    color: '',
    storage: '',
    imei: '',
    deviceRepairable: true,
    repairExplanation: '',
    causeOfDamage: '',
    partsUsed: [] as string[],
    customPart: '',
    noPartsNeeded: false,
    photos: [] as File[],
    additionalNotes: '',
    qualityAssuranceConfirmed: false
  })

  const [aiAnalysis, setAiAnalysis] = useState({
    deviceInfo: '',
    repairability: '',
    recommendedActions: [] as string[],
    riskFactors: [] as string[]
  })

  const [dynamicCheckboxes, setDynamicCheckboxes] = useState<{
    id: string
    label: string
    checked: boolean
    notes: string
  }[]>([])
  const [ticketComments, setTicketComments] = useState<(string | { text?: string; body?: string; comment?: string; date: string; author: string })[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  // Device-specific parts
  const getDeviceParts = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'phone':
        return [
          'Screen Assembly',
          'Battery',
          'Charging Port',
          'Back Glass',
          'Camera Module',
          'Speaker',
          'Vibrator',
          'Flex Cable',
          'Home Button',
          'Volume Buttons',
          'Power Button',
          'Earpiece Speaker',
          'Microphone',
          'Antenna'
        ]
      case 'laptop':
        return [
          'LCD Screen',
          'Keyboard',
          'Trackpad',
          'Battery',
          'Charging Port',
          'Motherboard',
          'RAM',
          'Hard Drive/SSD',
          'Fan Assembly',
          'Hinges',
          'Webcam',
          'Speakers',
          'Power Button',
          'USB Ports'
        ]
      case 'tablet':
        return [
          'Screen Assembly',
          'Battery',
          'Charging Port',
          'Back Cover',
          'Camera Module',
          'Speakers',
          'Home Button',
          'Volume Buttons',
          'Power Button',
          'Flex Cables'
        ]
      case 'watch':
        return [
          'Screen',
          'Battery',
          'Crown',
          'Band',
          'Charging Port',
          'Speaker',
          'Microphone',
          'Heart Rate Sensor'
        ]
      default:
        return [
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
    }
  }

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
    }
    getUser()

    // Fetch detailed ticket information including comments
    fetchTicketDetails()
    fetchRelevantComments()

    // Auto-populate some fields from ticket data
    populateFromTicket()

    // Perform AI analysis of the ticket
    performAiAnalysis()
  }, [])

  const fetchTicketDetails = async () => {
    try {
      // Extract ticket number from ticketId (remove # if present)
      const ticketNumber = ticket.ticketId.replace('#', '')
      const instance = ticket.ticketType === 'PR' ? 'platinum' : 'devicedoctor'
      
      console.log(`🔍 Fetching ticket details for ${ticketNumber} from ${instance}`)
      
      const response = await fetch(`/api/ticket-details?ticketId=${ticketNumber}&instance=${instance}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Got ticket details:`, data)
        
        // Update form data with claim number if found
        if (data.claimNumber) {
          setFormData(prev => ({
            ...prev,
            claim: data.claimNumber
          }))
          console.log(`✅ Updated claim number: ${data.claimNumber}`)
        }
        
        // Update form data with serial number if found
        if (data.serialNumber) {
          setFormData(prev => ({
            ...prev,
            imei: data.serialNumber
          }))
          console.log(`✅ Updated serial number: ${data.serialNumber}`)
        }
        
        // Update form data with client name if found
        if (data.clientName) {
          setFormData(prev => ({
            ...prev,
            clientName: data.clientName
          }))
          console.log(`✅ Updated client name: ${data.clientName}`)
        }
        
        // Update ticket data with custom fields if available
        if (data.customFields) {
          console.log(`✅ Got custom fields:`, data.customFields)
        }
      } else {
        console.log(`❌ Failed to fetch ticket details: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error)
    }
  }

  const fetchRelevantComments = async () => {
    try {
      setLoadingComments(true)
      const ticketNumber = ticket.ticketId.replace('#', '')
      const instance = ticket.ticketType === 'PR' ? 'platinum' : 'devicedoctor'
      
      const response = await fetch(`/api/ticket-details?ticketId=${ticketNumber}&instance=${instance}`)
      
      if (response.ok) {
        const data = await response.json()
        const comments = data.comments || []
        
        // Filter out irrelevant comments using AI
        const relevantComments = await filterRelevantComments(comments)
        setTicketComments(relevantComments)
      }
    } catch (error) {
      console.error('Error fetching relevant comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const filterRelevantComments = async (comments: any[]) => {
    try {
      const response = await fetch('/api/ai-filter-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: comments.map(comment => ({
            text: comment.body || comment.comment || '',
            date: comment.created_at || comment.date || '',
            author: comment.user?.name || comment.author || 'Unknown'
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.relevantComments || []
      }
    } catch (error) {
      console.error('Error filtering comments:', error)
    }
    
    // Fallback: simple keyword filtering
    const relevantKeywords = ['device', 'damage', 'issue', 'problem', 'repair', 'screen', 'battery', 'charging', 'water', 'drop', 'crack', 'broken', 'not working', 'faulty']
    return comments.filter(comment => {
      const text = (comment.body || comment.comment || '').toLowerCase()
      return relevantKeywords.some(keyword => text.includes(keyword))
    }).map(comment => comment.body || comment.comment || '')
  }

  const populateFromTicket = () => {
    // Debug logging
    console.log('🔍 Populating from ticket:', {
      ticketId: ticket.ticketId,
      description: ticket.description,
      deviceInfo: ticket.deviceInfo,
      claimNumber: ticket.claimNumber,
      customFields: ticket.customFields
    })
    
    // Use claim number from processed ticket data (from custom fields)
    const claimNumber = ticket.claimNumber || ''
    
    if (claimNumber) {
      console.log('✅ Using claim number from custom fields:', claimNumber)
    } else {
      console.log('❌ No claim number found in custom fields - this should be retrieved from RepairShopr API')
    }

    // Extract IMEI from full text using multiple patterns
    const fullText = `${ticket.description} ${ticket.deviceInfo}`
    const imeiPatterns = [
      /imei[:\s]*(\d{15})/i,
      /imei[:\s]*(\d{14})/i,
      /(\d{15})/g, // 15-digit numbers
      /(\d{14})/g, // 14-digit numbers
      /serial[:\s]*([A-Z0-9]{10,})/i
    ]
    
    let extractedImei = ''
    for (const pattern of imeiPatterns) {
      const match = fullText.match(pattern)
      if (match) {
        extractedImei = match[1]
        console.log('✅ IMEI found:', extractedImei, 'with pattern:', pattern)
        break
      }
    }
    
    if (!extractedImei) {
      console.log('❌ No IMEI found with any pattern')
    }

    const formDataUpdate = {
      ticket: ticket.ticketId,
      claim: claimNumber,
      imei: extractedImei,
      deviceType: extractDeviceType(ticket.deviceInfo),
      make: extractMake(ticket.deviceInfo),
      model: extractModel(ticket.deviceInfo)
    }
    
    console.log('🔍 Setting form data:', formDataUpdate)
    
    setFormData(prev => ({
      ...prev,
      ...formDataUpdate
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
    // Extract model from device info - more comprehensive
    const patterns = [
      /iPhone\s*(\d+\s*Pro?\s*Max?)/i,
      /Galaxy\s*S(\d+)/i,
      /iPad\s*(Pro|Air|Mini)/i,
      /MacBook\s*(Pro|Air)/i,
      /HP\s*(\w+)/i,
      /Dell\s*(\w+)/i,
      /Lenovo\s*(\w+)/i,
      /Samsung\s*(\w+)/i,
      /Huawei\s*(\w+)/i,
      /(\w+\s*\d+)/i // Generic pattern for model numbers
    ]
    
    for (const pattern of patterns) {
      const match = deviceInfo.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }
    return ''
  }

  const performAiAnalysis = async () => {
    try {
      console.log('🤖 Starting AI analysis with data:', {
        deviceInfo: ticket.deviceInfo,
        description: ticket.description
      })
      
      // Use OpenAI to analyze the ticket description
      const response = await fetch('/api/ai-analyze-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceInfo: ticket.deviceInfo,
          description: ticket.description
        })
      })

      if (response.ok) {
        const analysis = await response.json()
        console.log('🤖 AI analysis result:', analysis)
        
        setAiAnalysis(analysis.analysis)
        setDynamicCheckboxes(analysis.checkboxes || [])
        
        // Update form data with AI-extracted device details
        if (analysis.deviceDetails) {
          console.log('🤖 AI extracted device details:', analysis.deviceDetails)
          setFormData(prev => ({
            ...prev,
            make: analysis.deviceDetails.make || prev.make,
            model: analysis.deviceDetails.model || prev.model,
            deviceType: analysis.deviceDetails.deviceType || prev.deviceType,
            imei: analysis.deviceDetails.imei || prev.imei,
            claim: analysis.deviceDetails.claim || prev.claim
          }))
        }
      } else {
        console.log('🤖 AI analysis failed, using fallback')
        // Fallback to rule-based analysis
        performFallbackAnalysis()
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      performFallbackAnalysis()
    }
  }

  const performFallbackAnalysis = () => {
    const description = ticket.description.toLowerCase()
    const fullText = `${ticket.description} ${ticket.deviceInfo}`.toLowerCase()
    const checkboxes = []
    
    // Extract IMEI from full text using multiple patterns
    const imeiPatterns = [
      /imei[:\s]*(\d{15})/i,
      /imei[:\s]*(\d{14})/i,
      /(\d{15})/g, // 15-digit numbers
      /(\d{14})/g, // 14-digit numbers
      /serial[:\s]*([A-Z0-9]{10,})/i
    ]
    
    let extractedImei = ''
    for (const pattern of imeiPatterns) {
      const match = fullText.match(pattern)
      if (match) {
        extractedImei = match[1]
        break
      }
    }
    
    // Update form data with extracted IMEI
    if (extractedImei) {
      setFormData(prev => ({
        ...prev,
        imei: extractedImei
      }))
    }
    
    // Analyze description for specific issues
    if (description.includes('overheat') || description.includes('heating') || description.includes('hot')) {
      checkboxes.push({
        id: 'overheating',
        label: 'Client reported overheating issues',
        checked: false,
        notes: ''
      })
    }
    
    if (description.includes('water') || description.includes('liquid') || description.includes('spill')) {
      checkboxes.push({
        id: 'water_damage',
        label: 'Potential water damage reported',
        checked: false,
        notes: ''
      })
    }
    
    if (description.includes('drop') || description.includes('fell') || description.includes('impact')) {
      checkboxes.push({
        id: 'physical_damage',
        label: 'Physical damage from impact reported',
        checked: false,
        notes: ''
      })
    }
    
    if (description.includes('battery') || description.includes('charging') || description.includes('power')) {
      checkboxes.push({
        id: 'battery_issues',
        label: 'Battery or charging issues reported',
        checked: false,
        notes: ''
      })
    }
    
    if (description.includes('screen') || description.includes('display') || description.includes('crack')) {
      checkboxes.push({
        id: 'screen_damage',
        label: 'Screen damage reported',
        checked: false,
        notes: ''
      })
    }

    const analysis = {
      deviceInfo: `Device: ${ticket.deviceInfo}`,
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
    setDynamicCheckboxes(checkboxes)
  }

  const startTimer = async () => {
    if (!currentUser) {
      alert('Please wait for user authentication')
      return
    }
    
    if (!timerStarted) {
      // First time starting
      const start = Date.now()
      setTimerStartTime(start)
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
            technicianId: currentUser.id,
            technicianName: currentUser.full_name || currentUser.username,
            workType: 'damage_report',
            description: `Damage assessment for ${ticket.deviceInfo}`,
            startTime: new Date().toISOString(),
            status: 'active'
          })
        })
        console.log('✅ Time tracking started for damage report')
      } catch (error) {
        console.error('❌ Failed to start time tracking:', error)
      }
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - start
        setTimerTime(elapsed)
      }, 1000)
      
      setTimerInterval(interval)
    } else if (timerPaused) {
      // Resuming from pause
      const resumeTime = Date.now()
      setTimerStartTime(resumeTime - pausedTime)
      setTimerPaused(false)
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - (resumeTime - pausedTime)
        setTimerTime(elapsed)
      }, 1000)
      
      setTimerInterval(interval)
    }
  }

  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setPausedTime(timerTime)
    setTimerPaused(true)
  }

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setTimerStarted(false)
    setTimerPaused(false)
    setTimerStartTime(null)
    setPausedTime(0)
    setTimerTime(0)
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
    
    const totalPhotos = formData.photos.length + validFiles.length
    
    if (totalPhotos > 6) {
      alert('Maximum 6 photos allowed. Please select fewer photos.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }))
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const openImeiChecker = () => {
    if (formData.imei) {
      // Open IMEI checker with the IMEI number
      const imeiCheckerUrl = `https://www.imei.info/?imei=${formData.imei}`
      window.open(imeiCheckerUrl, '_blank')
    } else {
      alert('Please enter an IMEI number first')
    }
  }

  const handlePartsChange = (part: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: checked 
        ? [...prev.partsUsed, part]
        : prev.partsUsed.filter(p => p !== part)
    }))
  }

  const addCustomPart = () => {
    if (formData.customPart.trim()) {
      setFormData(prev => ({
        ...prev,
        partsUsed: [...prev.partsUsed, prev.customPart.trim()],
        customPart: ''
      }))
    }
  }

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.ticket || !currentUser || !formData.causeOfDamage) {
        alert('Please fill in all required fields including cause of damage')
        return
      }
      
      // Validate quality assurance confirmation
      if (!formData.qualityAssuranceConfirmed) {
        alert('Please confirm that you have tested all device functions and the device meets factory-level quality standards')
        return
      }
      
      // Validate photos (minimum 2, maximum 6)
      if (formData.photos.length < 2) {
        alert('Please upload at least 2 photos')
        return
      }
      
      if (formData.photos.length > 6) {
        alert('Maximum 6 photos allowed')
        return
      }

      // Convert photos to base64
      const photoPromises = formData.photos.map(async (photo) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(photo)
        })
      })
      
      const photoBase64s = await Promise.all(photoPromises)
      
      // Validate that all issues are checked with comments
      const uncheckedIssues = dynamicCheckboxes.filter(checkbox => 
        checkbox.checked && (!checkbox.notes || checkbox.notes.trim() === '')
      )
      
      if (uncheckedIssues.length > 0) {
        alert(`Please add comments for all checked issues:\n${uncheckedIssues.map(issue => `- ${issue.label}`).join('\n')}`)
        return
      }
      
      // Validate that at least one issue is checked
      const checkedIssues = dynamicCheckboxes.filter(checkbox => checkbox.checked)
      if (checkedIssues.length === 0) {
        alert('Please check at least one issue and add comments')
        return
      }
      
      // Stop timer
      stopTimer()
      
      // Complete time tracking entry
      try {
        await fetch('/api/time-tracking', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.ticketId,
            technicianId: currentUser.id,
            endTime: new Date().toISOString(),
            duration: Math.floor(timerTime / 1000), // Convert to seconds
            status: 'completed',
            productivityScore: 90 // Default score for damage reports
          })
        })
        console.log('✅ Time tracking completed for damage report')
      } catch (error) {
        console.error('❌ Failed to complete time tracking:', error)
      }
      
      const reportData = {
        ...formData,
        photos: photoBase64s,
        technician: currentUser?.full_name || currentUser?.username,
        timeSpent: timerTime,
        timestamp: new Date().toISOString(),
        aiAnalysis,
        dynamicCheckboxes,
        status: 'completed'
      }
      
      // Save to database
      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save damage report')
      }
      
      // Call parent callback
      if (onSave) {
        onSave(reportData)
      }
      
      // Show success message
      alert(`Damage Report completed successfully!\nTime spent: ${formatTime(timerTime)}\nTechnician: ${currentUser?.full_name || currentUser?.username}`)
      
      // Celebration for completion
      if (currentUser) {
        triggerCelebration(currentUser.full_name || currentUser.username, 'DR completed successfully', { 
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
          {/* Timer Section */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technician
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700">
                    {currentUser ? (currentUser.full_name || currentUser.username) : 'Loading...'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timer
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={timerStarted ? (timerPaused ? startTimer : pauseTimer) : startTimer}
                      disabled={!currentUser}
                      className={`px-4 py-2 rounded font-medium ${
                        timerStarted && !timerPaused
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      } disabled:opacity-50`}
                    >
                      {timerStarted ? (timerPaused ? '▶️ Resume' : '⏸️ Pause') : '▶️ Start Timer'}
                    </button>
                    {timerStarted && (
                      <button
                        onClick={stopTimer}
                        disabled={!currentUser}
                        className="px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        ⏹️ Stop
                      </button>
                    )}
                  </div>
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
                      disabled={!timerStarted}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                    <select
                      value={formData.deviceType}
                      onChange={(e) => setFormData(prev => ({ ...prev, deviceType: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      disabled={!timerStarted}
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
                      disabled={!timerStarted}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      disabled={!timerStarted}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">IMEI/Serial</label>
                    <input
                      type="text"
                      value={formData.imei}
                      onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                      placeholder="Enter IMEI or Serial number"
                      disabled={!timerStarted}
                    />
                    <button
                      type="button"
                      onClick={openImeiChecker}
                      disabled={!timerStarted || !formData.imei}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Check IMEI online"
                    >
                      🔍 Check IMEI Online
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Parts Needed for Repair</h3>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.noPartsNeeded}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        noPartsNeeded: e.target.checked,
                        partsUsed: e.target.checked ? [] : prev.partsUsed
                      }))}
                      className="mr-2"
                      disabled={!timerStarted}
                    />
                    <span className="text-sm text-gray-700">No parts needed</span>
                  </label>
                </div>

                {!formData.noPartsNeeded && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {getDeviceParts(formData.deviceType).map(part => (
                        <label key={part} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.partsUsed.includes(part)}
                            onChange={(e) => handlePartsChange(part, e.target.checked)}
                            className="mr-2"
                            disabled={!timerStarted}
                          />
                          <span className="text-sm text-gray-700">{part}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Custom Part Addition */}
                    <div className="border-t pt-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.customPart}
                          onChange={(e) => setFormData(prev => ({ ...prev, customPart: e.target.value }))}
                          placeholder="Add custom part..."
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                          disabled={!timerStarted}
                        />
                        <button
                          type="button"
                          onClick={addCustomPart}
                          disabled={!timerStarted || !formData.customPart.trim()}
                          className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    
                    {/* Selected Parts Display */}
                    {formData.partsUsed.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Selected Parts:</div>
                        <div className="flex flex-wrap gap-2">
                          {formData.partsUsed.map((part, index) => (
                            <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                              <span>{part}</span>
                              <button
                                type="button"
                                onClick={() => handlePartsChange(part, false)}
                                className="text-blue-600 hover:text-blue-800"
                                disabled={!timerStarted}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos (2-6 required)</h3>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                {formData.photos.length > 0 && (
                  <div className="mt-2">
                    <div className={`text-sm ${formData.photos.length >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                      {formData.photos.length} photo(s) selected (minimum 2 required)
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs">
                          <span className="mr-2">{photo.name}</span>
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
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

              {/* Ticket Comments Pane */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-4">📝 Relevant Ticket Comments</h3>
                
                {loadingComments ? (
                  <div className="text-center py-4">
                    <div className="text-sm text-green-700">Loading relevant comments...</div>
                  </div>
                ) : ticketComments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {ticketComments.map((comment, index) => {
                      const commentText = typeof comment === 'string' ? comment : comment.text || comment.body || comment.comment || 'No comment text'
                      
                      // Parse and format damage report data if it looks like a structured report
                      const isDamageReport = commentText.toLowerCase().includes('damage report:') || 
                                           commentText.toLowerCase().includes('device:') ||
                                           commentText.toLowerCase().includes('imei #:')
                      
                      return (
                        <div key={index} className="bg-white border border-green-200 rounded p-3">
                          {isDamageReport ? (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-green-800 mb-2">📋 Damage Report Details</div>
                              <div className="text-xs text-green-700 space-y-1">
                                {commentText.split('\n').map((line, lineIndex) => {
                                  if (line.trim()) {
                                    // Format key-value pairs
                                    if (line.includes(':')) {
                                      const [key, value] = line.split(':', 2)
                                      return (
                                        <div key={lineIndex} className="flex">
                                          <span className="font-medium text-green-800 w-32 flex-shrink-0">{key.trim()}:</span>
                                          <span className="text-green-700">{value.trim()}</span>
                                        </div>
                                      )
                                    } else {
                                      return (
                                        <div key={lineIndex} className="text-green-700">
                                          {line.trim()}
                                        </div>
                                      )
                                    }
                                  }
                                  return null
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-green-800">
                              {commentText}
                            </div>
                          )}
                          {typeof comment === 'object' && comment.date && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-green-100">
                              📅 {new Date(comment.date).toLocaleString()}
                            </div>
                          )}
                          {typeof comment === 'object' && comment.author && (
                            <div className="text-xs text-gray-500">
                              👤 {comment.author}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-green-700">No relevant comments found</div>
                  </div>
                )}
              </div>

              {/* Dynamic Checkboxes based on AI Analysis */}
              {dynamicCheckboxes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-4">🔍 Issues to Check</h3>
                  <div className="space-y-3">
                    {dynamicCheckboxes.map((checkbox) => (
                      <div key={checkbox.id} className="bg-white border border-yellow-200 rounded p-3">
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={checkbox.checked}
                            onChange={(e) => {
                              setDynamicCheckboxes(prev => 
                                prev.map(cb => 
                                  cb.id === checkbox.id 
                                    ? { ...cb, checked: e.target.checked }
                                    : cb
                                )
                              )
                            }}
                            className="mr-3 mt-1"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">{checkbox.label}</span>
                            {checkbox.checked && (
                              <div className="mt-2">
                                <textarea
                                  placeholder="Add your findings and notes..."
                                  value={checkbox.notes}
                                  onChange={(e) => {
                                    setDynamicCheckboxes(prev => 
                                      prev.map(cb => 
                                        cb.id === checkbox.id 
                                          ? { ...cb, notes: e.target.value }
                                          : cb
                                      )
                                    )
                                  }}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  rows={2}
                                  disabled={!timerStarted}
                                />
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        disabled={!timerStarted}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Damage *</label>
                    <select
                      value={formData.causeOfDamage}
                      onChange={(e) => setFormData(prev => ({ ...prev, causeOfDamage: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      disabled={!timerStarted}
                      required
                    >
                      <option value="">Select cause of damage...</option>
                      <option value="Impact & Liquid Damage">Impact & Liquid Damage</option>
                      <option value="Power Surge and/or Dip">Power Surge and/or Dip</option>
                      <option value="No Damage">No Damage</option>
                      <option value="Component Failure">Component Failure</option>
                      <option value="Wear & Tear">Wear & Tear</option>
                      <option value="Accidental Damage">Accidental Damage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      rows={4}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Any additional observations or notes..."
                      disabled={!timerStarted}
                    />
                  </div>

                  {/* Quality Assurance Confirmation */}
                  <div className="border-t pt-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.qualityAssuranceConfirmed}
                        onChange={(e) => setFormData(prev => ({ ...prev, qualityAssuranceConfirmed: e.target.checked }))}
                        className="mr-3 mt-1"
                        disabled={!timerStarted}
                        required
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          ✅ Quality Assurance Confirmation
                        </span>
                        <div className="text-xs text-gray-600 mt-1">
                          I confirm that I have tested all device functions and am 100% certain that there are no latent defects. 
                          The device has been repaired to factory-level quality standards.
                        </div>
                      </div>
                    </label>
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
              ✅ Complete Repair
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