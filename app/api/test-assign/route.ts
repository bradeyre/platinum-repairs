import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ 
    success: true,
    message: 'Assignment API test endpoint is working',
    timestamp: new Date().toISOString()
  })
}

export async function GET() {
  return NextResponse.json({ 
    success: true,
    message: 'Assignment API test endpoint is accessible',
    timestamp: new Date().toISOString()
  })
}
