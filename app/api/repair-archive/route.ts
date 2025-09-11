import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const technicianId = searchParams.get('technicianId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build the query
    let query = supabaseAdmin
      .from('repair_completions')
      .select(`
        *,
        repair_photos:repair_photos(id, photo_filename, photo_type, created_at)
      `)
      .order('completed_at', { ascending: false })

    // Apply filters
    if (technicianId) {
      query = query.eq('technician_id', technicianId)
    }

    if (dateFrom) {
      query = query.gte('completed_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('completed_at', dateTo)
    }

    if (search) {
      query = query.or(`ticket_number.ilike.%${search}%,work_completed.ilike.%${search}%,parts_used.ilike.%${search}%`)
    }

    // Get total count for pagination (apply same filters)
    let countQuery = supabaseAdmin
      .from('repair_completions')
      .select('*', { count: 'exact', head: true })

    if (technicianId) {
      countQuery = countQuery.eq('technician_id', technicianId)
    }
    if (dateFrom) {
      countQuery = countQuery.gte('completed_at', dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte('completed_at', dateTo)
    }
    if (search) {
      countQuery = countQuery.or(`ticket_number.ilike.%${search}%,work_completed.ilike.%${search}%,parts_used.ilike.%${search}%`)
    }

    const { count } = await countQuery

    // Get the actual data with pagination
    const { data: repairs, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ Error fetching repair archive:', error)
      return NextResponse.json(
        { error: 'Failed to fetch repair archive', details: error.message },
        { status: 500 }
      )
    }

    // Get technician names for display
    const technicianIds = [...new Set(repairs?.map(r => r.technician_id) || [])]
    const { data: technicians } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username')
      .in('id', technicianIds)

    const technicianMap = technicians?.reduce((acc, tech) => {
      acc[tech.id] = tech.full_name || tech.username
      return acc
    }, {} as Record<string, string>) || {}

    // Enhance repair data with technician names
    const enhancedRepairs = repairs?.map(repair => ({
      ...repair,
      technician_name: technicianMap[repair.technician_id] || repair.technician_name
    }))

    return NextResponse.json({
      success: true,
      repairs: enhancedRepairs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('❌ Error fetching repair archive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repairId = searchParams.get('id')

    if (!repairId) {
      return NextResponse.json(
        { error: 'Repair ID is required' },
        { status: 400 }
      )
    }

    // Delete associated photos first
    const { error: photosError } = await supabaseAdmin
      .from('repair_photos')
      .delete()
      .eq('repair_completion_id', repairId)

    if (photosError) {
      console.error('❌ Error deleting repair photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to delete repair photos', details: photosError.message },
        { status: 500 }
      )
    }

    // Delete the repair completion record
    const { error: repairError } = await supabaseAdmin
      .from('repair_completions')
      .delete()
      .eq('id', repairId)

    if (repairError) {
      console.error('❌ Error deleting repair completion:', repairError)
      return NextResponse.json(
        { error: 'Failed to delete repair completion', details: repairError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Repair completion deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting repair completion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
