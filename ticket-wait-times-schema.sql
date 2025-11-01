-- Table to track ticket wait times for performance analytics
CREATE TABLE IF NOT EXISTS ticket_wait_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  technician_id TEXT,
  wait_time_hours DECIMAL(10,2) NOT NULL,
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_ticket_wait_times_technician ON ticket_wait_times (technician_id);
CREATE INDEX IF NOT EXISTS idx_ticket_wait_times_completed_at ON ticket_wait_times (completed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_wait_times_ticket_id ON ticket_wait_times (ticket_id);

-- Table to track technician performance metrics
CREATE TABLE IF NOT EXISTS technician_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_tickets_completed INTEGER DEFAULT 0,
  average_wait_time_hours DECIMAL(10,2) DEFAULT 0,
  total_work_hours DECIMAL(10,2) DEFAULT 0,
  efficiency_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for technician-date combination
  UNIQUE(technician_id, date)
);

-- Create indexes for technician_performance table
CREATE INDEX IF NOT EXISTS idx_technician_performance_technician ON technician_performance (technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_performance_date ON technician_performance (date);

-- Function to update technician performance daily
CREATE OR REPLACE FUNCTION update_technician_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert daily performance record
  INSERT INTO technician_performance (
    technician_id,
    date,
    total_tickets_completed,
    average_wait_time_hours,
    total_work_hours,
    efficiency_score
  )
  SELECT 
    NEW.technician_id,
    NEW.completed_at::DATE,
    COUNT(*),
    AVG(wait_time_hours),
    SUM(wait_time_hours),
    CASE 
      WHEN AVG(wait_time_hours) <= 2 THEN 100
      WHEN AVG(wait_time_hours) <= 4 THEN 80
      WHEN AVG(wait_time_hours) <= 8 THEN 60
      ELSE 40
    END
  FROM ticket_wait_times
  WHERE technician_id = NEW.technician_id
    AND completed_at::DATE = NEW.completed_at::DATE
  ON CONFLICT (technician_id, date)
  DO UPDATE SET
    total_tickets_completed = EXCLUDED.total_tickets_completed,
    average_wait_time_hours = EXCLUDED.average_wait_time_hours,
    total_work_hours = EXCLUDED.total_work_hours,
    efficiency_score = EXCLUDED.efficiency_score,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update performance when wait time is recorded
CREATE TRIGGER trigger_update_technician_performance
  AFTER INSERT ON ticket_wait_times
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_performance();
