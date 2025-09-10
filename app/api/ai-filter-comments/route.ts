import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { comments } = await request.json()

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: 'Comments array is required' },
        { status: 400 }
      )
    }

    const prompt = `
You are an AI assistant helping technicians filter relevant comments from repair tickets.

Your task is to identify comments that contain useful information about:
- Device issues and problems
- Damage descriptions
- Technical details
- Customer-reported problems
- Device specifications
- Repair history

EXCLUDE comments that are:
- Administrative messages ("Transferred to this department", "I've arranged courier booking")
- Status updates ("Ticket closed", "Work completed")
- Internal notes not related to device issues
- Generic system messages

For each comment, return "RELEVANT" if it contains useful technical information, or "IRRELEVANT" if it's administrative.

Comments to analyze:
${comments.map((comment, index) => `${index + 1}. ${comment.text}`).join('\n')}

Return a JSON object with this structure:
{
  "relevantComments": [
    {
      "text": "The actual comment text",
      "date": "Comment date",
      "author": "Comment author"
    }
  ]
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that filters repair ticket comments to show only relevant technical information.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    try {
      const parsedResponse = JSON.parse(response)
      return NextResponse.json(parsedResponse)
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError)
      console.error('Raw response:', response)
      
      // Fallback: return all comments if parsing fails
      return NextResponse.json({
        relevantComments: comments.map(comment => ({
          text: comment.text,
          date: comment.date,
          author: comment.author
        }))
      })
    }

  } catch (error) {
    console.error('Error in AI filter comments:', error)
    return NextResponse.json(
      { error: 'Failed to filter comments' },
      { status: 500 }
    )
  }
}
