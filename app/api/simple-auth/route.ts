import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simple authentication endpoint that returns user data without Supabase auth
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    console.log('🔐 Simple auth attempt for:', username)
    
    // Query users table directly
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !user) {
      console.error('Simple auth error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    }

    console.log('🔐 Simple auth success:', authUser.username, authUser.role)
    
    return NextResponse.json({
      success: true,
      user: authUser
    })
  } catch (error) {
    console.error('Simple auth error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, { status: 500 })
  }
}
