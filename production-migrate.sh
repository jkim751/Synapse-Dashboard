#!/bin/bash

# Step 1: Create a baseline migration (marks current state as migrated)
npx prisma migrate resolve --applied "20251001090943_haha"

# Step 2: Generate client
npx prisma generate

# Step 3: Create diff to see what needs to be added
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > manual_migration.sql

# Step 4: Review manual_migration.sql and apply it manually to production

# Step 5: After applying manually, mark it as resolved
# npx prisma migrate resolve --applied "migration_name"
