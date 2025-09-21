# Database Setup Instructions

You have the connection URL: `postgresql://postgres:********@ballast.proxy.rlwy.net:55224/railway`

## Option 1: Use Online PostgreSQL Client

1. Go to **https://www.pgadmin.org/download/** or use a web-based client
2. Connect using your connection details:
   - Host: `ballast.proxy.rlwy.net`
   - Port: `55224`
   - Database: `railway`
   - Username: `postgres`
   - Password: (the hidden password from Railway)

## Option 2: Copy-Paste Method (Manual)

Since Railway has a "Create table" option, we can create tables manually:

### Create Users Table:
1. In Railway → octovox-database → Data → "Create table"
2. Table name: `users`
3. Add these columns:
   - `id` (UUID, Primary Key)
   - `email` (VARCHAR 255, NOT NULL, UNIQUE)
   - `name` (VARCHAR 255, NOT NULL)
   - `password_hash` (VARCHAR 255, NOT NULL)
   - `role` (VARCHAR 20, NOT NULL)
   - `is_verified` (BOOLEAN, DEFAULT FALSE)
   - `verification_token` (VARCHAR 255)
   - `created_at` (TIMESTAMP, DEFAULT NOW())
   - `updated_at` (TIMESTAMP, DEFAULT NOW())

## Option 3: Use Railway Dashboard SQL Query

Some Railway interfaces have a hidden SQL query option:

1. In your database, look for:
   - "SQL" tab
   - "Query" button
   - "Console" option
   - Three dots menu (⋯) → "Query"

If you find it, paste the contents of `database/schema.sql` and run it.

## Quick Test

To verify connection, you can try connecting with any PostgreSQL client using:
- Connection URL: `postgresql://postgres:********@ballast.proxy.rlwy.net:55224/railway`