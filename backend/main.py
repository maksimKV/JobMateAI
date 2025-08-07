from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any

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

# Track application startup time and status
app_start_time = time.time()
app_ready = False

app = FastAPI(
    title="JobMate AI API",
    description="AI-powered career development and interview preparation platform",
    version="1.0.0",
    on_startup=[],
    on_shutdown=[]
)

# Mark app as ready after initialization
@app.on_event("startup")
async def startup_event():
    global app_ready
    # Perform any additional initialization here if needed
    app_ready = True
    logger.info("Application startup complete")

# Configure CORS with allowed origins for both development and production
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://jobmateai-frontend-service.onrender.com",
    "https://www.jobmateai-frontend-service.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add middleware to handle CORS preflight and add CORS headers to all responses
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get('origin')
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

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
    """
    Health check endpoint that reports the current status of the application.
    Returns 200 when ready, 503 during startup.
    """
    current_time = time.time()
    uptime = current_time - app_start_time
    
    status = {
        "status": "ready" if app_ready else "starting",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(uptime, 2),
        "services": {
            "cohere": bool(ai_client.cohere_client),
            "openai": bool(ai_client.openai_client)
        }
    }
    
    if not app_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "starting",
                "message": "Application is starting up, please wait",
                "retry_after": 5  # Suggested retry after 5 seconds
            },
            headers={"Retry-After": "5"}
        )
    
    return status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)