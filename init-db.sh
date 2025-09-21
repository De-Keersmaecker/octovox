#!/bin/bash

# Database initialization script for Octovox
# Usage: ./init-db.sh "your-database-url"

DATABASE_URL=$1

if [ -z "$DATABASE_URL" ]; then
    echo "Please provide the DATABASE_URL as an argument"
    echo "Usage: ./init-db.sh \"postgresql://...\""
    exit 1
fi

echo "🔧 Initializing Octovox database..."

# Run schema
echo "📊 Creating tables..."
psql "$DATABASE_URL" < database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully"
else
    echo "❌ Failed to create schema"
    exit 1
fi

# Run seed data
echo "🌱 Adding seed data..."
psql "$DATABASE_URL" < database/seed.sql

if [ $? -eq 0 ]; then
    echo "✅ Seed data added successfully"
else
    echo "❌ Failed to add seed data"
    exit 1
fi

echo "🎉 Database initialization complete!"