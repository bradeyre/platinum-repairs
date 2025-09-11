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
  ticketsByStatus: Record<string, number>
  averageCompletionTime?: number
}

interface PerformanceData {
  technicians: TechnicianPerformance[]
  overallStats: {
    totalTickets: number
    averageWaitTime: number
    averageCompletionRate: number
  }
  insights: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { performanceData }: { performanceData: PerformanceData } = await request.json()

    if (!performanceData || !performanceData.technicians) {
      return NextResponse.json({ error: 'Performance data is required' }, { status: 400 })
    }

    const prompt = `
You are an expert workshop manager analyzing technician performance data. Provide actionable insights and recommendations.

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

ANALYSIS REQUIREMENTS:
1. **Individual Performance Analysis**: For each technician, identify:
   - Strengths and areas for improvement
   - Workload distribution concerns
   - Efficiency patterns
   - Training needs

2. **Team Performance Insights**:
   - Overall team efficiency
   - Bottlenecks and workflow issues
   - Resource allocation recommendations

3. **Actionable Recommendations**:
   - Specific training needs for each technician
   - Process improvements
   - Workload balancing suggestions
   - Performance targets

4. **Priority Actions**:
   - Most critical issues to address
   - Quick wins for immediate improvement
   - Long-term strategic improvements

FORMAT YOUR RESPONSE AS JSON:
{
  "individualAnalysis": {
    "technicianName": {
      "performance": "excellent/good/average/needs_improvement",
      "strengths": ["strength1", "strength2"],
      "concerns": ["concern1", "concern2"],
      "trainingNeeds": ["training1", "training2"],
      "recommendations": ["rec1", "rec2"]
    }
  },
  "teamInsights": {
    "overallEfficiency": "excellent/good/average/needs_improvement",
    "bottlenecks": ["bottleneck1", "bottleneck2"],
    "workloadBalance": "balanced/imbalanced",
    "teamRecommendations": ["rec1", "rec2"]
  },
  "priorityActions": {
    "immediate": ["action1", "action2"],
    "shortTerm": ["action1", "action2"],
    "longTerm": ["action1", "action2"]
  },
  "summary": "Brief overall assessment and key takeaways"
}

Be specific, actionable, and focus on practical improvements for a repair workshop environment.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert workshop manager with 15+ years of experience in repair operations, technician management, and performance optimization. Provide practical, actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content

    if (!analysis) {
      throw new Error('No analysis generated')
    }

    // Try to parse as JSON, fallback to text if needed
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch (error) {
      // If JSON parsing fails, return as text analysis
      parsedAnalysis = {
        analysis: analysis,
        format: 'text'
      }
    }

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in AI performance analysis:', error)
    return NextResponse.json(
      { error: 'Failed to analyze performance data' },
      { status: 500 }
    )
  }
}
