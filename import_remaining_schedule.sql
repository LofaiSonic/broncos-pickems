-- Import remaining 2025 NFL Schedule games (skipping already imported ones)

-- Continue Preseason Week 1 (pre2) - August 7-10, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre2', 2, 11, '2025-08-08 20:00:00', false, false), -- DET @ ATL
(2, 1, 'pre2', 3, 14, '2025-08-08 20:00:00', false, false), -- IND @ BAL
(2, 1, 'pre2', 4, 24, '2025-08-08 20:00:00', false, false), -- NYG @ BUF
(2, 1, 'pre2', 5, 8, '2025-08-08 20:00:00', false, false), -- CLE @ CAR
(2, 1, 'pre2', 6, 20, '2025-08-08 20:00:00', false, false), -- MIA @ CHI
(2, 1, 'pre2', 12, 25, '2025-08-08 20:00:00', false, false), -- NYJ @ GB
(2, 1, 'pre2', 15, 27, '2025-08-08 20:00:00', false, false), -- PIT @ JAX
(2, 1, 'pre2', 18, 23, '2025-08-09 20:00:00', false, false), -- NO @ LAC
(2, 1, 'pre2', 19, 9, '2025-08-09 20:00:00', false, false), -- DAL @ LAR
(2, 1, 'pre2', 21, 13, '2025-08-09 20:00:00', false, false), -- HOU @ MIN
(2, 1, 'pre2', 22, 32, '2025-08-09 20:00:00', false, false), -- WAS @ NE
(2, 1, 'pre2', 26, 7, '2025-08-09 20:00:00', false, false), -- CIN @ PHI
(2, 1, 'pre2', 28, 10, '2025-08-10 20:00:00', false, false), -- DEN @ SF
(2, 1, 'pre2', 29, 17, '2025-08-10 20:00:00', false, false), -- LV @ SEA
(2, 1, 'pre2', 30, 31, '2025-08-10 20:00:00', false, false); -- TEN @ TB

-- Regular Season Week 1 - September 4-8, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '1', 26, 9, '2025-09-04 20:20:00', false, false), -- DAL @ PHI (Thu 8:20p NBC)
(2, 2, '1', 18, 16, '2025-09-05 21:00:00', false, false), -- KC vs LAC (Sao Paulo, 9:00p BRT/8:00p ET YouTube)
(2, 2, '1', 2, 30, '2025-09-07 17:00:00', false, false), -- TB @ ATL (1:00p FOX)
(2, 2, '1', 8, 7, '2025-09-07 17:00:00', false, false), -- CIN @ CLE (1:00p FOX)
(2, 2, '1', 14, 20, '2025-09-07 17:00:00', false, false), -- MIA @ IND (1:00p CBS)
(2, 2, '1', 15, 5, '2025-09-07 17:00:00', false, false), -- CAR @ JAX (1:00p FOX)
(2, 2, '1', 22, 17, '2025-09-07 17:00:00', false, false), -- LV @ NE (1:00p CBS)
(2, 2, '1', 23, 1, '2025-09-07 17:00:00', false, false), -- ARI @ NO (1:00p CBS)
(2, 2, '1', 25, 27, '2025-09-07 17:00:00', false, false), -- PIT @ NYJ (1:00p CBS)
(2, 2, '1', 32, 24, '2025-09-07 17:00:00', false, false), -- NYG @ WAS (1:00p FOX)
(2, 2, '1', 10, 31, '2025-09-07 20:05:00', false, false), -- TEN @ DEN (4:05p FOX)
(2, 2, '1', 29, 28, '2025-09-07 20:05:00', false, false), -- SF @ SEA (4:05p FOX)
(2, 2, '1', 12, 11, '2025-09-07 20:25:00', false, false), -- DET @ GB (4:25p CBS)
(2, 2, '1', 19, 13, '2025-09-07 20:25:00', false, false), -- HOU @ LAR (4:25p CBS)
(2, 2, '1', 4, 3, '2025-09-07 24:20:00', false, false), -- BAL @ BUF (8:20p NBC)
(2, 2, '1', 6, 21, '2025-09-09 00:15:00', false, false); -- MIN @ CHI (Mon 8:15p ABC/ESPN)