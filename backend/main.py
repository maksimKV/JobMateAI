from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

# Import routers
from routers import cv_analyzer, cover_letter, job_scanner, interview_simulator, code_reviewer, statistics

# Load environment variables
load_dotenv()

app = FastAPI(
    title="JobMate AI API",
    description="AI-powered career development and interview preparation platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://jobmate-ai.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded documents
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(cv_analyzer.router, prefix="/api/cv", tags=["CV Analyzer"])
app.include_router(cover_letter.router, prefix="/api/cover-letter", tags=["Cover Letter"])
app.include_router(job_scanner.router, prefix="/api/job-scanner", tags=["Job Scanner"])
app.include_router(interview_simulator.router, prefix="/api/interview", tags=["Interview Simulator"])
app.include_router(code_reviewer.router, prefix="/api/code-review", tags=["Code Reviewer"])
app.include_router(statistics.router, prefix="/api/statistics", tags=["Statistics"])

@app.get("/")
async def root():
    return {
        "message": "JobMate AI API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 