import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi

from app.config import settings
from app.models.schemas import EnergyBreakdown, AnalyticsResponse

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for energy analytics and cost estimation"""
    
    def __init__(self):
        self.influx_client = None
        self.query_api = None
        self.connect()
    
    def connect(self):
        """Connect to InfluxDB"""
        try:
            self.influx_client = InfluxDBClient(
                url=settings.INFLUXDB_URL,
                token=settings.INFLUXDB_TOKEN,
                org=settings.INFLUXDB_ORG
            )
            self.query_api = self.influx_client.query_api()
            logger.info("Analytics service connected to InfluxDB")
        except Exception as e:
            logger.error(f"Failed to connect to InfluxDB: {e}")
    
    def get_energy_breakdown(self, start_time: datetime, end_time: datetime,
                            device_id: Optional[str] = None,
                            load_predictions: Optional[Dict[str, List]] = None) -> AnalyticsResponse:
        """
        Calculate energy breakdown by load type
        
        Args:
            start_time: Start of time range
            end_time: End of time range
            device_id: Optional device filter
            load_predictions: Dictionary mapping timestamps to load types
        
        Returns:
            AnalyticsResponse with energy breakdown
        """
        try:
            # Build InfluxDB query
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
              |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
              |> filter(fn: (r) => r._measurement == "sensor_reading")
              |> filter(fn: (r) => r._field == "power")
            '''
            
            if device_id:
                query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            
            query += '''
              |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
              |> cumulativeSum()
            '''
            
            # Execute query
            result = self.query_api.query(query)
            
            # Process results
            total_energy_joules = 0.0
            power_readings = []
            
            for table in result:
                for record in table.records:
                    power = record.get_value()
                    if power is not None:
                        power_readings.append({
                            'time': record.get_time(),
                            'power': float(power)
                        })
            
            # Calculate energy (integrate power over time)
            if len(power_readings) > 1:
                for i in range(1, len(power_readings)):
                    dt = (power_readings[i]['time'] - power_readings[i-1]['time']).total_seconds()
                    avg_power = (power_readings[i]['power'] + power_readings[i-1]['power']) / 2
                    total_energy_joules += avg_power * dt
            
            # Convert to kWh
            total_energy_kwh = total_energy_joules / 3600000.0
            
            # If we have load predictions, break down by load type
            breakdown = []
            if load_predictions:
                # Group energy by load type (simplified - would need timestamp matching)
                load_energy = {}
                for load_type, timestamps in load_predictions.items():
                    # Estimate energy based on average power for each load type
                    # This is simplified - real implementation would match timestamps
                    load_energy[load_type] = total_energy_kwh * (len(timestamps) / len(power_readings))
                
                total_load_energy = sum(load_energy.values())
                for load_type, energy in load_energy.items():
                    percentage = (energy / total_load_energy * 100) if total_load_energy > 0 else 0
                    breakdown.append(EnergyBreakdown(
                        load_type=load_type,
                        energy_kwh=energy,
                        percentage=percentage,
                        cost_usd=energy * 0.12  # $0.12 per kWh (example rate)
                    ))
            else:
                # No breakdown available
                breakdown.append(EnergyBreakdown(
                    load_type="total",
                    energy_kwh=total_energy_kwh,
                    percentage=100.0,
                    cost_usd=total_energy_kwh * 0.12
                ))
            
            return AnalyticsResponse(
                total_energy_kwh=total_energy_kwh,
                breakdown=breakdown,
                time_range={
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                },
                total_cost_usd=total_energy_kwh * 0.12
            )
            
        except Exception as e:
            logger.error(f"Error calculating energy breakdown: {e}")
            return AnalyticsResponse(
                total_energy_kwh=0.0,
                breakdown=[],
                time_range={
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            )
    
    def get_realtime_stats(self, device_id: Optional[str] = None) -> Dict:
        """Get real-time statistics"""
        try:
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
              |> range(start: -5m)
              |> filter(fn: (r) => r._measurement == "sensor_reading")
              |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
            '''
            
            if device_id:
                query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            
            query += '''
              |> last()
            '''
            
            result = self.query_api.query(query)
            
            stats = {
                "current": 0.0,
                "voltage": 0.0,
                "power": 0.0,
                "timestamp": datetime.now().isoformat()
            }
            
            for table in result:
                for record in table.records:
                    field = record.get_field()
                    value = record.get_value()
                    if value is not None:
                        stats[field] = float(value)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting realtime stats: {e}")
            return {}





