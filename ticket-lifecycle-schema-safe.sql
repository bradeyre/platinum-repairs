-- Safe version of ticket lifecycle schema that handles existing objects
-- This script can be run multiple times without errors

-- Drop existing objects if they exist (in reverse dependency order)
DROP TRIGGER IF EXISTS trigger_update_lifecycle_summary ON ticket_status_changes;
DROP TRIGGER IF EXISTS trigger_update_ticket_lifecycle ON ticket_status_changes;
DROP TRIGGER IF EXISTS trigger_update_ticket_lifecycle_comments ON ticket_comments;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS update_ticket_lifecycle_summary();
DROP FUNCTION IF EXISTS calculate_business_hours(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS is_ticket_finalized(TEXT);
DROP FUNCTION IF EXISTS get_sync_priority(TEXT, TIMESTAMP WITH TIME ZONE);

-- Drop views if they exist
DROP VIEW IF EXISTS ticket_lifecycle_summary;
DROP VIEW IF EXISTS analytics_summary;

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS sync_operations CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS ticket_status_changes CASCADE;
DROP TABLE IF EXISTS ticket_lifecycle CASCADE;

-- Create tables
CREATE TABLE ticket_lifecycle (
    id SERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    ticket_number INTEGER,
    description TEXT,
    status TEXT,
    device_info TEXT,
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_status_date TIMESTAMP WITH TIME ZONE,
    last_status_date TIMESTAMP WITH TIME ZONE,
    total_business_hours DECIMAL(10,2) DEFAULT 0,
    is_finalized BOOLEAN DEFAULT FALSE,
    sync_priority INTEGER DEFAULT 5,
    UNIQUE(ticket_id)
);

CREATE TABLE ticket_status_changes (
    id SERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by TEXT,
    business_hours_since_last DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (ticket_id) REFERENCES ticket_lifecycle(ticket_id) ON DELETE CASCADE
);

CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    comment_text TEXT,
    comment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment_author TEXT,
    comment_type TEXT DEFAULT 'general',
    FOREIGN KEY (ticket_id) REFERENCES ticket_lifecycle(ticket_id) ON DELETE CASCADE
);

CREATE TABLE sync_operations (
    id SERIAL PRIMARY KEY,
    sync_type TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    tickets_processed INTEGER DEFAULT 0,
    tickets_created INTEGER DEFAULT 0,
    tickets_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',
    error_details TEXT
);

-- Create functions
CREATE OR REPLACE FUNCTION calculate_business_hours(start_ts TIMESTAMP WITH TIME ZONE, end_ts TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_ts TIMESTAMP WITH TIME ZONE;
    total_hours DECIMAL(10,2) := 0;
    day_of_week INTEGER;
    hour_of_day INTEGER;
BEGIN
    current_ts := start_ts;

    WHILE current_ts < end_ts LOOP
        day_of_week := EXTRACT(DOW FROM current_ts);
        hour_of_day := EXTRACT(HOUR FROM current_ts);

        -- Only count business hours (8 AM - 5 PM, Monday to Friday)
        IF day_of_week >= 1 AND day_of_week <= 5 AND hour_of_day >= 8 AND hour_of_day < 17 THEN
            total_hours := total_hours + 1;
        END IF;

        current_ts := current_ts + INTERVAL '1 hour';
    END LOOP;

    RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_ticket_finalized(status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN status IN ('Completed', 'Closed', 'Cancelled', 'Repair Completed');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_sync_priority(status TEXT, created_at TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
BEGIN
    -- High priority for recent tickets
    IF created_at > NOW() - INTERVAL '1 day' THEN
        RETURN 1;
    END IF;
    
    -- Medium priority for tickets from last week
    IF created_at > NOW() - INTERVAL '7 days' THEN
        RETURN 2;
    END IF;
    
    -- Low priority for older tickets
    RETURN 3;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ticket_lifecycle_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the ticket_lifecycle record when status changes
    UPDATE ticket_lifecycle 
    SET 
        status = NEW.new_status,
        last_status_date = NEW.changed_at,
        total_business_hours = (
            SELECT COALESCE(SUM(business_hours_since_last), 0)
            FROM ticket_status_changes 
            WHERE ticket_id = NEW.ticket_id
        ),
        is_finalized = is_ticket_finalized(NEW.new_status),
        updated_at = NOW()
    WHERE ticket_id = NEW.ticket_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_ticket_lifecycle
    AFTER INSERT ON ticket_status_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_lifecycle_summary();

CREATE TRIGGER trigger_update_lifecycle_summary
    AFTER UPDATE ON ticket_status_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_lifecycle_summary();

CREATE TRIGGER trigger_update_ticket_lifecycle_comments
    AFTER INSERT ON ticket_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_lifecycle_summary();

-- Create views
CREATE VIEW ticket_lifecycle_summary AS
SELECT 
    tl.ticket_id,
    tl.ticket_number,
    tl.description,
    tl.status,
    tl.device_info,
    tl.assigned_to,
    tl.created_at,
    tl.updated_at,
    tl.first_status_date,
    tl.last_status_date,
    tl.total_business_hours,
    tl.is_finalized,
    tl.sync_priority,
    COUNT(tsc.id) as status_change_count,
    COUNT(tc.id) as comment_count
FROM ticket_lifecycle tl
LEFT JOIN ticket_status_changes tsc ON tl.ticket_id = tsc.ticket_id
LEFT JOIN ticket_comments tc ON tl.ticket_id = tc.ticket_id
GROUP BY tl.id, tl.ticket_id, tl.ticket_number, tl.description, tl.status, 
         tl.device_info, tl.assigned_to, tl.created_at, tl.updated_at,
         tl.first_status_date, tl.last_status_date, tl.total_business_hours,
         tl.is_finalized, tl.sync_priority;

CREATE VIEW analytics_summary AS
SELECT 
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE is_finalized = true) as completed_tickets,
    COUNT(*) FILTER (WHERE status = 'Awaiting Damage Report') as awaiting_damage_report,
    COUNT(*) FILTER (WHERE status = 'Awaiting Repair') as awaiting_repair,
    COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
    AVG(total_business_hours) FILTER (WHERE is_finalized = true) as avg_completion_time,
    AVG(total_business_hours) FILTER (WHERE status = 'Awaiting Damage Report') as avg_wait_time,
    COUNT(DISTINCT assigned_to) as active_technicians
FROM ticket_lifecycle;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_ticket_id ON ticket_lifecycle(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_status ON ticket_lifecycle(status);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_assigned_to ON ticket_lifecycle(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_lifecycle_created_at ON ticket_lifecycle(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_status_changes_ticket_id ON ticket_status_changes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status_changes_changed_at ON ticket_status_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_type ON sync_operations(sync_type);

-- Insert sample data (only if tables are empty)
INSERT INTO ticket_lifecycle (ticket_id, ticket_number, description, status, device_info, assigned_to, first_status_date, last_status_date, total_business_hours, is_finalized, sync_priority)
SELECT 'SAMPLE-001', 99999, 'Sample ticket for testing', 'Completed', 'iPhone 12', 'Test Tech', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 4.5, true, 3
WHERE NOT EXISTS (SELECT 1 FROM ticket_lifecycle LIMIT 1);

-- Insert sample sync operation
INSERT INTO sync_operations (sync_type, started_at, completed_at, tickets_processed, status)
SELECT 'initial_setup', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes', 0, 'completed'
WHERE NOT EXISTS (SELECT 1 FROM sync_operations LIMIT 1);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE ticket_lifecycle IS 'Main table storing ticket lifecycle information';
COMMENT ON TABLE ticket_status_changes IS 'Tracks all status changes for tickets';
COMMENT ON TABLE ticket_comments IS 'Stores ticket comments and notes';
COMMENT ON TABLE sync_operations IS 'Tracks sync operations and their status';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Ticket lifecycle schema created successfully!';
    RAISE NOTICE 'Tables created: ticket_lifecycle, ticket_status_changes, ticket_comments, sync_operations';
    RAISE NOTICE 'Views created: ticket_lifecycle_summary, analytics_summary';
    RAISE NOTICE 'Functions created: calculate_business_hours, is_ticket_finalized, get_sync_priority, update_ticket_lifecycle_summary';
    RAISE NOTICE 'Triggers created: trigger_update_ticket_lifecycle, trigger_update_lifecycle_summary, trigger_update_ticket_lifecycle_comments';
    RAISE NOTICE 'Schema is ready for use!';
END $$;
