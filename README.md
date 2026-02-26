# Industry Portal – Frontend

React + Vite frontend for the Industry Portal. **This is its own Git repo** (separate from the backend).

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend URL
npm run dev
```

Runs at `http://localhost:5173` (or the port Vite shows).

## Git (this repo only)

Push this folder as a **standalone repo**:

```bash
cd industry-frontend
git init
git add .
git commit -m "Initial: Industry portal frontend"
git remote add origin <frontend-repo-url>
git push -u origin main
```

## Deploy (Google App Engine)

1. Set `VITE_API_URL` in `.env` (or build args) to your live backend URL.
2. Deploy:

   ```bash
   npm install
   gcloud app deploy
   ```

3. App Engine runs `npm start` (build + serve on 8080).

## Environment

- **VITE_API_URL** – Backend API base URL (e.g. `https://your-backend.run.app` or your GCE VM URL).
