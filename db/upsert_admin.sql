-- Tworzy konto admina (lub nadaje istniejącemu rolę admina i nowe hasło).
-- Użycie: psql -v email=... -v pw_hash='$argon2id$...' -f upsert_admin.sql   (hash z deploy/create_admin.sh)
INSERT INTO users (first_name, last_name, email, password, role, is_blocked)
VALUES ('Admin', 'LocalArchive', lower(:'email'), :'pw_hash', 'admin', false)
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'admin', is_blocked = false;
