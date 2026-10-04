# Trackiyo

Trackiyo is a modern, full-stack habit tracking and personal productivity platform designed for zero-friction daily routines. It blends daily habit building, prioritized task management, wellness tracking, deep work focus timers, social accountability challenges, and an intelligent context-aware AI Coach powered by Google Gemini.

---

## Features

### 📅 Habit Tracking & Streaks
- **Interactive Habit Grid**: Month-by-month consistency tracker with daily check-ins.
- **Resilient Streak Engine**: Calculates current streaks, longest streaks, total completions, and automated grace days so an accidental missed day doesn't wipe out progress.
- **Habit Stacking**: Group complementary habits together to build consistent daily routines.
- **Templates Library**: Pre-built habit templates for morning routines, fitness, productivity, and mindfulness.

### 📝 Task Management
- **Smart Prioritization**: Categorize tasks by priority (`High`, `Medium`, `Low`) and categories with estimated durations.
- **Subtasks & Recurrence**: Break tasks down into checklist subtasks and schedule repeating tasks.
- **Quick Capture**: Capture fleeting thoughts and action items instantly with natural language date parsing.

### 🧘 Wellness & Journaling
- **Daily Check-ins**: Log mood, sleep hours, water intake, and energy levels.
- **Daily Reflections Journal**: Structured prompts for daily gratitude, wins, and reflections.

### ⏱️ Focus Sessions & Deep Work
- **Pomodoro & Focus Timer**: Integrated timers with ambient focus presets.
- **Deep Work Mode**: Fullscreen, distraction-free work environment with distraction logging.

### 🤖 Intelligent AI Coach
- **Context-Aware Coaching**: Analyzes actual user habits, completion rates, pending tasks, recent focus time, and wellness metrics.
- **Personalized Recommendations**: Generates tailored daily schedules, burnout risk assessments, and targeted motivational nudges.
- **Persona Modes**: Adaptable coach personas (Encouraging, Direct/Disciplined, Analytical).
- **Graceful Fallbacks**: When an external AI key is absent or offline, intelligent rule-based heuristic engines provide instant offline coaching.

### 📊 Analytics & Insights
- **GitHub-Style Contribution Heatmap**: Visual overview of yearly productivity volume.
- **Consistency Charts & Trends**: Completion rates, category distribution, and streak analytics via Recharts.
- **Shareable Achievement Cards**: Export and share clean graphical achievement cards natively or via image download.

### 🏆 Gamification & Social Accountability
- **XP & Leveling**: Earn experience points for completing habits, clearing tasks, and logging focus hours.
- **Achievements Engine**: Dynamic milestone badges and rewards.
- **Friends & Shared Challenges**: Connect with friends, create collaborative habit challenges, and track live leaderboard rankings.

### 🎨 Themes & Mobile Experience
- **Dynamic Theming**: Multi-theme system with tailored light and dark palettes.
- **Responsive Across Screens**: Optimized for mobile, tablet, laptop, and ultra-wide desktop displays.
- **Android Ready**: Native Android shell powered by Capacitor with system bar integration and update checking.

---

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Bundler & Tooling**: Vite 8, Rolldown / esbuild
- **Styling**: Tailwind CSS v4, custom CSS token system
- **State Management**: Zustand
- **Animations**: GSAP & `@gsap/react`
- **Charts & Visualizations**: Recharts
- **Icons & Assets**: `react-icons`, `emoji-picker-react`
- **Mobile Container**: Capacitor Android (`@capacitor/core`, `@capacitor/android`)
- **PWA**: `vite-plugin-pwa`, `workbox-window`
- **Linter**: Oxlint

### Backend
- **Runtime**: Node.js (v18+)
- **Server Framework**: Express 5
- **Security & Utilities**: Helmet, CORS origin validation, Morgan logging, Compression, Cookie-parser, Express-validator
- **Test Runner**: Node.js built-in test runner (`node --test`)

### Database & Authentication
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Auth**: Supabase Auth (JWT verification & session management)
- **Realtime**: Supabase Realtime WebSocket subscriptions

### AI Engine
- **Model**: Google Gemini 2.5 Flash / 1.5 Flash via REST API
- **Fallback Engine**: Deterministic heuristic rules engine for offline/unconfigured environments

---

## Project Structure

```text
Trackiyo-Habit-Tracker/
├── backend/                        # Node.js + Express REST API
│   ├── config/                     # Supabase client & in-memory caching
│   ├── middleware/                 # Supabase JWT auth & daily-lock anti-cheat
│   ├── routes/                     # Domain API handlers (habits, tasks, ai, focus, etc.)
│   ├── test/                       # Node.js backend test suite
│   ├── .env.example                # Backend environment template
│   ├── package.json
│   └── server.js                   # Express application entrypoint
├── frontend/                       # React 19 + TypeScript SPA
│   ├── android/                    # Capacitor Android native shell project
│   ├── public/                     # Static assets, PWA manifest, favicons
│   ├── src/
│   │   ├── api/                    # API client methods (captures, etc.)
│   │   ├── components/             # Domain-organized UI components
│   │   │   ├── auth/               # Login, register, auth modals
│   │   │   ├── common/             # Dropdowns, date pickers, command palettes
│   │   │   ├── dashboard/          # Today view, overview stats, week strips
│   │   │   ├── focus/              # Focus timers, deep work mode
│   │   │   ├── habits/             # Habit grids, detail modals, stack manager
│   │   │   ├── insights/           # Analytics, contribution heatmap, charts
│   │   │   ├── landing/            # Landing page & download banner
│   │   │   ├── layout/             # Responsive shell, navigation, logo
│   │   │   ├── settings/           # Profile settings, achievements, sound toggles
│   │   │   ├── shared/             # AI assistant drawer, daily planner, share cards
│   │   │   ├── social/             # Friends list, shared challenges, leaderboards
│   │   │   ├── tasks/              # Task lists, task modals, subtasks
│   │   │   └── wellness/           # Mood, sleep, water tracking
│   │   ├── ds/                     # Custom design system tokens & provider
│   │   ├── hooks/                  # Custom React hooks (useToday, etc.)
│   │   ├── lib/                    # Supabase client initialization
│   │   ├── services/               # Axios API client & localStorage adapters
│   │   ├── store/                  # Zustand state stores
│   │   ├── theme/                  # Theme registry & color palettes
│   │   ├── types/                  # TypeScript interfaces and schemas
│   │   ├── utils/                  # Date helpers, error normalization, card generator
│   │   ├── App.tsx                 # Root application routing & lazy views
│   │   ├── index.css               # Core styling & design system imports
│   │   └── main.tsx                # React DOM mount point
│   ├── .env.example                # Frontend environment template
│   ├── package.json
│   └── vite.config.ts              # Vite configuration & PWA setup
├── supabase/                       # PostgreSQL migrations & database schemas
│   ├── schema.sql                  # Core database tables & RLS policies
│   ├── performance_indexes.sql     # Database indexing for high performance
│   └── ...                         # Feature schemas (friends, challenges, streaks)
├── .env.example                    # Unified root environment template
├── .gitignore                      # Git ignore rules for node, builds, android, logs
└── README.md                       # Project documentation
```

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com) project (free tier works)
- (Optional) [Google AI Studio API Key](https://aistudio.google.com/apikey) for live Gemini AI responses

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/trackiyo-habit-tracker.git
cd Trackiyo-Habit-Tracker
```

### 2. Configure Database
In your Supabase Dashboard SQL Editor, run the schema files in order:
1. `supabase/schema.sql`
2. `supabase/performance_indexes.sql`
3. Any additional modular schemas from `supabase/` (e.g., `schema_friends_challenges.sql`, `schema_streaks_sharing.sql`)

### 3. Configure Environment Variables

Copy the example environment files:
```bash
# In the backend directory
cp backend/.env.example backend/.env

# In the frontend directory
cp frontend/.env.example frontend/.env
```

Fill in your actual credentials:

#### `backend/.env`
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-optional-gemini-key
```

#### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Development

Start both backend and frontend development servers:

```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend Client (runs on http://localhost:5173)
cd frontend
npm run dev
```

---

## Build & Testing

### Frontend Production Build
```bash
cd frontend
npm run build
```
This runs TypeScript checking (`tsc -b`) and bundles production assets via Vite with PWA service worker generation into `frontend/dist`.

### Frontend Linting
```bash
cd frontend
npm run lint
```
Runs high-speed linting using `oxlint`.

### Backend Automated Test Suite
```bash
cd backend
npm test
```
Executes the native test suite verifying:
- Daily-lock anti-cheat middleware
- Consecutive streak calculation and grace day logic
- Route precedence and security policies
- API server health endpoints

---

## API Architecture

The Express backend exposes RESTful endpoints under `/api/*`:

| Route Group | Description |
|---|---|
| `/api/auth` | User authentication, registration, session checks, password reset |
| `/api/habits` | Habit CRUD operations, daily check-in logs, month grids |
| `/api/tasks` | Task management, subtasks, priority recalculations |
| `/api/wellness` | Daily mood, sleep, water, and wellness entries |
| `/api/focus` | Focus sessions, Pomodoro logs, daily stats |
| `/api/analytics` | Consistency scores, monthly completion summaries |
| `/api/ai` | Gemini AI Coach chat, smart daily schedule planner, burnout analysis |
| `/api/gamification` | User levels, XP tracking, achievement unlock checks |
| `/api/streaks` | Consecutive streaks, grace days, milestone computation |
| `/api/captures` | Quick capture notes, natural language conversion to tasks |
| `/api/time-blocks` | Interactive time block planning |
| `/api/habit-stacks` | Habit stacking routine sequences |
| `/api/distractions` | Deep work distraction logs and focus metrics |
| `/api/friends` | Friend requests, social connections, activity feeds |
| `/api/challenges` | Group habit challenges, participant leaderboards, check-ins |
| `/api/share` | Public achievement links, customizable share cards |
| `/api/health` | Server health check probe |

---

## AI Coach

The Trackiyo AI Coach is an integrated personal accountability assistant built directly into the app:

- **Data-Driven Context**: Unlike generic AI chatbots, the Trackiyo Coach synthesizes your live Trackiyo records:
  - Active and overdue tasks
  - Habit completion percentages and broken streaks
  - Recent focus session durations
  - Wellness trends (sleep hours, mood ratings)
- **Actionable Outputs**: The AI generates concrete action steps, schedules time blocks, and flags burnout risks when tasks exceed available energy.
- **Offline / Zero-Config Resilience**: If `GEMINI_API_KEY` is not set or network errors occur, Trackiyo automatically switches to a deterministic heuristic engine that analyzes your actual metrics and outputs helpful guidance without breaking.

---

## Windows Desktop App (PWA)

Trackiyo offers a native-grade desktop experience on Windows using Progressive Web App (PWA) capabilities with zero installation overhead:

### Key Features on Windows
- **Standalone Window Experience**: Runs in its own distraction-free window without browser tabs, navigation bars, or URL clutter.
- **Windows Taskbar & Start Menu Integration**: Can be pinned to the Windows Taskbar and searched directly from the Windows Start Menu.
- **Windows Jump Lists**: Right-clicking the Trackiyo icon on the Windows taskbar provides quick shortcuts to:
  - **Today Overview** (`/?tab=today`)
  - **Focus Session / Pomodoro** (`/?tab=focus`)
  - **Habits Tracker** (`/?tab=habits`)
  - **AI Coach** (`/?tab=coach`)
- **Offline Capable & Instant Launch**: The Service Worker caches the complete application shell, fonts, and assets for immediate offline loading.
- **Automatic Background Updates**: Updates automatically alongside the production web deployment without needing manual `.exe` or `.msi` patch installers.

### Installing on Windows
1. Open Trackiyo (`https://trackiyo.vercel.app` or `http://localhost:5173`) in **Microsoft Edge** or **Google Chrome**.
2. Click the **Install Trackiyo** icon (`⊕`) in the right side of the browser address bar (or navigate to **Settings** → **Desktop & Mobile Apps** and click **Install for Windows**).
3. Click **Install**. Windows will pin Trackiyo to your Start Menu and Taskbar.

---

## Capacitor Android

Trackiyo uses a **remote-URL architecture** for its Android application, transforming the native APK into a high-performance shell that loads the live production web app (`https://trackiyo.vercel.app`).

### Web-Layer Updates (No APK Reinstall Needed)
Any changes to the web application go live instantly across both desktop browsers and installed Android apps:
- UI designs, styling, themes, and CSS changes
- React components, pages, navigation, and routes
- Task and habit management logic
- AI Coach improvements and prompts
- Backend API integrations

### Changes That Require a New Native Build (APK / AAB)
Only low-level Android native modifications require rebuilding the APK:
- New Capacitor plugins or SDK updates
- Android permissions (`AndroidManifest.xml`)
- Native splash screen or app icon vector drawables
- `capacitor.config.ts` configuration changes

### Development & Android Build Commands
```bash
# Sync web build and assets to Android project
cd frontend
npm run build
npx cap sync android

# Build debug APK with Android SDK
cd android
./gradlew assembleDebug

# Build release signed APK
./gradlew assembleRelease
```

### Production Caching Strategy
To ensure instantaneous updates without displaying stale cached bundles:
1. **Entry Point (`/index.html` & `/version.json`)**: Served with `Cache-Control: public, max-age=0, must-revalidate, no-cache`. WebViews and browsers always validate the latest application entry point.
2. **Static Bundles (`/assets/*`)**: All JavaScript and CSS chunks are hashed by Vite and cached with `max-age=31536000, immutable`.
3. **Automatic Web Version Detector**: The application checks `/version.json` on app startup, background resume, and periodic intervals. When a new deployment is detected, a non-intrusive banner safely updates the application without interrupting forms or active typing.

---

## Authentication & Security

### Secure Persistent Login ("Remember Me")
Trackiyo provides seamless persistent login across app restarts and device reboots without ever compromising user credentials:

- **Zero Raw Password Storage**: Passwords are never saved in LocalStorage, IndexedDB, SQLite, Capacitor Preferences, plain files, or logs. Passwords exist in memory only during the active login request and are immediately cleared.
- **Hardware-Backed Android Keystore**: On Android, authentication tokens are stored in hardware-encrypted native storage via `@aparajita/capacitor-secure-storage` using AES-256 GCM (AndroidX `EncryptedSharedPreferences`). Tokens are never stored in plain JavaScript-accessible LocalStorage on native devices.
- **Web Storage Separation**: On web browsers, sessions use `localStorage` (when "Remember me" is checked) or transient `sessionStorage` (when unchecked).
- **Session Expiration & Token Refresh**: If an access token expires, Trackiyo attempts a silent background exchange via `/api/auth/refresh`. If refresh fails or a session is revoked, credentials are wiped from secure storage and the user is redirected to sign in.
- **Multi-User Safety**: Logging out invalidates the session, purges secure storage, and flushes all local task, habit, and profile caches, preventing cross-account data leakage on shared devices.

### Security & Reliability
- **Secret Isolation**: Real database service role keys and AI credentials exist exclusively on the server (`backend/.env`) and are never bundled into client code.
- **Daily-Lock Protection**: Anti-cheat middleware enforces timestamp consistency to prevent invalid historical modifications.
- **Strict CORS & Origin Verification**: Validates allowed development, production, and native Capacitor WebView origins.
- **Graceful Error Handling**: Centralized error interceptors normalize API responses and provide clean user feedback.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add amazing feature'`.
4. Run tests and linting: `npm test` (in backend) and `npm run lint` (in frontend).
5. Push to the branch: `git push origin feature/amazing-feature`.
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
