# Pickleball Tournament Application

A web application for managing and viewing pickleball tournaments, matches, scores, fixtures, and point tables.

## Project Purpose

This application allows players and tournament organizers to:
- View all live tournaments
- Track matches and their scores
- View tournament fixtures
- Check point tables and standings
- Monitor tournament progress in real-time

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: (To be determined - PostgreSQL/MongoDB)
- **Language**: JavaScript/TypeScript

### Frontend
- **Framework**: React
- **Language**: JavaScript/TypeScript
- **Build Tool**: Vite (or Create React App)
- **Styling**: (To be determined - CSS Modules/Tailwind CSS)

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn package manager

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The backend server will typically run on `http://localhost:3000` (or as configured)

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend application will typically run on `http://localhost:5173` (Vite) or `http://localhost:3000` (CRA)

## Project Structure

```
.
├── backend/          # Backend API server
├── frontend/         # Frontend React application
└── README.md         # This file
```

## Admin Setup

To create an admin user for the first time:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Make sure MongoDB is running and `.env` file is configured

3. Create admin user:
   ```bash
   npm run create-admin
   ```

   This creates an admin with:
   - Email: `admin@gmail.com`
   - Password: `123456`

4. For custom credentials:
   ```bash
   node scripts/createAdmin.js your-email@example.com your-password
   ```

5. Login at `/admin/login` in the frontend

## Development Notes

- Backend and frontend can be run independently
- Ensure both servers are running for full application functionality
- API endpoints and frontend routes will be documented as development progresses
- Admin accounts must be created manually using the script (no registration endpoint)

## Deployment

### Vercel Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

**Quick Start:**
1. Deploy frontend to Vercel (recommended)
2. Deploy backend to Railway/Render (for Socket.IO support)
3. Set environment variables
4. Create admin user

**Note:** Socket.IO has limitations with Vercel serverless functions. For production, deploy the backend to a platform that supports persistent connections (Railway, Render, etc.).

