import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { full_name, username, email, bio, role } = await request.json()

    if (!full_name || !username) {
      return NextResponse.json(
        { error: 'Full name and username are required' },
        { status: 400 }
      )
    }

    // Check if username already exists for a different user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Update technician
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name,
        username,
        email: email || null,
        bio: bio || null,
        role: role || 'technician',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating technician:', error)
      return NextResponse.json(
        { error: 'Failed to update technician' },
        { status: 500 }
      )
    }

    return NextResponse.json({ technician: data })
  } catch (error) {
    console.error('Error in PUT /api/technicians/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
