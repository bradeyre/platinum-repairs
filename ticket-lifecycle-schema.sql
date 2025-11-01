-- Ticket Lifecycle Analytics Schema
-- This schema stores comprehensive ticket data from RepairShopr for deep analysis

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
  updated_at_local TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_ticket_id ON ticket_lifecycle(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_ticket_number ON ticket_lifecycle(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_status ON ticket_lifecycle(current_status);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_assigned_tech ON ticket_lifecycle(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_created_at ON ticket_lifecycle(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_completed_at ON ticket_lifecycle(completed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_is_rework ON ticket_lifecycle(is_rework);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_repair_type ON ticket_lifecycle(repair_type);

CREATE INDEX IF NOT EXISTS idx_status_changes_ticket_id ON ticket_status_changes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_ticket_number ON ticket_status_changes(ticket_number);
CREATE INDEX IF NOT EXISTS idx_status_changes_changed_at ON ticket_status_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_status_changes_to_status ON ticket_status_changes(to_status);

CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_number ON ticket_comments(ticket_number);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON ticket_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_author ON ticket_comments(author_name);
CREATE INDEX IF NOT EXISTS idx_comments_is_internal ON ticket_comments(is_internal);

-- Function to calculate business hours between two timestamps
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

-- Comments for documentation
COMMENT ON TABLE ticket_lifecycle IS 'Complete ticket lifecycle data from RepairShopr for comprehensive analytics';
COMMENT ON TABLE ticket_status_changes IS 'Individual status changes with timing for detailed workflow analysis';
COMMENT ON TABLE ticket_comments IS 'All ticket comments with analysis flags for content insights';

COMMENT ON COLUMN ticket_lifecycle.status_history IS 'JSON array of all status changes with timestamps';
COMMENT ON COLUMN ticket_lifecycle.comments IS 'JSON array of all comments with metadata';
COMMENT ON COLUMN ticket_lifecycle.parts_used IS 'JSON array of parts used in repair';
COMMENT ON COLUMN ticket_status_changes.business_hours_since_last_change IS 'Business hours only (8 AM - 5 PM, Mon-Fri)';
COMMENT ON COLUMN ticket_comments.contains_rework_keywords IS 'Flag indicating if comment mentions rework-related terms';
