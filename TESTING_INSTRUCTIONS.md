# 🧪 Testing the Automatic Updates System

## How to Access the AdminPanel

1. **Open the Application**: Go to http://localhost:3000
2. **Login**: Use Reddit OAuth to login (you need to be logged in as username 'bryansimon')
3. **Navigate to Profile**: Click on your profile or go directly to the Profile page
4. **Find AdminPanel**: Scroll to the bottom - the AdminPanel will appear only for admin users
5. **Click Auto Updates Tab**: The AdminPanel has 3 tabs - click on "🤖 Auto Updates"

## Testing Each Update Type

### 1. Injury Reports Test
- Click "Update Injury Reports" button
- **Expected Response**: Should show success with records updated count
- **What it does**: Fetches injury data from ESPN API for all NFL teams
- **Response time**: Usually 5-15 seconds depending on team count

### 2. Betting Odds Test
- Click "Update Betting Odds" button  
- **Expected Response**: May show 0 records updated (needs ODDS_API_KEY)
- **What it does**: Fetches spreads and over/under from The Odds API
- **Note**: Requires API key in environment variables

### 3. Team Records Test
- Click "Update Team Records" button
- **Expected Response**: Should show records updated for teams
- **What it does**: Fetches current standings from ESPN API
- **Response time**: Usually 2-5 seconds

### 4. Weather Data Test
- Click "Update Weather Data" button
- **Expected Response**: May show 0 records (needs OPENWEATHER_API_KEY)
- **What it does**: Fetches weather for upcoming outdoor games
- **Note**: Only updates games for outdoor stadiums

### 5. Game Status Test
- Click "Update Game Status" button
- **Expected Response**: Updates any live or recent games
- **What it does**: Checks ESPN scoreboard for live scores
- **Response time**: Usually 3-8 seconds

## What to Look For in Test Results

### ✅ Success Response Format:
```
🎯 [UPDATE_TYPE] UPDATE COMPLETED!

✅ Status: Success
📊 Records Updated: [number]
⏱️ Duration: [time]ms  
💬 Message: [success message]
```

### ❌ Error Response Format:
```
❌ [UPDATE_TYPE] UPDATE FAILED!

🚨 Error: [error description]
📱 Status Code: [HTTP code]
🔍 Details: [additional error info]
```

## Test Results Section

After running any test, you'll see a new "🧪 Manual Test Results" section that shows:
- **Visual Status**: Green for success, red for error
- **Detailed Metrics**: Records updated, duration, error codes
- **Full API Response**: Expandable section with complete API data
- **Real-time Updates**: Each test adds to the results list

## Console Logs

Open browser dev tools (F12) and check the Console tab for detailed logs:
- Request/response data
- API call timing
- Error details
- Backend processing logs

## Backend Logs

To see server-side processing:
```bash
docker logs broncos-pickems-backend --tail 50 -f
```

This will show real-time server logs including:
- API endpoint calls
- ESPN/external API requests
- Database operations
- Error handling

## Service Status Monitoring

The AdminPanel also shows:
- **Service Running**: ✅ if automatic updates are active
- **Active Jobs**: Count of scheduled cron jobs (should be 5)
- **Recent Success/Errors**: Quick overview of job health
- **Recent Activity**: Last 20 automated update runs

## Troubleshooting

### Common Issues:
1. **"No admin panel visible"**: Make sure you're logged in as 'bryansimon'
2. **"Updates failing"**: Check if external API keys are configured
3. **"Long response times"**: ESPN API can be slow, especially for injury reports
4. **"0 records updated"**: Normal for weather/odds without API keys

### Expected Behavior:
- **Injury updates**: Should work without API keys (uses ESPN public API)
- **Team records**: Should work without API keys (uses ESPN public API)  
- **Game status**: Should work without API keys (uses ESPN public API)
- **Weather**: Requires OPENWEATHER_API_KEY to return data
- **Betting odds**: Requires ODDS_API_KEY to return data