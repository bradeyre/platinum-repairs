import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check repair_completions table
    const { data: repairCompletions, error: repairError } = await supabaseAdmin
      .from('repair_completions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (repairError) {
      console.error('Error fetching repair completions:', repairError)
    }

    // Check damage_reports table
    const { data: damageReports, error: damageError } = await supabaseAdmin
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (damageError) {
      console.error('Error fetching damage reports:', damageError)
    }

    // Check users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username, role')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
    }

    // Get table counts
    const { count: repairCount } = await supabaseAdmin
      .from('repair_completions')
      .select('*', { count: 'exact', head: true })

    const { count: damageCount } = await supabaseAdmin
      .from('damage_reports')
      .select('*', { count: 'exact', head: true })

    const { count: userCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: {
        tableCounts: {
          repair_completions: repairCount || 0,
          damage_reports: damageCount || 0,
          users: userCount || 0
        },
        repairCompletions: repairCompletions || [],
        damageReports: damageReports || [],
        users: users || [],
        message: repairCount === 0 ? 
          'No repair completions found. The Deep Analytics Report needs actual repair completion data to work properly.' :
          `Found ${repairCount} repair completions. Deep Analytics should work.`
      }
    })

  } catch (error) {
    console.error('Debug repair data error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
