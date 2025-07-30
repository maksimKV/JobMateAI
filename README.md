# JobMate AI 🧠

Your personal AI mentor for career development and technical interviews.

## 🚀 Features

- **CV Analyzer** - Upload and analyze your resume for structure and clarity
- **Cover Letter Generator** - AI-powered personalized cover letters in Bulgarian or English
- **Job Description Scanner** - Match your skills against job requirements with detailed analysis
- **Interview Simulator** - Practice HR and technical interviews with AI-generated questions
- **Interview Statistics** - Track your performance with interactive charts
- **AI Code Reviewer** - Get feedback on your code with optimization tips

## 🏗️ Tech Stack

- **Frontend**: Next.js + React + TailwindCSS + **TypeScript**
- **Backend**: FastAPI (Python)
- **AI APIs**: Cohere / OpenAI GPT-3.5 / Ollama
- **Charts**: Chart.js
- **File Parsing**: pdfplumber, python-docx, PyMuPDF
- **Hosting**: Render (frontend & backend)

## 📦 Project Structure

```
JobMateAI/
├── frontend/          # Next.js React + TypeScript application
├── backend/           # FastAPI Python backend
├── shared/            # Shared types and utilities
└── docs/             # Documentation
```

## 🛠️ Setup Instructions

### Backend Setup (Render or Local)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # For local development
```

### Frontend Setup (Render or Local)
```bash
cd frontend
npm install
npm run build
npm start  # For local production build
```

## 🔧 Environment Variables

Create `.env` files in both frontend and backend directories:

### Backend (.env)
```
COHERE_API_KEY=your_cohere_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Frontend (.env or .env.production)
```
NEXT_PUBLIC_API_URL=https://<your-backend-service-name>.onrender.com
```

## 🚀 Deploying to Render

### 1. Backend (FastAPI)
- Create a new **Web Service** on Render
- Select the `backend/` directory as the root
- Use the following build and start commands:
  - **Build Command:** `pip install -r requirements.txt`
  - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
- Set environment variables for your API keys
- Expose port `10000` (or as configured)

### 2. Frontend (Next.js)
- Create a new **Web Service** on Render
- Select the `frontend/` directory as the root
- Use the following build and start commands:
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
- Set `NEXT_PUBLIC_API_URL` to your backend Render URL (e.g. `https://jobmateai-backend.onrender.com`)

### 3. Connect Frontend to Backend
- Make sure the frontend `.env` points to the Render backend URL, not localhost.
- Both services can be deployed independently and will communicate via public URLs.

## 📊 Core Features

1. **CV Analyzer**: Upload PDF/DOCX resumes and get AI analysis
2. **Cover Letter Generator**: Generate personalized cover letters based on job descriptions
3. **Job Description Scanner**: Extract keywords and match against your skills
4. **Interview Simulator**: Practice HR and technical interviews
5. **Statistics Dashboard**: Track interview performance with charts
6. **Code Reviewer**: Get AI feedback on your code

## 🎯 Getting Started (Local)

1. Clone the repository
2. Set up the backend (see Backend Setup)
3. Set up the frontend (see Frontend Setup)
4. Configure environment variables
5. Start both services
6. Open http://localhost:3000