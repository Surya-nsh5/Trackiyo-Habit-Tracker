# Trackiyo — Habit Tracker

A minimalist, full-stack habit tracking app built for people who want zero-friction daily routines. Track habits, manage tasks, log wellness data, and visualize your consistency over time.

---

## Features

- **Habit Grid** — visual month-by-month habit completion grid
- **Task Manager** — drag-and-drop task list with real-time sync
- **Wellness Tracker** — log mood and sleep hours daily
- **Analytics Dashboard** — consistency scores, streaks, and top charts
- **Dark / Light Mode** — system-aware theme with smooth transitions
- **PWA Support** — installable on mobile and desktop, works offline
- **Real-time Sync** — live updates via Supabase Realtime across devices
- **Auth** — email/password sign-up and login via Supabase Auth

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 8 | Build tool & dev server |
| Tailwind CSS v4 | Styling |
| Zustand | State management |
| GSAP | Animations |
| Recharts | Analytics charts |
| @dnd-kit | Drag-and-drop tasks |
| Supabase JS | Auth & database client |
| Vite PWA | Service worker & offline support |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| Supabase JS | Database & auth verification |
| Helmet + CORS | Security middleware |
| dotenv | Environment config |

### Database
- **Supabase** (PostgreSQL) — habits, tasks, wellness entries, user profiles

---

## Project Structure

```
Trackiyo-Habit-Tracker/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── store/          # Zustand state stores
│   │   ├── services/       # API + localStorage adapters
│   │   ├── lib/            # Supabase client
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Date helpers
│   ├── public/             # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   └── .env.example        # ← copy to .env and fill in values
├── backend/                # Express REST API
│   ├── config/             # Supabase client setup
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API route handlers
│   ├── server.js
│   └── .env.example        # ← copy to .env and fill in values
└── supabase/
    ├── schema.sql          # Database schema
    └── performance_indexes.sql
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/trackiyo-habit-tracker.git
cd trackiyo-habit-tracker
```

### 2. Set up the database

Run the SQL files in your Supabase SQL editor, in order:

1. `supabase/schema.sql`
2. `supabase/performance_indexes.sql`

### 3. Configure environment variables

**Frontend:**
```bash
cd frontend
cp .env.example .env
```
Fill in `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5000/api
```

**Backend:**
```bash
cd backend
cp .env.example .env
```
Fill in `backend/.env`:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> Get your keys from **Supabase Dashboard → Project Settings → API**.  
> Keep `SUPABASE_SERVICE_KEY` secret — never expose it on the client.

### 4. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 5. Run the app

Open two terminals:

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## Available Scripts

### Frontend (`/frontend`)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run oxlint |

### Backend (`/backend`)

| Script | Description |
|---|---|
| `npm run dev` | Start server with `--watch` (auto-restart) |
| `npm start` | Start server (production) |

---

## Deployment

### Frontend — Vercel

The `frontend/vercel.json` rewrites all routes to `index.html` for SPA routing. Deploy the `frontend/` folder directly:

```bash
cd frontend
vercel
```

Set the same environment variables from `.env.example` in your Vercel project settings.

### Backend — Vercel Serverless

The `backend/vercel.json` configures the Express app as a serverless function. Deploy the `backend/` folder:

```bash
cd backend
vercel
```

Set the same environment variables from `.env.example` in your Vercel project settings. Update `FRONTEND_URL` to your deployed frontend URL.

---

## Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Supabase public anon key |
| `VITE_API_URL` | frontend | Backend API base URL |
| `SUPABASE_URL` | backend | Supabase project URL |
| `SUPABASE_ANON_KEY` | backend | Supabase public anon key |
| `SUPABASE_SERVICE_KEY` | backend | Supabase service role key (**secret**) |
| `PORT` | backend | Express server port (default: 5000) |
| `NODE_ENV` | backend | `development` or `production` |
| `FRONTEND_URL` | backend | Allowed CORS origin |

---

## License

MIT
