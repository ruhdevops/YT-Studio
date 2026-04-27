# Ruh Al Tarikh - YT Studio Archive

A cinematic archive for **Ruh Al Tarikh** episodes exploring Islamic history, scripture, prophecy, and deep discussion.

## Features

- **7 UX Enhancements**
  - Search autocomplete with suggestions & history
  - Keyboard shortcuts (J/K//, arrow navigation)
  - Infinite scroll + pagination (12 items per page)
  - Episode notes/transcript panel
  - Enhanced mobile responsiveness
  - Recommended episodes (based on viewing history)
  - Social sharing & copyable links (Twitter, Facebook, WhatsApp)

- **Core Features**
  - Video grid with lazy-loaded images
  - Continue Watching section
  - Trending episodes
  - Dark/light mode toggle
  - Watch Later queue (localStorage)
  - Progress tracking & dashboard
  - Search & category filtering

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build**: Vite (configured)
- **Server**: Nginx (Docker)
- **Deployment**: Google Cloud Run / Container Registry
- **Analytics**: Vercel Speed Insights + Cloudflare Web Analytics
- **Backend API**: Cloudflare Workers

## Quick Start

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:5173
```

### Docker Build & Run
```bash
docker build -t yt-studio:latest .
docker run -p 8080:80 yt-studio:latest
# Visit http://localhost:8080
```

### Docker Compose
```bash
docker-compose up
# Visit http://localhost:8080
```

## Deployment

### Google Cloud Run
```bash
gcloud auth login
gcloud auth configure-docker
docker tag yt-studio:latest gcr.io/yt-studio-493116/yt-studio:latest
docker push gcr.io/yt-studio-493116/yt-studio:latest
gcloud run deploy yt-studio --image gcr.io/yt-studio-493116/yt-studio:latest --platform managed --region us-central1 --allow-unauthenticated
```

### GitHub Actions
Automated builds on push to `main` or `develop` branches:
- Builds Docker image
- Pushes to GCR
- Deploys to Cloud Run (main branch only)

See `.github/workflows/deploy-gcr.yml`

### Vercel
```bash
vercel deploy
```

## Configuration

### Environment Variables
- `VITE_API_URL`: Backend API endpoint (default: `http://127.0.0.1:8787`)

Create `.env`:
```
VITE_API_URL=https://yt-studio-api.example.com
```

## Project Structure
```
├── index.html          # Main SPA entry point
├── js/
│   └── app.js         # Core application logic
├── css/
│   └── style.css      # Design system & responsive styles
├── src/
│   └── api.js         # API client
├── Dockerfile         # Production multi-stage build
├── docker-compose.yml # Local compose setup
├── package.json       # Dependencies
└── .github/workflows/ # CI/CD pipelines
```

## Performance

- **Image lazy loading**: Intersection Observer API
- **Asset caching**: 1-year expires for static files
- **Gzip compression**: Enabled in Nginx
- **SPA routing**: All routes → `/index.html`
- **Pagination**: Load 12 episodes per page
- **Search history**: Stored in localStorage

## API Integration

Episodes fetched from:
```
https://yt-studio-api.ruhdevopsytstudio.workers.dev
```

Response format:
```json
{
  "videos": [
    {
      "id": "video-id",
      "title": "Episode title",
      "thumbnail": "https://i.ytimg.com/...",
      "publishedAt": "2024-01-01T00:00:00Z",
      "channel": "Ruh Al Tarikh"
    }
  ]
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `J` | Previous episode |
| `K` | Next episode |
| `Esc` | Close modals |
| `↑↓←→` | Navigate grid |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

## License

MIT

## Author

Azeez Mohammed Rizwan
