-- Add JAECOO merk to the merks table
INSERT INTO merks (nama, is_default, is_active, created_at)
VALUES ('JAECOO', false, true, NOW())
ON CONFLICT DO NOTHING;
