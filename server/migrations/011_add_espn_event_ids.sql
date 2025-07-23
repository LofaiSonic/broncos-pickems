-- Add ESPN event IDs to games table for proper odds integration
-- This will allow us to map our games to ESPN's event system

ALTER TABLE games 
ADD COLUMN espn_event_id VARCHAR(50),
ADD COLUMN espn_game_id VARCHAR(50);

-- Add index for faster lookups when fetching odds
CREATE INDEX idx_games_espn_event_id ON games(espn_event_id);
CREATE INDEX idx_games_espn_game_id ON games(espn_game_id);

-- Add comments for documentation
COMMENT ON COLUMN games.espn_event_id IS 'ESPN event ID for fetching odds and additional data';
COMMENT ON COLUMN games.espn_game_id IS 'ESPN competition/game ID for detailed game data';