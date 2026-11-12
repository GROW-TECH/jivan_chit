# Basic Chit Fund Management System - Database & Deployment Guide

This system is built with **React.js**, **Node.js + Express.js**, and a normalized **MySQL** database schema with safe decimal math and audit logging.

---

## 1. Technology Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express.js REST APIs with JWT role-based authentication and secure session tokens.
- **Database**:
  - **MySQL 8.0+** schema (`database/schema.sql` and `database/seed.sql`) using `DECIMAL(12, 2)` for zero float precision loss.
  - **Embedded Persistent Storage Engine** (`data/chitfund_store.json`) for seamless zero-config execution in containerized sandbox / preview environments, with seamless automatic failover to MySQL when `DB_HOST` and credentials are provided.

---

## 2. MySQL Database Setup & Migration

### Step 1: Create Database & User in MySQL
Log into MySQL as root:
```bash
mysql -u root -p
```
Run the following SQL commands:
```sql
CREATE DATABASE IF NOT EXISTS chitfund_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'chitfund_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON chitfund_db.* TO 'chitfund_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 2: Import Schema & Seed Data
Import the schema and initial seed data:
```bash
mysql -u chitfund_user -p chitfund_db < database/schema.sql
mysql -u chitfund_user -p chitfund_db < database/seed.sql
```

### Step 3: Configure Environment Variables
Create or edit `.env` in the project root:
```env
PORT=3000
NODE_ENV=production

# MySQL Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=chitfund_user
DB_PASSWORD=StrongPassword123!
DB_NAME=chitfund_db

# Security
JWT_SECRET=your-secure-production-jwt-secret-key-32chars
```

---

## 3. Local Development Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend API and frontend Vite dev server will boot concurrently on `http://localhost:3000`.

3. **Login Credentials**:
   - **Admin User**:
     - Username: `admin`
     - Password: `admin123`
     - Permissions: Full administrative access (Manage users, groups, settings, backups, audits).
   - **Staff User**:
     - Username: `staff`
     - Password: `staff123`
     - Permissions: Add/view customers, record payments, view members and basic reports.

---

## 4. Production Deployment Instructions

### Option A: Standard Linux Server (Ubuntu / Debian / RHEL)
1. Ensure Node.js 20+ and MySQL 8.0+ are installed.
2. Clone or copy project files to `/var/www/chitfund`.
3. Run build:
   ```bash
   npm install --production=false
   npm run build
   ```
   This compiles the Vite frontend into `dist/` and bundles the Express backend into `dist/server.cjs`.
4. Run under PM2 process manager:
   ```bash
   npm install -g pm2
   pm2 start dist/server.cjs --name "chitfund-app"
   pm2 save
   pm2 startup
   ```
5. Configure Nginx as reverse proxy with SSL (Certbot/Let's Encrypt) pointing to `http://127.0.0.1:3000`.

### Option B: Docker / Container Deployment
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
```

---

## 5. Security & Financial Calculation Rules

- **Currency Calculations**: Fixed-point arithmetic rounded to 2 decimal places. Floating point representations are never used for balances.
- **Audit Trails**: All payments, payment reversals, group creations, auctions, and sensitive updates are permanently stored in `audit_logs` with actor ID, IP address, timestamp, and JSON diffs.
- **Data Safety**: Financial records (installments, payments) use soft statuses (`active`, `reversed`, `cancelled`) to preserve ledger history.
