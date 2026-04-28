# RateBridge — Currency Exchange Desk

A real-time currency exchange desk for **MMK · THB · USD**, built for traders who need accurate P2P market rates alongside official CBM figures.

[![Frontend — Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend — Docker](https://img.shields.io/badge/Backend-Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

---

## Features

- **Live rates** — auto-refreshes every 60 seconds
- **User rate input** — enter your own THB / 100k MMK P2P rate; all conversions use it
- **CBM official mode** — toggle to switch to Central Bank of Myanmar official rates
- **Multi-currency result** — primary conversion + third-currency equivalent shown simultaneously
- **Sparkline charts** — mini price history for USD/THB, USD/MMK, THB/MMK
- **Quote log** — session history of copied quotes
- **Bilingual** — English and Myanmar (မြန်မာဘာသာ)
- **Dark / Light theme** — persisted in `localStorage`
- **Responsive** — desktop two-column layout and mobile single-column view
- **Live clocks** — Yangon, Bangkok, UTC

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), Vite 6 |
| Backend | Python 3.11, FastAPI, Uvicorn |
| HTTP client | httpx (async) |
| Validation | Pydantic v2 |
| Rate sources | Frankfurter API, Binance P2P, CBM API |
| Deployment | Vercel (frontend), Docker on VPS (backend) |

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
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
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
├── docker-compose.yml          # Root compose — runs backend
└── README.md
```

---

## Rate Sources

| Pair | Primary | Fallback |
|---|---|---|
| USD / THB | [Frankfurter API](https://frankfurter.dev) | — |
| USD / MMK | Binance P2P (median of top 10 USDT/MMK listings) | CBM official |
| THB / MMK | Derived from USD/THB × USD/MMK | CBM derived |

> **Note:** Binance P2P requires the server to be located inside Myanmar to receive listings. If the server is hosted outside Myanmar (e.g. a VPS in Singapore), the backend automatically falls back to CBM official rates.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (optional, for backend)

### 1. Clone the repository

```bash
git clone https://github.com/HeinHtetNyan/ratebridge.git
cd ratebridge
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env          # fill in your values
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env          # set VITE_API_BASE_URL etc.
npm install
npm run dev
```

App will be available at `http://localhost:3000`.

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_GITHUB_URL` | GitHub profile/repo link for footer icon | `https://github.com/yourname` |
| `VITE_LINKEDIN_URL` | LinkedIn profile link for footer icon | `https://linkedin.com/in/yourname` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `APP_NAME` | API title shown in docs | `Currency Exchange API` |
| `DEBUG` | Enable FastAPI debug mode | `False` |
| `API_PREFIX` | Route prefix | `/api` |
| `EXCHANGE_API_URL` | Frankfurter API endpoint | `https://api.frankfurter.dev/v1/latest` |
| `BINANCE_P2P_URL` | Binance P2P search endpoint | *(see .env.example)* |
| `CBM_API_URL` | Central Bank of Myanmar API | `https://forex.cbm.gov.mm/api/latest` |
| `CACHE_TTL` | Rate cache lifetime in seconds | `60` |
| `HTTP_TIMEOUT` | Outbound HTTP timeout in seconds | `10.0` |
| `BINANCE_ROWS` | Number of P2P listings to sample | `10` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://your-app.vercel.app` |

---

## API Reference

### `GET /api/rates`

Returns current reference exchange rates.

**Response**
```json
{
  "usd_to_thb": 33.42,
  "usd_to_mmk": 3350.0,
  "thb_to_mmk": 100.24,
  "updated_at": "2026-04-29T10:00:00Z",
  "mmk_source": "binance_p2p"
}
```

`mmk_source` is either `"binance_p2p"` or `"cbm_official"`.

---

### `POST /api/convert`

Convert an amount between MMK, THB, and USD.

**Request body**
```json
{
  "amount": 100000,
  "from_currency": "MMK",
  "to_currency": "THB",
  "user_rate": 780,
  "use_official": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | `float > 0` | ✅ | Amount to convert |
| `from_currency` | `MMK \| THB \| USD` | ✅ | Source currency |
| `to_currency` | `MMK \| THB \| USD` | ✅ | Target currency (must differ from `from_currency`) |
| `user_rate` | `float > 0` | Required when MMK involved and `use_official=false` | THB per **100,000 MMK** |
| `use_official` | `bool` | ❌ | `true` = use CBM official rates; default `false` |

**Response**
```json
{
  "amount": 100000,
  "from_currency": "MMK",
  "to_currency": "THB",
  "converted_amount": 128.21,
  "rate_used": 780.0
}
```

---

### `GET /health`

Health check endpoint.

```json
{ "status": "ok" }
```

---

## Deployment

### Frontend → Vercel

1. Push the `frontend/` folder (or the whole repo) to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Add all `VITE_*` environment variables in the Vercel project settings.
5. Deploy — Vercel runs `npm run build` automatically.

### Backend → VPS with Docker

```bash
# On your VPS
git clone https://github.com/HeinHtetNyan/ratebridge.git
cd ratebridge
cp backend/.env.example backend/.env   # fill in production values
docker compose up -d --build
```

The backend will be available on port `8000`. Put it behind nginx or Caddy for HTTPS, then update `ALLOWED_ORIGINS` in `backend/.env` with your Vercel domain.

---

## How the Rate Calculation Works

The frontend performs all conversions **client-side** using the user's rate input:

```
user enters:  780  (THB per 100,000 MMK)
derived:      mmkPerThb = 100,000 / 780 ≈ 128.21  MMK per THB

THB → MMK:    amount × mmkPerThb
MMK → THB:    amount / mmkPerThb
USD → MMK:    amount × usdToThb × mmkPerThb
MMK → USD:    amount / mmkPerThb / usdToThb
```

When **CBM Official** mode is on, `mmkPerThb` is sourced from the backend's `thb_to_mmk` field instead of the user input.

---

## License

MIT
