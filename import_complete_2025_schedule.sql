-- Import COMPLETE 2025 NFL Schedule
-- Team ID Reference:
-- 1=ARI, 2=ATL, 3=BAL, 4=BUF, 5=CAR, 6=CHI, 7=CIN, 8=CLE, 9=DAL, 10=DEN
-- 11=DET, 12=GB, 13=HOU, 14=IND, 15=JAX, 16=KC, 17=LV, 18=LAC, 19=LAR, 20=MIA
-- 21=MIN, 22=NE, 23=NO, 24=NYG, 25=NYJ, 26=PHI, 27=PIT, 28=SF, 29=SEA, 30=TB
-- 31=TEN, 32=WAS

-- Clear existing games to avoid duplicates
DELETE FROM picks WHERE game_id IN (SELECT id FROM games WHERE season_id = 2);
DELETE FROM games WHERE season_id = 2;

-- PRESEASON GAMES
-- Hall of Fame Game (pre1) - July 31, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre1', 11, 18, '2025-07-31 20:00:00', false, false); -- LAC @ DET

-- Preseason Week 1 (pre2) - August 7-10, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre2', 1, 16, '2025-08-07 20:00:00', false, false), -- KC @ ARI
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

-- Preseason Week 2 (pre3) - August 14-18, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre3', 2, 31, '2025-08-14 20:00:00', false, false), -- TEN @ ATL
(2, 1, 'pre3', 6, 4, '2025-08-17 20:00:00', false, false), -- BUF @ CHI (FOX 8pm)
(2, 1, 'pre3', 9, 3, '2025-08-15 20:00:00', false, false), -- BAL @ DAL
(2, 1, 'pre3', 10, 1, '2025-08-15 20:00:00', false, false), -- ARI @ DEN
(2, 1, 'pre3', 11, 20, '2025-08-15 20:00:00', false, false), -- MIA @ DET
(2, 1, 'pre3', 13, 5, '2025-08-15 20:00:00', false, false), -- CAR @ HOU
(2, 1, 'pre3', 14, 12, '2025-08-15 20:00:00', false, false), -- GB @ IND
(2, 1, 'pre3', 17, 28, '2025-08-16 20:00:00', false, false), -- SF @ LV
(2, 1, 'pre3', 19, 18, '2025-08-16 20:00:00', false, false), -- LAC @ LAR
(2, 1, 'pre3', 21, 22, '2025-08-16 20:00:00', false, false), -- NE @ MIN
(2, 1, 'pre3', 23, 15, '2025-08-16 20:00:00', false, false), -- JAX @ NO
(2, 1, 'pre3', 24, 25, '2025-08-17 20:00:00', false, false), -- NYJ @ NYG
(2, 1, 'pre3', 26, 8, '2025-08-17 20:00:00', false, false), -- CLE @ PHI
(2, 1, 'pre3', 30, 27, '2025-08-17 20:00:00', false, false), -- PIT @ TB
(2, 1, 'pre3', 29, 16, '2025-08-17 20:00:00', false, false), -- KC @ SEA
(2, 1, 'pre3', 32, 7, '2025-08-18 20:00:00', false, false); -- CIN @ WAS (ESPN 8pm)

-- Preseason Week 3 (pre4) - August 21-24, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 1, 'pre4', 1, 17, '2025-08-21 20:00:00', false, false), -- LV @ ARI
(2, 1, 'pre4', 5, 27, '2025-08-21 20:00:00', false, false), -- PIT @ CAR
(2, 1, 'pre4', 7, 14, '2025-08-21 20:00:00', false, false), -- IND @ CIN
(2, 1, 'pre4', 8, 19, '2025-08-21 20:00:00', false, false), -- LAR @ CLE
(2, 1, 'pre4', 9, 2, '2025-08-21 20:00:00', false, false), -- ATL @ DAL
(2, 1, 'pre4', 11, 13, '2025-08-21 20:00:00', false, false), -- HOU @ DET
(2, 1, 'pre4', 12, 29, '2025-08-21 20:00:00', false, false), -- SEA @ GB
(2, 1, 'pre4', 16, 6, '2025-08-22 20:00:00', false, false), -- CHI @ KC
(2, 1, 'pre4', 20, 15, '2025-08-22 20:00:00', false, false), -- JAX @ MIA
(2, 1, 'pre4', 23, 10, '2025-08-22 20:00:00', false, false), -- DEN @ NO
(2, 1, 'pre4', 24, 22, '2025-08-21 20:00:00', false, false), -- NE @ NYG (Prime Video 8pm)
(2, 1, 'pre4', 25, 26, '2025-08-22 20:00:00', false, false), -- PHI @ NYJ
(2, 1, 'pre4', 28, 18, '2025-08-22 20:00:00', false, false), -- LAC @ SF
(2, 1, 'pre4', 30, 4, '2025-08-23 20:00:00', false, false), -- BUF @ TB
(2, 1, 'pre4', 31, 21, '2025-08-22 20:00:00', false, false), -- MIN @ TEN (CBS 8pm)
(2, 1, 'pre4', 32, 3, '2025-08-23 20:00:00', false, false); -- BAL @ WAS

-- REGULAR SEASON GAMES
-- Week 1 - September 4-8, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '1', 26, 9, '2025-09-04 20:20:00', false, false), -- DAL @ PHI (Thu 8:20p NBC)
(2, 2, '1', 18, 16, '2025-09-05 20:00:00', false, false), -- KC vs LAC (Sao Paulo, 8:00p ET YouTube)
(2, 2, '1', 2, 30, '2025-09-07 17:00:00', false, false), -- TB @ ATL
(2, 2, '1', 8, 7, '2025-09-07 17:00:00', false, false), -- CIN @ CLE
(2, 2, '1', 14, 20, '2025-09-07 17:00:00', false, false), -- MIA @ IND
(2, 2, '1', 15, 5, '2025-09-07 17:00:00', false, false), -- CAR @ JAX
(2, 2, '1', 22, 17, '2025-09-07 17:00:00', false, false), -- LV @ NE
(2, 2, '1', 23, 1, '2025-09-07 17:00:00', false, false), -- ARI @ NO
(2, 2, '1', 25, 27, '2025-09-07 17:00:00', false, false), -- PIT @ NYJ
(2, 2, '1', 32, 24, '2025-09-07 17:00:00', false, false), -- NYG @ WAS
(2, 2, '1', 10, 31, '2025-09-07 20:05:00', false, false), -- TEN @ DEN
(2, 2, '1', 29, 28, '2025-09-07 20:05:00', false, false), -- SF @ SEA
(2, 2, '1', 12, 11, '2025-09-07 20:25:00', false, false), -- DET @ GB
(2, 2, '1', 19, 13, '2025-09-07 20:25:00', false, false), -- HOU @ LAR
(2, 2, '1', 4, 3, '2025-09-08 00:20:00', false, false), -- BAL @ BUF (8:20p NBC)
(2, 2, '1', 6, 21, '2025-09-09 00:15:00', false, false); -- MIN @ CHI (Mon 8:15p ABC/ESPN)

-- Week 2 - September 11-15, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '2', 12, 32, '2025-09-11 20:15:00', false, false), -- WAS @ GB (Thu 8:15p Prime Video)
(2, 2, '2', 3, 8, '2025-09-14 17:00:00', false, false), -- CLE @ BAL
(2, 2, '2', 7, 15, '2025-09-14 17:00:00', false, false), -- JAX @ CIN
(2, 2, '2', 9, 24, '2025-09-14 17:00:00', false, false), -- NYG @ DAL
(2, 2, '2', 11, 6, '2025-09-14 17:00:00', false, false), -- CHI @ DET
(2, 2, '2', 20, 22, '2025-09-14 17:00:00', false, false), -- NE @ MIA
(2, 2, '2', 23, 28, '2025-09-14 17:00:00', false, false), -- SF @ NO
(2, 2, '2', 25, 4, '2025-09-14 17:00:00', false, false), -- BUF @ NYJ
(2, 2, '2', 27, 29, '2025-09-14 17:00:00', false, false), -- SEA @ PIT
(2, 2, '2', 31, 19, '2025-09-14 17:00:00', false, false), -- LAR @ TEN
(2, 2, '2', 1, 5, '2025-09-14 20:05:00', false, false), -- CAR @ ARI
(2, 2, '2', 14, 10, '2025-09-14 20:05:00', false, false), -- DEN @ IND
(2, 2, '2', 16, 26, '2025-09-14 20:25:00', false, false), -- PHI @ KC
(2, 2, '2', 21, 2, '2025-09-15 00:20:00', false, false), -- ATL @ MIN (8:20p NBC)
(2, 2, '2', 13, 30, '2025-09-15 23:00:00', false, false), -- TB @ HOU (Mon 7:00p ABC)
(2, 2, '2', 17, 18, '2025-09-16 02:00:00', false, false); -- LAC @ LV (Mon 10:00p ESPN)

-- Week 3 - September 18-22, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '3', 4, 20, '2025-09-18 20:15:00', false, false), -- MIA @ BUF (Thu 8:15p Prime Video)
(2, 2, '3', 5, 2, '2025-09-21 17:00:00', false, false), -- ATL @ CAR
(2, 2, '3', 8, 12, '2025-09-21 17:00:00', false, false), -- GB @ CLE
(2, 2, '3', 15, 13, '2025-09-21 17:00:00', false, false), -- HOU @ JAX
(2, 2, '3', 21, 7, '2025-09-21 17:00:00', false, false), -- CIN @ MIN
(2, 2, '3', 22, 27, '2025-09-21 17:00:00', false, false), -- PIT @ NE
(2, 2, '3', 26, 19, '2025-09-21 17:00:00', false, false), -- LAR @ PHI
(2, 2, '3', 30, 25, '2025-09-21 17:00:00', false, false), -- NYJ @ TB
(2, 2, '3', 31, 14, '2025-09-21 17:00:00', false, false), -- IND @ TEN
(2, 2, '3', 32, 17, '2025-09-21 17:00:00', false, false), -- LV @ WAS
(2, 2, '3', 18, 10, '2025-09-21 20:05:00', false, false), -- DEN @ LAC
(2, 2, '3', 29, 23, '2025-09-21 20:05:00', false, false), -- NO @ SEA
(2, 2, '3', 6, 9, '2025-09-21 20:25:00', false, false), -- DAL @ CHI
(2, 2, '3', 28, 1, '2025-09-21 20:25:00', false, false), -- ARI @ SF
(2, 2, '3', 24, 16, '2025-09-22 00:20:00', false, false), -- KC @ NYG (8:20p NBC)
(2, 2, '3', 3, 11, '2025-09-23 00:15:00', false, false); -- DET @ BAL (Mon 8:15p ESPN/ABC)

-- Week 4 - September 25-29, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '4', 1, 29, '2025-09-25 20:15:00', false, false), -- SEA @ ARI (Thu 8:15p Prime Video)
(2, 2, '4', 27, 21, '2025-09-28 13:30:00', false, false), -- MIN vs PIT (Dublin, 9:30a NFLN)
(2, 2, '4', 2, 32, '2025-09-28 17:00:00', false, false), -- WAS @ ATL
(2, 2, '4', 4, 23, '2025-09-28 17:00:00', false, false), -- NO @ BUF
(2, 2, '4', 11, 8, '2025-09-28 17:00:00', false, false), -- CLE @ DET
(2, 2, '4', 13, 31, '2025-09-28 17:00:00', false, false), -- TEN @ HOU
(2, 2, '4', 22, 5, '2025-09-28 17:00:00', false, false), -- CAR @ NE
(2, 2, '4', 24, 18, '2025-09-28 17:00:00', false, false), -- LAC @ NYG
(2, 2, '4', 30, 26, '2025-09-28 17:00:00', false, false), -- PHI @ TB
(2, 2, '4', 19, 14, '2025-09-28 20:05:00', false, false), -- IND @ LAR
(2, 2, '4', 28, 15, '2025-09-28 20:05:00', false, false), -- JAX @ SF
(2, 2, '4', 16, 3, '2025-09-28 20:25:00', false, false), -- BAL @ KC
(2, 2, '4', 17, 6, '2025-09-28 20:25:00', false, false), -- CHI @ LV
(2, 2, '4', 9, 12, '2025-09-29 00:20:00', false, false), -- GB @ DAL (8:20p NBC)
(2, 2, '4', 20, 25, '2025-09-29 23:15:00', false, false), -- NYJ @ MIA (Mon 7:15p ESPN)
(2, 2, '4', 10, 7, '2025-09-30 00:15:00', false, false); -- CIN @ DEN (Mon 8:15p ABC)

-- Week 5 - October 2-6, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '5', 19, 28, '2025-10-02 20:15:00', false, false), -- SF @ LAR (Thu 8:15p Prime Video)
(2, 2, '5', 8, 21, '2025-10-05 13:30:00', false, false), -- MIN vs CLE (Tottenham, 9:30a NFLN)
(2, 2, '5', 3, 13, '2025-10-05 17:00:00', false, false), -- HOU @ BAL
(2, 2, '5', 5, 20, '2025-10-05 17:00:00', false, false), -- MIA @ CAR
(2, 2, '5', 14, 17, '2025-10-05 17:00:00', false, false), -- LV @ IND
(2, 2, '5', 23, 24, '2025-10-05 17:00:00', false, false), -- NYG @ NO
(2, 2, '5', 25, 9, '2025-10-05 17:00:00', false, false), -- DAL @ NYJ
(2, 2, '5', 26, 10, '2025-10-05 17:00:00', false, false), -- DEN @ PHI
(2, 2, '5', 1, 31, '2025-10-05 20:05:00', false, false), -- TEN @ ARI
(2, 2, '5', 29, 30, '2025-10-05 20:05:00', false, false), -- TB @ SEA
(2, 2, '5', 7, 11, '2025-10-05 20:25:00', false, false), -- DET @ CIN
(2, 2, '5', 18, 32, '2025-10-05 20:25:00', false, false), -- WAS @ LAC
(2, 2, '5', 4, 22, '2025-10-06 00:20:00', false, false), -- NE @ BUF (8:20p NBC)
(2, 2, '5', 15, 16, '2025-10-07 00:15:00', false, false); -- KC @ JAX (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - ATL, CHI, GB, PIT

-- Week 6 - October 9-13, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '6', 24, 26, '2025-10-09 20:15:00', false, false), -- PHI @ NYG (Thu 8:15p Prime Video)
(2, 2, '6', 25, 10, '2025-10-12 13:30:00', false, false), -- DEN vs NYJ (Tottenham, 9:30a NFLN)
(2, 2, '6', 3, 19, '2025-10-12 17:00:00', false, false), -- LAR @ BAL
(2, 2, '6', 5, 9, '2025-10-12 17:00:00', false, false), -- DAL @ CAR
(2, 2, '6', 14, 1, '2025-10-12 17:00:00', false, false), -- ARI @ IND
(2, 2, '6', 15, 29, '2025-10-12 17:00:00', false, false), -- SEA @ JAX
(2, 2, '6', 20, 18, '2025-10-12 17:00:00', false, false), -- LAC @ MIA
(2, 2, '6', 27, 8, '2025-10-12 17:00:00', false, false), -- CLE @ PIT
(2, 2, '6', 30, 28, '2025-10-12 17:00:00', false, false), -- SF @ TB
(2, 2, '6', 17, 31, '2025-10-12 20:05:00', false, false), -- TEN @ LV
(2, 2, '6', 12, 7, '2025-10-12 20:25:00', false, false), -- CIN @ GB
(2, 2, '6', 23, 22, '2025-10-12 20:25:00', false, false), -- NE @ NO
(2, 2, '6', 16, 11, '2025-10-13 00:20:00', false, false), -- DET @ KC (8:20p NBC)
(2, 2, '6', 2, 4, '2025-10-13 23:15:00', false, false), -- BUF @ ATL (Mon 7:15p ESPN)
(2, 2, '6', 32, 6, '2025-10-14 00:15:00', false, false); -- CHI @ WAS (Mon 8:15p ABC)
-- Note: BYE weeks - HOU, MIN

-- Week 7 - October 16-20, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '7', 7, 27, '2025-10-16 20:15:00', false, false), -- PIT @ CIN (Thu 8:15p Prime Video)
(2, 2, '7', 15, 19, '2025-10-19 13:30:00', false, false), -- LAR @ JAX (Wembley, 9:30a NFLN)
(2, 2, '7', 6, 23, '2025-10-19 17:00:00', false, false), -- NO @ CHI
(2, 2, '7', 8, 20, '2025-10-19 17:00:00', false, false), -- MIA @ CLE
(2, 2, '7', 16, 17, '2025-10-19 17:00:00', false, false), -- LV @ KC
(2, 2, '7', 21, 26, '2025-10-19 17:00:00', false, false), -- PHI @ MIN
(2, 2, '7', 25, 5, '2025-10-19 17:00:00', false, false), -- CAR @ NYJ
(2, 2, '7', 31, 22, '2025-10-19 17:00:00', false, false), -- NE @ TEN
(2, 2, '7', 10, 24, '2025-10-19 20:05:00', false, false), -- NYG @ DEN
(2, 2, '7', 18, 14, '2025-10-19 20:05:00', false, false), -- IND @ LAC
(2, 2, '7', 1, 12, '2025-10-19 20:25:00', false, false), -- GB @ ARI
(2, 2, '7', 9, 32, '2025-10-19 20:25:00', false, false), -- WAS @ DAL
(2, 2, '7', 28, 2, '2025-10-20 00:20:00', false, false), -- ATL @ SF (8:20p NBC)
(2, 2, '7', 11, 30, '2025-10-20 23:00:00', false, false), -- TB @ DET (Mon 7:00p ESPN/ABC)
(2, 2, '7', 29, 13, '2025-10-21 02:00:00', false, false); -- HOU @ SEA (Mon 10:00p ESPN+)
-- Note: BYE weeks - BAL, BUF

-- Week 8 - October 23-27, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '8', 18, 21, '2025-10-23 20:15:00', false, false), -- MIN @ LAC (Thu 8:15p Prime Video)
(2, 2, '8', 2, 20, '2025-10-26 17:00:00', false, false), -- MIA @ ATL
(2, 2, '8', 3, 6, '2025-10-26 17:00:00', false, false), -- CHI @ BAL
(2, 2, '8', 5, 4, '2025-10-26 17:00:00', false, false), -- BUF @ CAR
(2, 2, '8', 7, 25, '2025-10-26 17:00:00', false, false), -- NYJ @ CIN
(2, 2, '8', 13, 28, '2025-10-26 17:00:00', false, false), -- SF @ HOU
(2, 2, '8', 22, 8, '2025-10-26 17:00:00', false, false), -- CLE @ NE
(2, 2, '8', 26, 24, '2025-10-26 17:00:00', false, false), -- NYG @ PHI
(2, 2, '8', 23, 30, '2025-10-26 20:05:00', false, false), -- TB @ NO
(2, 2, '8', 10, 9, '2025-10-26 20:25:00', false, false), -- DAL @ DEN
(2, 2, '8', 14, 31, '2025-10-26 20:25:00', false, false), -- TEN @ IND
(2, 2, '8', 27, 12, '2025-10-27 00:20:00', false, false), -- GB @ PIT (8:20p NBC)
(2, 2, '8', 16, 32, '2025-10-28 00:15:00', false, false); -- WAS @ KC (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - ARI, DET, JAX, LAR, LV, SEA

-- Week 9 - October 30 - November 3, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '9', 20, 3, '2025-10-30 20:15:00', false, false), -- BAL @ MIA (Thu 8:15p Prime Video)
(2, 2, '9', 7, 6, '2025-11-02 17:00:00', false, false), -- CHI @ CIN
(2, 2, '9', 11, 21, '2025-11-02 17:00:00', false, false), -- MIN @ DET
(2, 2, '9', 12, 5, '2025-11-02 17:00:00', false, false), -- CAR @ GB
(2, 2, '9', 13, 10, '2025-11-02 17:00:00', false, false), -- DEN @ HOU
(2, 2, '9', 22, 2, '2025-11-02 17:00:00', false, false), -- ATL @ NE
(2, 2, '9', 24, 28, '2025-11-02 17:00:00', false, false), -- SF @ NYG
(2, 2, '9', 27, 14, '2025-11-02 17:00:00', false, false), -- IND @ PIT
(2, 2, '9', 31, 18, '2025-11-02 17:00:00', false, false), -- LAC @ TEN
(2, 2, '9', 19, 23, '2025-11-02 20:05:00', false, false), -- NO @ LAR
(2, 2, '9', 17, 15, '2025-11-02 20:05:00', false, false), -- JAX @ LV
(2, 2, '9', 4, 16, '2025-11-02 20:25:00', false, false), -- KC @ BUF
(2, 2, '9', 32, 29, '2025-11-03 01:20:00', false, false), -- SEA @ WAS (8:20p NBC)
(2, 2, '9', 9, 1, '2025-11-04 01:15:00', false, false); -- ARI @ DAL (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - CLE, NYJ, PHI, TB

-- Week 10 - November 6-10, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '10', 10, 17, '2025-11-06 20:15:00', false, false), -- LV @ DEN (Thu 8:15p Prime Video)
(2, 2, '10', 14, 2, '2025-11-09 13:30:00', false, false), -- ATL vs IND (Berlin, 9:30a NFLN)
(2, 2, '10', 5, 23, '2025-11-09 17:00:00', false, false), -- NO @ CAR
(2, 2, '10', 6, 24, '2025-11-09 17:00:00', false, false), -- NYG @ CHI
(2, 2, '10', 13, 15, '2025-11-09 17:00:00', false, false), -- JAX @ HOU
(2, 2, '10', 20, 4, '2025-11-09 17:00:00', false, false), -- BUF @ MIA
(2, 2, '10', 21, 3, '2025-11-09 17:00:00', false, false), -- BAL @ MIN
(2, 2, '10', 25, 8, '2025-11-09 17:00:00', false, false), -- CLE @ NYJ
(2, 2, '10', 30, 22, '2025-11-09 17:00:00', false, false), -- NE @ TB
(2, 2, '10', 29, 1, '2025-11-09 20:05:00', false, false), -- ARI @ SEA
(2, 2, '10', 28, 19, '2025-11-09 20:25:00', false, false), -- LAR @ SF
(2, 2, '10', 32, 11, '2025-11-09 20:25:00', false, false), -- DET @ WAS
(2, 2, '10', 18, 27, '2025-11-10 01:20:00', false, false), -- PIT @ LAC (8:20p NBC)
(2, 2, '10', 12, 26, '2025-11-11 01:15:00', false, false); -- PHI @ GB (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - CIN, DAL, KC, TEN

-- Week 11 - November 13-17, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '11', 22, 25, '2025-11-13 20:15:00', false, false), -- NYJ @ NE (Thu 8:15p Prime Video)
(2, 2, '11', 20, 32, '2025-11-16 13:30:00', false, false), -- WAS vs MIA (Madrid, 9:30a NFLN)
(2, 2, '11', 2, 5, '2025-11-16 17:00:00', false, false), -- CAR @ ATL
(2, 2, '11', 4, 30, '2025-11-16 17:00:00', false, false), -- TB @ BUF
(2, 2, '11', 15, 18, '2025-11-16 17:00:00', false, false), -- LAC @ JAX
(2, 2, '11', 21, 6, '2025-11-16 17:00:00', false, false), -- CHI @ MIN
(2, 2, '11', 24, 12, '2025-11-16 17:00:00', false, false), -- GB @ NYG
(2, 2, '11', 27, 7, '2025-11-16 17:00:00', false, false), -- CIN @ PIT
(2, 2, '11', 31, 13, '2025-11-16 17:00:00', false, false), -- HOU @ TEN
(2, 2, '11', 1, 28, '2025-11-16 20:05:00', false, false), -- SF @ ARI
(2, 2, '11', 19, 29, '2025-11-16 20:05:00', false, false), -- SEA @ LAR
(2, 2, '11', 8, 3, '2025-11-16 20:25:00', false, false), -- BAL @ CLE
(2, 2, '11', 10, 16, '2025-11-16 20:25:00', false, false), -- KC @ DEN
(2, 2, '11', 26, 11, '2025-11-17 01:20:00', false, false), -- DET @ PHI (8:20p NBC)
(2, 2, '11', 17, 9, '2025-11-18 01:15:00', false, false); -- DAL @ LV (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - IND, NO

-- Week 12 - November 20-24, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '12', 13, 4, '2025-11-20 20:15:00', false, false), -- BUF @ HOU (Thu 8:15p Prime Video)
(2, 2, '12', 3, 25, '2025-11-23 17:00:00', false, false), -- NYJ @ BAL
(2, 2, '12', 6, 27, '2025-11-23 17:00:00', false, false), -- PIT @ CHI
(2, 2, '12', 7, 22, '2025-11-23 17:00:00', false, false), -- NE @ CIN
(2, 2, '12', 11, 24, '2025-11-23 17:00:00', false, false), -- NYG @ DET
(2, 2, '12', 12, 21, '2025-11-23 17:00:00', false, false), -- MIN @ GB
(2, 2, '12', 16, 14, '2025-11-23 17:00:00', false, false), -- IND @ KC
(2, 2, '12', 31, 29, '2025-11-23 17:00:00', false, false), -- SEA @ TEN
(2, 2, '12', 1, 15, '2025-11-23 20:05:00', false, false), -- JAX @ ARI
(2, 2, '12', 17, 8, '2025-11-23 20:05:00', false, false), -- CLE @ LV
(2, 2, '12', 9, 26, '2025-11-23 20:25:00', false, false), -- PHI @ DAL
(2, 2, '12', 23, 2, '2025-11-23 20:25:00', false, false), -- ATL @ NO
(2, 2, '12', 19, 30, '2025-11-24 01:20:00', false, false), -- TB @ LAR (8:20p NBC)
(2, 2, '12', 28, 5, '2025-11-25 01:15:00', false, false); -- CAR @ SF (Mon 8:15p ESPN)
-- Note: BYE weeks - DEN, LAC, MIA, WAS

-- Week 13 - November 27 - December 1, 2025 (Thanksgiving Week)
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '13', 11, 12, '2025-11-27 18:00:00', false, false), -- GB @ DET (Thanksgiving 1:00p FOX)
(2, 2, '13', 9, 16, '2025-11-27 21:30:00', false, false), -- KC @ DAL (Thanksgiving 4:30p CBS)
(2, 2, '13', 3, 7, '2025-11-28 01:20:00', false, false), -- CIN @ BAL (Thanksgiving 8:20p NBC)
(2, 2, '13', 26, 6, '2025-11-28 20:00:00', false, false), -- CHI @ PHI (Fri 3:00p Prime Video)
(2, 2, '13', 5, 19, '2025-11-30 17:00:00', false, false), -- LAR @ CAR
(2, 2, '13', 8, 28, '2025-11-30 17:00:00', false, false), -- SF @ CLE
(2, 2, '13', 14, 13, '2025-11-30 17:00:00', false, false), -- HOU @ IND
(2, 2, '13', 20, 23, '2025-11-30 17:00:00', false, false), -- NO @ MIA
(2, 2, '13', 25, 2, '2025-11-30 17:00:00', false, false), -- ATL @ NYJ
(2, 2, '13', 30, 1, '2025-11-30 17:00:00', false, false), -- ARI @ TB
(2, 2, '13', 31, 15, '2025-11-30 17:00:00', false, false), -- JAX @ TEN
(2, 2, '13', 29, 21, '2025-11-30 20:05:00', false, false), -- MIN @ SEA
(2, 2, '13', 18, 17, '2025-11-30 20:25:00', false, false), -- LV @ LAC
(2, 2, '13', 27, 4, '2025-11-30 20:25:00', false, false), -- BUF @ PIT
(2, 2, '13', 32, 10, '2025-12-01 01:20:00', false, false), -- DEN @ WAS (8:20p NBC)
(2, 2, '13', 22, 24, '2025-12-02 01:15:00', false, false); -- NYG @ NE (Mon 8:15p ESPN)

-- Week 14 - December 4-8, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '14', 11, 9, '2025-12-04 20:15:00', false, false), -- DAL @ DET (Thu 8:15p Prime Video)
(2, 2, '14', 2, 29, '2025-12-07 17:00:00', false, false), -- SEA @ ATL
(2, 2, '14', 3, 27, '2025-12-07 17:00:00', false, false), -- PIT @ BAL
(2, 2, '14', 8, 31, '2025-12-07 17:00:00', false, false), -- TEN @ CLE
(2, 2, '14', 12, 6, '2025-12-07 17:00:00', false, false), -- CHI @ GB
(2, 2, '14', 15, 14, '2025-12-07 17:00:00', false, false), -- IND @ JAX
(2, 2, '14', 21, 32, '2025-12-07 17:00:00', false, false), -- WAS @ MIN
(2, 2, '14', 25, 20, '2025-12-07 17:00:00', false, false), -- MIA @ NYJ
(2, 2, '14', 30, 23, '2025-12-07 17:00:00', false, false), -- NO @ TB
(2, 2, '14', 17, 10, '2025-12-07 20:05:00', false, false), -- DEN @ LV
(2, 2, '14', 1, 19, '2025-12-07 20:25:00', false, false), -- LAR @ ARI
(2, 2, '14', 4, 7, '2025-12-07 20:25:00', false, false), -- CIN @ BUF
(2, 2, '14', 16, 13, '2025-12-08 00:20:00', false, false), -- HOU @ KC (8:20p NBC)
(2, 2, '14', 18, 26, '2025-12-09 01:15:00', false, false); -- PHI @ LAC (Mon 8:15p ESPN/ABC)
-- Note: BYE weeks - CAR, NE, NYG, SF

-- Week 15 - December 11-15, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '15', 30, 2, '2025-12-11 20:15:00', false, false), -- ATL @ TB (Thu 8:15p Prime Video)
(2, 2, '15', 3, 22, '2025-12-14 17:00:00', false, false), -- NE @ BAL
(2, 2, '15', 5, 30, '2025-12-14 17:00:00', false, false), -- TB @ CAR
(2, 2, '15', 8, 4, '2025-12-14 17:00:00', false, false), -- BUF @ CLE
(2, 2, '15', 9, 18, '2025-12-14 17:00:00', false, false), -- LAC @ DAL
(2, 2, '15', 23, 25, '2025-12-14 17:00:00', false, false), -- NYJ @ NO
(2, 2, '15', 24, 21, '2025-12-14 17:00:00', false, false), -- MIN @ NYG
(2, 2, '15', 31, 16, '2025-12-14 17:00:00', false, false), -- KC @ TEN
(2, 2, '15', 1, 2, '2025-12-14 20:05:00', false, false), -- ATL @ ARI
(2, 2, '15', 10, 15, '2025-12-14 20:05:00', false, false), -- JAX @ DEN
(2, 2, '15', 11, 27, '2025-12-14 20:25:00', false, false), -- PIT @ DET
(2, 2, '15', 13, 17, '2025-12-14 20:25:00', false, false), -- LV @ HOU
(2, 2, '15', 20, 7, '2025-12-15 01:20:00', false, false), -- CIN @ MIA (8:20p NBC)
(2, 2, '15', 14, 28, '2025-12-16 01:15:00', false, false); -- SF @ IND (Mon 8:15p ESPN)
-- Note: Week 15 also includes Saturday games (TBD times):
-- GB @ CHI (Sat FOX), PHI @ WAS (Sat FOX)

-- Week 16 - December 18-22, 2025
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '16', 32, 9, '2025-12-18 17:00:00', false, false), -- DAL @ WAS (Thu 1:00p NETFLIX)
(2, 2, '16', 21, 11, '2025-12-18 20:30:00', false, false), -- DET @ MIN (Thu 4:30p NETFLIX)
(2, 2, '16', 16, 10, '2025-12-19 00:15:00', false, false), -- DEN @ KC (Thu 8:15p Prime Video)
-- Saturday games TBD
(2, 2, '16', 8, 27, '2025-12-21 17:00:00', false, false), -- PIT @ CLE
(2, 2, '16', 14, 15, '2025-12-21 17:00:00', false, false), -- JAX @ IND
(2, 2, '16', 20, 30, '2025-12-21 17:00:00', false, false), -- TB @ MIA
(2, 2, '16', 25, 22, '2025-12-21 17:00:00', false, false), -- NE @ NYJ
(2, 2, '16', 31, 23, '2025-12-21 17:00:00', false, false), -- NO @ TEN
(2, 2, '16', 4, 26, '2025-12-21 20:25:00', false, false), -- PHI @ BUF
(2, 2, '16', 28, 6, '2025-12-22 01:20:00', false, false), -- CHI @ SF (8:20p NBC)
(2, 2, '16', 2, 19, '2025-12-23 01:15:00', false, false); -- LAR @ ATL (Mon 8:15p ESPN)
-- Note: Additional Saturday games - SEA @ CAR, ARI @ CIN, BAL @ GB, HOU @ LAC, NYG @ LV (TBD times)

-- Week 17 - December 25-29, 2025
-- All Week 17 games have TBD times, so using placeholder times
INSERT INTO games (season_id, season_type, week, home_team_id, away_team_id, game_time, picks_locked, is_final) VALUES
(2, 2, '17', 2, 23, '2025-12-28 17:00:00', false, false), -- NO @ ATL
(2, 2, '17', 4, 25, '2025-12-28 17:00:00', false, false), -- NYJ @ BUF
(2, 2, '17', 6, 11, '2025-12-28 17:00:00', false, false), -- DET @ CHI
(2, 2, '17', 7, 8, '2025-12-28 17:00:00', false, false), -- CLE @ CIN
(2, 2, '17', 10, 18, '2025-12-28 17:00:00', false, false), -- LAC @ DEN
(2, 2, '17', 13, 14, '2025-12-28 17:00:00', false, false), -- IND @ HOU
(2, 2, '17', 15, 31, '2025-12-28 17:00:00', false, false), -- TEN @ JAX
(2, 2, '17', 19, 1, '2025-12-28 17:00:00', false, false), -- ARI @ LAR
(2, 2, '17', 17, 16, '2025-12-28 17:00:00', false, false), -- KC @ LV
(2, 2, '17', 21, 12, '2025-12-28 17:00:00', false, false), -- GB @ MIN
(2, 2, '17', 22, 20, '2025-12-28 17:00:00', false, false), -- MIA @ NE
(2, 2, '17', 24, 9, '2025-12-28 17:00:00', false, false), -- DAL @ NYG
(2, 2, '17', 26, 32, '2025-12-28 17:00:00', false, false), -- WAS @ PHI
(2, 2, '17', 27, 3, '2025-12-28 17:00:00', false, false), -- BAL @ PIT
(2, 2, '17', 28, 29, '2025-12-28 17:00:00', false, false), -- SEA @ SF
(2, 2, '17', 30, 5, '2025-12-28 17:00:00', false, false); -- CAR @ TB

-- Week 18 - January 3-4, 2026
-- All Week 18 games TBD - will be scheduled based on playoff implications