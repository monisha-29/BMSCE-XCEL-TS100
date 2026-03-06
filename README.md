# Curia AI — Intelligent Meeting Assistant

> **AI-powered meeting summarization with automatic Jira ticket creation**

Curia AI records your meeting transcripts, uses Google Gemini to extract **key decisions** and **action items**, and automatically creates **Jira tickets** — so nothing falls through the cracks.

---

## 🏗️ Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Express Backend   │────▶│  Flask AI Engine  │
│  React+Vite  │     │  (Auth + Meetings) │     │  (Gemini + Jira)  │
│  Port 5173   │     │    Port 5001       │     │    Port 5002      │
└──────────────┘     └───────────────────┘     └──────────────────┘
                              │                         │
                              ▼                         ▼
                        ┌──────────┐            ┌──────────────┐
                        │ MongoDB  │            │  Jira Cloud  │
                        │  Atlas   │            │  (Atlassian) │
                        └──────────┘            └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Auth Backend** | Node.js, Express, JWT, Mongoose |
| **AI Backend** | Python, Flask, Google Gemini API |
| **Database** | MongoDB Atlas |
| **Integrations** | Jira Cloud REST API |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **MongoDB Atlas** account (free tier works)
- **Google Gemini API key**
- **Jira Cloud** account + API token

### 1. Clone & Install

```bash
git clone <repo-url>
cd BMSCE-XCEL-TS100

# Install Express backend
cd backend-node
npm install

# Install Flask backend
cd ../backend
pip install -r requirements.txt

# Install frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**`backend-node/.env`**
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/curia-ai
JWT_SECRET=your_jwt_secret
PORT=5001
FLASK_API_URL=http://localhost:5002
```

**`backend/.env`**
```env
GEMINI_API_KEY=your_gemini_api_key
JIRA_URL=https://your-domain.atlassian.net
JIRA_PROJECT_KEY=YOUR_PROJECT
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_jira_api_token
```

### 3. Run

Open three terminal tabs:

```bash
# Terminal 1: Express Backend
cd backend-node && npm run dev

# Terminal 2: Flask AI Backend
cd backend && python app.py

# Terminal 3: Frontend
cd frontend && npm run dev
```

Visit **http://localhost:5173** → Sign up → Create a meeting → Paste transcript → Analyze!

---

## 📋 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login |
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update profile |

### Meetings (`/api/meetings`) — *Auth required*
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create meeting |
| GET | `/` | List all meetings |
| GET | `/:id` | Get meeting details |
| PUT | `/:id` | Update meeting |
| DELETE | `/:id` | Delete meeting |
| POST | `/:id/transcript` | Add/update transcript |
| POST | `/:id/analyze` | AI analyze + create Jira tickets |

### AI Engine (`Flask :5002`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze-transcript` | Process transcript → JSON summary |
| GET | `/health` | Health check |

---

## 🧠 How It Works

1. **Create a meeting** in the dashboard
2. **Paste the transcript** (or let the bot capture it)
3. Click **"Analyze with AI"** → Gemini extracts:
   - 📌 **Key Decisions**
   - ✅ **Action Items** (with assignee, priority, due date)
4. **Jira tickets** are automatically created for each action item

---

## 👥 Team

- Built at **BMSCE XCEL TS100 Hackathon**
