-- Import correct 2025 NFL Schedule
-- Clear existing data first (already done)

-- Hall of Fame Game (pre1)
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre1', 11, 18, '2025-07-31 20:00:00', false, false); -- LAC @ DET

-- Preseason Week 1 (pre2) - August 7-10, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre2', 2, 16, '2025-08-07 20:00:00', false, false), -- KC @ ARI
(2, 1, 'pre2', 1, 11, '2025-08-08 20:00:00', false, false), -- DET @ ATL
(2, 1, 'pre2', 3, 15, '2025-08-08 20:00:00', false, false), -- IND @ BAL
(2, 1, 'pre2', 5, 21, '2025-08-08 20:00:00', false, false), -- NYG @ BUF
(2, 1, 'pre2', 6, 8, '2025-08-08 20:00:00', false, false), -- CLE @ CAR
(2, 1, 'pre2', 7, 20, '2025-08-08 20:00:00', false, false), -- MIA @ CHI
(2, 1, 'pre2', 12, 22, '2025-08-08 20:00:00', false, false), -- NYJ @ GB
(2, 1, 'pre2', 13, 26, '2025-08-08 20:00:00', false, false), -- PIT @ JAX
(2, 1, 'pre2', 18, 23, '2025-08-09 20:00:00', false, false), -- NO @ LAC
(2, 1, 'pre2', 17, 9, '2025-08-09 20:00:00', false, false), -- DAL @ LAR
(2, 1, 'pre2', 19, 14, '2025-08-09 20:00:00', false, false), -- HOU @ MIN
(2, 1, 'pre2', 22, 32, '2025-08-09 20:00:00', false, false), -- WAS @ NE
(2, 1, 'pre2', 25, 4, '2025-08-09 20:00:00', false, false), -- CIN @ PHI
(2, 1, 'pre2', 28, 10, '2025-08-10 20:00:00', false, false), -- DEN @ SF
(2, 1, 'pre2', 29, 16, '2025-08-10 20:00:00', false, false), -- LV @ SEA
(2, 1, 'pre2', 30, 14, '2025-08-10 20:00:00', false, false); -- TEN @ TB

-- Preseason Week 2 (pre3) - August 14-18, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre3', 1, 30, '2025-08-14 20:00:00', false, false), -- TEN @ ATL
(2, 1, 'pre3', 7, 5, '2025-08-17 20:00:00', false, false), -- BUF @ CHI (FOX 8pm)
(2, 1, 'pre3', 9, 3, '2025-08-15 20:00:00', false, false), -- BAL @ DAL
(2, 1, 'pre3', 10, 2, '2025-08-15 20:00:00', false, false), -- ARI @ DEN
(2, 1, 'pre3', 11, 20, '2025-08-15 20:00:00', false, false), -- MIA @ DET
(2, 1, 'pre3', 14, 8, '2025-08-15 20:00:00', false, false), -- CAR @ HOU
(2, 1, 'pre3', 15, 12, '2025-08-15 20:00:00', false, false), -- GB @ IND
(2, 1, 'pre3', 16, 28, '2025-08-16 20:00:00', false, false), -- SF @ LV
(2, 1, 'pre3', 17, 18, '2025-08-16 20:00:00', false, false), -- LAC @ LAR
(2, 1, 'pre3', 19, 22, '2025-08-16 20:00:00', false, false), -- NE @ MIN
(2, 1, 'pre3', 23, 13, '2025-08-16 20:00:00', false, false), -- JAX @ NO
(2, 1, 'pre3', 21, 22, '2025-08-17 20:00:00', false, false), -- NYJ @ NYG
(2, 1, 'pre3', 25, 6, '2025-08-17 20:00:00', false, false), -- CLE @ PHI
(2, 1, 'pre3', 26, 30, '2025-08-17 20:00:00', false, false), -- PIT @ TB
(2, 1, 'pre3', 29, 16, '2025-08-17 20:00:00', false, false), -- KC @ SEA
(2, 1, 'pre3', 32, 4, '2025-08-18 20:00:00', false, false); -- CIN @ WAS (ESPN 8pm)

-- Preseason Week 3 (pre4) - August 21-24, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre4', 2, 16, '2025-08-21 20:00:00', false, false), -- LV @ ARI
(2, 1, 'pre4', 8, 26, '2025-08-21 20:00:00', false, false), -- PIT @ CAR
(2, 1, 'pre4', 4, 15, '2025-08-21 20:00:00', false, false), -- IND @ CIN
(2, 1, 'pre4', 6, 17, '2025-08-21 20:00:00', false, false), -- LAR @ CLE
(2, 1, 'pre4', 9, 1, '2025-08-21 20:00:00', false, false), -- ATL @ DAL
(2, 1, 'pre4', 11, 14, '2025-08-21 20:00:00', false, false), -- HOU @ DET
(2, 1, 'pre4', 12, 29, '2025-08-21 20:00:00', false, false), -- SEA @ GB
(2, 1, 'pre4', 16, 7, '2025-08-22 20:00:00', false, false), -- CHI @ KC
(2, 1, 'pre4', 20, 13, '2025-08-22 20:00:00', false, false), -- JAX @ MIA
(2, 1, 'pre4', 23, 10, '2025-08-22 20:00:00', false, false), -- DEN @ NO
(2, 1, 'pre4', 21, 22, '2025-08-21 20:00:00', false, false), -- NE @ NYG (Prime Video 8pm)
(2, 1, 'pre4', 22, 25, '2025-08-22 20:00:00', false, false), -- PHI @ NYJ
(2, 1, 'pre4', 28, 18, '2025-08-22 20:00:00', false, false), -- LAC @ SF
(2, 1, 'pre4', 30, 5, '2025-08-23 20:00:00', false, false), -- BUF @ TB
(2, 1, 'pre4', 30, 19, '2025-08-22 20:00:00', false, false), -- MIN @ TEN (CBS 8pm)
(2, 1, 'pre4', 32, 3, '2025-08-23 20:00:00', false, false); -- BAL @ WAS

-- Regular Season Week 1 - September 4-8, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '1', 25, 9, '2025-09-04 20:20:00', false, false), -- DAL @ PHI (Thu 8:20p NBC)
(2, 2, '1', 18, 16, '2025-09-05 21:00:00', false, false), -- KC vs LAC (Sao Paulo, 8:00p ET YouTube)
(2, 2, '1', 1, 30, '2025-09-07 17:00:00', false, false), -- TB @ ATL (1:00p FOX)
(2, 2, '1', 6, 4, '2025-09-07 17:00:00', false, false), -- CIN @ CLE (1:00p FOX)
(2, 2, '1', 15, 20, '2025-09-07 17:00:00', false, false), -- MIA @ IND (1:00p CBS)
(2, 2, '1', 13, 8, '2025-09-07 17:00:00', false, false), -- CAR @ JAX (1:00p FOX)
(2, 2, '1', 22, 16, '2025-09-07 17:00:00', false, false), -- LV @ NE (1:00p CBS)
(2, 2, '1', 23, 2, '2025-09-07 17:00:00', false, false), -- ARI @ NO (1:00p CBS)
(2, 2, '1', 21, 26, '2025-09-07 17:00:00', false, false), -- PIT @ NYJ (1:00p CBS)
(2, 2, '1', 32, 21, '2025-09-07 17:00:00', false, false), -- NYG @ WAS (1:00p FOX)
(2, 2, '1', 10, 30, '2025-09-07 20:05:00', false, false), -- TEN @ DEN (4:05p FOX)
(2, 2, '1', 29, 28, '2025-09-07 20:05:00', false, false), -- SF @ SEA (4:05p FOX)
(2, 2, '1', 12, 11, '2025-09-07 20:25:00', false, false), -- DET @ GB (4:25p CBS)
(2, 2, '1', 17, 14, '2025-09-07 20:25:00', false, false), -- HOU @ LAR (4:25p CBS)
(2, 2, '1', 5, 3, '2025-09-07 24:20:00', false, false), -- BAL @ BUF (8:20p NBC)
(2, 2, '1', 7, 19, '2025-09-08 24:15:00', false, false); -- MIN @ CHI (Mon 8:15p ABC/ESPN)

-- Note: Team IDs need to be verified against your teams table
-- This is a template - you'll need to check actual team IDs in your database