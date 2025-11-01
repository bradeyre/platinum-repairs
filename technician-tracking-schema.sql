-- Technician Clock-In/Clock-Out Tracking System
-- This schema supports comprehensive technician time tracking and performance monitoring

-- Table for tracking clock-in/clock-out events
CREATE TABLE IF NOT EXISTS technician_clock_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for daily work hours summary
CREATE TABLE IF NOT EXISTS technician_work_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(technician_id, work_date)
);

-- Table for technician performance metrics
CREATE TABLE IF NOT EXISTS technician_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tickets_completed INTEGER NOT NULL DEFAULT 0,
    total_work_minutes INTEGER NOT NULL DEFAULT 0,
    average_completion_time_minutes INTEGER,
    quality_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 5.00
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(technician_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_technician_clock_ins_technician_id ON technician_clock_ins(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_clock_ins_clock_in_time ON technician_clock_ins(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_technician_clock_ins_active ON technician_clock_ins(technician_id, clock_out_time) WHERE clock_out_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_technician_work_hours_technician_id ON technician_work_hours(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_work_hours_date ON technician_work_hours(work_date);
CREATE INDEX IF NOT EXISTS idx_technician_work_hours_technician_date ON technician_work_hours(technician_id, work_date);

CREATE INDEX IF NOT EXISTS idx_technician_performance_technician_id ON technician_performance(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_performance_date ON technician_performance(date);
CREATE INDEX IF NOT EXISTS idx_technician_performance_technician_date ON technician_performance(technician_id, date);

-- Function to automatically update work hours when clocking out
CREATE OR REPLACE FUNCTION update_work_hours_on_clock_out()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if clock_out_time was just set (was NULL, now has value)
    IF OLD.clock_out_time IS NULL AND NEW.clock_out_time IS NOT NULL THEN
        -- Calculate work minutes
        DECLARE
            work_minutes INTEGER;
            work_date DATE;
        BEGIN
            work_minutes := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 60;
            work_date := DATE(NEW.clock_in_time);
            
            -- Insert or update work hours record
            INSERT INTO technician_work_hours (technician_id, work_date, total_minutes)
            VALUES (NEW.technician_id, work_date, work_minutes)
            ON CONFLICT (technician_id, work_date)
            DO UPDATE SET 
                total_minutes = technician_work_hours.total_minutes + work_minutes,
                updated_at = NOW();
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update work hours
DROP TRIGGER IF EXISTS trigger_update_work_hours ON technician_clock_ins;
CREATE TRIGGER trigger_update_work_hours
    AFTER UPDATE ON technician_clock_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_work_hours_on_clock_out();

-- Function to update performance metrics daily
CREATE OR REPLACE FUNCTION update_daily_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance metrics when a damage report is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        DECLARE
            work_date DATE;
            completion_time_minutes INTEGER;
        BEGIN
            work_date := DATE(NEW.updated_at);
            completion_time_minutes := EXTRACT(EPOCH FROM (NEW.updated_at - NEW.created_at)) / 60;
            
            -- Insert or update performance record
            INSERT INTO technician_performance (technician_id, date, tickets_completed, total_work_minutes, average_completion_time_minutes)
            VALUES (
                NEW.assigned_tech_id,
                work_date,
                1,
                0, -- Will be updated by work hours calculation
                completion_time_minutes
            )
            ON CONFLICT (technician_id, date)
            DO UPDATE SET 
                tickets_completed = technician_performance.tickets_completed + 1,
                average_completion_time_minutes = (
                    (technician_performance.average_completion_time_minutes * technician_performance.tickets_completed + completion_time_minutes) 
                    / (technician_performance.tickets_completed + 1)
                ),
                updated_at = NOW();
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update performance metrics
DROP TRIGGER IF EXISTS trigger_update_performance ON damage_reports;
CREATE TRIGGER trigger_update_performance
    AFTER UPDATE ON damage_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_performance();

-- Function to sync work hours with performance metrics
CREATE OR REPLACE FUNCTION sync_work_hours_with_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance record with work hours
    UPDATE technician_performance 
    SET 
        total_work_minutes = NEW.total_minutes,
        updated_at = NOW()
    WHERE technician_id = NEW.technician_id 
    AND date = NEW.work_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync work hours
DROP TRIGGER IF EXISTS trigger_sync_work_hours ON technician_work_hours;
CREATE TRIGGER trigger_sync_work_hours
    AFTER INSERT OR UPDATE ON technician_work_hours
    FOR EACH ROW
    EXECUTE FUNCTION sync_work_hours_with_performance();

-- Add client_name column to damage_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'damage_reports' AND column_name = 'client_name') THEN
        ALTER TABLE damage_reports ADD COLUMN client_name TEXT;
    END IF;
END $$;

-- Add ticket_number column to damage_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'damage_reports' AND column_name = 'ticket_number') THEN
        ALTER TABLE damage_reports ADD COLUMN ticket_number TEXT;
    END IF;
END $$;

-- Add quality_score column to technician_performance if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'technician_performance' AND column_name = 'quality_score') THEN
        ALTER TABLE technician_performance ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.00;
    END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE technician_clock_ins IS 'Tracks individual clock-in/clock-out events for technicians';
COMMENT ON TABLE technician_work_hours IS 'Daily summary of work hours for each technician';
COMMENT ON TABLE technician_performance IS 'Daily performance metrics including tickets completed and quality scores';

COMMENT ON COLUMN technician_clock_ins.clock_in_time IS 'When the technician clocked in';
COMMENT ON COLUMN technician_clock_ins.clock_out_time IS 'When the technician clocked out (NULL if still clocked in)';
COMMENT ON COLUMN technician_work_hours.total_minutes IS 'Total minutes worked on this date';
COMMENT ON COLUMN technician_performance.quality_score IS 'Quality score from 0.00 to 5.00 based on manager reviews';
