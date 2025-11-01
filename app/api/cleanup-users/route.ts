import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🗑️ Cleaning up all existing users...')
    
    // Delete all users from the users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // This will delete all users

    if (deleteError) {
      console.error('Error deleting users:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete users',
        details: deleteError
      })
    }

    console.log('✅ All users cleaned up successfully')

    return NextResponse.json({
      success: true,
      message: 'All users have been removed from the system'
    })
  } catch (err) {
    console.error('Cleanup users error:', err)
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup users',
      details: err
    })
  }
}

