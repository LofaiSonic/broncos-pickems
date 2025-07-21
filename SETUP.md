# 🏈 Denver Broncos Pickems League - Setup Guide

This guide will walk you through setting up and running the Denver Broncos Pickems League application on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/downloads)
- A **Reddit account** for OAuth setup

### Check Your Installations
```bash
node --version    # Should show v16.0.0 or higher
npm --version     # Should show 8.0.0 or higher
psql --version    # Should show PostgreSQL version
git --version     # Should show Git version
```

## 🚀 Step 1: Clone and Setup Project

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd NFLwithClaude

# Or if you already have the files, navigate to the project directory
cd path/to/your/project
```

## 🗄️ Step 2: Database Setup

### Install PostgreSQL (if not installed)

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember your postgres user password!

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database
```bash
# Connect to PostgreSQL (enter password when prompted)
psql -U postgres

# Create the database
CREATE DATABASE broncos_pickems;

# Exit PostgreSQL
\q

# Run the migration to create tables
psql -U postgres -d broncos_pickems -f database/migrations/001_create_tables.sql
```

### Verify Database Setup
```bash
# Connect to your new database
psql -U postgres -d broncos_pickems

# List tables (should see users, teams, games, etc.)
\dt

# Check teams were inserted (should see 32 NFL teams)
SELECT COUNT(*) FROM teams;

# Exit
\q
```

## 🔐 Step 3: Reddit OAuth Setup

1. **Go to Reddit App Preferences:**
   - Visit: https://www.reddit.com/prefs/apps
   - Login with your Reddit account

2. **Create New Application:**
   - Click "Create App" or "Create Another App"
   - Fill out the form:
     - **Name:** `Broncos Pickems League`
     - **App type:** `web app`
     - **Description:** `NFL pickems game for Broncos fans`
     - **About URL:** `http://localhost:3000` (optional)
     - **Redirect URI:** `http://localhost:5000/api/auth/reddit/callback`

3. **Save Your Credentials:**
   - **Client ID:** Found under your app name (random string)
   - **Client Secret:** The "secret" field (longer random string)

## ⚙️ Step 4: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
```

**Edit `.env` file with your actual values:**
```env
# Reddit OAuth (replace with your values)
REDDIT_CLIENT_ID=your_reddit_client_id_from_step_3
REDDIT_CLIENT_SECRET=your_reddit_client_secret_from_step_3
REDDIT_REDIRECT_URI=http://localhost:5000/api/auth/reddit/callback
REDDIT_USER_AGENT=BroncosPickemsLeague/1.0

# Database (replace 'your_password' with your postgres password)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/broncos_pickems

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Application settings
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Optional API keys (leave empty for now)
NFL_API_KEY=
ODDS_API_KEY=
WEATHER_API_KEY=
```

### Generate JWT Secret
```bash
# Use Node.js to generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📦 Step 5: Install Dependencies

### Install Backend Dependencies
```bash
cd server
npm install

# Install nodemon globally for development
npm install -g nodemon
```

### Install Frontend Dependencies  
```bash
cd ../client
npm install
```

### Verify Installations
```bash
# Check server dependencies
cd ../server
npm list --depth=0

# Check client dependencies
cd ../client  
npm list --depth=0
```

## 🏃‍♂️ Step 6: Run the Application

You'll need **two terminal windows** open:

### Terminal 1: Start Backend Server
```bash
cd server
npm run dev

# You should see:
# "Server running on port 5000"
```

### Terminal 2: Start Frontend Development Server
```bash
cd client
npm start

# You should see:
# "webpack compiled successfully"
# Browser should automatically open to http://localhost:3000
```

## 🧪 Step 7: Test the Application

### Basic Functionality Test
1. **Visit** http://localhost:3000
2. **Verify** you see the Broncos-themed homepage
3. **Click** "Login with Reddit"
4. **Authorize** the application on Reddit
5. **Confirm** you're redirected back and logged in
6. **Navigate** to "Make Picks" to see the picks interface
7. **Check** "Leaderboard" page loads correctly

### API Endpoints Test
```bash
# Test API directly (in a third terminal)
curl http://localhost:5000/
# Should return: {"message":"Broncos Pickems API Server"}

# Test games endpoint
curl http://localhost:5000/api/games/week/1
# Should return JSON array of games
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### **"Database connection error"**
```bash
# Check if PostgreSQL is running
# Windows: Check Services panel
# macOS: brew services list | grep postgresql  
# Linux: sudo systemctl status postgresql

# Verify DATABASE_URL in .env matches your setup
# Common issue: wrong password or database name
```

#### **"Reddit OAuth callback error"**
- Verify redirect URI exactly matches: `http://localhost:5000/api/auth/reddit/callback`
- Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env
- Ensure no extra spaces or quotes in .env values

#### **"Port already in use"**
```bash
# Find what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Kill the process (macOS/Linux)
kill -9 <process_id>
```

#### **"Module not found" errors**
```bash
# Clear npm cache and reinstall
cd server
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

cd ../client
rm -rf node_modules package-lock.json  
npm cache clean --force
npm install
```

#### **React app won't start**
```bash
# Make sure you're in the client directory
cd client
npm start

# If port 3000 is busy, React will ask to use a different port
# Type 'y' to accept
```

### Database Issues

#### **Reset Database**
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS broncos_pickems;"
psql -U postgres -c "CREATE DATABASE broncos_pickems;"
psql -U postgres -d broncos_pickems -f database/migrations/001_create_tables.sql
```

#### **Check Database Connection**
```bash
# Test connection
psql -U postgres -d broncos_pickems -c "SELECT COUNT(*) FROM teams;"
# Should return: 32
```

## 🎯 Expected Results

When everything is working correctly:

### Frontend (http://localhost:3000)
- ✅ Broncos-themed homepage loads
- ✅ Navigation menu works  
- ✅ Reddit login redirects properly
- ✅ Picks page shows game interface
- ✅ Leaderboard displays correctly
- ✅ Profile page shows user stats

### Backend (http://localhost:5000)
- ✅ API responses return JSON
- ✅ Database queries execute successfully
- ✅ Reddit OAuth flow completes
- ✅ JWT tokens generated properly

## 📚 Next Steps

Once everything is running:

1. **Make Test Picks** - Select winners for games
2. **Check Leaderboard** - Verify scoring system works
3. **Explore Profile** - Review user statistics
4. **Test Mobile View** - Resize browser window
5. **Sync NFL Data** - Use the sync endpoint to get real games

## 🏈 Ready to Play!

Your Denver Broncos Pickems League is now ready! Invite fellow Broncos fans to join and start competing in your weekly NFL predictions game.

**Go Broncos!** 🧡💙

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Look at terminal output for server errors  
3. Verify all environment variables are set correctly
4. Ensure database connection is working
5. Confirm Reddit OAuth app settings match exactly

The application includes comprehensive error handling and logging to help diagnose any issues.