-- Create database tables for Broncos Pickems League

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    reddit_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seasons table
CREATE TABLE seasons (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL UNIQUE,
    current_week INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    logo_url TEXT,
    city VARCHAR(255),
    conference VARCHAR(10),
    division VARCHAR(20),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7)
);

-- Games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id),
    week INTEGER NOT NULL,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    game_time TIMESTAMP NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    is_final BOOLEAN DEFAULT FALSE,
    spread DECIMAL(3,1),
    over_under DECIMAL(4,1),
    weather_conditions TEXT,
    espn_game_id VARCHAR(255),
    picks_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Picks table
CREATE TABLE picks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    game_id INTEGER REFERENCES games(id),
    picked_team_id INTEGER REFERENCES teams(id),
    confidence_points INTEGER DEFAULT 1,
    points_earned INTEGER DEFAULT 0,
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

-- Injury reports table
CREATE TABLE injury_reports (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    team_id INTEGER REFERENCES teams(id),
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(10),
    injury_status VARCHAR(20), -- 'out', 'questionable', 'probable', 'doubtful'
    injury_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_games_season_week ON games(season_id, week);
CREATE INDEX idx_games_time ON games(game_time);
CREATE INDEX idx_picks_user_game ON picks(user_id, game_id);
CREATE INDEX idx_picks_game ON picks(game_id);
CREATE INDEX idx_users_reddit_id ON users(reddit_id);
CREATE INDEX idx_injury_reports_game ON injury_reports(game_id);

-- Insert current season
INSERT INTO seasons (year, current_week, is_active) VALUES (2024, 1, TRUE);

-- Insert NFL teams
INSERT INTO teams (name, abbreviation, city, conference, division, primary_color, secondary_color) VALUES
('Arizona Cardinals', 'ARI', 'Arizona', 'NFC', 'West', '#97233F', '#000000'),
('Atlanta Falcons', 'ATL', 'Atlanta', 'NFC', 'South', '#A71930', '#000000'),
('Baltimore Ravens', 'BAL', 'Baltimore', 'AFC', 'North', '#241773', '#9E7C0C'),
('Buffalo Bills', 'BUF', 'Buffalo', 'AFC', 'East', '#00338D', '#C60C30'),
('Carolina Panthers', 'CAR', 'Carolina', 'NFC', 'South', '#0085CA', '#101820'),
('Chicago Bears', 'CHI', 'Chicago', 'NFC', 'North', '#C83803', '#0B162A'),
('Cincinnati Bengals', 'CIN', 'Cincinnati', 'AFC', 'North', '#FB4F14', '#000000'),
('Cleveland Browns', 'CLE', 'Cleveland', 'AFC', 'North', '#311D00', '#FF3C00'),
('Dallas Cowboys', 'DAL', 'Dallas', 'NFC', 'East', '#003594', '#869397'),
('Denver Broncos', 'DEN', 'Denver', 'AFC', 'West', '#FB4F14', '#002244'),
('Detroit Lions', 'DET', 'Detroit', 'NFC', 'North', '#0076B6', '#B0B7BC'),
('Green Bay Packers', 'GB', 'Green Bay', 'NFC', 'North', '#203731', '#FFB612'),
('Houston Texans', 'HOU', 'Houston', 'AFC', 'South', '#03202F', '#A71930'),
('Indianapolis Colts', 'IND', 'Indianapolis', 'AFC', 'South', '#002C5F', '#A2AAAD'),
('Jacksonville Jaguars', 'JAX', 'Jacksonville', 'AFC', 'South', '#006778', '#9F792C'),
('Kansas City Chiefs', 'KC', 'Kansas City', 'AFC', 'West', '#E31837', '#FFB81C'),
('Las Vegas Raiders', 'LV', 'Las Vegas', 'AFC', 'West', '#000000', '#A5ACAF'),
('Los Angeles Chargers', 'LAC', 'Los Angeles', 'AFC', 'West', '#0080C6', '#FFC20E'),
('Los Angeles Rams', 'LAR', 'Los Angeles', 'NFC', 'West', '#003594', '#FFA300'),
('Miami Dolphins', 'MIA', 'Miami', 'AFC', 'East', '#008E97', '#FC4C02'),
('Minnesota Vikings', 'MIN', 'Minnesota', 'NFC', 'North', '#4F2683', '#FFC62F'),
('New England Patriots', 'NE', 'New England', 'AFC', 'East', '#002244', '#C60C30'),
('New Orleans Saints', 'NO', 'New Orleans', 'NFC', 'South', '#D3BC8D', '#101820'),
('New York Giants', 'NYG', 'New York', 'NFC', 'East', '#0B2265', '#A71930'),
('New York Jets', 'NYJ', 'New York', 'AFC', 'East', '#125740', '#000000'),
('Philadelphia Eagles', 'PHI', 'Philadelphia', 'NFC', 'East', '#004C54', '#A5ACAF'),
('Pittsburgh Steelers', 'PIT', 'Pittsburgh', 'AFC', 'North', '#FFB612', '#101820'),
('San Francisco 49ers', 'SF', 'San Francisco', 'NFC', 'West', '#AA0000', '#B3995D'),
('Seattle Seahawks', 'SEA', 'Seattle', 'NFC', 'West', '#002244', '#69BE28'),
('Tampa Bay Buccaneers', 'TB', 'Tampa Bay', 'NFC', 'South', '#D50A0A', '#FF7900'),
('Tennessee Titans', 'TEN', 'Tennessee', 'AFC', 'South', '#0C2340', '#4B92DB'),
('Washington Commanders', 'WAS', 'Washington', 'NFC', 'East', '#5A1414', '#FFB612');