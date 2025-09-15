import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN
    
    return NextResponse.json({
      success: true,
      token: token ? `${token.substring(0, 10)}...` : 'Missing',
      tokenLength: token ? token.length : 0,
      first10Chars: token ? token.substring(0, 10) : 'N/A'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


