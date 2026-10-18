-- LocalArchive – schemat bazy odtworzony z modeli SQLAlchemy (backend-web/app.py: User, Photo).
-- Uruchamiać jako właściciel bazy (np. użytkownik "postgres" w Cloud SQL).

BEGIN;

CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    first_name       VARCHAR(50)  NOT NULL,
    last_name        VARCHAR(50)  NOT NULL,
    email            VARCHAR(50)  NOT NULL UNIQUE,
    is_blocked       BOOLEAN      NOT NULL DEFAULT false,
    role             VARCHAR(20)  NOT NULL DEFAULT 'viewer',
    password         VARCHAR(255) NOT NULL,           -- hash argon2id w formacie PHC (~97 znaków)
    last_login_date  TIMESTAMPTZ,
    last_last_login  TIMESTAMPTZ,
    CONSTRAINT users_role_chk  CHECK (role IN ('admin', 'editor', 'viewer')),
    CONSTRAINT users_email_lower_chk CHECK (email = lower(email))
);

CREATE TABLE photos (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    filename    VARCHAR(500) NOT NULL UNIQUE,         -- nazwa pliku <uuid>.<ext> w buckecie
    location    VARCHAR(255),
    photo_year  INTEGER CONSTRAINT photos_photo_year_range_chk CHECK (photo_year BETWEEN 1 AND 2026),
    owner_id    INTEGER NOT NULL REFERENCES users(id),
    is_blocked  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX photos_owner_id_idx   ON photos (owner_id);
CREATE INDEX photos_created_at_idx ON photos (created_at DESC);

COMMIT;
