-- Drop the problematic enum if it exists
DROP TYPE IF EXISTS "UserSex" CASCADE;
DROP TYPE IF EXISTS "Day" CASCADE;
DROP TYPE IF EXISTS "PaymentType" CASCADE;
DROP TYPE IF EXISTS "StudentStatus" CASCADE;

-- Recreate the enums
CREATE TYPE "UserSex" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "Day" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE "PaymentType" AS ENUM ('XERO', 'BANK_TRANSFER', 'CASH');
CREATE TYPE "StudentStatus" AS ENUM ('CURRENT', 'TRIAL', 'DISENROLLED');

-- Continue with table creation if needed...
