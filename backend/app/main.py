from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import threading

from app.config import settings
from app.api.routes import data, predictions, analytics, loads, training, relay
from app.api.websocket import websocket_endpoint, manager
from app.services.data_collector import DataCollector
from app.services.ml_service import MLService
from app.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global data collector
data_collector = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    global data_collector
    
    # Startup
    logger.info("Starting NILM backend services...")
    
    # Initialize database
    init_db()
    logger.info("Database initialized")
    
    # Initialize data collector
    def on_event_detected(event_data):
        """Callback when event is detected"""
        logger.info(f"Event detected: {event_data}")
        # Could trigger ML prediction here
    
    data_collector = DataCollector(on_event_detected=on_event_detected)
    
    try:
        data_collector.start()
        logger.info("Data collector started")
    except Exception as e:
        logger.warning(f"Data collector not started (MQTT/InfluxDB may not be available): {e}")
        logger.info("API will still work, but data collection is disabled")
    
    # Initialize ML service
    ml_service = MLService()
    logger.info(f"ML service initialized: {ml_service.get_model_info()}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down NILM backend services...")
    if data_collector:
        data_collector.stop()


# Create FastAPI app
app = FastAPI(
    title="NILM DC System API",
    description="Non-Intrusive Load Monitoring API for DC loads",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(data.router)
app.include_router(predictions.router)
app.include_router(analytics.router)
app.include_router(loads.router)
app.include_router(training.router)
app.include_router(relay.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NILM DC System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "data_collector": data_collector is not None,
            "ml_service": True
        }
    }


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket, device_id: str = Query(None)):
    """WebSocket endpoint for real-time data"""
    await websocket_endpoint(websocket, device_id)


@app.get("/api/v1/ml/model/info")
async def get_model_info():
    """Get ML model information"""
    ml_service = MLService()
    return ml_service.get_model_info()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )

