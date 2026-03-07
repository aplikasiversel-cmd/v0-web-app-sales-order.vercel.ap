-- Check all dealers in the database
SELECT id, kode_dealer, merk, nama_dealer, is_active FROM dealers ORDER BY merk, nama_dealer;

-- Check total count
SELECT COUNT(*) as total_dealers FROM dealers;

-- Check dealers by merk
SELECT merk, COUNT(*) as dealer_count FROM dealers GROUP BY merk ORDER BY merk;

-- Check dealers by is_active status
SELECT is_active, COUNT(*) as dealer_count FROM dealers GROUP BY is_active;
