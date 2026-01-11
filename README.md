# AI E-Commerce Platform (Kerala Edition)

## Project Structure
- **frontend/**: Next.js + Tailwind CSS (Web Interface)
- **backend/**: Node.js + Express (Main API & Orchestrator)
- **ai_service/**: Python + FastAPI (NLP & Intent Extraction)
- **database/**: SQL Scripts for Supabase

## Setup Instructions

### 1. Database (Supabase)
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to the SQL Editor and run the script in `database/schema.sql`.
3. Get your `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings > API.
4. Update `backend/.env` with these keys.

### 2. Backend (Node.js)
```bash
cd backend
npm install
# Update .env first!
npm start
```
Runs on: http://localhost:5000

### 3. AI Service (Python)
```bash
cd ai_service
pip install -r requirements.txt
python main.py
```
Runs on: http://localhost:8000

### 4. Frontend (Next.js)
```bash
cd frontend
npm run dev
```
Runs on: http://localhost:3000

## Features
- **Voice Search**: "Show me red sarees"
- **Recommendation**: Personalized based on region (Kerala)
- **Realtime Cart**: Updates instantly
