-- Clean up invalid dealer references from all tables
-- This script removes dealer names that don't exist in the dealers table

-- Remove invalid dealer references from simulasi table
DELETE FROM simulasi 
WHERE dealer IS NOT NULL 
AND dealer NOT IN (SELECT DISTINCT nama_dealer FROM dealers);

-- Remove invalid dealer references from aktivitas table
DELETE FROM aktivitas 
WHERE dealer IS NOT NULL 
AND dealer NOT IN (SELECT DISTINCT nama_dealer FROM dealers);

-- Remove invalid dealer references from orders table
DELETE FROM orders 
WHERE dealer IS NOT NULL 
AND dealer NOT IN (SELECT DISTINCT nama_dealer FROM dealers);

-- Set invalid dealer assignments to NULL in users table (keep user records, just clear invalid dealer)
UPDATE users SET dealer = NULL 
WHERE dealer IS NOT NULL 
AND dealer NOT IN (SELECT DISTINCT nama_dealer FROM dealers);

-- Display summary - show remaining valid dealer references in each table
SELECT 'Valid dealers remaining in Simulasi' as summary, COUNT(*) as count FROM simulasi WHERE dealer IS NOT NULL
UNION ALL
SELECT 'Valid dealers remaining in Aktivitas', COUNT(*) FROM aktivitas WHERE dealer IS NOT NULL
UNION ALL
SELECT 'Valid dealers remaining in Orders', COUNT(*) FROM orders WHERE dealer IS NOT NULL
UNION ALL
SELECT 'Valid dealer assignments in Users', COUNT(*) FROM users WHERE dealer IS NOT NULL;
