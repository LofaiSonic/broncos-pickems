# 🐳 Docker Setup Guide - Denver Broncos Pickems League

This guide will show you how to run the Denver Broncos Pickems League using Docker - no need to install PostgreSQL, Node.js versions, or manage dependencies manually!

## 📋 Prerequisites

**Only Docker is required:**
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)

### Install Docker Desktop

1. **Download Docker Desktop** for Windows from https://www.docker.com/products/docker-desktop/
2. **Install** and restart your computer
3. **Launch Docker Desktop** and complete the setup
4. **Verify installation:**
```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start (3 Steps!)

### Step 1: Setup Reddit OAuth

1. **Go to Reddit App Preferences:**
   - Visit: https://www.reddit.com/prefs/apps
   - Login with your Reddit account

2. **Create New Application:**
   - Click "Create App" or "Create Another App"
   - Fill out:
     - **Name:** `Broncos Pickems League`
     - **App type:** `web app`
     - **Redirect URI:** `http://localhost:5000/api/auth/reddit/callback`
   - **Save the Client ID and Client Secret**

### Step 2: Configure Environment

```bash
# Copy the Docker environment template
copy .env.docker .env

# Edit .env with your Reddit credentials
```

**Edit `.env` file - only change these two lines:**
```env
REDDIT_CLIENT_ID=your_reddit_client_id_from_step_1
REDDIT_CLIENT_SECRET=your_reddit_client_secret_from_step_1
```

### Step 3: Run Everything!

```bash
# Start all services (database, backend, frontend)
docker-compose up

# Or run in background
docker-compose up -d
```

**That's it!** 🎉

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Database:** Automatically configured

## 🛠️ Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
```

### Development Commands
```bash
# Rebuild containers after code changes
docker-compose build

# Restart a specific service
docker-compose restart backend

# Execute commands in running containers
docker-compose exec backend npm install
docker-compose exec postgres psql -U postgres -d broncos_pickems
```

## 🧪 Verify Everything Works

1. **Check all containers are running:**
```bash
docker-compose ps
```

2. **Visit the application:**
   - Go to http://localhost:3000
   - Click "Login with Reddit"
   - Complete OAuth flow
   - You should be logged in!

3. **Check database:**
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d broncos_pickems

# List tables (should see teams, users, games, etc.)
\dt

# Check teams were inserted (should show 32)
SELECT COUNT(*) FROM teams;

# Exit database
\q
```

## 🔧 Development Workflow

### Making Code Changes

**Frontend changes:**
- Edit files in `client/src/`
- React hot-reload will automatically update

**Backend changes:**
- Edit files in `server/`
- Nodemon will automatically restart the server

**Database changes:**
- Edit migration files in `database/migrations/`
- Restart with: `docker-compose restart postgres`

### Adding Dependencies

**Frontend:**
```bash
# Install new npm packages
docker-compose exec frontend npm install package-name

# Or rebuild container
docker-compose build frontend
```

**Backend:**
```bash
# Install new npm packages  
docker-compose exec backend npm install package-name

# Or rebuild container
docker-compose build backend
```

## 🗂️ Project Structure with Docker

```
broncos-pickems/
├── docker-compose.yml      # Main Docker orchestration
├── .env                    # Environment variables
├── client/
│   ├── Dockerfile         # Frontend container config
│   ├── .dockerignore      # Files to ignore
│   └── src/               # React app code
├── server/
│   ├── Dockerfile         # Backend container config
│   ├── .dockerignore      # Files to ignore
│   └── routes/            # API code
└── database/
    └── migrations/        # Auto-loaded on container start
```

## 🐛 Troubleshooting

### Common Issues

#### **"Port already in use"**
```bash
# Stop any existing containers
docker-compose down

# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill processes if needed
taskkill /PID <process_id> /F
```

#### **"Container won't start"**
```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Rebuild containers
docker-compose build --no-cache
```

#### **"Database connection error"**
```bash
# Restart database container
docker-compose restart postgres

# Check database is running
docker-compose ps

# Connect to database manually
docker-compose exec postgres psql -U postgres -d broncos_pickems
```

#### **"Reddit OAuth not working"**
- Verify `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` in `.env`
- Ensure redirect URI is exactly: `http://localhost:5000/api/auth/reddit/callback`
- Restart backend: `docker-compose restart backend`

#### **"Changes not showing"**
```bash
# For frontend (React hot reload should work)
docker-compose restart frontend

# For backend (nodemon should auto-restart)
docker-compose restart backend

# Force rebuild if needed
docker-compose build backend frontend
```

### Reset Everything
```bash
# Nuclear option - fresh start
docker-compose down -v
docker system prune -f
docker-compose up --build
```

## 🚀 Production Deployment

### Build for Production
```bash
# Create production builds
docker-compose -f docker-compose.prod.yml build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production
Create `.env.production`:
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
REDDIT_CLIENT_ID=your_production_reddit_client_id
REDDIT_CLIENT_SECRET=your_production_reddit_client_secret
REDDIT_REDIRECT_URI=https://your-domain.com/api/auth/reddit/callback
CLIENT_URL=https://your-domain.com
```

## 📊 Container Resource Usage

### Monitor Resources
```bash
# View resource usage
docker stats

# View container details
docker-compose top
```

### Optimize Performance
```bash
# Limit memory usage in docker-compose.yml
services:
  backend:
    mem_limit: 512m
  frontend:  
    mem_limit: 1g
```

## 🏈 Ready to Play!

With Docker, your Broncos Pickems League is now:
- ✅ **Easy to setup** - Just 3 steps!
- ✅ **Consistent environment** - Works the same everywhere
- ✅ **Isolated** - Won't conflict with other projects
- ✅ **Easy to reset** - Fresh start anytime
- ✅ **Production ready** - Same containers in prod

**Go Broncos!** 🧡💙

---

## 🆘 Need Help?

If you run into issues:

1. **Check logs:** `docker-compose logs`
2. **Restart services:** `docker-compose restart`
3. **Fresh start:** `docker-compose down -v && docker-compose up`
4. **Check Reddit OAuth setup** - most common issue

The Docker setup handles all the complex database and Node.js configuration automatically!