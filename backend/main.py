from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers
from routers import cv_analyzer, cover_letter, job_scanner, interview_simulator, code_reviewer, statistics

# Load environment variables
from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env from the same directory as this script
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Debug print
logger.info("\n=== Environment Status ===")
logger.info(f"Current directory: {os.getcwd()}")
logger.info(f".env path: {env_path}")
logger.info(f"COHERE_API_KEY: {'Set' if os.getenv('COHERE_API_KEY') else 'Not set'}")
logger.info(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
logger.info("========================\n")

# Initialize AI client after environment variables are loaded
from utils.ai_client import ai_client

# Force initialization of AI clients
ai_client._initialize_clients()

# Log client status
logger.info("AI Client status:")
logger.info(f"Cohere client: {'Available' if ai_client.cohere_client else 'Not available'}")
logger.info(f"OpenAI client: {'Available' if ai_client.openai_client else 'Not available'}")

if not ai_client.cohere_client and not ai_client.openai_client:
    logger.error("Warning: No AI clients were successfully initialized. Check your API keys and network connection.")

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