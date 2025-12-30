-- Migration: Change foto_survey column from TEXT[] to JSONB
-- This fixes the malformed array literal error when storing base64 images

-- First, check if the column exists and its type
DO $$
BEGIN
  -- If the column is currently TEXT[], convert to JSONB
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'foto_survey' 
    AND data_type = 'ARRAY'
  ) THEN
    -- Create a temporary column
    ALTER TABLE orders ADD COLUMN foto_survey_new JSONB DEFAULT '[]'::JSONB;
    
    -- Migrate existing data (convert TEXT[] to JSONB array)
    UPDATE orders 
    SET foto_survey_new = COALESCE(to_jsonb(foto_survey), '[]'::JSONB)
    WHERE foto_survey IS NOT NULL;
    
    -- Drop old column and rename new one
    ALTER TABLE orders DROP COLUMN foto_survey;
    ALTER TABLE orders RENAME COLUMN foto_survey_new TO foto_survey;
  END IF;
  
  -- If the column doesn't exist at all, create it as JSONB
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'foto_survey'
  ) THEN
    ALTER TABLE orders ADD COLUMN foto_survey JSONB DEFAULT '[]'::JSONB;
  END IF;
END $$;
