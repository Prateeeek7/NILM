from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import get_db

from app.config import settings
from app.models.schemas import AnalyticsResponse
from app.services.analytics import AnalyticsService
from app.services.training_service import TrainingService

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

analytics_service = AnalyticsService()
training_service = TrainingService()


@router.get("/energy")
async def get_energy_breakdown(
    start_time: datetime = Query(..., description="Start time (ISO format)"),
    end_time: datetime = Query(..., description="End time (ISO format)"),
    device_id: Optional[str] = Query(None, description="Device ID filter")
) -> AnalyticsResponse:
    """Get energy consumption breakdown by load type"""
    try:
        return analytics_service.get_energy_breakdown(
            start_time=start_time,
            end_time=end_time,
            device_id=device_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating energy breakdown: {str(e)}")


@router.get("/cost")
async def get_cost_estimation(
    start_time: datetime = Query(..., description="Start time (ISO format)"),
    end_time: datetime = Query(..., description="End time (ISO format)"),
    device_id: Optional[str] = Query(None, description="Device ID filter"),
    rate_per_kwh: float = Query(8.0, description="Electricity rate per kWh (in INR)")
):
    """Get cost estimation for energy consumption"""
    try:
        breakdown = analytics_service.get_energy_breakdown(
            start_time=start_time,
            end_time=end_time,
            device_id=device_id
        )
        
        # Apply custom rate (in INR - Indian Rupees)
        for item in breakdown.breakdown:
            item.cost_usd = item.energy_kwh * rate_per_kwh  # Keep field name for compatibility
        
        breakdown.total_cost_usd = breakdown.total_energy_kwh * rate_per_kwh  # Keep field name for compatibility
        
        return breakdown
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating cost: {str(e)}")


@router.get("/training-data-stats")
async def get_training_data_stats(
    rate_per_kwh: float = Query(8.0, description="Electricity rate per kWh (in INR)"),
    db: Session = Depends(get_db)
):
    """Get comprehensive statistics from training data including energy and cost breakdown"""
    try:
        # Get all training data from database
        all_training_data = training_service.get_training_data(db, limit=10000)
        
        # If database is empty, try reading from JSON file
        if not all_training_data:
            import json
            from pathlib import Path
            
            # Try multiple possible paths
            possible_paths = [
                Path(__file__).parent.parent.parent.parent / "ml-training" / "data" / "Training_data.json",
                Path(__file__).parent.parent.parent.parent.parent / "ml-training" / "data" / "Training_data.json",
                Path("/Users/pratikkumar/Desktop/NILM/ml-training/data/Training_data.json"),
            ]
            json_path = None
            for path in possible_paths:
                if path.exists():
                    json_path = path
                    break
            
            if json_path and json_path.exists():
                with open(json_path, 'r') as f:
                    json_data = json.load(f)
                
                # Convert JSON data to same format as database records
                class MockRecord:
                    def __init__(self, item):
                        self.label = item.get('label', 'unknown')
                        self.data_window = item.get('data_window', [])
                
                all_training_data = [MockRecord(item) for item in json_data]
        
        if not all_training_data:
            return {
                "total_samples": 0,
                "load_breakdown": [],
                "total_energy_kwh": 0.0,
                "total_cost_inr": 0.0,
                "total_power_watts": 0.0,
                "total_current_amps": 0.0,
                "message": "No training data available"
            }
        
        # Calculate statistics per load type
        load_stats = {}
        
        for record in all_training_data:
            label = record.label
            if not label:
                continue
                
            if label not in load_stats:
                load_stats[label] = {
                    "load_type": label,
                    "samples_count": 0,
                    "total_energy_kwh": 0.0,
                    "total_power_watts": 0.0,
                    "total_current_amps": 0.0,
                    "total_voltage": 0.0,
                    "total_time_seconds": 0.0,
                    "data_windows": []
                }
            
            load_stats[label]["samples_count"] += 1
            
            if record.data_window and len(record.data_window) > 0:
                # Calculate average power, current, and voltage for this window
                total_power = sum(p.get('power', 0) for p in record.data_window)
                total_current = sum(p.get('current', 0) for p in record.data_window)
                total_voltage = sum(p.get('voltage', 0) for p in record.data_window)
                avg_power = total_power / len(record.data_window)
                avg_current = total_current / len(record.data_window)
                avg_voltage = total_voltage / len(record.data_window)
                
                # Estimate time (assuming 10Hz sample rate, 50 samples = 5 seconds)
                window_duration = len(record.data_window) / 10.0  # seconds
                
                load_stats[label]["data_windows"].append({
                    "avg_power": avg_power,
                    "avg_current": avg_current,
                    "avg_voltage": avg_voltage,
                    "duration": window_duration
                })
                
                load_stats[label]["total_power_watts"] += avg_power
                load_stats[label]["total_current_amps"] += avg_current
                load_stats[label]["total_voltage"] += avg_voltage
                load_stats[label]["total_time_seconds"] += window_duration
        
        # Calculate energy and cost for each load type
        breakdown = []
        total_energy = 0.0
        total_cost = 0.0
        total_power_sum = 0.0
        total_current_sum = 0.0
        total_voltage_sum = 0.0
        total_samples_count = 0
        
        for label, stats in load_stats.items():
            # Calculate average power, current, and voltage for this load type
            avg_power_watts = stats["total_power_watts"] / stats["samples_count"] if stats["samples_count"] > 0 else 0
            avg_current_amps = stats["total_current_amps"] / stats["samples_count"] if stats["samples_count"] > 0 else 0
            avg_voltage = stats["total_voltage"] / stats["samples_count"] if stats["samples_count"] > 0 else 0
            
            # Calculate total time in hours
            total_time_hours = stats["total_time_seconds"] / 3600.0
            
            # Calculate energy consumption (Power × Time in kWh)
            # energy_kwh = (avg_power_watts * total_time_hours) / 1000.0
            # Or use sum of all windows: energy_kwh = sum(power_watts * duration_hours) / 1000.0
            energy_kwh = sum(
                (w["avg_power"] * w["duration"] / 3600.0) / 1000.0
                for w in stats["data_windows"]
            )
            
            # Calculate cost
            cost_inr = energy_kwh * rate_per_kwh
            
            total_energy += energy_kwh
            total_cost += cost_inr
            total_power_sum += avg_power_watts * stats["samples_count"]
            total_current_sum += avg_current_amps * stats["samples_count"]
            total_voltage_sum += avg_voltage * stats["samples_count"]
            total_samples_count += stats["samples_count"]
            
            breakdown.append({
                "load_type": label,
                "samples_count": stats["samples_count"],
                "energy_kwh": round(energy_kwh, 4),
                "cost_inr": round(cost_inr, 2),
                "avg_power_watts": round(avg_power_watts, 2),
                "avg_current_amps": round(avg_current_amps, 3),
                "total_time_hours": round(total_time_hours, 2),
                "percentage": 0.0  # Will be calculated below
            })
        
        # Calculate percentages
        if total_energy > 0:
            for item in breakdown:
                item["percentage"] = round((item["energy_kwh"] / total_energy) * 100, 2)
        
        # Sort by energy consumption (descending)
        breakdown.sort(key=lambda x: x["energy_kwh"], reverse=True)
        
        # Calculate weighted average power, current, and voltage
        avg_power_watts = total_power_sum / total_samples_count if total_samples_count > 0 else 0
        avg_current_amps = total_current_sum / total_samples_count if total_samples_count > 0 else 0
        avg_voltage = total_voltage_sum / total_samples_count if total_samples_count > 0 else 0
        
        return {
            "total_samples": len(all_training_data),
            "load_breakdown": breakdown,
            "total_energy_kwh": round(total_energy, 4),
            "total_cost_inr": round(total_cost, 2),
            "total_power_watts": round(avg_power_watts, 2),
            "total_current_amps": round(avg_current_amps, 3),
            "total_voltage": round(avg_voltage, 2),
            "rate_per_kwh": rate_per_kwh
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating training data stats: {str(e)}")


@router.get("/realtime")
async def get_realtime_stats(device_id: Optional[str] = None):
    """Get real-time statistics"""
    try:
        return analytics_service.get_realtime_stats(device_id=device_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting realtime stats: {str(e)}")
