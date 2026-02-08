# Production Deployment Guide

## Backend (Spring Boot) Configuration

### Environment Variables

The application uses a single configuration file with environment variable overrides for production.

### Running the Application

**Development (default settings):**
```bash
mvn spring-boot:run
# Uses: ddl-auto=create, init-sample-data=true, localhost CORS
```

**Production (with environment variables):**
```bash
export DB_DDL_AUTO=update
export INIT_SAMPLE_DATA=false
export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
mvn spring-boot:run
```

### Data Initialization Strategy

#### Development (app.init-sample-data=true)
Initializes:
- ✅ Departments (7 civic departments)
- ✅ Categories (9 complaint types)
- ✅ SLA Configurations (business rules)
- ✅ Sample staff (28 staff members + department heads)
- ✅ Test users (citizen, admin, superadmin, commissioner)

#### Production (app.init-sample-data=false)
Initializes:
- ✅ Departments (required reference data)
- ✅ Categories (required reference data)
- ✅ SLA Configurations (required reference data)
- ❌ Sample staff (skipped)
- ❌ Test users (skipped)

### First Production Deployment

1. **Set database to update mode:**
   ```bash
   export DB_DDL_AUTO=update
   ```

2. **Set database credentials:**
   ```bash
   export DB_URL=jdbc:mysql://your-db-host:3306/argus_prod
   export DB_USERNAME=your_db_user
   export DB_PASSWORD=your_secure_password
   ```

3. **Disable sample data:**
   ```bash
   export INIT_SAMPLE_DATA=false
   ```

4. **Configure CORS for your domain:**
   ```bash
   export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

5. **Run the application:**
   ```bash
   java -jar springapp.jar
   ```

6. **Create first admin user manually** (via database):
   ```sql
   INSERT INTO user (name, email, mobile, password, user_type, dept_id)
   VALUES ('Production Admin', 'admin@yourdomain.com', '1234567890', 
           'HASHED_PASSWORD_HERE', 'SUPER_ADMIN', NULL);
   ```

### Database Migration Strategy

When changing from `ddl-auto=create` to `ddl-auto=update`:

1. ✅ Reference data (departments, categories, SLA) will be preserved
2. ✅ Existing complaints and user data will be preserved
3. ✅ Schema changes will be applied automatically
4. ⚠️ No sample data will be re-created (controlled by flag)

---

## Frontend (React) Configuration

### Environment File

Single `.env` file for all environments. Update values based on your deployment:

**Development:**
```env
REACT_APP_API_URL=http://localhost:8080/api
```

**Production:**
```env
REACT_APP_API_URL=https://api.yourdomain.com/api
```

### Building for Different Environments

**Development:**
```bash
npm start
```

**Production:**
1. Update `.env` with production API URL
2. Build:
   ```bash
   npm run build
   ```
3. Deploy the `build/` folder

---

## CORS Configuration

### Understanding CORS Setup

CORS (Cross-Origin Resource Sharing) allows your frontend to communicate with your backend when they're on different domains.

### Common Deployment Scenarios

#### Scenario 1: Separate Domains
```
Frontend: https://myapp.com
Backend:  https://api-myapp.com
```
**Backend CORS Setting:**
```bash
export CORS_ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
```

#### Scenario 2: CNAME with Subdomain (Your Setup)
```
Frontend: https://yourdomain.com
export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
java -jar springapp.jar

# Frontend
# Update .env.production first:
# REACT_APP_API_URL=https://api.yourdomain.com/api
# REACT_APP_FRONTEND_URL=https://yourdomain.com
export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Scenario 3: Same Domain, Different Ports (Development)
```
Frontend: http://localhost:3000
Backend:  http://localhost:8080
```
**Backend CORS Setting:**
```bash
export CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### What to Allow in Your Backend

**Rule:** Allow the URLs where your **frontend** is hosted.

For your CNAME setup:
- ✅ Backend runs at: `https://api.yourdomain.com`
- ✅ Frontend runs at: `https://yourdomain.com`
- ✅ CORS should allow: `https://yourdomain.com,https://www.yourdomain.com`

**DO NOT** allow `*` (all origins) in production - it's a security risk!

### Configuration Files

**Development** ([application-dev.properties](springapp/src/main/resources/application-dev.properties)):
```properties
cors.allowed-origins=http://localhost:3000,http://127.0.0.1:3000
Single configuration file: [application.properties](springapp/src/main/resources/application.properties)

All settings have development-friendly defaults and can be overridden with environment variables:

| Setting | Default (Dev) | Production Override |
|---------|---------------|---------------------|
| `DB_DDL_AUTO` | `create` | `update` |
| `INIT_SAMPLE_DATA` | `true` | `false` |
| `CORS_ALLOWED_ORIGINS` | `localhost:3000` | Your domain(s) |
| `DB_SHOW_SQL` | `true` | `false` |
## Quick Reference

### Development Setup
```bash
# Backend (uses default dev settings)
cd springapp
mvn spring-boot:run

# Frontend
cd reactapp
npm start
```

### Production Deployment
```bash
# Backend
export DB_DDL_AUTO=update
export DB_URL=jdbc:mysql://prod-db:3306/argus
export DB_USERNAME=prod_user
export DB_PASSWORD=secure_pass
export DB_SHOW_SQL=false
export INIT_SAMPLE_DATA=false
export CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
java -jar springapp.jar

# Frontend
# Update .env with production URL:
# REACT_APP_API_URL=https://api.yourdomain.com/api
npm run build
# Deploy build/ folder
```

### Switching from Development to Production

1. Set `DB_DDL_AUTO=update` (preserve data between restarts)
2. Set `INIT_SAMPLE_DATA=false` (no test users)
3. Set `DB_SHOW_SQL=false` (reduce logs)
4. Update database credentials
5. Update CORS origins to your domain
6. Update `.env` with production API URL
7. Create first admin user manually
