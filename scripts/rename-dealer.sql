-- Update dealer name from ISTANA MOBIL TRIO MOTOR to ISTANA MOBIL TRIO BANJARBARU
-- This script updates all tables that reference this dealer name

-- 1. Update dealers table
UPDATE public.dealers 
SET nama_dealer = 'ISTANA MOBIL TRIO BANJARBARU'
WHERE nama_dealer = 'ISTANA MOBIL TRIO MOTOR';

-- 2. Update users table
UPDATE public.users 
SET dealer = 'ISTANA MOBIL TRIO BANJARBARU'
WHERE dealer = 'ISTANA MOBIL TRIO MOTOR';

-- 3. Update orders table
UPDATE public.orders 
SET dealer = 'ISTANA MOBIL TRIO BANJARBARU'
WHERE dealer = 'ISTANA MOBIL TRIO MOTOR';

-- 4. Update simulasi table
UPDATE public.simulasi 
SET dealer = 'ISTANA MOBIL TRIO BANJARBARU'
WHERE dealer = 'ISTANA MOBIL TRIO MOTOR';

-- 5. Update aktivitas table
UPDATE public.aktivitas 
SET dealer = 'ISTANA MOBIL TRIO BANJARBARU'
WHERE dealer = 'ISTANA MOBIL TRIO MOTOR';

-- Verify the updates
SELECT 'Dealers updated:' as status, COUNT(*) as count FROM public.dealers WHERE nama_dealer = 'ISTANA MOBIL TRIO BANJARBARU'
UNION ALL
SELECT 'Users updated:' as status, COUNT(*) as count FROM public.users WHERE dealer = 'ISTANA MOBIL TRIO BANJARBARU'
UNION ALL
SELECT 'Orders updated:' as status, COUNT(*) as count FROM public.orders WHERE dealer = 'ISTANA MOBIL TRIO BANJARBARU'
UNION ALL
SELECT 'Simulasi updated:' as status, COUNT(*) as count FROM public.simulasi WHERE dealer = 'ISTANA MOBIL TRIO BANJARBARU'
UNION ALL
SELECT 'Aktivitas updated:' as status, COUNT(*) as count FROM public.aktivitas WHERE dealer = 'ISTANA MOBIL TRIO BANJARBARU';
