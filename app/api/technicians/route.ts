import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { full_name, username, email, bio, role } = await request.json()

    if (!full_name || !username) {
      return NextResponse.json(
        { error: 'Full name and username are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Create new technician
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        full_name,
        username,
        email: email || null,
        bio: bio || null,
        role: role || 'technician',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating technician:', error)
      return NextResponse.json(
        { error: 'Failed to create technician' },
        { status: 500 }
      )
    }

    return NextResponse.json({ technician: data })
  } catch (error) {
    console.error('Error in POST /api/technicians:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
