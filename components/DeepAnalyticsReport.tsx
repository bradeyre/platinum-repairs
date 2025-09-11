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
  claimNumber?: string
}

interface RepairCompletion {
  id: string
  ticket_id: string
  ticket_number: string
  technician_id: string
  technician_name: string
  work_completed: string
  parts_used: string
  testing_results: string
  final_status: string
  notes: string
  time_spent: string
  time_spent_seconds: number
  repair_photos: string[]
  photo_count: number
  repair_checklist: any
  ai_analysis: any
  completed_at: string
  created_at: string
  updated_at: string
}

interface DeepAnalyticsData {
  timeRange: {
    startDate: string
    endDate: string
    totalDays: number
  }
  overallStats: {
    totalCompletedTickets: number
    totalRepairTime: number
    averageRepairTime: number
    totalTechnicians: number
    averageTicketsPerDay: number
    averageTicketsPerTechnician: number
    reworkRate: number
    totalReworks: number
    averageReworkTime: number
  }
  technicianPerformance: {
    [technicianName: string]: {
      totalTickets: number
      totalRepairTime: number
      averageRepairTime: number
      ticketsPerDay: number
      efficiency: number
      deviceExpertise: Record<string, number>
      repairTypes: Record<string, number>
      qualityScore: number
      consistency: number
      peakPerformanceDays: string[]
      improvementTrend: 'improving' | 'stable' | 'declining'
      strengths: string[]
      areasForImprovement: string[]
      reworkRate: number
      totalReworks: number
      averageReworkTime: number
      reworkReasons: Record<string, number>
      firstTimeFixRate: number
    }
  }
  deviceAnalytics: {
    [deviceType: string]: {
      totalRepairs: number
      averageRepairTime: number
      successRate: number
      commonIssues: string[]
      difficultyLevel: 'easy' | 'medium' | 'hard'
      technicianPerformance: Record<string, number>
      reworkRate: number
      commonReworkReasons: string[]
      averageReworkTime: number
    }
  }
  reworkAnalytics: {
    overallReworkRate: number
    totalReworks: number
    averageReworkTime: number
    reworkReasons: Record<string, number>
    reworkByTechnician: Record<string, number>
    reworkByDevice: Record<string, number>
    reworkTrends: Record<string, number>
    costOfReworks: number
    timeLostToReworks: number
    topReworkCauses: string[]
    reworkPreventionOpportunities: string[]
  }
  timeAnalytics: {
    dailyPerformance: Record<string, {
      ticketsCompleted: number
      totalTime: number
      averageTime: number
      technicians: string[]
      reworks: number
      reworkRate: number
    }>
    weeklyTrends: Record<string, {
      week: string
      ticketsCompleted: number
      averageTime: number
      efficiency: number
      reworks: number
      reworkRate: number
    }>
    hourlyPatterns: Record<string, number>
    peakHours: string[]
    offPeakHours: string[]
  }
  businessInsights: {
    topPerformers: string[]
    mostEfficientDevices: string[]
    mostChallengingDevices: string[]
    productivityTrends: string[]
    recommendations: string[]
    costAnalysis: {
      totalLaborHours: number
      averageCostPerRepair: number
      efficiencySavings: number
      reworkCosts: number
      potentialSavingsFromReworkReduction: number
    }
  }
  aiInsights: {
    performancePatterns: string[]
    optimizationOpportunities: string[]
    riskFactors: string[]
    successFactors: string[]
    predictiveInsights: string[]
    reworkInsights: string[]
    qualityImprovementStrategies: string[]
  }
}

// Helper function to calculate business hours between two dates
function getBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let hours = 0
  const current = new Date(start)
  
  while (current < end) {
    const dayOfWeek = current.getDay()
    const hour = current.getHours()
    
    // Only count business hours (8 AM - 5 PM, Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17) {
      const nextHour = new Date(current)
      nextHour.setHours(current.getHours() + 1)
      
      if (nextHour > end) {
        hours += (end.getTime() - current.getTime()) / (1000 * 60 * 60)
      } else {
        hours += 1
      }
    }
    
    current.setHours(current.getHours() + 1)
  }
  
  return hours
}

// Function to extract device type from device info
function extractDeviceType(deviceInfo: string): string {
  const lower = deviceInfo.toLowerCase()
  
  if (lower.includes('iphone') || lower.includes('samsung galaxy') || lower.includes('huawei') || lower.includes('oneplus')) {
    return 'Smartphone'
  } else if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('tab')) {
    return 'Tablet'
  } else if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) {
    return 'Laptop'
  } else if (lower.includes('desktop') || lower.includes('pc')) {
    return 'Desktop'
  } else if (lower.includes('watch') || lower.includes('band')) {
    return 'Wearable'
  } else {
    return 'Other'
  }
}

// Function to extract repair type from work completed
function extractRepairType(workCompleted: string): string {
  const lower = workCompleted.toLowerCase()
  
  if (lower.includes('screen') || lower.includes('display') || lower.includes('lcd')) {
    return 'Screen Repair'
  } else if (lower.includes('battery')) {
    return 'Battery Replacement'
  } else if (lower.includes('charging') || lower.includes('port')) {
    return 'Charging Port'
  } else if (lower.includes('camera')) {
    return 'Camera Repair'
  } else if (lower.includes('water') || lower.includes('liquid')) {
    return 'Water Damage'
  } else if (lower.includes('software') || lower.includes('update') || lower.includes('reset')) {
    return 'Software Issue'
  } else if (lower.includes('button') || lower.includes('home')) {
    return 'Button Repair'
  } else {
    return 'General Repair'
  }
}

// Function to detect reworks from ticket data
function detectReworks(tickets: ProcessedTicket[]): { [ticketNumber: string]: any[] } {
  const reworks: { [ticketNumber: string]: any[] } = {}
  
  // Group tickets by ticket number to find duplicates
  const ticketGroups: { [ticketNumber: string]: ProcessedTicket[] } = {}
  
  tickets.forEach(ticket => {
    if (!ticketGroups[ticket.ticketNumber]) {
      ticketGroups[ticket.ticketNumber] = []
    }
    ticketGroups[ticket.ticketNumber].push(ticket)
  })
  
  // Find tickets with multiple entries (potential reworks)
  Object.entries(ticketGroups).forEach(([ticketNumber, ticketList]) => {
    if (ticketList.length > 1) {
      // Sort by timestamp to identify sequence
      const sortedTickets = ticketList.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      
      // Identify rework patterns
      const reworkSequence = []
      for (let i = 1; i < sortedTickets.length; i++) {
        const currentTicket = sortedTickets[i]
        const previousTicket = sortedTickets[i - 1]
        
        // Check for rework indicators
        const isRework = detectReworkIndicators(currentTicket, previousTicket)
        if (isRework.isRework) {
          reworkSequence.push({
            ticketId: currentTicket.ticketId,
            timestamp: currentTicket.timestamp,
            reason: isRework.reason,
            timeBetween: new Date(currentTicket.timestamp).getTime() - new Date(previousTicket.timestamp).getTime(),
            technician: currentTicket.assignedTo || 'Unknown',
            deviceType: extractDeviceType(currentTicket.description),
            repairType: extractRepairType(currentTicket.description)
          })
        }
      }
      
      if (reworkSequence.length > 0) {
        reworks[ticketNumber] = reworkSequence
      }
    }
  })
  
  return reworks
}

// Function to detect rework indicators
function detectReworkIndicators(currentTicket: ProcessedTicket, previousTicket: ProcessedTicket): { isRework: boolean, reason: string } {
  const currentDesc = currentTicket.description.toLowerCase()
  const previousDesc = previousTicket.description.toLowerCase()
  
  // Check for explicit rework keywords
  const reworkKeywords = [
    'rework', 'redo', 'fix again', 'repair again', 'not working', 'still broken',
    'issue persists', 'problem remains', 'failed repair', 'incomplete repair',
    'quality issue', 'defect', 'malfunction', 'returned', 'comeback'
  ]
  
  for (const keyword of reworkKeywords) {
    if (currentDesc.includes(keyword) || previousDesc.includes(keyword)) {
      return { isRework: true, reason: `Rework detected: ${keyword}` }
    }
  }
  
  // Check for status changes that indicate rework
  const reworkStatuses = ['rework', 'returned', 'failed', 'incomplete', 'quality issue']
  if (reworkStatuses.some(status => currentTicket.status.toLowerCase().includes(status))) {
    return { isRework: true, reason: `Status indicates rework: ${currentTicket.status}` }
  }
  
  // Check for time gap that might indicate rework (same ticket, different dates)
  const timeDiff = new Date(currentTicket.timestamp).getTime() - new Date(previousTicket.timestamp).getTime()
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
  
  if (daysDiff > 1 && daysDiff < 30) { // Between 1 day and 1 month
    return { isRework: true, reason: `Time gap suggests rework: ${Math.round(daysDiff)} days` }
  }
  
  return { isRework: false, reason: '' }
}

// Function to analyze rework patterns
function analyzeReworkPatterns(reworks: { [ticketNumber: string]: any[] }): any {
  const allReworks = Object.values(reworks).flat()
  
  if (allReworks.length === 0) {
    return {
      overallReworkRate: 0,
      totalReworks: 0,
      averageReworkTime: 0,
      reworkReasons: {},
      reworkByTechnician: {},
      reworkByDevice: {},
      reworkTrends: {},
      costOfReworks: 0,
      timeLostToReworks: 0,
      topReworkCauses: [],
      reworkPreventionOpportunities: []
    }
  }
  
  // Analyze rework reasons
  const reworkReasons: Record<string, number> = {}
  const reworkByTechnician: Record<string, number> = {}
  const reworkByDevice: Record<string, number> = {}
  const reworkTrends: Record<string, number> = {}
  
  let totalReworkTime = 0
  
  allReworks.forEach(rework => {
    // Count reasons
    reworkReasons[rework.reason] = (reworkReasons[rework.reason] || 0) + 1
    
    // Count by technician
    reworkByTechnician[rework.technician] = (reworkByTechnician[rework.technician] || 0) + 1
    
    // Count by device
    reworkByDevice[rework.deviceType] = (reworkByDevice[rework.deviceType] || 0) + 1
    
    // Track trends by week
    const weekKey = getWeekKey(new Date(rework.timestamp))
    reworkTrends[weekKey] = (reworkTrends[weekKey] || 0) + 1
    
    // Add to total time
    totalReworkTime += rework.timeBetween
  })
  
  // Calculate top rework causes
  const topReworkCauses = Object.entries(reworkReasons)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([reason]) => reason)
  
  // Generate prevention opportunities
  const reworkPreventionOpportunities = generateReworkPreventionOpportunities(reworkReasons, reworkByTechnician, reworkByDevice)
  
  return {
    overallReworkRate: 0, // Will be calculated with total tickets
    totalReworks: allReworks.length,
    averageReworkTime: totalReworkTime / allReworks.length,
    reworkReasons,
    reworkByTechnician,
    reworkByDevice,
    reworkTrends,
    costOfReworks: allReworks.length * 150, // Estimated cost per rework
    timeLostToReworks: totalReworkTime / (1000 * 60 * 60), // Convert to hours
    topReworkCauses,
    reworkPreventionOpportunities
  }
}

// Helper function to get week key
function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  return startOfWeek.toISOString().split('T')[0]
}

// Function to generate rework prevention opportunities
function generateReworkPreventionOpportunities(reworkReasons: Record<string, number>, reworkByTechnician: Record<string, number>, reworkByDevice: Record<string, number>): string[] {
  const opportunities = []
  
  // Analyze top rework reasons
  const topReasons = Object.entries(reworkReasons)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
  
  topReasons.forEach(([reason, count]) => {
    if (reason.includes('quality issue')) {
      opportunities.push('Implement quality checkpoints and standardized testing procedures')
    } else if (reason.includes('incomplete repair')) {
      opportunities.push('Create comprehensive repair checklists and completion verification')
    } else if (reason.includes('time gap')) {
      opportunities.push('Improve communication and follow-up procedures for complex repairs')
    } else {
      opportunities.push(`Address root cause of "${reason}" through targeted training`)
    }
  })
  
  // Analyze technician patterns
  const topReworkTechnicians = Object.entries(reworkByTechnician)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 2)
  
  if (topReworkTechnicians.length > 0) {
    opportunities.push(`Provide additional training for technicians with higher rework rates`)
  }
  
  // Analyze device patterns
  const topReworkDevices = Object.entries(reworkByDevice)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 2)
  
  if (topReworkDevices.length > 0) {
    opportunities.push(`Develop specialized training for ${topReworkDevices[0][0]} repairs`)
  }
  
  return opportunities
}

export default function DeepAnalyticsReport() {
  const [analyticsData, setAnalyticsData] = useState<DeepAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all')
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all')

  useEffect(() => {
    fetchDeepAnalytics()
  }, [])

  const fetchDeepAnalytics = async () => {
    try {
      setLoading(true)
      
      // Calculate date range (last 2 months)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 2)
      
      // Fetch completed repairs from the last 2 months
      const repairsResponse = await fetch(`/api/repair-archive?dateFrom=${startDate.toISOString().split('T')[0]}&dateTo=${endDate.toISOString().split('T')[0]}&limit=1000`)
      
      let repairsData = { repairs: [] }
      if (repairsResponse.ok) {
        repairsData = await repairsResponse.json()
      } else {
        console.warn('Repair archive not available, using ticket data only')
      }
      
      // Fetch all tickets for context and rework analysis
      const ticketsResponse = await fetch('/api/tickets')
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch tickets data')
      }
      const ticketsData = await ticketsResponse.json()
      
      // Process the data with enhanced rework analysis
      const processedData = await processDeepAnalytics(repairsData.repairs || [], ticketsData.tickets || [], startDate, endDate)
      setAnalyticsData(processedData)
      
    } catch (err) {
      console.error('Error fetching deep analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const processDeepAnalytics = async (repairs: RepairCompletion[], tickets: ProcessedTicket[], startDate: Date, endDate: Date): Promise<DeepAnalyticsData> => {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Detect and analyze reworks from ticket data
    const reworks = detectReworks(tickets)
    const reworkAnalytics = analyzeReworkPatterns(reworks)
    
    // Filter tickets to completed ones for analysis
    const completedTickets = tickets.filter(ticket => 
      ticket.status.toLowerCase().includes('completed') || 
      ticket.status.toLowerCase().includes('closed') ||
      ticket.status.toLowerCase().includes('repaired')
    )
    
    // Overall stats - use repair completions if available, otherwise use completed tickets
    const totalCompletedTickets = repairs.length > 0 ? repairs.length : completedTickets.length
    const totalRepairTime = repairs.reduce((sum, repair) => sum + (repair.time_spent_seconds || 0), 0)
    const averageRepairTime = totalCompletedTickets > 0 ? totalRepairTime / totalCompletedTickets : 0
    
    // Calculate overall rework rate
    const overallReworkRate = totalCompletedTickets > 0 ? (reworkAnalytics.totalReworks / totalCompletedTickets) * 100 : 0
    reworkAnalytics.overallReworkRate = overallReworkRate
    
    // Technician performance analysis
    const technicianPerformance: any = {}
    const deviceAnalytics: any = {}
    const timeAnalytics: any = {
      dailyPerformance: {},
      weeklyTrends: {},
      hourlyPatterns: {},
      peakHours: [],
      offPeakHours: []
    }
    
    // Process repair completions if available
    repairs.forEach(repair => {
      const technicianName = repair.technician_name
      const deviceType = extractDeviceType(repair.work_completed || '')
      const repairType = extractRepairType(repair.work_completed || '')
      const completionDate = new Date(repair.completed_at)
      const dayKey = completionDate.toISOString().split('T')[0]
      const weekKey = getWeekKey(completionDate)
      const hourKey = completionDate.getHours().toString()
      
      // Initialize technician data
      if (!technicianPerformance[technicianName]) {
        technicianPerformance[technicianName] = {
          totalTickets: 0,
          totalRepairTime: 0,
          averageRepairTime: 0,
          ticketsPerDay: 0,
          efficiency: 0,
          deviceExpertise: {},
          repairTypes: {},
          qualityScore: 0,
          consistency: 0,
          peakPerformanceDays: [],
          improvementTrend: 'stable' as const,
          strengths: [],
          areasForImprovement: [],
          reworkRate: 0,
          totalReworks: 0,
          averageReworkTime: 0,
          reworkReasons: {},
          firstTimeFixRate: 100
        }
      }
      
      // Initialize device analytics
      if (!deviceAnalytics[deviceType]) {
        deviceAnalytics[deviceType] = {
          totalRepairs: 0,
          averageRepairTime: 0,
          successRate: 0,
          commonIssues: [],
          difficultyLevel: 'medium' as const,
          technicianPerformance: {}
        }
      }
      
      // Update technician stats
      technicianPerformance[technicianName].totalTickets++
      technicianPerformance[technicianName].totalRepairTime += repair.time_spent_seconds || 0
      technicianPerformance[technicianName].deviceExpertise[deviceType] = (technicianPerformance[technicianName].deviceExpertise[deviceType] || 0) + 1
      technicianPerformance[technicianName].repairTypes[repairType] = (technicianPerformance[technicianName].repairTypes[repairType] || 0) + 1
      
      // Update device analytics
      deviceAnalytics[deviceType].totalRepairs++
      deviceAnalytics[deviceType].technicianPerformance[technicianName] = (deviceAnalytics[deviceType].technicianPerformance[technicianName] || 0) + 1
      
      // Update time analytics
      if (!timeAnalytics.dailyPerformance[dayKey]) {
        timeAnalytics.dailyPerformance[dayKey] = {
          ticketsCompleted: 0,
          totalTime: 0,
          averageTime: 0,
          technicians: []
        }
      }
      timeAnalytics.dailyPerformance[dayKey].ticketsCompleted++
      timeAnalytics.dailyPerformance[dayKey].totalTime += repair.time_spent_seconds || 0
      if (!timeAnalytics.dailyPerformance[dayKey].technicians.includes(technicianName)) {
        timeAnalytics.dailyPerformance[dayKey].technicians.push(technicianName)
      }
      
      timeAnalytics.hourlyPatterns[hourKey] = (timeAnalytics.hourlyPatterns[hourKey] || 0) + 1
    })

    // Process completed tickets if no repair completions available
    if (repairs.length === 0) {
      completedTickets.forEach(ticket => {
        const technicianName = ticket.assignedTo || 'Unknown Technician'
        const deviceType = extractDeviceType(ticket.description || '')
        const repairType = extractRepairType(ticket.description || '')
        const completionDate = new Date(ticket.timestamp)
        const dayKey = completionDate.toISOString().split('T')[0]
        const weekKey = getWeekKey(completionDate)
        const hourKey = completionDate.getHours().toString()
        
        // Initialize technician data
        if (!technicianPerformance[technicianName]) {
          technicianPerformance[technicianName] = {
            totalTickets: 0,
            totalRepairTime: 0,
            averageRepairTime: 0,
            ticketsPerDay: 0,
            efficiency: 0,
            deviceExpertise: {},
            repairTypes: {},
            qualityScore: 0,
            consistency: 0,
            peakPerformanceDays: [],
            improvementTrend: 'stable' as const,
            strengths: [],
            areasForImprovement: [],
            reworkRate: 0,
            totalReworks: 0,
            averageReworkTime: 0,
            reworkReasons: {},
            firstTimeFixRate: 100
          }
        }
        
        // Initialize device analytics
        if (!deviceAnalytics[deviceType]) {
          deviceAnalytics[deviceType] = {
            totalRepairs: 0,
            averageRepairTime: 0,
            successRate: 0,
            commonIssues: [],
            difficultyLevel: 'medium' as const,
            technicianPerformance: {}
          }
        }
        
        // Update technician stats (estimate time based on device type)
        const estimatedTime = deviceType === 'Smartphone' ? 3600 : deviceType === 'Tablet' ? 5400 : 7200 // 1-2 hours
        technicianPerformance[technicianName].totalTickets++
        technicianPerformance[technicianName].totalRepairTime += estimatedTime
        technicianPerformance[technicianName].deviceExpertise[deviceType] = (technicianPerformance[technicianName].deviceExpertise[deviceType] || 0) + 1
        technicianPerformance[technicianName].repairTypes[repairType] = (technicianPerformance[technicianName].repairTypes[repairType] || 0) + 1
        
        // Update device analytics
        deviceAnalytics[deviceType].totalRepairs++
        deviceAnalytics[deviceType].technicianPerformance[technicianName] = (deviceAnalytics[deviceType].technicianPerformance[technicianName] || 0) + 1
        
        // Update time analytics
        if (!timeAnalytics.dailyPerformance[dayKey]) {
          timeAnalytics.dailyPerformance[dayKey] = {
            ticketsCompleted: 0,
            totalTime: 0,
            averageTime: 0,
            technicians: []
          }
        }
        timeAnalytics.dailyPerformance[dayKey].ticketsCompleted++
        timeAnalytics.dailyPerformance[dayKey].totalTime += estimatedTime
        if (!timeAnalytics.dailyPerformance[dayKey].technicians.includes(technicianName)) {
          timeAnalytics.dailyPerformance[dayKey].technicians.push(technicianName)
        }
        
        timeAnalytics.hourlyPatterns[hourKey] = (timeAnalytics.hourlyPatterns[hourKey] || 0) + 1
      })
    }
    
    // Add rework data to technician performance
    Object.keys(technicianPerformance).forEach(tech => {
      const data = technicianPerformance[tech]
      const techReworks = reworkAnalytics.reworkByTechnician[tech] || 0
      data.totalReworks = techReworks
      data.reworkRate = data.totalTickets > 0 ? (techReworks / data.totalTickets) * 100 : 0
      data.firstTimeFixRate = data.totalTickets > 0 ? ((data.totalTickets - techReworks) / data.totalTickets) * 100 : 100
    })
    
    // Calculate derived metrics
    Object.keys(technicianPerformance).forEach(tech => {
      const data = technicianPerformance[tech]
      data.averageRepairTime = data.totalTickets > 0 ? data.totalRepairTime / data.totalTickets : 0
      data.ticketsPerDay = data.totalTickets / totalDays
      data.efficiency = data.totalTickets > 0 ? (data.totalRepairTime / data.totalTickets) / 3600 : 0 // hours per repair
      data.qualityScore = calculateQualityScore(data)
      data.consistency = calculateConsistency(data)
    })
    
    // Calculate device analytics
    Object.keys(deviceAnalytics).forEach(device => {
      const data = deviceAnalytics[device]
      data.averageRepairTime = data.totalRepairs > 0 ? 
        Object.keys(technicianPerformance).reduce((sum, tech) => {
          const techDeviceCount = technicianPerformance[tech].deviceExpertise[device] || 0
          const techAvgTime = technicianPerformance[tech].averageRepairTime
          return sum + (techDeviceCount * techAvgTime)
        }, 0) / data.totalRepairs : 0
      data.difficultyLevel = data.averageRepairTime > 7200 ? 'hard' : data.averageRepairTime > 3600 ? 'medium' : 'easy'
    })
    
    // Calculate time analytics
    Object.keys(timeAnalytics.dailyPerformance).forEach(day => {
      const data = timeAnalytics.dailyPerformance[day]
      data.averageTime = data.ticketsCompleted > 0 ? data.totalTime / data.ticketsCompleted : 0
    })
    
    // Find peak and off-peak hours
    const sortedHours = Object.entries(timeAnalytics.hourlyPatterns)
      .sort(([,a], [,b]) => (b as number) - (a as number))
    timeAnalytics.peakHours = sortedHours.slice(0, 3).map(([hour]) => hour)
    timeAnalytics.offPeakHours = sortedHours.slice(-3).map(([hour]) => hour)
    
    // Generate business insights
    const businessInsights = generateBusinessInsights(technicianPerformance, deviceAnalytics, timeAnalytics, reworkAnalytics)
    
    // Generate AI insights
    const aiInsights = await generateAIInsights(technicianPerformance, deviceAnalytics, businessInsights)
    
    return {
      timeRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalDays
      },
      overallStats: {
        totalCompletedTickets,
        totalRepairTime,
        averageRepairTime,
        totalTechnicians: Object.keys(technicianPerformance).length,
        averageTicketsPerDay: totalCompletedTickets / totalDays,
        averageTicketsPerTechnician: totalCompletedTickets / Object.keys(technicianPerformance).length,
        reworkRate: overallReworkRate,
        totalReworks: reworkAnalytics.totalReworks,
        averageReworkTime: reworkAnalytics.averageReworkTime
      },
      technicianPerformance,
      deviceAnalytics,
      reworkAnalytics,
      timeAnalytics,
      businessInsights,
      aiInsights
    }
  }


  const calculateQualityScore = (techData: any): number => {
    // Simple quality score based on efficiency and consistency
    const efficiencyScore = Math.max(0, 100 - (techData.efficiency * 10)) // Lower time = higher score
    const consistencyScore = techData.consistency * 100
    return (efficiencyScore + consistencyScore) / 2
  }

  const calculateConsistency = (techData: any): number => {
    // Calculate consistency based on repair time variance
    // This is a simplified version - in reality you'd need more data points
    return 0.8 // Placeholder
  }

  const generateBusinessInsights = (technicianPerformance: any, deviceAnalytics: any, timeAnalytics: any, reworkAnalytics: any) => {
    const topPerformers = Object.entries(technicianPerformance)
      .sort(([,a], [,b]) => (b as any).efficiency - (a as any).efficiency)
      .slice(0, 3)
      .map(([name]) => name)
    
    const mostEfficientDevices = Object.entries(deviceAnalytics)
      .sort(([,a], [,b]) => (a as any).averageRepairTime - (b as any).averageRepairTime)
      .slice(0, 3)
      .map(([device]) => device)
    
    const mostChallengingDevices = Object.entries(deviceAnalytics)
      .sort(([,a], [,b]) => (b as any).averageRepairTime - (a as any).averageRepairTime)
      .slice(0, 3)
      .map(([device]) => device)
    
    return {
      topPerformers,
      mostEfficientDevices,
      mostChallengingDevices,
      productivityTrends: ['Steady improvement in efficiency', 'Increased smartphone repairs', 'Better device specialization'],
      recommendations: [
        'Focus training on challenging device types',
        'Implement peer mentoring between top and bottom performers',
        'Optimize scheduling during peak hours',
        'Create device-specific training modules',
        'Reduce rework rates through quality improvements'
      ],
      costAnalysis: {
        totalLaborHours: Object.values(technicianPerformance).reduce((sum: number, tech: any) => sum + tech.totalRepairTime, 0) / 3600,
        averageCostPerRepair: 150, // Placeholder
        efficiencySavings: 5000, // Placeholder
        reworkCosts: reworkAnalytics.costOfReworks,
        potentialSavingsFromReworkReduction: reworkAnalytics.costOfReworks * 0.5 // 50% reduction potential
      }
    }
  }

  const generateAIInsights = async (technicianPerformance: any, deviceAnalytics: any, businessInsights: any) => {
    try {
      const response = await fetch('/api/ai-deep-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianPerformance,
          deviceAnalytics,
          businessInsights
        })
      })

      if (response.ok) {
        return await response.json()
      } else {
        return generateFallbackAIInsights()
      }
    } catch (error) {
      console.error('AI insights failed:', error)
      return generateFallbackAIInsights()
    }
  }

  const generateFallbackAIInsights = () => ({
    performancePatterns: [
      'Technicians show consistent performance patterns',
      'Device complexity correlates with repair time',
      'Peak hours show higher efficiency'
    ],
    optimizationOpportunities: [
      'Cross-train technicians on different device types',
      'Implement time-based scheduling optimization',
      'Create device-specific repair protocols'
    ],
    riskFactors: [
      'Over-reliance on specific technicians',
      'Limited device type coverage',
      'Peak hour bottlenecks'
    ],
    successFactors: [
      'Strong technician specialization',
      'Consistent quality standards',
      'Efficient workflow processes'
    ],
    predictiveInsights: [
      'Expected increase in smartphone repairs',
      'Potential efficiency gains from training',
      'Seasonal patterns in repair volume'
    ]
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-gray-600">Analyzing deep performance data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-yellow-600 mr-2">ℹ️</div>
          <span className="text-yellow-800">No analytics data available</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔍 Deep Analytics Report</h2>
            <p className="text-gray-600 mt-1">
              Comprehensive analysis of completed repairs from {analyticsData.timeRange.startDate} to {analyticsData.timeRange.endDate}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{analyticsData.overallStats?.totalCompletedTickets || 0}</div>
            <div className="text-sm text-gray-500">Completed Repairs</div>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Repairs</h3>
          <div className="text-3xl font-bold text-blue-600">{analyticsData.overallStats?.totalCompletedTickets || 0}</div>
          <div className="text-sm text-gray-500">{(analyticsData.overallStats?.averageTicketsPerDay || 0).toFixed(1)} per day</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Time</h3>
          <div className="text-3xl font-bold text-green-600">{((analyticsData.overallStats?.totalRepairTime || 0) / 3600).toFixed(1)}h</div>
          <div className="text-sm text-gray-500">{((analyticsData.overallStats?.averageRepairTime || 0) / 60).toFixed(1)}m avg</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rework Rate</h3>
          <div className={`text-3xl font-bold ${(analyticsData.overallStats?.reworkRate || 0) > 10 ? 'text-red-600' : (analyticsData.overallStats?.reworkRate || 0) > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
            {(analyticsData.overallStats?.reworkRate || 0).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">{analyticsData.overallStats?.totalReworks || 0} reworks</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Technicians</h3>
          <div className="text-3xl font-bold text-purple-600">{analyticsData.overallStats?.totalTechnicians || 0}</div>
          <div className="text-sm text-gray-500">{(analyticsData.overallStats?.averageTicketsPerTechnician || 0).toFixed(1)} per tech</div>
        </div>
        
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Efficiency</h3>
          <div className="text-3xl font-bold text-orange-600">{((analyticsData.overallStats?.totalRepairTime || 0) / (analyticsData.overallStats?.totalCompletedTickets || 1) / 60).toFixed(1)}m</div>
          <div className="text-sm text-gray-500">Average repair time</div>
        </div>
      </div>

      {/* Technician Performance */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Technician Performance Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repairs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rework Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Fix Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top Device</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analyticsData.technicianPerformance).map(([tech, data]: [string, any]) => (
                <tr key={tech}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tech}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data?.totalTickets || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(data.totalRepairTime / 3600).toFixed(1)}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(data.averageRepairTime / 60).toFixed(1)}m</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.ticketsPerDay.toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      data.reworkRate > 10 ? 'bg-red-100 text-red-800' :
                      data.reworkRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {data.reworkRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      data.firstTimeFixRate >= 90 ? 'bg-green-100 text-green-800' :
                      data.firstTimeFixRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.firstTimeFixRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      data.qualityScore >= 80 ? 'bg-green-100 text-green-800' :
                      data.qualityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.qualityScore.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Object.entries(data.deviceExpertise).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rework Analytics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Rework Analysis & Quality Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">Total Reworks</h4>
            <div className="text-2xl font-bold text-red-600">{analyticsData.reworkAnalytics?.totalReworks || 0}</div>
            <div className="text-sm text-red-700">{(analyticsData.reworkAnalytics?.overallReworkRate || 0).toFixed(1)}% rework rate</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Time Lost</h4>
            <div className="text-2xl font-bold text-orange-600">{(analyticsData.reworkAnalytics?.timeLostToReworks || 0).toFixed(1)}h</div>
            <div className="text-sm text-orange-700">Productivity impact</div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Rework Cost</h4>
            <div className="text-2xl font-bold text-yellow-600">${(analyticsData.reworkAnalytics?.costOfReworks || 0).toLocaleString()}</div>
            <div className="text-sm text-yellow-700">Additional costs</div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Avg Rework Time</h4>
            <div className="text-2xl font-bold text-blue-600">{((analyticsData.reworkAnalytics?.averageReworkTime || 0) / (1000 * 60 * 60)).toFixed(1)}h</div>
            <div className="text-sm text-blue-700">Per rework</div>
          </div>
        </div>
        
        {(analyticsData.reworkAnalytics?.topReworkCauses || []).length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">🔍 Top Rework Causes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(analyticsData.reworkAnalytics?.topReworkCauses || []).map((cause, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <span className="text-gray-800">{cause}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {analyticsData.reworkAnalytics.reworkPreventionOpportunities.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">💡 Rework Prevention Opportunities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.reworkAnalytics.reworkPreventionOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-green-800">{opportunity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Device Analytics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Device Performance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analyticsData.deviceAnalytics).map(([device, data]: [string, any]) => (
            <div key={device} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{device}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Repairs:</span>
                  <span className="font-medium">{data.totalRepairs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="font-medium">{(data.averageRepairTime / 60).toFixed(1)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    data.difficultyLevel === 'easy' ? 'bg-green-100 text-green-800' :
                    data.difficultyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.difficultyLevel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">🤖 AI-Powered Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Performance Patterns</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {analyticsData.aiInsights.performancePatterns.map((pattern, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 mt-1.5"></div>
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Optimization Opportunities</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {analyticsData.aiInsights.optimizationOpportunities.map((opportunity, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-2 mt-1.5"></div>
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Business Recommendations */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Business Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsData.businessInsights.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                {index + 1}
              </div>
              <span className="text-gray-800">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
