# Frontend

The frontend is a React 18 application built with Vite. It uses React Router for navigation, Material UI for components, Axios for API requests, and TanStack Query for server-state management.

## Requirements

- Node.js 18 or later
- The backend running at `http://localhost:5000`

## Install and run

From this directory:

```bash
npm install
npm run dev
```

Vite prints the local URL when it starts; the configured development port is `5173` (`http://localhost:5173`). Start the backend separately. Its default API address is `http://localhost:5000/api`.

## Other commands

```bash
npm run build    # Build the production assets into dist/
npm run preview  # Serve the production build locally
npm run lint     # Run ESLint
```

The API base URL is currently hardcoded in `src/services/api.js`. Update it there if the backend runs at a different address. The backend CORS settings must also allow the frontend's origin.
