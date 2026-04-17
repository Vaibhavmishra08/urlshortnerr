# Deployment to Render - Step-by-Step Guide

Your project is ready for deployment! Follow these steps:

## Step 1: Create GitHub Account & Repository
**If you don't have GitHub:**
1. Go to https://github.com/signup
2. Create an account (free)
3. Verify your email

**Create a new repository:**
1. Go to https://github.com/new
2. Repository name: `urlshortner`
3. Description: "URL Shortener with authentication and backend"
4. Choose "Public" (for free deployment)
5. Click "Create repository" (don't initialize with README)

## Step 2: Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Follow them:

```powershell
# In your terminal, run these commands:

cd "c:\Users\scifi\OneDrive\Desktop\urlshortner"

# Configure git with your GitHub username and email
git config user.email "YOUR_EMAIL@example.com"
git config user.name "YOUR_NAME"

# Add origin and push
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/urlshortner.git
git push -u origin main
```

**Replace:**
- `YOUR_EMAIL@example.com` - Your GitHub email
- `YOUR_NAME` - Your GitHub name
- `YOUR_USERNAME` - Your actual GitHub username

**Example:**
```powershell
git config user.email "john@example.com"
git config user.name "John Doe"
git remote add origin https://github.com/johndoe/urlshortner.git
git push -u origin main
```

## Step 3: Deploy on Render

1. Go to https://render.com
2. Click "Sign up with GitHub" (easiest option)
3. Authorize Render to access your GitHub
4. Click "New +" button
5. Select "Web Service"
6. Select your `urlshortner` repository
7. Fill in the form:
   - **Name**: `urlshortner`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Free Plan**: Select the free plan
8. Click "Create Web Service"

**Wait 2-3 minutes...**

## Step 4: Update Your Frontend

Once deployed, Render will show your URL (like `https://urlshortner-xxxx.onrender.com`)

Update your app.js with this URL:

1. Open `app.js` 
2. Find this line (line 1):
   ```javascript
   const API_BASE_URL = 'http://localhost:3000/api';
   ```
3. Replace with your Render URL:
   ```javascript
   const API_BASE_URL = 'https://urlshortner-xxxx.onrender.com/api';
   ```

4. Save and push to GitHub:
   ```powershell
   cd "c:\Users\scifi\OneDrive\Desktop\urlshortner"
   git add app.js
   git commit -m "Update API URL for production"
   git push
   ```

Render will automatically redeploy!

## Step 5: Test Your Deployment

1. Go to your Render URL: `https://urlshortner-xxxx.onrender.com/urlshortner`
2. Register a new account
3. Shorten a URL
4. Check that data persists

## Troubleshooting

**"Connection refused":**
- Wait 5 minutes - Render is still building
- Check build logs in Render dashboard

**"Database error":**
- Data directory is created automatically
- Check Render logs for details

**"Authentication failed":**
- Make sure API_BASE_URL is correct (with https://)
- Check browser console (F12) for errors

## Environment Variables

Render uses the `.env` file automatically. Your JWT_SECRET is set there.

**For production security, update in Render dashboard:**
1. Go to your service settings
2. Environment section
3. Change JWT_SECRET to a strong random value

## Your Live URL

Once deployed:
- Frontend: `https://urlshortner-xxxx.onrender.com/urlshortner`
- API: `https://urlshortner-xxxx.onrender.com/api`

## Next Steps

- ✅ Customize domain (Render premium)
- ✅ Add email notifications
- ✅ Scale up as needed
- ✅ Add more features

**Share your deployed app with anyone at your live URL!**

---

**Need help?**
- Render support: https://render.com/docs
- GitHub help: https://docs.github.com
