# PitchPro Frontend

PitchPro is a football-club operations frontend for managing club staff, players, squads, matches, schedules, training, medical information, and subscriptions. It is a single-page application built with Vue 3 and Vite. Most club data and account operations are provided by the PitchPro backend API, which must be available for those features to work.

## Features

- Club registration and technical-director registration, including email verification.
- Sign-in with access and refresh token handling, protected dashboard routes, and an optional stay-signed-in session.
- Club dashboard with operational information and navigation to club-management tools.
- Staff directory and staff creation, with plan-based staff limits.
- Squad category management and player acquisition/control.
- Match scheduling, call-ups, live match monitoring, attendance and match-event tracking, and match archives.
- Training sessions, training monitoring and attendance, and training archives.
- Medical dashboard for player welfare workflows.
- Subscription-plan information and payment success/failure pages.
- English and Arabic translations. English is the default language and uses left-to-right layout; Arabic uses right-to-left layout. A previously selected language is remembered.
- Shared notifications/toasts and responsive dashboard navigation.

The following dashboard routes currently show a placeholder rather than a finished feature: Players Monitor, Finances, and Settings. Some other screens may show limited or sample content until connected to the backend.

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8).
- npm (included with Node.js).
- Access to a compatible PitchPro backend API for authentication and server-backed features.

## Install and run

1. Clone the repository and enter the project directory:

	```sh
	git clone <repository-url>
	cd pitchpro-frontend
	```

2. Install dependencies:

	```sh
	npm install
	```

3. Create a `.env.local` file in the project root and set the backend URL:

	```dotenv
	VITE_API_URL=https://localhost:7057
	```

	Replace the example with the URL of your running backend. The default in the application is `https://localhost:7057`; without a local backend, API-dependent actions will fail. The API URL should be the backend origin, without an API path suffix.

4. Start the development server:

	```sh
	npm run dev
	```

	Open the local URL printed by Vite, usually `http://localhost:5173`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production bundle in `dist/`. |
| `npm run preview` | Serve the production bundle locally after building. |

There are currently no test or lint scripts defined in `package.json`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | For backend use | Backend origin used for API requests. Defaults to `https://localhost:7057`. |
| `VITE_REFRESH_INTERVAL_MS` | No | Access-token refresh timer in milliseconds. Defaults to 14.5 minutes. |

Vite exposes variables prefixed with `VITE_` to browser code; do not put secrets in these values. Keep `.env.local` out of source control.

## Main routes

| Route | Page |
| --- | --- |
| `/club-registration` | Club registration |
| `/club-president-registration` | Club president/technical director registration |
| `/login` | Sign in |
| `/verify-email` | Email verification |
| `/dashboard/home` | Home dashboard |
| `/dashboard/staff-management` | Staff management |
| `/dashboard/categories` | Squad categories |
| `/dashboard/players` | Player acquisition |
| `/dashboard/player-control` | Player control |
| `/dashboard/matches` | Matches and scheduling |
| `/dashboard/schedule` | Schedule |
| `/dashboard/call-up` | Match call-ups |
| `/dashboard/match-monitor` | Match monitoring |
| `/dashboard/match-archive` | Match archive |
| `/dashboard/training` | Training |
| `/dashboard/training-monitor` | Training monitoring |
| `/dashboard/training-archive` | Training archive |
| `/dashboard/medical` | Medical dashboard |
| `/dashboard/subscription` | Subscription plans |
| `/dashboard/players-monitor` | Placeholder: under development |
| `/dashboard/finances` | Placeholder: under development |
| `/dashboard/settings` | Placeholder: under development |

The root route (`/`) redirects to `/club-registration`. Dashboard routes require an authenticated session and redirect to `/login` when no session is available.

## Project structure

```text
src/
  components/       Shared application components
  composables/      Reusable Vue composables
  features/         Feature-specific dashboard components
  locales/          English and Arabic translation files
  router/           Vue Router routes and authentication guard
  services/         API clients for auth, clubs, staff, players, matches, etc.
  views/             Route-level pages
public/              Static public assets
```

## Production deployment

Build the frontend with `npm run build` and deploy the generated `dist/` directory to a static hosting provider. Configure `VITE_API_URL` in the hosting provider's build environment to point to the deployed backend, then rebuild. The included `vercel.json` rewrites requests to `index.html` so Vue Router history routes work on Vercel. Other static hosts need an equivalent single-page-app fallback. The backend must allow requests from the deployed frontend origin through its CORS configuration.

## Technologies

Vue 3, Vue Router, Vue I18n, Vite, Tailwind CSS, Axios, and `@vueform/slider`.
