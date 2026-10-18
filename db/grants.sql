-- Uprawnienia użytkownika aplikacji: tylko DML, bez DDL.
-- Użycie: psql -v app_user=app -f grants.sql
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
