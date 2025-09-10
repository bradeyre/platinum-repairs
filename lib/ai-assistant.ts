import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface RepairSuggestion {
  category: 'diagnosis' | 'repair' | 'testing' | 'parts' | 'safety'
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  reasoning: string
  confidence: number // 0-100
}

export interface AIAnalysisResult {
  deviceType: string
  likelyIssues: string[]
  repairSuggestions: RepairSuggestion[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
  estimatedTime: string
  safetyWarnings: string[]
  partsRecommendations: string[]
  testingSteps: string[]
}

export class AIRepairAssistant {
  
  /**
   * Analyze device description and provide repair suggestions
   */
  static async analyzeRepairRequest(
    deviceInfo: string,
    description: string,
    symptoms?: string
  ): Promise<AIAnalysisResult> {
    try {
      const prompt = `
You are an expert mobile device repair technician with 15+ years of experience. 
Analyze the following repair request and provide comprehensive guidance:

Device: ${deviceInfo}
Description: ${description}
Symptoms: ${symptoms || 'Not provided'}

Please provide a JSON response with the following structure:
{
  "deviceType": "string (e.g., iPhone 12, Samsung Galaxy S21)",
  "likelyIssues": ["array of most likely issues"],
  "repairSuggestions": [
    {
      "category": "diagnosis|repair|testing|parts|safety",
      "priority": "high|medium|low",
      "suggestion": "specific actionable suggestion",
      "reasoning": "why this suggestion is important",
      "confidence": 85
    }
  ],
  "estimatedComplexity": "simple|moderate|complex",
  "estimatedTime": "string (e.g., 30-45 minutes)",
  "safetyWarnings": ["array of safety considerations"],
  "partsRecommendations": ["array of likely parts needed"],
  "testingSteps": ["array of testing procedures"]
}

Focus on:
1. Accurate diagnosis based on symptoms
2. Safety considerations (battery, screen, etc.)
3. Step-by-step repair guidance
4. Proper testing procedures
5. Common pitfalls to avoid
6. Time estimates based on complexity

Be specific and actionable. Consider modern device repair best practices.
`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert mobile device repair technician. Provide accurate, safe, and actionable repair guidance. Always prioritize safety and proper procedures."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI assistant')
      }

      // Parse JSON response
      const analysis = JSON.parse(response) as AIAnalysisResult
      
      console.log('🤖 AI Analysis completed:', {
        deviceType: analysis.deviceType,
        complexity: analysis.estimatedComplexity,
        suggestionsCount: analysis.repairSuggestions.length
      })

      return analysis

    } catch (error) {
      console.error('❌ Error in AI analysis:', error)
      
      // Return fallback analysis
      return {
        deviceType: 'Unknown Device',
        likelyIssues: ['Unable to analyze - AI service unavailable'],
        repairSuggestions: [
          {
            category: 'diagnosis',
            priority: 'high',
            suggestion: 'Perform manual diagnosis following standard procedures',
            reasoning: 'AI analysis unavailable, manual assessment required',
            confidence: 50
          }
        ],
        estimatedComplexity: 'moderate',
        estimatedTime: 'Unknown',
        safetyWarnings: ['Always follow standard safety procedures'],
        partsRecommendations: ['Diagnosis required to determine parts'],
        testingSteps: ['Follow standard testing procedures']
      }
    }
  }

  /**
   * Generate repair completion summary with AI insights
   */
  static async generateRepairSummary(
    workCompleted: string,
    partsUsed: string,
    testingResults: string,
    finalStatus: string,
    deviceInfo: string
  ): Promise<{
    summary: string
    qualityScore: number
    recommendations: string[]
    followUpActions: string[]
  }> {
    try {
      const prompt = `
You are a quality assurance expert for mobile device repairs. 
Review the following repair completion data and provide insights:

Device: ${deviceInfo}
Work Completed: ${workCompleted}
Parts Used: ${partsUsed}
Testing Results: ${testingResults}
Final Status: ${finalStatus}

Please provide a JSON response with:
{
  "summary": "concise summary of the repair work",
  "qualityScore": 85,
  "recommendations": ["array of improvement suggestions"],
  "followUpActions": ["array of recommended follow-up actions"]
}

Evaluate:
1. Completeness of repair documentation
2. Quality of testing procedures
3. Appropriate parts usage
4. Safety considerations
5. Customer communication needs

Provide a quality score (0-100) and actionable recommendations.
`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a quality assurance expert for mobile device repairs. Provide objective, constructive feedback to improve repair quality and customer satisfaction."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI assistant')
      }

      const result = JSON.parse(response)
      
      console.log('🤖 AI Quality assessment completed:', {
        qualityScore: result.qualityScore,
        recommendationsCount: result.recommendations.length
      })

      return result

    } catch (error) {
      console.error('❌ Error in AI quality assessment:', error)
      
      return {
        summary: 'Repair completed successfully',
        qualityScore: 75,
        recommendations: ['AI assessment unavailable - manual review recommended'],
        followUpActions: ['Monitor device performance', 'Follow up with customer']
      }
    }
  }

  /**
   * Generate intelligent ticket prioritization
   */
  static async prioritizeTicket(
    ticketId: string,
    deviceInfo: string,
    description: string,
    customerUrgency?: string
  ): Promise<{
    priority: 'urgent' | 'high' | 'medium' | 'low'
    estimatedTime: string
    complexity: 'simple' | 'moderate' | 'complex'
    reasoning: string
    suggestedTechnician: string
  }> {
    try {
      const prompt = `
You are a workshop manager with expertise in mobile device repair prioritization.
Analyze this ticket and provide prioritization guidance:

Ticket ID: ${ticketId}
Device: ${deviceInfo}
Description: ${description}
Customer Urgency: ${customerUrgency || 'Not specified'}

Please provide a JSON response with:
{
  "priority": "urgent|high|medium|low",
  "estimatedTime": "string (e.g., 45-60 minutes)",
  "complexity": "simple|moderate|complex",
  "reasoning": "explanation for prioritization decision",
  "suggestedTechnician": "string (e.g., 'Senior Technician', 'Screen Specialist', 'General Technician')"
}

Consider:
1. Device value and customer importance
2. Repair complexity and time requirements
3. Parts availability and cost
4. Customer urgency indicators
5. Technician skill requirements
6. Business impact

`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert workshop manager. Provide intelligent ticket prioritization based on business value, complexity, and customer needs."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI assistant')
      }

      const result = JSON.parse(response)
      
      console.log('🤖 AI Ticket prioritization completed:', {
        ticketId,
        priority: result.priority,
        complexity: result.complexity
      })

      return result

    } catch (error) {
      console.error('❌ Error in AI ticket prioritization:', error)
      
      return {
        priority: 'medium',
        estimatedTime: 'Unknown',
        complexity: 'moderate',
        reasoning: 'AI prioritization unavailable - manual assessment required',
        suggestedTechnician: 'General Technician'
      }
    }
  }

  /**
   * Generate performance insights for technicians
   */
  static async generatePerformanceInsights(
    technicianName: string,
    metrics: {
      averageWaitTime: number
      efficiencyScore: number
      ticketsCompleted: number
      averageTimePerTicket: number
    }
  ): Promise<{
    insights: string[]
    recommendations: string[]
    strengths: string[]
    areasForImprovement: string[]
  }> {
    try {
      const prompt = `
You are a performance coach for mobile device repair technicians.
Analyze the following performance metrics and provide insights:

Technician: ${technicianName}
Average Wait Time: ${metrics.averageWaitTime} hours
Efficiency Score: ${metrics.efficiencyScore}%
Tickets Completed: ${metrics.ticketsCompleted}
Average Time Per Ticket: ${metrics.averageTimePerTicket} minutes

Please provide a JSON response with:
{
  "insights": ["array of key performance insights"],
  "recommendations": ["array of actionable improvement recommendations"],
  "strengths": ["array of identified strengths"],
  "areasForImprovement": ["array of areas needing improvement"]
}

Focus on:
1. Productivity optimization
2. Quality improvement
3. Time management
4. Skill development
5. Customer satisfaction
6. Workshop efficiency

Be constructive and specific in your recommendations.
`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a performance coach specializing in mobile device repair technicians. Provide constructive, actionable feedback to help technicians improve their performance and job satisfaction."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1200
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI assistant')
      }

      const result = JSON.parse(response)
      
      console.log('🤖 AI Performance insights generated:', {
        technicianName,
        insightsCount: result.insights.length,
        recommendationsCount: result.recommendations.length
      })

      return result

    } catch (error) {
      console.error('❌ Error in AI performance insights:', error)
      
      return {
        insights: ['AI analysis unavailable - manual review recommended'],
        recommendations: ['Continue current practices', 'Monitor performance metrics'],
        strengths: ['Consistent work output'],
        areasForImprovement: ['AI assessment unavailable']
      }
    }
  }
}
