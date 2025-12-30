# Pickleball Tournament Frontend

React frontend application for viewing pickleball tournaments, matches, and live scores.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates

## Brand Colors

- **Lime Green (Primary)**: `rgb(194, 255, 0)` - Main brand color
- **Forest Green (Secondary)**: `rgb(67, 160, 102)` - Secondary brand color
- **Pink (Accent)**: `rgb(255, 102, 204)` - Accent color
- **Navy Blue**: `rgb(0, 38, 77)` - Text and dark elements
- **Cream (Muted)**: `rgb(250, 245, 220)` - Subtle backgrounds

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will run on `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000/api
```

## Pages

### Home (`/`)
- Lists all public tournaments
- Shows tournament status, type, and format
- Links to individual tournament views

### Tournament View (`/tournament/:id`)
- Tournament details and information
- Quick links to matches and bracket
- Tournament rules and current round

### Match List (`/tournament/:id/matches`)
- Groups matches by status (live, upcoming, past)
- Shows match scores and participants
- Real-time score updates

### Bracket View (`/tournament/:id/bracket`)
- Visual bracket representation
- Shows tournament progression
- Highlights live and completed matches

## Features

- **No Authentication Required** - All pages are public
- **Real-time Updates** - Socket.IO integration for live scores
- **Responsive Design** - Works on mobile and desktop
- **Brand Colors** - Uses specified color palette throughout

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Layout.jsx          # Main layout with header/footer
│   ├── pages/
│   │   ├── Home.jsx            # Tournament list
│   │   ├── TournamentView.jsx # Tournament details
│   │   ├── MatchList.jsx      # Match listings
│   │   └── BracketView.jsx    # Bracket visualization
│   ├── services/
│   │   └── api.js              # API client
│   ├── App.jsx                 # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

