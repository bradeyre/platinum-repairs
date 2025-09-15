-- Ticket Lifecycle Analytics Schema - FINAL FIXED VERSION
-- This schema stores comprehensive ticket data from RepairShopr for deep analysis
-- FIXED: All SQL syntax errors resolved

-- Main table for storing complete ticket lifecycle data
CREATE TABLE IF NOT EXISTS ticket_lifecycle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic ticket info
  ticket_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  device_info TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Status and workflow
  current_status TEXT NOT NULL,
  status_history JSONB DEFAULT '[]'::jsonb, -- Array of status changes with timestamps
  priority TEXT,
  ticket_type TEXT, -- PR, DD, etc.
  
  -- Assignment and timing
  assigned_technician_id TEXT,
  assigned_technician_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Time tracking
  total_duration_seconds INTEGER DEFAULT 0,
  active_work_time_seconds INTEGER DEFAULT 0,
  waiting_time_seconds INTEGER DEFAULT 0,
  
  -- Comments and notes
  comments JSONB DEFAULT '[]'::jsonb, -- Array of all comments with timestamps and authors
  internal_notes JSONB DEFAULT '[]'::jsonb,
  
  -- Repair details
  repair_type TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  work_completed TEXT,
  testing_results TEXT,
  
  -- Quality and rework tracking
  is_rework BOOLEAN DEFAULT FALSE,
  rework_reason TEXT,
  rework_count INTEGER DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0.00,
  
  -- Financial
  labor_cost DECIMAL(10,2) DEFAULT 0.00,
  parts_cost DECIMAL(10,2) DEFAULT 0.00,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  source_system TEXT DEFAULT 'repairshopr',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at_local TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_local TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Smart syncing fields
  is_finalized BOOLEAN DEFAULT FALSE, -- True if ticket is completed and at least 1 week old
  sync_priority INTEGER DEFAULT 1, -- 1=high (completed+old), 2=medium (completed+recent), 3=low (active)
  next_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 day'
);

-- Table for storing individual status changes with detailed tracking
CREATE TABLE IF NOT EXISTS ticket_status_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  
  -- Status change details
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  changed_by TEXT, -- User who made the change
  
  -- Context
  comment TEXT,
  internal_note BOOLEAN DEFAULT FALSE,
  
  -- Timing calculations
  duration_since_last_change INTEGER, -- Seconds since previous status change
  business_hours_since_last_change DECIMAL(10,2), -- Business hours only
  
  -- Metadata
  source_system TEXT DEFAULT 'repairshopr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing ticket comments with full context
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  
  -- Comment details
  comment_text TEXT NOT NULL,
  comment_type TEXT, -- 'customer', 'technician', 'system', 'internal'
  author_name TEXT,
  author_email TEXT,
  is_internal BOOLEAN DEFAULT FALSE,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Analysis fields
  contains_rework_keywords BOOLEAN DEFAULT FALSE,
  contains_quality_issues BOOLEAN DEFAULT FALSE,
  contains_parts_info BOOLEAN DEFAULT FALSE,
  contains_time_info BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  source_system TEXT DEFAULT 'repairshopr',
  created_at_local TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'completed_only'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  
  -- Statistics
  tickets_processed INTEGER DEFAULT 0,
  tickets_inserted INTEGER DEFAULT 0,
  tickets_updated INTEGER DEFAULT 0,
  tickets_skipped INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Configuration
  sync_config JSONB DEFAULT '{}'::jsonb, -- Store sync parameters
  error_log JSONB DEFAULT '[]'::jsonb, -- Store any errors encountered
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_ticket_id ON ticket_lifecycle(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_ticket_number ON ticket_lifecycle(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_status ON ticket_lifecycle(current_status);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_assigned_tech ON ticket_lifecycle(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_created_at ON ticket_lifecycle(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_completed_at ON ticket_lifecycle(completed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_is_rework ON ticket_lifecycle(is_rework);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_repair_type ON ticket_lifecycle(repair_type);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_is_finalized ON ticket_lifecycle(is_finalized);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_sync_priority ON ticket_lifecycle(sync_priority);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_next_sync_at ON ticket_lifecycle(next_sync_at);

CREATE INDEX IF NOT EXISTS idx_status_changes_ticket_id ON ticket_status_changes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_ticket_number ON ticket_status_changes(ticket_number);
CREATE INDEX IF NOT EXISTS idx_status_changes_changed_at ON ticket_status_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_status_changes_to_status ON ticket_status_changes(to_status);

CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_number ON ticket_comments(ticket_number);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON ticket_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_author ON ticket_comments(author_name);
CREATE INDEX IF NOT EXISTS idx_comments_is_internal ON ticket_comments(is_internal);

CREATE INDEX IF NOT EXISTS idx_sync_operations_started_at ON sync_operations(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);

-- FIXED: Function to calculate business hours between two timestamps
CREATE OR REPLACE FUNCTION calculate_business_hours(start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE;
  total_hours DECIMAL(10,2) := 0;
  day_of_week INTEGER;
  hour_of_day INTEGER;
BEGIN
  current_time := start_time;
  
  WHILE current_time < end_time LOOP
    day_of_week := EXTRACT(DOW FROM current_time);
    hour_of_day := EXTRACT(HOUR FROM current_time);
    
    -- Only count business hours (8 AM - 5 PM, Monday to Friday)
    IF day_of_week >= 1 AND day_of_week <= 5 AND hour_of_day >= 8 AND hour_of_day < 17 THEN
      total_hours := total_hours + 1;
    END IF;
    
    current_time := current_time + INTERVAL '1 hour';
  END LOOP;
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to determine if a ticket is finalized (completed and at least 1 week old)
CREATE OR REPLACE FUNCTION is_ticket_finalized(ticket_status TEXT, completed_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if ticket is completed
  IF ticket_status NOT ILIKE '%completed%' AND ticket_status NOT ILIKE '%closed%' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if completed at least 1 week ago
  IF completed_date IS NULL OR completed_date > (NOW() - INTERVAL '1 week') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to determine sync priority
CREATE OR REPLACE FUNCTION get_sync_priority(ticket_status TEXT, completed_date TIMESTAMP WITH TIME ZONE, last_synced TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
BEGIN
  -- High priority: Completed tickets that are at least 1 week old
  IF is_ticket_finalized(ticket_status, completed_date) THEN
    RETURN 1;
  END IF;
  
  -- Medium priority: Recently completed tickets (less than 1 week old)
  IF ticket_status ILIKE '%completed%' OR ticket_status ILIKE '%closed%' THEN
    RETURN 2;
  END IF;
  
  -- Low priority: Active tickets
  RETURN 3;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next sync time based on priority
CREATE OR REPLACE FUNCTION get_next_sync_time(priority INTEGER, last_synced TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE priority
    WHEN 1 THEN -- High priority: Sync daily
      RETURN last_synced + INTERVAL '1 day';
    WHEN 2 THEN -- Medium priority: Sync every 3 days
      RETURN last_synced + INTERVAL '3 days';
    WHEN 3 THEN -- Low priority: Sync weekly
      RETURN last_synced + INTERVAL '7 days';
    ELSE
      RETURN last_synced + INTERVAL '1 day';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to detect rework patterns
CREATE OR REPLACE FUNCTION detect_rework_pattern(ticket_id TEXT)
RETURNS JSONB AS $$
DECLARE
  status_changes RECORD;
  rework_count INTEGER := 0;
  rework_reasons TEXT[] := '{}';
  result JSONB;
BEGIN
  -- Count status changes that indicate rework
  SELECT COUNT(*) INTO rework_count
  FROM ticket_status_changes
  WHERE ticket_id = $1
  AND (
    to_status ILIKE '%rework%' OR
    to_status ILIKE '%returned%' OR
    to_status ILIKE '%failed%' OR
    to_status ILIKE '%incomplete%' OR
    to_status ILIKE '%quality%'
  );
  
  -- Collect rework reasons from comments
  SELECT ARRAY_AGG(DISTINCT comment_text) INTO rework_reasons
  FROM ticket_comments
  WHERE ticket_id = $1
  AND (
    comment_text ILIKE '%rework%' OR
    comment_text ILIKE '%redo%' OR
    comment_text ILIKE '%fix again%' OR
    comment_text ILIKE '%not working%' OR
    comment_text ILIKE '%still broken%'
  );
  
  result := jsonb_build_object(
    'is_rework', rework_count > 0,
    'rework_count', rework_count,
    'rework_reasons', to_jsonb(rework_reasons)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticket lifecycle summary
CREATE OR REPLACE FUNCTION update_ticket_lifecycle_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the main ticket_lifecycle record with calculated fields
  UPDATE ticket_lifecycle
  SET
    total_duration_seconds = EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)),
    active_work_time_seconds = (
      SELECT COALESCE(SUM(duration_since_last_change), 0)
      FROM ticket_status_changes
      WHERE ticket_id = NEW.ticket_id
      AND to_status IN ('In Progress', 'Working', 'Repairing', 'Testing')
    ),
    waiting_time_seconds = (
      SELECT COALESCE(SUM(duration_since_last_change), 0)
      FROM ticket_status_changes
      WHERE ticket_id = NEW.ticket_id
      AND to_status IN ('Waiting', 'Pending', 'On Hold', 'Awaiting Parts')
    ),
    updated_at_local = NOW()
  WHERE ticket_id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update lifecycle summary when status changes
CREATE TRIGGER trigger_update_lifecycle_summary
  AFTER INSERT OR UPDATE ON ticket_status_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_lifecycle_summary();

-- Views for easy analysis
CREATE OR REPLACE VIEW ticket_analytics_summary AS
SELECT
  tl.ticket_id,
  tl.ticket_number,
  tl.current_status,
  tl.assigned_technician_name,
  tl.created_at,
  tl.completed_at,
  tl.total_duration_seconds,
  tl.active_work_time_seconds,
  tl.waiting_time_seconds,
  tl.is_rework,
  tl.rework_count,
  tl.repair_type,
  tl.device_info,
  tl.is_finalized,
  tl.sync_priority,
  -- Calculate derived metrics
  EXTRACT(EPOCH FROM (COALESCE(tl.completed_at, NOW()) - tl.created_at)) / 3600 as total_hours,
  tl.active_work_time_seconds / 3600.0 as active_work_hours,
  tl.waiting_time_seconds / 3600.0 as waiting_hours,
  -- Status change count
  (SELECT COUNT(*) FROM ticket_status_changes tsc WHERE tsc.ticket_id = tl.ticket_id) as status_change_count,
  -- Comment count
  (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = tl.ticket_id) as comment_count
FROM ticket_lifecycle tl;

-- View for technician performance analysis
CREATE OR REPLACE VIEW technician_performance_analytics AS
SELECT
  assigned_technician_name,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN current_status = 'Completed' THEN 1 END) as completed_tickets,
  COUNT(CASE WHEN is_rework = true THEN 1 END) as rework_tickets,
  AVG(total_duration_seconds / 3600.0) as avg_completion_hours,
  AVG(active_work_time_seconds / 3600.0) as avg_active_work_hours,
  AVG(waiting_time_seconds / 3600.0) as avg_waiting_hours,
  SUM(total_duration_seconds / 3600.0) as total_work_hours,
  -- Calculate efficiency metrics
  (COUNT(CASE WHEN current_status = 'Completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100 as completion_rate,
  (COUNT(CASE WHEN is_rework = true THEN 1 END)::DECIMAL / COUNT(*)) * 100 as rework_rate,
  -- Device expertise
  (SELECT jsonb_object_agg(repair_type, count) FROM (
    SELECT repair_type, COUNT(*) as count
    FROM ticket_lifecycle
    WHERE assigned_technician_name = tas.assigned_technician_name
    AND repair_type IS NOT NULL
    GROUP BY repair_type
  ) device_stats) as device_expertise
FROM ticket_analytics_summary tas
WHERE assigned_technician_name IS NOT NULL
GROUP BY assigned_technician_name;

-- View for sync management
CREATE OR REPLACE VIEW sync_management AS
SELECT
  sync_priority,
  COUNT(*) as ticket_count,
  COUNT(CASE WHEN is_finalized = true THEN 1 END) as finalized_count,
  COUNT(CASE WHEN next_sync_at <= NOW() THEN 1 END) as ready_for_sync,
  MIN(next_sync_at) as next_sync_time,
  MAX(last_synced_at) as last_sync_time
FROM ticket_lifecycle
GROUP BY sync_priority
ORDER BY sync_priority;

-- Comments for documentation
COMMENT ON TABLE ticket_lifecycle IS 'Complete ticket lifecycle data from RepairShopr for comprehensive analytics';
COMMENT ON TABLE ticket_status_changes IS 'Individual status changes with timing for detailed workflow analysis';
COMMENT ON TABLE ticket_comments IS 'All ticket comments with analysis flags for content insights';
COMMENT ON TABLE sync_operations IS 'Tracks sync operations and their results for monitoring';

COMMENT ON COLUMN ticket_lifecycle.status_history IS 'JSON array of all status changes with timestamps';
COMMENT ON COLUMN ticket_lifecycle.comments IS 'JSON array of all comments with metadata';
COMMENT ON COLUMN ticket_lifecycle.parts_used IS 'JSON array of parts used in repair';
COMMENT ON COLUMN ticket_lifecycle.is_finalized IS 'True if ticket is completed and at least 1 week old';
COMMENT ON COLUMN ticket_lifecycle.sync_priority IS '1=high (completed+old), 2=medium (completed+recent), 3=low (active)';
COMMENT ON COLUMN ticket_status_changes.business_hours_since_last_change IS 'Business hours only (8 AM - 5 PM, Mon-Fri)';
COMMENT ON COLUMN ticket_comments.contains_rework_keywords IS 'Flag indicating if comment mentions rework-related terms';


