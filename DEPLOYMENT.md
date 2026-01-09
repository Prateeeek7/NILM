# Deployment Guide

Production deployment guide for the NILM DC System.

## Prerequisites

- Docker and Docker Compose installed
- Domain name (optional, for HTTPS)
- SSL certificates (for HTTPS)
- Server with at least 2GB RAM and 10GB storage

## Production Configuration

### 1. Environment Variables

Create `.env` file in project root:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=https://your-domain.com

# MQTT Configuration
MQTT_BROKER_HOST=mosquitto
MQTT_BROKER_PORT=1883
MQTT_USERNAME=your_mqtt_user
MQTT_PASSWORD=your_secure_password

# InfluxDB Configuration
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=your_secure_token
INFLUXDB_ORG=nilm_org
INFLUXDB_BUCKET=nilm_data

# ML Configuration
ML_MODEL_PATH=/app/models/load_classifier.pkl
FEATURE_WINDOW_SIZE=50

# Security
SECRET_KEY=your_secret_key_here
ALLOWED_ORIGINS=https://your-domain.com
```

### 2. MQTT Security

Edit `mosquitto/config/mosquitto.conf`:

```conf
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwd
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
```

Create password file:
```bash
docker exec -it nilm_mosquitto mosquitto_passwd -c /mosquitto/config/passwd your_user
```

### 3. InfluxDB Security

1. Access InfluxDB UI: `http://your-server:8086`
2. Create admin user with strong password
3. Generate API token with appropriate permissions
4. Update `INFLUXDB_TOKEN` in `.env`

### 4. HTTPS Setup (Recommended)

#### Using Nginx Reverse Proxy

Create `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5. Update Docker Compose

Add nginx service to `docker-compose.yml`:

```yaml
  nginx:
    image: nginx:alpine
    container_name: nilm_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - nilm_network
```

## Deployment Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd NILM
```

### 2. Configure Environment

```bash
cp backend/.env.example .env
# Edit .env with production values
```

### 3. Build and Start Services

```bash
docker-compose build
docker-compose up -d
```

### 4. Verify Services

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test API
curl http://localhost:8000/health
```

### 5. Initialize InfluxDB

1. Access InfluxDB UI
2. Complete setup wizard
3. Create bucket: `nilm_data`
4. Generate API token
5. Update `.env` with token

### 6. Upload ML Model

```bash
# Copy trained model to backend
docker cp load_classifier.pkl nilm_backend:/app/models/
```

## Monitoring

### Health Checks

```bash
# API health
curl http://your-domain.com/health

# Service status
docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Resource Usage

```bash
docker stats
```

## Backup

### InfluxDB Backup

```bash
# Backup data
docker exec nilm_influxdb influx backup /backup

# Restore
docker exec nilm_influxdb influx restore /backup
```

### ML Model Backup

```bash
# Backup model
docker cp nilm_backend:/app/models/load_classifier.pkl ./backups/
```

## Updates

### Update Application

```bash
git pull
docker-compose build
docker-compose up -d
```

### Update ML Model

```bash
# Stop backend
docker-compose stop backend

# Copy new model
docker cp new_model.pkl nilm_backend:/app/models/load_classifier.pkl

# Start backend
docker-compose start backend
```

## Scaling

### Multiple ESP32 Devices

1. Configure each ESP32 with unique `DEVICE_ID`
2. All devices publish to same MQTT broker
3. Backend automatically handles multiple devices
4. Filter by `device_id` in API calls

### Horizontal Scaling

For high load, consider:
- Load balancer for backend API
- Multiple backend instances
- Redis for caching
- Separate database server

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Check ports
netstat -tulpn | grep -E '8000|3000|1883|8086'

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Test InfluxDB connection
docker exec nilm_backend python -c "from influxdb_client import InfluxDBClient; print('OK')"

# Check InfluxDB logs
docker-compose logs influxdb
```

### Performance Issues

1. Check resource usage: `docker stats`
2. Increase Docker memory limits
3. Optimize database queries
4. Enable caching (Redis)

## Security Checklist

- [ ] MQTT authentication enabled
- [ ] InfluxDB secured with tokens
- [ ] HTTPS enabled
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Regular security updates
- [ ] Firewall rules configured
- [ ] Regular backups scheduled

## Maintenance

### Regular Tasks

- Weekly: Check logs for errors
- Monthly: Update dependencies
- Quarterly: Review security
- Annually: Full system audit

### Monitoring

Set up monitoring for:
- API response times
- Database disk usage
- Memory usage
- Error rates
- Uptime

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review documentation
- Open GitHub issue





