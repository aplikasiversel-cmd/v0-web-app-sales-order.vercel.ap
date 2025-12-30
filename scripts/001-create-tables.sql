-- MUF Order Management Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('sales', 'cmo', 'cmh', 'admin')),
  no_hp VARCHAR(15),
  merk VARCHAR(100),
  dealer VARCHAR(255),
  jabatan VARCHAR(100),
  is_first_login BOOLEAN DEFAULT true,
  password_last_changed TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_program VARCHAR(255) NOT NULL,
  jenis_pembiayaan VARCHAR(50) NOT NULL,
  merk VARCHAR(100) NOT NULL,
  tdp_persen DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenor Bunga table (related to programs)
CREATE TABLE IF NOT EXISTS tenor_bunga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  tenor INTEGER NOT NULL,
  bunga DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Dealers table
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_dealer VARCHAR(50) UNIQUE NOT NULL,
  merk VARCHAR(100) NOT NULL,
  nama_dealer VARCHAR(255) NOT NULL,
  alamat TEXT,
  no_telp VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID REFERENCES users(id),
  sales_name VARCHAR(255) NOT NULL,
  nama_nasabah VARCHAR(255) NOT NULL,
  foto_ktp_nasabah TEXT,
  nama_pasangan VARCHAR(255),
  foto_ktp_pasangan TEXT,
  foto_kk TEXT,
  no_hp VARCHAR(15) NOT NULL,
  type_unit VARCHAR(255) NOT NULL,
  merk VARCHAR(100) NOT NULL,
  dealer VARCHAR(255) NOT NULL,
  jenis_pembiayaan VARCHAR(50) NOT NULL,
  nama_program VARCHAR(255) NOT NULL,
  otr BIGINT NOT NULL,
  tdp BIGINT NOT NULL,
  angsuran BIGINT NOT NULL,
  tenor INTEGER NOT NULL,
  cmo_id UUID REFERENCES users(id),
  cmo_name VARCHAR(255) NOT NULL,
  catatan_khusus TEXT,
  status VARCHAR(30) DEFAULT 'Baru' CHECK (status IN ('Baru', 'Claim', 'Cek Slik', 'Proses', 'Pertimbangkan', 'Map In', 'Approve', 'Reject')),
  hasil_slik TEXT,
  tanggal_survey DATE,
  checklist_ktp_pemohon BOOLEAN DEFAULT false,
  checklist_ktp_pasangan BOOLEAN DEFAULT false,
  checklist_kartu_keluarga BOOLEAN DEFAULT false,
  checklist_npwp BOOLEAN DEFAULT false,
  checklist_bkr BOOLEAN DEFAULT false,
  checklist_livin BOOLEAN DEFAULT false,
  checklist_rek_tabungan BOOLEAN DEFAULT false,
  checklist_muf_app BOOLEAN DEFAULT false,
  foto_survey TEXT[],
  claimed_by UUID REFERENCES users(id),
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Notes table
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  note TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulasi table
CREATE TABLE IF NOT EXISTS simulasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  merk VARCHAR(100) NOT NULL,
  dealer VARCHAR(255) NOT NULL,
  jenis_pembiayaan VARCHAR(50) NOT NULL,
  nama_program VARCHAR(255) NOT NULL,
  otr BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL,
  tdp BIGINT,
  angsuran BIGINT,
  cmo_id UUID REFERENCES users(id),
  cmo_name VARCHAR(255),
  hasil_simulasi JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aktivitas table
CREATE TABLE IF NOT EXISTS aktivitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  jenis_aktivitas VARCHAR(50) NOT NULL,
  tanggal DATE NOT NULL,
  pic_dealer VARCHAR(255) NOT NULL,
  dealer VARCHAR(255) NOT NULL,
  foto_aktivitas TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_merk ON users(merk);
CREATE INDEX IF NOT EXISTS idx_orders_sales_id ON orders(sales_id);
CREATE INDEX IF NOT EXISTS idx_orders_cmo_id ON orders(cmo_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_merk ON orders(merk);
CREATE INDEX IF NOT EXISTS idx_programs_merk ON programs(merk);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
