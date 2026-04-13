-- Replaces whelp_date + expected_date with selection_date + go_home_date,
-- and removes the 'born' litter status.

-- 1. Migrate any born litters to available
UPDATE litters SET status = 'available' WHERE status::text = 'born';

-- 2. Recreate litter_status enum without 'born'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'litter_status' AND e.enumlabel = 'born'
  ) THEN
    ALTER TABLE litters ALTER COLUMN status DROP DEFAULT;
    ALTER TYPE litter_status RENAME TO litter_status_old;
    CREATE TYPE litter_status AS ENUM ('planned', 'available', 'booked', 'completed');
    ALTER TABLE litters ALTER COLUMN status TYPE litter_status USING status::text::litter_status;
    DROP TYPE litter_status_old;
    ALTER TABLE litters ALTER COLUMN status SET DEFAULT 'planned';
  END IF;
END $$;

-- 3. Add new columns
ALTER TABLE litters ADD COLUMN IF NOT EXISTS selection_date text;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS go_home_date text;

-- 4. Populate selection_date (use today as fallback for any rows without a value)
UPDATE litters SET selection_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
WHERE selection_date IS NULL;

-- 5. Make selection_date NOT NULL
ALTER TABLE litters ALTER COLUMN selection_date SET NOT NULL;

-- 6. Drop old columns
ALTER TABLE litters DROP COLUMN IF EXISTS whelp_date;
ALTER TABLE litters DROP COLUMN IF EXISTS expected_date;
