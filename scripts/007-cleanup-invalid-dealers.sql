-- Script to clean up programs that reference dealers that no longer exist in the dealers table
-- This script removes program_dealers entries that reference non-existent dealers

-- First, let's see which dealers are referenced in programs but don't exist
SELECT DISTINCT pd.dealer_id 
FROM program_dealers pd
LEFT JOIN dealers d ON pd.dealer_id = d.id
WHERE d.id IS NULL;

-- Delete program_dealers that reference non-existent dealers
DELETE FROM program_dealers 
WHERE dealer_id NOT IN (SELECT id FROM dealers);

-- Verify the cleanup
SELECT COUNT(*) as remaining_invalid_refs 
FROM program_dealers 
WHERE dealer_id NOT IN (SELECT id FROM dealers);
