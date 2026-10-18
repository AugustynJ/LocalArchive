-- F4: dopuszczalny rok zdjęcia 1–2026 (wcześniej tylko > 0).
-- Dla baz utworzonych starszą wersją schema.sql. Nowe instalacje mają to już w schema.sql.
BEGIN;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_photo_year_check;
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_photo_year_range_chk;
ALTER TABLE photos ADD CONSTRAINT photos_photo_year_range_chk CHECK (photo_year BETWEEN 1 AND 2026);
COMMIT;
