-- Migration: Change ID columns from UUID to TEXT for compatibility
-- This allows both UUID format and custom ID formats (like nanoid)

-- First, drop all foreign key constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_sales_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cmo_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_claimed_by_fkey;
ALTER TABLE order_notes DROP CONSTRAINT IF EXISTS order_notes_order_id_fkey;
ALTER TABLE order_notes DROP CONSTRAINT IF EXISTS order_notes_user_id_fkey;
ALTER TABLE tenor_bunga DROP CONSTRAINT IF EXISTS tenor_bunga_program_id_fkey;
ALTER TABLE simulasi DROP CONSTRAINT IF EXISTS simulasi_user_id_fkey;
ALTER TABLE simulasi DROP CONSTRAINT IF EXISTS simulasi_cmo_id_fkey;
ALTER TABLE aktivitas DROP CONSTRAINT IF EXISTS aktivitas_user_id_fkey;

-- Alter users table
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

-- Alter programs table
ALTER TABLE programs ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE programs ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

-- Alter tenor_bunga table
ALTER TABLE tenor_bunga ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE tenor_bunga ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE tenor_bunga ALTER COLUMN program_id TYPE TEXT USING program_id::TEXT;

-- Alter dealers table
ALTER TABLE dealers ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE dealers ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

-- Alter orders table
ALTER TABLE orders ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE orders ALTER COLUMN sales_id TYPE TEXT USING sales_id::TEXT;
ALTER TABLE orders ALTER COLUMN cmo_id TYPE TEXT USING cmo_id::TEXT;
ALTER TABLE orders ALTER COLUMN claimed_by TYPE TEXT USING claimed_by::TEXT;

-- Alter order_notes table
ALTER TABLE order_notes ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE order_notes ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE order_notes ALTER COLUMN order_id TYPE TEXT USING order_id::TEXT;
ALTER TABLE order_notes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Alter simulasi table
ALTER TABLE simulasi ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE simulasi ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE simulasi ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE simulasi ALTER COLUMN cmo_id TYPE TEXT USING cmo_id::TEXT;

-- Alter aktivitas table
ALTER TABLE aktivitas ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE aktivitas ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE aktivitas ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Re-add foreign key constraints (without strict UUID validation)
ALTER TABLE orders ADD CONSTRAINT orders_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES users(id);
ALTER TABLE orders ADD CONSTRAINT orders_cmo_id_fkey FOREIGN KEY (cmo_id) REFERENCES users(id);
ALTER TABLE orders ADD CONSTRAINT orders_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES users(id);
ALTER TABLE order_notes ADD CONSTRAINT order_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE order_notes ADD CONSTRAINT order_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE tenor_bunga ADD CONSTRAINT tenor_bunga_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
ALTER TABLE simulasi ADD CONSTRAINT simulasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE simulasi ADD CONSTRAINT simulasi_cmo_id_fkey FOREIGN KEY (cmo_id) REFERENCES users(id);
ALTER TABLE aktivitas ADD CONSTRAINT aktivitas_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
