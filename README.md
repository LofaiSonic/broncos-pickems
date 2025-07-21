# 🏈 Denver Broncos Pickems League

A full-stack web application for a Denver Broncos-themed NFL pickems game where fans can predict weekly game outcomes, compete on leaderboards, and engage with the community through Reddit integration.

## 🚀 Features

### Core Functionality
- **Reddit OAuth Authentication** - Secure login using Reddit credentials
- **Weekly NFL Predictions** - Pick winners for all NFL games each week
- **Real-time Scoring** - Automatic point calculation with bonus for upsets
- **Dynamic Leaderboards** - Weekly and season-long rankings
- **User Profiles** - Personal stats, pick history, and performance analytics
- **Mobile-Responsive Design** - Broncos-themed interface optimized for all devices

### Game Features
- **Smart Pick Locking** - Automatically locks picks when games start
- **Game Information** - Team matchups, betting lines, and game times
- **Upset Bonuses** - Extra points for correctly picking underdog wins
- **Weekly Navigation** - Easy switching between different NFL weeks
- **Real-time Updates** - Live score updates during games

## 🛠 Tech Stack

### Frontend
- **React 18** with Hooks and Context API
- **React Router** for navigation
- **Axios** for API communication
- **CSS3** with custom Broncos theming

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with comprehensive schema
- **Reddit OAuth** via Passport.js
- **JWT** for session management
- **ESPN API** for NFL data
- **Rate limiting** and security middleware

### Additional Integrations
- **ESPN API** - NFL schedules, scores, and team data
- **The Odds API** - Betting lines and spreads (planned)
- **OpenWeatherMap API** - Weather conditions (planned)
- **Reddit API** - Community posting automation (planned)

## 📁 Project Structure

```
broncos-pickems/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── styles/         # CSS and styling
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/             # API route handlers
│   ├── models/             # Database models
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic services
│   ├── scheduled-jobs/     # Cron jobs and automation
│   └── package.json
├── database/
│   ├── migrations/         # Database schema files
│   └── seeds/              # Initial data
├── docs/                   # Documentation
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database
- Reddit application credentials
- API keys for external services

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd broncos-pickems
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb broncos_pickems

# Run migrations
psql broncos_pickems < database/migrations/001_create_tables.sql
```

4. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

5. **Reddit App Setup**
- Go to https://www.reddit.com/prefs/apps
- Create a new "web app"
- Set redirect URI to: `http://localhost:5000/api/auth/reddit/callback`
- Add client ID and secret to `.env`

### Running the Application

1. **Start the backend server**
```bash
cd server
npm run dev  # or npm start for production
```

2. **Start the frontend development server**
```bash
cd client
npm start
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Configuration

### Required Environment Variables

```env
# Reddit OAuth
REDDIT_CLIENT_ID=your_reddit_app_client_id
REDDIT_CLIENT_SECRET=your_reddit_app_client_secret
REDDIT_REDIRECT_URI=http://localhost:5000/api/auth/reddit/callback
REDDIT_USER_AGENT=BroncosPickemsLeague/1.0

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/broncos_pickems

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
```

## 📊 Database Schema

### Core Tables
- **users** - Reddit user profiles and authentication data
- **seasons** - NFL seasons with current week tracking
- **teams** - NFL team information with logos and colors
- **games** - Individual NFL games with scores and metadata
- **picks** - User predictions linked to games and users
- **injury_reports** - Player injury status for informed picks

## 🎮 How to Play

1. **Login** - Use your Reddit account to authenticate
2. **Make Picks** - Select winners for each NFL game before they start
3. **Earn Points** - Get 1 point per correct pick, bonus for upsets
4. **Compete** - Climb weekly and season leaderboards
5. **Track Stats** - View your performance and favorite teams

## 🔒 Security Features

- Reddit OAuth 2.0 authentication
- JWT token-based sessions
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure database queries with parameterization
- CORS and security headers

## 🚀 Deployment

The application is designed for easy deployment on platforms like:
- **Heroku** - With Heroku Postgres add-on
- **Vercel** - Frontend deployment
- **Railway** - Full-stack deployment
- **DigitalOcean** - VPS deployment

### Production Checklist
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up SSL/HTTPS
- [ ] Configure domain and DNS
- [ ] Set up monitoring and logging
- [ ] Schedule automatic backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏈 Go Broncos!

Built with ❤️ for the Denver Broncos community. Orange and Blue forever! 🧡💙