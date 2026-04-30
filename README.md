# RateBridge — Currency Exchange Desk

A real-time currency exchange desk for **MMK · THB · USD · EUR**, built for traders who need accurate P2P market rates alongside official CBM figures.

[![Frontend — Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend — Docker](https://img.shields.io/badge/Backend-Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

---

## Features

- **Live rates** — auto-refreshes every 60 seconds
- **4 currencies** — MMK, THB, USD, EUR with all pair combinations supported
- **User rate input** — enter your own P2P rate in either format:
  - THB per 100,000 MMK (e.g. `750`)
  - MMK per 1 THB (e.g. `133.33`)
  - Toggle between formats with the swap button; value converts automatically
- **CBM official mode** — toggle to switch to Central Bank of Myanmar official rates
- **Multi-currency result** — primary conversion + all other currency equivalents shown simultaneously
- **Sparkline charts** — mini price history for USD/THB, USD/MMK, THB/MMK, USD/EUR
- **Quote log** — session history of copied quotes
- **Bilingual** — English and Myanmar (မြန်မာဘာသာ)
- **Dark / Light theme** — light by default, persisted in `localStorage`
- **Responsive** — desktop two-column layout and mobile single-column view
- **Live clocks** — Yangon, Bangkok, UTC

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), Vite 6, Nginx (Docker ready) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Connectivity | Cloudflare Tunnel (optional) |
| HTTP client | httpx (async) |
| Validation | Pydantic v2 |
| Rate sources | Frankfurter API, Binance P2P, CBM API |
| Deployment | Vercel (frontend), Docker (backend/fullstack) |

---

## Project Structure

```
Currency_Exchange/
├── frontend/
│   ├── assets/
│   │   ├── scripts/
│   │   │   ├── app.js          # Main app logic
│   │   │   └── i18n.js         # EN / MM translations
│   │   └── styles/
│   │       ├── tokens.css      # Design tokens (dark + light theme)
│   │       └── app.css         # Component styles
│   ├── public/                 # Static assets (logo, etc.)
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   ├── Dockerfile              # Multi-stage Nginx build
│   ├── nginx.conf              # SPA-optimized Nginx config
│   ├── .env                    # Local env (git-ignored)
│   └── .env.example            # Template — commit this
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py       # Settings via pydantic-settings
│   │   ├── routers/
│   │   │   ├── rates.py        # GET /api/rates
│   │   │   └── convert.py      # POST /api/convert
│   │   ├── schemas/
│   │   │   ├── rate_schema.py
│   │   │   └── convert_schema.py
│   │   ├── services/
│   │   │   ├── rate_service.py     # Orchestrates data sources + cache
│   │   │   ├── binance_service.py  # Binance P2P median price
│   │   │   ├── cbm_service.py      # CBM official rates (fallback)
│   │   │   └── cache_service.py    # In-memory TTL cache
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                    # Local env (git-ignored)
│   └── .env.example            # Template — commit this
│
├── docker-compose.yml          # Root compose — runs backend + cloudflared
└── README.md
```

---

## Rate Sources

| Pair | Primary | Fallback |
|---|---|---|
| USD / THB | [Frankfurter API](https://frankfurter.dev) | — |
| USD / EUR | [Frankfurter API](https://frankfurter.dev) (same call) | — |
| USD / MMK | Binance P2P (median of top 10 USDT/MMK listings) | CBM official |
| THB / MMK | Derived: USD/THB × USD/MMK | CBM derived |
| EUR / THB | Derived: USD/THB ÷ USD/EUR | — |
| EUR / MMK | Derived: EUR/THB × THB/MMK | — |

> **Note:** Binance P2P requires the server to be located inside Myanmar to receive listings. If the server is hosted outside Myanmar (e.g. a VPS in Singapore), the backend automatically falls back to CBM official rates.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (recommended)

### 1. Clone the repository

```bash
git clone https://github.com/HeinHtetNyan/ratebridge.git
cd ratebridge
```

### 2. Manual Setup (Development)

#### Backend
```bash
cd backend
cp .env.example .env          # fill in your values
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

### 3. Docker Setup (Recommended)

To run the backend and Cloudflare Tunnel:
```bash
docker compose up -d --build
```

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_GITHUB_URL` | GitHub profile/repo link | `https://github.com/yourname` |
| `VITE_LINKEDIN_URL` | LinkedIn profile link | `https://linkedin.com/in/yourname` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `APP_NAME` | API title shown in docs | `Currency Exchange API` |
| `DEBUG` | Enable FastAPI debug mode | `False` |
| `API_PREFIX` | Route prefix | `/api` |
| `CACHE_TTL` | Rate cache lifetime (seconds) | `60` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token for Cloudflare Tunnel | `your-token-here` |

---

## API Reference

### `GET /api/rates`
Returns current reference exchange rates.

### `POST /api/convert`
Convert an amount between MMK, THB, USD, and EUR.

---

## Deployment

### Frontend → Vercel
Set **Root Directory** to `frontend`. Vercel will handle the build automatically.

### Backend → VPS (Docker)
Ensure your `ALLOWED_ORIGINS` includes your Vercel domain.

### Connectivity → Cloudflare Tunnel
The included `docker-compose.yml` supports Cloudflare Tunneling. 
1. Create a tunnel in the Cloudflare Dashboard.
2. Get the tunnel token.
3. Set `CLOUDFLARE_TUNNEL_TOKEN` in your environment.
4. Run `docker compose up -d`.

---

## License

MIT
