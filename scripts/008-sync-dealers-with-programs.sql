-- Synchronize dealers with active programs
-- Keep only dealers whose brands have active programs
-- Programs exist for: Toyota, Suzuki, JAECOO, Honda, Mitsubishi, Daihatsu
-- Delete dealers from brands: Isuzu, Wuling, Chery, Hyundai, Hino, Nissan, Mazda

-- First, show which dealers will be deleted
SELECT 
  kode_dealer as "Kode",
  nama_dealer as "Nama Dealer",
  merk as "Merk yang dihapus"
FROM dealers 
WHERE merk IN ('Isuzu', 'Wuling', 'Chery', 'Hyundai', 'Hino', 'Nissan', 'Mazda')
ORDER BY merk, nama_dealer;

-- Delete dealers that don't have active programs
DELETE FROM dealers 
WHERE merk IN ('Isuzu', 'Wuling', 'Chery', 'Hyundai', 'Hino', 'Nissan', 'Mazda');

-- Show remaining dealers organized by brand
SELECT merk, COUNT(*) as "Jumlah Dealer"
FROM dealers
GROUP BY merk
ORDER BY merk;

-- List remaining dealers by brand
SELECT 
  merk as "Merk",
  kode_dealer as "Kode",
  nama_dealer as "Nama Dealer"
FROM dealers
ORDER BY merk, nama_dealer;
