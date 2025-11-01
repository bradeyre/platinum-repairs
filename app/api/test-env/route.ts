import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token1 = process.env.REPAIRSHOPR_TOKEN
    const token2 = process.env.REPAIRSHOPR_TOKEN_DD
    
    return NextResponse.json({
      success: true,
      env: {
        REPAIRSHOPR_TOKEN: token1 ? `${token1.substring(0, 10)}...` : 'Missing',
        REPAIRSHOPR_TOKEN_DD: token2 ? `${token2.substring(0, 10)}...` : 'Missing',
        REPAIRSHOPR_BASE_URL: process.env.REPAIRSHOPR_BASE_URL,
        REPAIRSHOPR_DD_BASE_URL: process.env.REPAIRSHOPR_DD_BASE_URL
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


