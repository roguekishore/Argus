# JWT Authentication Deployment Guide

## Overview

This application now uses JWT (JSON Web Token) authentication instead of custom headers. This is compatible with AWS CloudFront free tier since it uses the standard `Authorization: Bearer` header.

## Architecture Changes

### Backend Changes

1. **JwtService** (`springapp/src/main/java/com/backend/springapp/security/JwtService.java`)
   - Generates and validates JWT tokens
   - Configurable secret key, expiration times

2. **JwtAuthenticationFilter** (`springapp/src/main/java/com/backend/springapp/config/JwtAuthenticationFilter.java`)
   - Replaces MockAuthenticationFilter for production
   - Extracts user context from JWT token
   - Protects all endpoints except public paths

3. **AuthController Updates**
   - `/api/auth/login` now returns `{ token, refreshToken, userId, role, ... }`
   - `/api/auth/refresh` - Refresh expired tokens
   - `/api/auth/me` - Validate token and get user info

4. **MockAuthenticationFilter** (development only)
   - Disabled when `jwt.enabled=true` (default)
   - Enable for local development: `jwt.enabled=false`

### Frontend Changes

1. **apiClient.js**
   - Uses `Authorization: Bearer <token>` header
   - Stores tokens in localStorage

2. **authService.js**
   - Stores JWT tokens on login
   - Token expiry checking
   - Refresh token support

## Configuration

### Environment Variables (Production)

Set these environment variables in your deployment:

```bash
# REQUIRED - JWT Secret (minimum 32 characters)
JWT_SECRET=your-secure-256-bit-secret-key-here-make-it-long

# Optional - Token expiration
JWT_EXPIRATION=86400000        # 24 hours (default)
JWT_REFRESH_EXPIRATION=604800000  # 7 days (default)

# Enable JWT (default: true)
JWT_ENABLED=true

# Database
DB_URL=jdbc:mysql://your-rds-endpoint:3306/springdb
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# Frontend URL (for CORS)
CORS_ALLOWED_ORIGINS=https://your-cloudfront-domain.cloudfront.net
```

### Frontend Environment

In your React app's `.env` or build configuration:

```bash
REACT_APP_API_URL=https://your-backend-url/api
```

## AWS Free Tier Deployment

### Architecture

```
[CloudFront] → [S3 Static Hosting (React)]
     ↓
[API Gateway / EC2 / Elastic Beanstalk] → [RDS MySQL]
```

### CloudFront Configuration

CloudFront supports the standard `Authorization` header:

1. **Create Distribution** for your frontend (S3 origin)
2. **Create Behavior** for API calls (`/api/*`) with:
   - Origin: Your backend URL
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache Policy: Disabled or CachingOptimized
   - Origin Request Policy: AllViewerExceptHostHeader
   - **Headers to Forward**: `Authorization`, `Content-Type`, `Accept`

### Backend Deployment Options (Free Tier)

1. **EC2 t2.micro** (750 hours/month free for 12 months)
   - Deploy Spring Boot JAR directly
   - Use nginx as reverse proxy

2. **Elastic Beanstalk** (uses EC2 under the hood)
   - Easy deployment with `eb deploy`
   - Auto-configures load balancing

3. **Lambda + API Gateway** (requires code changes)
   - 1 million requests/month free
   - Would need to convert to serverless

### Recommended: EC2 Deployment

```bash
# On EC2 instance
# 1. Install Java 17
sudo yum install java-17-amazon-corretto -y

# 2. Copy your JAR file
scp target/springapp-0.0.1-SNAPSHOT.jar ec2-user@your-ec2:/home/ec2-user/

# 3. Create systemd service
sudo tee /etc/systemd/system/grievance-app.service << EOF
[Unit]
Description=Grievance Redressal App
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/java -jar springapp-0.0.1-SNAPSHOT.jar
Environment="JWT_SECRET=your-secure-secret-here"
Environment="DB_URL=jdbc:mysql://your-rds:3306/springdb"
Environment="DB_USERNAME=admin"
Environment="DB_PASSWORD=your-password"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 4. Start service
sudo systemctl daemon-reload
sudo systemctl enable grievance-app
sudo systemctl start grievance-app
```

## Security Checklist

- [ ] Set strong `JWT_SECRET` (minimum 32 characters, random)
- [ ] Use HTTPS for all connections
- [ ] Set proper CORS origins (not `*` in production)
- [ ] Use RDS with proper security groups
- [ ] Enable CloudWatch logging
- [ ] Set `spring.jpa.hibernate.ddl-auto=validate` in production

## Testing

### Login (get tokens)
```bash
curl -X POST https://your-api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "userId": 1,
  "role": "CITIZEN"
}
```

### Authenticated Request
```bash
curl https://your-api/api/complaints \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

### Refresh Token
```bash
curl -X POST https://your-api/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiJ9..."}'
```

## Local Development

To use the old header-based auth locally (for testing without tokens):

```properties
# application.properties
jwt.enabled=false
```

This enables `MockAuthenticationFilter` which reads `X-User-Id` and `X-User-Role` headers.
