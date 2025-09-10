import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const { deviceInfo, description, symptoms } = await request.json()

    if (!deviceInfo || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceInfo, description' },
        { status: 400 }
      )
    }

    console.log('🤖 AI Analysis request:', { deviceInfo, description: description.substring(0, 50) + '...' })

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
    
    console.log('✅ AI Analysis completed:', {
      deviceType: analysis.deviceType,
      complexity: analysis.estimatedComplexity,
      suggestionsCount: analysis.repairSuggestions.length
    })

    return NextResponse.json({
      success: true,
      analysis: analysis
    })

  } catch (error) {
    console.error('❌ Error in AI analysis:', error)
    
    // Return fallback analysis
    const fallbackAnalysis: AIAnalysisResult = {
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

    return NextResponse.json({
      success: false,
      error: 'AI analysis failed',
      analysis: fallbackAnalysis
    })
  }
}
