# RateBridge — Currency Exchange Desk

A real-time currency exchange desk for **MMK · THB · USD · EUR**, built for traders who need accurate P2P market rates alongside official CBM figures.

[![Frontend — Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend — Docker](https://img.shields.io/badge/Backend-Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

---

## 🚀 Features

- **Live rates** — auto-refreshes every 60 seconds with source tracking.
- **4 currencies** — MMK, THB, USD, EUR with all pair combinations supported.
- **Dual rate input** — Enter your own P2P rate in either format:
  - THB per 100,000 MMK (e.g. `750`)
  - MMK per 1 THB (e.g. `133.33`)
  - Automatic conversion when toggling between formats.
- **Dynamic Sources** — Uses high-precision institutional sources (Airwallex) and local market APIs.
- **Multi-currency result** — Shows primary conversion + all other currency equivalents simultaneously.
- **Sparkline charts** — Mini price history for USD/THB, USD/MMK, THB/MMK, and USD/EUR.
- **Quote log** — Session history of copied quotes for easy reference.
- **Bilingual UI** — English and Myanmar (မြန်မာဘာသာ) support.
- **Theming** — Dark / Light theme support, persisted in `localStorage`.
- **Responsive Design** — Desktop two-column layout and mobile-optimized views.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS (ES modules), Vite 6, Tailwind-inspired CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **HTTP Client** | httpx (async) |
| **Validation** | Pydantic v2 |
| **Deployment** | Vercel (Frontend), Docker (Backend) |

---

## 🏗️ Project Structure

```
Currency_Exchange/
├── frontend/
│   ├── assets/
│   │   ├── scripts/
│   │   │   ├── app.js          # Main app logic & state management
│   │   │   └── i18n.js         # EN / MM translations
│   │   └── styles/
│   │       ├── tokens.css      # Design tokens (colors, spacing)
│   │       └── app.css         # Component-specific styles
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   ├── Dockerfile              # Multi-stage Nginx build
│   └── .env.example            # Frontend environment template
│
├── backend/
│   ├── app/
│   │   ├── core/config.py      # Pydantic-settings configuration
│   │   ├── routers/            # API endpoints (rates, convert)
│   │   ├── schemas/            # Pydantic models
│   │   ├── services/           # Business logic & external API integration
│   │   │   ├── rate_service.py # Source orchestration & caching
│   │   │   ├── airwallex_service.py # Institutional rates
│   │   │   ├── binance_service.py   # P2P Market rates
│   │   │   ├── myanmar_market_service.py # Local market API
│   │   │   └── cbm_service.py       # Official CBM fallback
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example            # Backend environment template
│
├── docker-compose.yml          # Production-ready compose for backend
└── README.md
```

---

## 📊 Rate Sources & Priority

The backend uses a multi-tiered fallback system to ensure data availability:

### Fiat Rates (USD/THB, USD/EUR)
1. **Airwallex MarketFX** (Institutional Quality)
2. **Frankfurter API** (Public Fallback)

### MMK Rates (USD/MMK, THB/MMK)
1. **Myanmar Market API** (Real-time local rates)
2. **Binance P2P** (Median of top 10 USDT/MMK listings)
3. **CBM Official** (Central Bank of Myanmar fallback)

> **Note:** Some sources (like Binance) may be geoblocked depending on your server location. The system automatically detects failures and switches to the next available source.

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (optional, for deployment)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys (Airwallex, Myanmar Market, etc.)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Set VITE_API_BASE_URL to http://localhost:8000
npm install
npm run dev
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `AIRWALLEX_CLIENT_ID` | Airwallex API Client ID | `""` |
| `AIRWALLEX_API_KEY` | Airwallex API Key | `""` |
| `MYANMAR_MARKET_API_KEY`| Local Market API Key | `""` |
| `CACHE_TTL` | Rate cache lifetime (seconds) | `60` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

---

## 🚢 Deployment

### Frontend (Vercel)
Connect your repository to Vercel and set the **Root Directory** to `frontend`.

### Backend (Docker)
The root `docker-compose.yml` is configured for deployment behind a reverse proxy (e.g., Nginx Proxy Manager).
```bash
docker compose up -d --build
```

---

## 📄 License
MIT
