import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface TechnicianPerformance {
  technician: string
  totalTickets: number
  currentLoad: number
  averageWaitTime: number
  completionRate: number
}

export async function POST(request: NextRequest) {
  try {
    const { performanceData } = await request.json()

    if (!performanceData || !Array.isArray(performanceData)) {
      return NextResponse.json({ error: 'Invalid performance data' }, { status: 400 })
    }

    // Create a comprehensive prompt for AI analysis
    const prompt = `
You are an expert workshop manager analyzing technician performance data. Analyze the following performance metrics and provide actionable insights:

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Please provide a comprehensive analysis in the following JSON format:
{
  "overallInsights": [
    "Key insight 1 about overall performance",
    "Key insight 2 about team efficiency",
    "Key insight 3 about workload distribution"
  ],
  "topPerformers": [
    "Technician name 1",
    "Technician name 2"
  ],
  "needsTraining": [
    "Technician name who needs training",
    "Another technician who needs support"
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3",
    "Specific actionable recommendation 4"
  ],
  "efficiencyTrends": [
    "Trend observation 1",
    "Trend observation 2",
    "Trend observation 3"
  ],
  "workloadDistribution": [
    "Workload insight 1",
    "Workload insight 2",
    "Workload insight 3"
  ]
}

Focus on:
1. Who is performing well and why
2. Who needs training or support
3. Workload balance and distribution
4. Specific actionable recommendations
5. Efficiency patterns and trends
6. Areas for improvement

Be specific, actionable, and professional in your analysis.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert workshop manager with 15+ years of experience in technician performance analysis and team optimization. Provide specific, actionable insights based on data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse the AI response
    let analysis
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback to a structured response
      analysis = {
        overallInsights: [
          "AI analysis temporarily unavailable",
          "Using fallback performance metrics",
          "Please try refreshing the analysis"
        ],
        topPerformers: [],
        needsTraining: [],
        recommendations: [
          "Review individual technician performance metrics",
          "Consider workload redistribution",
          "Implement regular performance reviews",
          "Provide targeted training where needed"
        ],
        efficiencyTrends: [
          "Monitor completion rates regularly",
          "Track average wait times",
          "Identify performance patterns"
        ],
        workloadDistribution: [
          "Review current ticket distribution",
          "Balance workload across technicians",
          "Consider capacity planning"
        ]
      }
    }

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Error in AI performance analysis:', error)
    
    // Return fallback analysis
    const fallbackAnalysis = {
      overallInsights: [
        "AI analysis service temporarily unavailable",
        "Using basic performance metrics",
        "Please try again later"
      ],
      topPerformers: [],
      needsTraining: [],
      recommendations: [
        "Review technician performance metrics manually",
        "Consider implementing peer mentoring",
        "Set up regular performance reviews",
        "Provide training for common repair types"
      ],
      efficiencyTrends: [
        "Monitor completion rates weekly",
        "Track average wait times by technician",
        "Identify patterns in ticket completion"
      ],
      workloadDistribution: [
        "Review current workload distribution",
        "Consider redistributing tickets for balance",
        "Monitor technician capacity"
      ]
    }

    return NextResponse.json(fallbackAnalysis)
  }
}