# Vercel Deployment Guide

This guide will help you deploy the Pickleball Tournament application to Vercel.

## ⚠️ Important Note: Socket.IO Limitations

Vercel serverless functions have limitations with Socket.IO persistent connections. For production, we recommend:

**Option 1 (Recommended):** Deploy frontend to Vercel and backend to Railway/Render/Railway
**Option 2:** Deploy both to Vercel (Socket.IO may have connection issues)

## Prerequisites

1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. MongoDB Atlas account (or MongoDB database)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Options

### Option 1: Frontend on Vercel + Backend on Railway/Render (Recommended)

#### Step 1: Deploy Frontend to Vercel

1. **Install Vercel CLI** (optional, you can also use the web dashboard):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   Or use the Vercel dashboard:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Set **Root Directory** to `frontend`
   - Configure build settings (auto-detected for Vite)

4. **Set Environment Variables** in Vercel dashboard:
   - `VITE_API_URL` = Your backend API URL (e.g., `https://your-backend.railway.app/api`)

5. **Redeploy** after setting environment variables

#### Step 2: Deploy Backend to Railway/Render

**Railway:**
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add MongoDB service or use external MongoDB Atlas
4. Set environment variables (see below)
5. Deploy

**Render:**
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set root directory to `backend`
5. Build command: `npm install`
6. Start command: `npm start`
7. Set environment variables

#### Step 3: Update CORS Settings

In your backend `.env` file or environment variables:
```
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Option 2: Deploy Both to Vercel

⚠️ **Note:** Socket.IO may have connection issues with serverless functions.

1. **Deploy from root directory**:
   ```bash
   vercel
   ```

2. **Set Environment Variables** in Vercel:
   - See environment variables section below

3. **Configure Build Settings**:
   - Root Directory: `.` (root)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`

## Environment Variables

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com/api` |

### Backend (Railway/Render/Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` (auto-set on Railway/Render) |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key-here` |
| `CORS_ORIGIN` | Allowed CORS origin | `https://your-frontend.vercel.app` |
| `NODE_ENV` | Environment | `production` |

## MongoDB Setup

1. **Create MongoDB Atlas account** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a cluster** (free tier available)
3. **Create database user**
4. **Whitelist IP addresses** (add `0.0.0.0/0` for all IPs, or specific IPs)
5. **Get connection string**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```
6. **Set `MONGO_URI`** in your backend environment variables

## Post-Deployment Steps

### 1. Create Admin User

After backend is deployed, create an admin user:

**Option A: Using Railway/Render console:**
```bash
npm run create-admin
```

**Option B: SSH into server:**
```bash
node scripts/createAdmin.js admin@example.com yourpassword
```

### 2. Test Deployment

1. Visit your frontend URL
2. Test public tournament viewing
3. Login at `/admin/login`
4. Create a test tournament
5. Test real-time updates (if Socket.IO is working)

### 3. Update API URL

If backend is on a different domain, update `frontend/src/services/api.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.com/api'
```

## Custom Domain Setup

### Frontend (Vercel)

1. Go to Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Backend (Railway/Render)

1. Go to your service settings
2. Add custom domain
3. Update CORS_ORIGIN to include custom domain
4. Update frontend VITE_API_URL

## Troubleshooting

### Socket.IO Connection Issues

If Socket.IO isn't working on Vercel:
- Deploy backend to Railway/Render instead
- Or use polling transport instead of websockets

### CORS Errors

- Ensure `CORS_ORIGIN` includes your frontend URL
- Check for trailing slashes in URLs
- Verify environment variables are set correctly

### Build Failures

- Check Node.js version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs in Vercel dashboard

### Database Connection Issues

- Verify MongoDB connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Backend Logs**: Check Railway/Render logs
- **MongoDB Atlas**: Monitor database usage

## Support

For issues:
1. Check deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check MongoDB connection

