-- Migration 009: Update Week Numbering System
-- Change from negative numbers to pre1,pre2,pre3,pre4 for preseason

-- Step 1: Add a temporary column for the new week format
ALTER TABLE games ADD COLUMN week_new VARCHAR(10);

-- Step 2: Update the new column with the new week numbering
UPDATE games SET week_new = 
  CASE 
    WHEN week = -4 THEN 'pre1'
    WHEN week = -3 THEN 'pre2' 
    WHEN week = -2 THEN 'pre3'
    WHEN week = -1 THEN 'pre4'
    ELSE week::text
  END;

-- Step 3: Drop the old index
DROP INDEX IF EXISTS idx_games_season_week;

-- Step 4: Drop the old week column and rename the new one
ALTER TABLE games DROP COLUMN week;
ALTER TABLE games RENAME COLUMN week_new TO week;

-- Step 5: Add NOT NULL constraint
ALTER TABLE games ALTER COLUMN week SET NOT NULL;

-- Step 6: Recreate the index with the new column type
CREATE INDEX idx_games_season_week ON games(season_id, week);

-- Step 7: Update any other tables that might reference week numbers
-- (Check if picks table or other tables have week references)

-- Verify the update
SELECT 'After update:' as status, week, COUNT(*) as games 
FROM games 
GROUP BY week 
ORDER BY 
  CASE 
    WHEN week LIKE 'pre%' THEN SUBSTRING(week FROM 4)::int
    ELSE week::int + 100
  END;