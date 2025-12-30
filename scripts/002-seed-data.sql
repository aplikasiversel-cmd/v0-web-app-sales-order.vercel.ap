-- Seed initial users
INSERT INTO users (username, password, nama_lengkap, role, jabatan, is_first_login, is_active)
VALUES 
  ('Admin', 'Muf1234', 'Administrator', 'admin', 'Admin', false, true),
  ('25029956', 'cmo1234', 'Faisal Fajar', 'cmo', 'CMO', true, true),
  ('24028259', 'cmo1234', 'Robby Anggara Sasmita', 'cmo', 'CMO', true, true),
  ('23025309', 'cmh1234', 'M Sahid', 'cmh', 'CMH', true, true)
ON CONFLICT (username) DO NOTHING;

-- Seed sample programs
INSERT INTO programs (nama_program, jenis_pembiayaan, merk, tdp_persen, is_active)
VALUES 
  ('Program Regular', 'Passenger', 'Honda', 20, true),
  ('Program Promo', 'Passenger', 'Toyota', 15, true),
  ('Program EV Special', 'EV (Listrik)', 'BYD', 25, true)
ON CONFLICT DO NOTHING;

-- Get program IDs and insert tenor_bunga
DO $$
DECLARE
  prog1_id UUID;
  prog2_id UUID;
  prog3_id UUID;
BEGIN
  SELECT id INTO prog1_id FROM programs WHERE nama_program = 'Program Regular' LIMIT 1;
  SELECT id INTO prog2_id FROM programs WHERE nama_program = 'Program Promo' LIMIT 1;
  SELECT id INTO prog3_id FROM programs WHERE nama_program = 'Program EV Special' LIMIT 1;

  IF prog1_id IS NOT NULL THEN
    INSERT INTO tenor_bunga (program_id, tenor, bunga, is_active) VALUES
      (prog1_id, 12, 5.5, true),
      (prog1_id, 24, 6.0, true),
      (prog1_id, 36, 6.5, true),
      (prog1_id, 48, 7.0, true),
      (prog1_id, 60, 7.5, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF prog2_id IS NOT NULL THEN
    INSERT INTO tenor_bunga (program_id, tenor, bunga, is_active) VALUES
      (prog2_id, 12, 4.5, true),
      (prog2_id, 24, 5.0, true),
      (prog2_id, 36, 5.5, true),
      (prog2_id, 48, 6.0, true),
      (prog2_id, 60, 6.5, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF prog3_id IS NOT NULL THEN
    INSERT INTO tenor_bunga (program_id, tenor, bunga, is_active) VALUES
      (prog3_id, 12, 3.5, true),
      (prog3_id, 24, 4.0, true),
      (prog3_id, 36, 4.5, true),
      (prog3_id, 48, 5.0, true),
      (prog3_id, 60, 5.5, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
