-- Nadaje rolę admina istniejącemu (zarejestrowanemu przez UI/API) kontu.
-- Użycie: psql -v email=jan@example.com -f seed_admin.sql
UPDATE users SET role = 'admin' WHERE email = lower(:'email');
