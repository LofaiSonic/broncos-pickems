-- Enhanced injury system with detailed ESPN Core API data
-- Migration 008: Detailed Injuries

-- Drop existing injury tables to rebuild with new structure
DROP TABLE IF EXISTS team_injuries CASCADE;
DROP TABLE IF EXISTS injury_reports CASCADE;

-- Create enhanced injury table with detailed ESPN data
CREATE TABLE detailed_injuries (
    id SERIAL PRIMARY KEY,
    injury_id VARCHAR(50) UNIQUE NOT NULL,  -- ESPN injury ID
    player_id VARCHAR(50),                   -- ESPN player ID
    team_id INTEGER REFERENCES teams(id),
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10),
    status VARCHAR(50) NOT NULL,             -- Out, Questionable, Doubtful, etc.
    short_comment TEXT,                      -- Brief injury description
    long_comment TEXT,                       -- Detailed injury description
    injury_type VARCHAR(100),                -- Type of injury (e.g., "Undisclosed", "Knee")
    injury_location VARCHAR(100),            -- Body part (e.g., "Other", "Knee", "Shoulder")
    injury_detail VARCHAR(255),              -- Specific detail (e.g., "Not Specified", "ACL")
    side VARCHAR(50),                        -- Left/Right/Not Specified
    return_date DATE,                        -- Expected return date
    fantasy_status VARCHAR(50),              -- Fantasy football status (e.g., "PUP-P")
    injury_date TIMESTAMP,                   -- When injury was reported
    type_abbreviation VARCHAR(5),            -- Status abbreviation (O, Q, D, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_detailed_injuries_team ON detailed_injuries(team_id);
CREATE INDEX idx_detailed_injuries_player ON detailed_injuries(player_id);
CREATE INDEX idx_detailed_injuries_status ON detailed_injuries(status);
CREATE INDEX idx_detailed_injuries_injury_id ON detailed_injuries(injury_id);

-- Create view for active injuries (excluding old/resolved ones)
CREATE VIEW active_injuries AS 
SELECT * FROM detailed_injuries 
WHERE status IN ('Out', 'Questionable', 'Doubtful', 'Probable')
ORDER BY 
    CASE status 
        WHEN 'Out' THEN 1
        WHEN 'Doubtful' THEN 2  
        WHEN 'Questionable' THEN 3
        WHEN 'Probable' THEN 4
        ELSE 5
    END,
    injury_date DESC;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_detailed_injuries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detailed_injuries_timestamp
    BEFORE UPDATE ON detailed_injuries
    FOR EACH ROW
    EXECUTE FUNCTION update_detailed_injuries_timestamp();

-- Insert sample data for testing (optional)
-- This will be populated by the actual API calls