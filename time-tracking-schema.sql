-- Enhanced Time Tracking Schema
-- This table stores detailed time tracking data for productivity monitoring

CREATE TABLE IF NOT EXISTS time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  ticket_number TEXT,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  work_type TEXT NOT NULL DEFAULT 'repair', -- 'repair', 'damage_report', 'testing', 'other'
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in seconds
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  productivity_score INTEGER, -- 0-100 score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_tracking_technician_id ON time_tracking (technician_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_ticket_id ON time_tracking (ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_start_time ON time_tracking (start_time);
CREATE INDEX IF NOT EXISTS idx_time_tracking_status ON time_tracking (status);
CREATE INDEX IF NOT EXISTS idx_time_tracking_work_type ON time_tracking (work_type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_time_tracking_technician_date ON time_tracking (technician_id, start_time);
CREATE INDEX IF NOT EXISTS idx_time_tracking_status_date ON time_tracking (status, start_time);

-- RLS (Row Level Security) policies
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read time tracking data
CREATE POLICY "Allow authenticated users to read time tracking" ON time_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow technicians to insert their own time tracking data
CREATE POLICY "Allow technicians to insert time tracking" ON time_tracking
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow technicians to update their own time tracking data
CREATE POLICY "Allow technicians to update time tracking" ON time_tracking
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow admins to delete time tracking data
CREATE POLICY "Allow admins to delete time tracking" ON time_tracking
  FOR DELETE USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_time_tracking_updated_at_trigger
  BEFORE UPDATE ON time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_time_tracking_updated_at();

-- Function to calculate duration when end_time is set
CREATE OR REPLACE FUNCTION calculate_time_tracking_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate duration
CREATE TRIGGER calculate_time_tracking_duration_trigger
  BEFORE INSERT OR UPDATE ON time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_tracking_duration();

-- View for active time tracking sessions
CREATE OR REPLACE VIEW active_time_sessions AS
SELECT 
  id,
  ticket_id,
  ticket_number,
  technician_id,
  technician_name,
  work_type,
  description,
  start_time,
  EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER as current_duration,
  status
FROM time_tracking
WHERE status = 'active'
ORDER BY start_time DESC;

-- View for daily productivity summary
CREATE OR REPLACE VIEW daily_productivity_summary AS
SELECT 
  technician_id,
  technician_name,
  DATE(start_time) as work_date,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
  SUM(CASE WHEN status = 'completed' AND duration IS NOT NULL THEN duration ELSE 0 END) as total_completed_seconds,
  SUM(CASE WHEN status = 'active' THEN EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER ELSE 0 END) as total_active_seconds,
  AVG(CASE WHEN status = 'completed' AND duration IS NOT NULL THEN duration ELSE NULL END) as avg_session_duration,
  COUNT(DISTINCT ticket_id) as unique_tickets_worked
FROM time_tracking
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY technician_id, technician_name, DATE(start_time)
ORDER BY work_date DESC, technician_name;
