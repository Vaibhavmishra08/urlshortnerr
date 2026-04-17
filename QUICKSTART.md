# Quick Start Guide

## 1. Install Dependencies
```bash
cd urlshortner
npm install
```

This will install:
- `express` - Web server framework
- `sqlite3` - Database
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

## 2. Start the Server
```bash
npm start
```

You should see:
```
Server running on http://localhost:3000
Frontend: http://localhost:3000/urlshortner
```

## 3. Open in Browser
Navigate to: `http://localhost:3000/urlshortner`

## 4. Try It Out

### Create an Account
1. Click "Login" button (top right)
2. Click "Register" link
3. Enter email and password (min 6 characters)
4. Click "Register"

### Shorten a URL
1. Paste a long URL in the input field
2. Click "Shorten URL"
3. Copy the shortened link

### Manage Your URLs
- View all your shortened URLs in the history section
- Click 📋 to copy a shortened URL
- Click 🔗 to test the URL
- Search your URLs by entering text in the search box
- See total URLs created and clicks

## Database
The database is automatically created in `data/database.db` on first run.

## Stopping the Server
Press `Ctrl+C` in the terminal

## Issues?
- Make sure Node.js is installed: `node --version`
- Check that port 3000 is available
- Look at console errors for details
- Try deleting `data/` folder and restarting if you have database issues

Enjoy your URL shortener!
