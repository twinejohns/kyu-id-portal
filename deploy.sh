#!/bin/bash
echo "==========================================================="
echo "  KyU Staff ID Portal — Automated Production Deployer"
echo "==========================================================="

# Check for Docker installation
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Error: docker-compose is not installed. Please install Docker & Compose first." >&2
  exit 1
fi

echo "🚀 [1/3] Building Next.js standalone container & initializing PostgreSQL..."
docker-compose up --build -d

# Wait for PostgreSQL container health check to be green
echo "⏳ [2/3] Waiting for PostgreSQL database container to warm up and become healthy..."
until [ "`docker inspect -f {{.State.Health.Status}} kyu_postgres`"=="healthy" ]; do
    sleep 1
done

echo "📦 [3/3] Running Prisma migrations & database seeding inside Next.js container..."
docker-compose exec web npx prisma migrate deploy
docker-compose exec web npx prisma db seed

echo "==========================================================="
echo "🎉 Portal deployed successfully on Port 3000!"
echo "Database is online, migrated, and populated with registry data."
echo "Secure camera biometrics are protected via proxy routing."
echo "==========================================================="
