#!/bin/bash

echo "Resetting database and migrations..."

# Remove migration files
rm -rf prisma/migrations

# Reset database
npx prisma migrate reset --force

# Create new baseline migration
npx prisma migrate dev --name init

# Generate client
npx prisma generate

echo "Database reset complete!"
