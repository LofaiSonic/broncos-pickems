# 🏈 Denver Broncos Pickems League - Project Blueprint

## 📋 Project Overview
**Full-stack NFL prediction game focused on Denver Broncos fan community**
- **Tech Stack**: Docker + React + Node.js + PostgreSQL
- **Theme**: Denver Broncos colors (#FA4616 orange, #001489 blue)
- **Purpose**: Weekly NFL game predictions with scoring and leaderboards

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER ENVIRONMENT                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Frontend      │    Backend      │       Database          │
│   (React)       │   (Node.js)     │    (PostgreSQL)         │
│   Port: 3000    │   Port: 5000    │     Port: 5432          │
│                 │                 │                         │
│ • React Router  │ • Express API   │ • Teams & Games         │
│ • Axios HTTP    │ • JWT Auth      │ • Users & Picks         │
│ • Tailwind CSS  │ • ESPN API      │ • Seasons & Scores      │
│ • Broncos Theme │ • Reddit OAuth  │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## 🌐 External APIs & Integrations

### ESPN API (No Auth Required)
**Purpose**: NFL game data, team info, injury reports
```
Base URL: http://site.api.espn.com/apis/site/v2/sports/football/nfl/
```

**Endpoints Used:**
- `scoreboard?dates=YYYYMMDD&week=X` - Game scores and schedules
- `teams/{teamId}/roster` - Player rosters and injury data
- `teams` - Team information and colors

**Where Used:**
- `server/minimal.js` - `fetchHistoricalGames()`, `fetchTeamInjuries()`
- Game data import and real-time injury fetching

### Reddit OAuth API
**Purpose**: User authentication
```
Base URL: https://www.reddit.com/api/v1/
Auth URL: https://www.reddit.com/api/v1/authorize
Token URL: https://www.reddit.com/api/v1/access_token
```

**Environment Variables Required:**
```bash
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret
JWT_SECRET=your_jwt_secret_key
```

**Where Used:**
- `server/minimal.js` - `/auth/reddit` endpoints
- `client/src/hooks/useAuth.js` - Authentication context

### The Odds API (Optional - Sample Data Used)
**Purpose**: Betting odds (currently using mock data)
```
Base URL: https://api.the-odds-api.com/v4/
```

---

## 🗄️ Database Schema

### Core Tables
```sql
seasons
├── id (Primary Key)
├── year (2024)
├── is_active (Boolean)
└── created_at

teams (32 NFL Teams Pre-populated)
├── id (Primary Key) 
├── name ("Denver Broncos")
├── abbreviation ("DEN")
├── city ("Denver")
├── primary_color ("#FA4616")
├── secondary_color ("#001489")
└── logo_url

games
├── id (Primary Key)
├── season_id (Foreign Key → seasons.id)
├── week (1-18)
├── home_team_id (Foreign Key → teams.id)
├── away_team_id (Foreign Key → teams.id)
├── game_time (DateTime)
├── home_score (Nullable)
├── away_score (Nullable)
├── is_final (Boolean)
├── picks_locked (Boolean)
├── spread (Decimal - betting line)
└── over_under (Decimal - total points)

users
├── id (Primary Key)
├── reddit_id (Unique)
├── username
├── email
├── avatar_url
├── is_active
└── created_at

picks
├── id (Primary Key)
├── user_id (Foreign Key → users.id)
├── game_id (Foreign Key → games.id) 
├── picked_team_id (Foreign Key → teams.id)
├── confidence_points (1-16 scale)
├── created_at
└── updated_at
```

### Team ID Mapping (Database → ESPN)
```javascript
const teamIdMapping = {
  1: 22,   // Arizona Cardinals
  2: 1,    // Atlanta Falcons
  3: 33,   // Baltimore Ravens
  10: 7,   // Denver Broncos
  // ... (see server/minimal.js for full mapping)
}
```

---

## 📁 File Structure & Key Components

```
├── docker-compose.yml          # Container orchestration
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.js      # Main navigation with Broncos theme
│   │   ├── pages/
│   │   │   ├── HomePage.js    # Landing page with auth
│   │   │   ├── PicksPage.js   # Main picks interface ⭐
│   │   │   ├── LeaderboardPage.js
│   │   │   └── ProfilePage.js
│   │   ├── hooks/
│   │   │   └── useAuth.js     # Authentication context
│   │   ├── styles/
│   │   │   └── index.css      # Broncos theme CSS variables
│   │   └── App.js             # Main app with routing
├── server/                     # Node.js Backend  
│   ├── minimal.js             # Main API server ⭐
│   ├── models/
│   │   └── database.js        # PostgreSQL connection
│   └── package.json
└── database/
    └── migrations/
        └── 001_create_tables.sql  # Database schema
```

---

## 🎨 Styling System

### CSS Variables (client/src/styles/index.css)
```css
:root {
  --broncos-orange: #FA4616;    /* Primary brand color */
  --broncos-blue: #001489;      /* Secondary brand color */  
  --broncos-white: #FFFFFF;
  --broncos-cream: #fdf6e3;     /* Background color */
}
```

### Key Style Classes
```css
.btn-primary     /* Orange Broncos button */
.btn-secondary   /* Blue Broncos button */
.card            /* Beveled edge game cards */
.text-primary    /* Orange text */
.text-secondary  /* Blue text */
```

### Navigation Styling Issues
**Problem**: Tailwind classes being overridden
**Solution**: Force white text with inline styles and !important
```jsx
// client/src/components/Navbar.js
style={{ color: '#FFFFFF' }}  // Override Tailwind
```

---

## 🔑 API Endpoints

### Authentication
```
POST /auth/reddit/callback    # Reddit OAuth callback
GET  /auth/me                 # Get current user info  
POST /auth/logout             # Logout user
```

### Games & Picks
```
GET  /api/games                    # All games current season
GET  /api/games/week/:week/picks   # Games + user picks for week ⭐
POST /api/picks                    # Submit/update pick
GET  /api/picks/user/:userId       # User's all picks
```

### Testing & Data
```
POST /api/import-historical-games  # Import ESPN game data
POST /test/add-sample-odds         # Add sample betting odds
```

---

## 🧩 Key Components Deep Dive

### PicksPage.js - Main Picks Interface
**Location**: `client/src/pages/PicksPage.js`

**Key Functions:**
- `fetchGamesAndPicks()` - Gets games + user picks for week
- `handlePickChange()` - Immediate pick submission  
- `getTeamInjuries()` - Real ESPN injury data
- `formatGameTime()` - Display formatting

**Layout Structure:**
```jsx
<div className="container">
  {/* Week Navigation Buttons */}
  <div className="grid grid-cols-2 gap-md">
    {/* Away Team */}
    <div>
      <button className="team-selection">
        <div>@ AWAY</div>
        <div>{team.abbreviation}</div>
        <div>(0-0)</div>
      </button>
      <div className="injury-report">🏥 INJURIES</div>
    </div>
    
    {/* Home Team - Same structure */}
  </div>
  
  {/* Betting Odds - Centered */}
  <div className="bg-blue-50">
    <div>📊 BETTING ODDS</div>
    <div>DEN -3.5 (DEN favored)</div>
    <div>Over/Under: 45.5</div>
  </div>
</div>
```

---

## 🐛 Common Issues & Solutions

### Styling Problems
| Issue | Location | Solution |
|-------|----------|----------|
| Navigation text dark gray | `Navbar.js` | Use inline `style={{ color: '#FFFFFF' }}` |
| Team boxes too small | `PicksPage.js` | Increase `p-8` and `minHeight: '160px'` |
| Tailwind overrides | Any component | Use `!important` in CSS or inline styles |

### API Issues  
| Issue | Location | Solution |
|-------|----------|----------|
| ESPN API rate limits | `server/minimal.js` | 30-minute caching in `injuryCache` |
| Reddit OAuth white page | Environment | Refresh Reddit app credentials |
| CORS errors | `server/minimal.js` | Ensure `app.use(cors())` |

### Database Issues
| Issue | Solution |
|-------|----------|
| Connection refused | Check Docker containers with `docker-compose ps` |
| Missing tables | Run migrations: `psql -f database/migrations/001_create_tables.sql` |
| Wrong database name | Use `broncos_pickems` not `broncos_db` |

---

## 🚀 Development Workflow

### Starting the Application
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs frontend
docker-compose logs backend
```

### Making Changes

**Frontend Changes:**
1. Edit files in `client/src/`
2. Restart container: `docker-compose restart frontend`
3. For major changes: `docker-compose build frontend`

**Backend Changes:**
1. Edit `server/minimal.js`
2. Restart: `docker-compose restart backend`  

**Database Changes:**
1. Update `database/migrations/001_create_tables.sql`
2. Restart: `docker-compose restart postgres`

### Testing User Flow
1. **Login**: Visit http://localhost:3000 → Login with Reddit
2. **Make Picks**: Navigate to /picks → Select teams for each game
3. **View Data**: Check browser console for API responses
4. **Database**: `docker-compose exec postgres psql -U postgres -d broncos_pickems`

---

## 📊 Data Flow Examples

### User Makes a Pick
```
1. User clicks team button (PicksPage.js)
   ↓
2. handlePickChange() calls POST /api/picks
   ↓  
3. server/minimal.js updates database
   ↓
4. Frontend updates local state immediately
   ↓
5. UI shows selected team highlighted
```

### Loading Game Data with Injuries
```
1. PicksPage loads, calls /api/games/week/1/picks
   ↓
2. Backend fetches games from database
   ↓
3. For each game, calls ESPN API for team injuries
   ↓
4. 30-minute cache prevents excessive API calls
   ↓
5. Returns combined data: games + picks + injuries
   ↓
6. Frontend displays team cards with real injury data
```

---

## 🔍 Testing & Debugging

### Key URLs
- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:5000/health  
- **API Example**: http://localhost:5000/api/games

### Browser Console Debugging
**Enable in PicksPage.js:**
- Game data: `console.log('Games data:', gamesData)`
- Injury data: `console.log('Away team injuries:', game.awayTeamInjuries)`
- API responses: `console.log('Raw API response:', response.data)`

### Database Queries
```sql
-- Check active games
SELECT g.id, g.week, ht.abbreviation as home, at.abbreviation as away 
FROM games g 
JOIN teams ht ON g.home_team_id = ht.id 
JOIN teams at ON g.away_team_id = at.id 
WHERE g.season_id = 1;

-- Check user picks  
SELECT u.username, t.abbreviation, g.week
FROM picks p
JOIN users u ON p.user_id = u.id
JOIN teams t ON p.picked_team_id = t.id  
JOIN games g ON p.game_id = g.id;
```

---

## 🎯 Feature Status

### ✅ Completed
- [x] Docker environment setup
- [x] Reddit OAuth authentication  
- [x] NFL game data from ESPN API
- [x] Real-time injury reports
- [x] Interactive picks interface
- [x] Betting odds integration
- [x] Broncos-themed responsive design
- [x] Team records and home/away indicators

### 🚧 Pending  
- [ ] Real team record data from ESPN
- [ ] Reddit integration for weekly posts
- [ ] Weather API for outdoor games  
- [ ] Scheduled jobs for data updates
- [ ] Advanced scoring algorithms

---

## 📞 Quick Reference

**Restart Everything**: `docker-compose restart`  
**View Logs**: `docker-compose logs [service]`  
**Database Access**: `docker-compose exec postgres psql -U postgres -d broncos_pickems`  
**Force Rebuild**: `docker-compose build [service]`

**Main Files to Edit:**
- **Styling**: `client/src/styles/index.css`
- **Picks Interface**: `client/src/pages/PicksPage.js`  
- **API Logic**: `server/minimal.js`
- **Navigation**: `client/src/components/Navbar.js`