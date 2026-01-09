"""
Script to collect training data from InfluxDB or MQTT
"""
import json
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path
from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def collect_data_from_influxdb(
    influxdb_url: str,
    token: str,
    org: str,
    bucket: str,
    start_time: datetime,
    end_time: datetime,
    device_id: str = None,
    output_file: str = "training_data_raw.json"
):
    """Collect raw sensor data from InfluxDB"""
    
    client = InfluxDBClient(url=influxdb_url, token=token, org=org)
    query_api = client.query_api()
    
    query = f'''
    from(bucket: "{bucket}")
      |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
    '''
    
    if device_id:
        query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
    
    query += '''
      |> sort(columns: ["_time"])
    '''
    
    logger.info("Querying InfluxDB...")
    result = query_api.query(query)
    
    # Collect data
    data_points = []
    current_record = {}
    
    for table in result:
        for record in table.records:
            time = record.get_time()
            field = record.get_field()
            value = record.get_value()
            device = record.values.get('device_id', device_id or 'unknown')
            
            timestamp_key = int(time.timestamp() * 1000)
            
            if timestamp_key not in [r.get('timestamp') for r in data_points]:
                current_record = {
                    'device_id': device,
                    'timestamp': timestamp_key,
                    'current': 0.0,
                    'voltage': 0.0,
                    'power': 0.0
                }
                data_points.append(current_record)
            else:
                current_record = next(r for r in data_points if r['timestamp'] == timestamp_key)
            
            if value is not None:
                current_record[field] = float(value)
    
    logger.info(f"Collected {len(data_points)} data points")
    
    # Save to file
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(data_points, f, indent=2)
    
    logger.info(f"Saved data to {output_file}")
    return data_points


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Collect training data from InfluxDB")
    parser.add_argument("--influxdb-url", type=str, required=True)
    parser.add_argument("--token", type=str, required=True)
    parser.add_argument("--org", type=str, required=True)
    parser.add_argument("--bucket", type=str, required=True)
    parser.add_argument("--start-time", type=str, required=True, help="ISO format")
    parser.add_argument("--end-time", type=str, required=True, help="ISO format")
    parser.add_argument("--device-id", type=str, default=None)
    parser.add_argument("--output", type=str, default="data/raw/training_data.json")
    
    args = parser.parse_args()
    
    start_time = datetime.fromisoformat(args.start_time)
    end_time = datetime.fromisoformat(args.end_time)
    
    collect_data_from_influxdb(
        influxdb_url=args.influxdb_url,
        token=args.token,
        org=args.org,
        bucket=args.bucket,
        start_time=start_time,
        end_time=end_time,
        device_id=args.device_id,
        output_file=args.output
    )





