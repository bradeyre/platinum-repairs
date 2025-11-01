import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface RepairChecklistItem {
  id: string
  category: 'safety' | 'functionality' | 'hardware' | 'software' | 'connectivity' | 'battery' | 'display' | 'audio'
  priority: 'critical' | 'high' | 'medium' | 'low'
  issue: string
  description: string
  verificationMethod: string
  expectedOutcome: string
  source: string // What in the ticket history led to this concern
  checked: boolean
  notes: string
}

export interface RepairChecklist {
  ticketId: string
  deviceInfo: string
  summary: string
  criticalIssues: number
  totalItems: number
  checklist: RepairChecklistItem[]
  recommendations: string[]
  warnings: string[]
}

export async function POST(request: NextRequest) {
  let ticketId = 'unknown'
  let deviceInfo = 'Unknown Device'
  
  try {
    const requestData = await request.json()
    ticketId = requestData.ticketId || 'unknown'
    deviceInfo = requestData.deviceInfo || 'Unknown Device'
    const description = requestData.description || ''

    if (!ticketId || ticketId === 'unknown') {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, deviceInfo' },
        { status: 400 }
      )
    }

    console.log('🤖 Generating AI repair checklist for ticket:', ticketId)

    // Fetch comprehensive ticket data
    const ticketData = await fetchComprehensiveTicketData(ticketId)
    
    // Generate AI-powered repair checklist
    const checklist = await generateRepairChecklist(ticketData, deviceInfo, description)
    
    console.log('✅ AI repair checklist generated:', {
      ticketId,
      totalItems: checklist.totalItems,
      criticalIssues: checklist.criticalIssues
    })

    return NextResponse.json({
      success: true,
      checklist: checklist
    })

  } catch (error) {
    console.error('❌ Error generating repair checklist:', error)
    
    // Return fallback checklist
    const fallbackChecklist: RepairChecklist = {
      ticketId: ticketId,
      deviceInfo: deviceInfo,
      summary: 'Unable to generate AI checklist - manual assessment required',
      criticalIssues: 0,
      totalItems: 0,
      checklist: [],
      recommendations: ['Perform standard repair procedures', 'Follow manufacturer guidelines'],
      warnings: ['AI analysis unavailable - manual assessment required']
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to generate repair checklist',
      checklist: fallbackChecklist
    })
  }
}

async function fetchComprehensiveTicketData(ticketId: string) {
  try {
    // Fetch ticket details
    const ticketResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ticket-details?ticketId=${ticketId}`)
    const ticketData = ticketResponse.ok ? await ticketResponse.json() : null

    // Fetch damage reports
    const damageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/damage-reports?ticketId=${ticketId}`)
    const damageData = damageResponse.ok ? await damageResponse.json() : null

    // Fetch repair completions
    const repairResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/repair-completions?ticketId=${ticketId}`)
    const repairData = repairResponse.ok ? await repairResponse.json() : null

    // Fetch time tracking data
    const timeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/time-tracking?ticketId=${ticketId}`)
    const timeData = timeResponse.ok ? await timeResponse.json() : null

    return {
      ticket: ticketData?.ticket || null,
      damageReports: damageData?.reports || [],
      repairCompletions: repairData?.repairs || [],
      timeTracking: timeData?.entries || []
    }
  } catch (error) {
    console.error('Error fetching ticket data:', error)
    return {
      ticket: null,
      damageReports: [],
      repairCompletions: [],
      timeTracking: []
    }
  }
}

async function generateRepairChecklist(ticketData: any, deviceInfo: string, description: string): Promise<RepairChecklist> {
  try {
    const prompt = `
You are an expert mobile device repair technician with 15+ years of experience. 
Analyze the following comprehensive ticket data and create a detailed repair checklist.

Device: ${deviceInfo}
Description: ${description}

Ticket History:
${JSON.stringify(ticketData, null, 2)}

IMPORTANT CONTEXT RULES:
1. IGNORE insurance company names (like "Monitor", "Discovery", "Outsurance", etc.) - these are NOT device issues
2. Focus ONLY on actual device problems mentioned in damage reports and customer comments
3. Look for specific damage descriptions like "screen cracked", "device not charging", "speaker not working"
4. Pay attention to physical damage, functionality issues, and performance problems
5. DO NOT create checklist items based on insurance company names or policy numbers

Create a JSON response with this structure:
{
  "summary": "Brief summary of key concerns and repair focus areas",
  "criticalIssues": 3,
  "totalItems": 12,
  "checklist": [
    {
      "id": "unique_id",
      "category": "safety|functionality|hardware|software|connectivity|battery|display|audio",
      "priority": "critical|high|medium|low",
      "issue": "Specific device issue to check (e.g., 'Screen display functionality after crack repair')",
      "description": "Detailed description of the device concern",
      "verificationMethod": "How to test/verify this device issue (e.g., 'Test all screen functions, touch response, and display quality')",
      "expectedOutcome": "What should happen if device is working correctly",
      "source": "What in the ticket history led to this device concern (e.g., 'Damage report shows screen cracked from impact')",
      "checked": false,
      "notes": ""
    }
  ],
  "recommendations": ["Specific repair recommendations based on actual device issues"],
  "warnings": ["Important device safety or quality warnings"]
}

Focus ONLY on actual device issues:
1. Physical damage mentioned (cracked screens, damaged ports, broken buttons)
2. Functionality problems (charging issues, connectivity problems, audio problems)
3. Performance issues (slow response, overheating, battery drain)
4. Hardware failures (camera not working, speaker issues, vibration problems)
5. Display problems (screen issues, touch response, brightness)

DO NOT include:
- Insurance company names as issues
- Basic safety procedures (use protective equipment, disconnect device, etc.)
- Generic repair steps that apply to all repairs
- Items not mentioned in the actual ticket data

Only include specific, actionable device-related items that relate to the actual problems in this ticket.
Generate 6-12 specific checklist items based on the real device issues found in the ticket data.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert mobile device repair technician. Create specific, actionable repair checklists based on ticket history and device issues. Focus on real problems, not basic procedures."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI assistant')
    }

    const result = JSON.parse(response)
    
    // Add ticket ID and device info
    result.ticketId = ticketData.ticket?.ticketId || 'unknown'
    result.deviceInfo = deviceInfo

    return result as RepairChecklist

  } catch (error) {
    console.error('Error generating AI checklist:', error)
    throw error
  }
}
