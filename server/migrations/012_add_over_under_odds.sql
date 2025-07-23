-- Add over/under odds columns to games table for ESPN odds integration

ALTER TABLE games 
ADD COLUMN over_odds DECIMAL(6,2),
ADD COLUMN under_odds DECIMAL(6,2);

-- Add comments for documentation
COMMENT ON COLUMN games.over_odds IS 'Over betting odds (e.g. -115 for over bet)';
COMMENT ON COLUMN games.under_odds IS 'Under betting odds (e.g. -105 for under bet)';