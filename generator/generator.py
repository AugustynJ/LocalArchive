#!/usr/bin/env python3
"""Generator danych LocalArchive (F13/T11) – emulator „urządzenia” wysyłającego zdjęcia przez API.

Generuje obrazy krajobrazów (Pillow) z metadanymi i wysyła je przez POST /api/v1/photos/add,
tak jak robiłby to aparat lub fotopułapka. Nie zapisuje niczego bezpośrednio w bazie danych.

Tryby:
  historyczny  --count N            seria N zdjęć (np. z kolejnych lat: --year-mode sequence)
  bieżący      --interval S         jedno zdjęcie co S sekund, do Ctrl+C lub do --count

Dane logowania (nigdy w kodzie) – kolejność pierwszeństwa:
  1. parametry --basic-auth / --email / --password
  2. zmienne środowiskowe LA_BASIC_AUTH / LA_EMAIL / LA_PASSWORD / LA_API_URL
  3. plik generator/.env (KLUCZ=wartość, poza repozytorium)

Przykłady: patrz generator/README.md
"""
import argparse
import io
import math
import os
import random
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from PIL import Image, ImageDraw

DEFAULT_API_URL = 'https://localarchive-421271501355.europe-central2.run.app'
SESSION_REFRESH_AFTER = 13 * 60  # s – token dostępu jest ważny 15 min
REQUEST_TIMEOUT = 30            # s

SCENES = {
    'mountains': ('Góry', ['Zakopane', 'Szczyrk', 'Karpacz', 'Wisła', 'Bukowina Tatrzańska', 'Ustrzyki Górne']),
    'sea':       ('Morze', ['Łeba', 'Sopot', 'Hel', 'Międzyzdroje', 'Kołobrzeg', 'Ustka']),
    'lake':      ('Jezioro', ['Mikołajki', 'Giżycko', 'Augustów', 'Ełk', 'Węgorzewo', 'Ruciane-Nida']),
    'city':      ('Miasto', ['Kraków', 'Warszawa', 'Wrocław', 'Gdańsk', 'Poznań', 'Łódź']),
}
# Pora dnia wg jasności sceny (0 = noc, 1 = południe)
PHASES = [(0.2, 'noc'), (0.4, 'zmierzch'), (0.6, 'świt'), (0.8, 'poranek'), (1.01, 'południe')]


# ───────────────────────────── konfiguracja ─────────────────────────────

def load_env_file(path):
    """Wczytuje KLUCZ=wartość z pliku (bez nadpisywania istniejących zmiennych środowiskowych)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def parse_years(text):
    try:
        start, end = (int(x) for x in text.split('-', 1))
    except ValueError:
        raise argparse.ArgumentTypeError('zakres lat w formacie OD-DO, np. 1990-2025')
    if start > end:
        raise argparse.ArgumentTypeError('początek zakresu większy niż koniec')
    return start, end


def parse_args():
    p = argparse.ArgumentParser(description='Generator zdjęć dla LocalArchive (wysyła przez API).')
    p.add_argument('--api-url', default=None, help=f'adres aplikacji (domyślnie LA_API_URL lub {DEFAULT_API_URL})')
    p.add_argument('--basic-auth', default=None, help='dane Basic Auth "użytkownik:hasło" (lub LA_BASIC_AUTH)')
    p.add_argument('--email', default=None, help='e-mail konta edytora (lub LA_EMAIL)')
    p.add_argument('--password', default=None, help='hasło konta edytora (lub LA_PASSWORD)')
    mode = p.add_argument_group('tryb wysyłania')
    mode.add_argument('--count', type=int, default=None, help='liczba zdjęć (tryb historyczny; w bieżącym – limit)')
    mode.add_argument('--interval', type=float, default=None, help='tryb bieżący: odstęp w sekundach między zdjęciami')
    gen = p.add_argument_group('sposób generowania')
    gen.add_argument('--scene', choices=[*SCENES, 'random'], default='random', help='rodzaj krajobrazu (domyślnie random)')
    gen.add_argument('--year-mode', choices=['random', 'sequence', 'fixed', 'current'], default=None,
                     help='random – losowo z --years; sequence – kolejne lata od początku --years; '
                          'fixed – zawsze --year; current – bieżący rok (domyślnie: current dla --interval, random dla --count)')
    gen.add_argument('--years', type=parse_years, default=(1990, datetime.now().year), help='zakres lat OD-DO (domyślnie 1990-bieżący)')
    gen.add_argument('--year', type=int, default=None, help='rok dla --year-mode fixed (np. 2030, by pokazać odrzucenie)')
    gen.add_argument('--light-mode', choices=['random', 'sine'], default='random',
                     help='jasność sceny: random albo sine – sinusoidalny cykl dnia między kolejnymi zdjęciami')
    gen.add_argument('--period', type=int, default=12, help='liczba zdjęć na pełny cykl dnia w trybie sine (domyślnie 12)')
    gen.add_argument('--seed', type=int, default=None, help='ziarno losowości (powtarzalne dane)')
    args = p.parse_args()

    if args.count is None and args.interval is None:
        p.error('podaj --count (tryb historyczny) i/lub --interval (tryb bieżący)')
    if args.count is not None and args.count < 1:
        p.error('--count musi być ≥ 1')
    if args.interval is not None and args.interval < 1:
        p.error('--interval musi być ≥ 1 s')
    if args.year_mode is None:
        args.year_mode = 'current' if args.interval is not None else 'random'
    if args.year_mode == 'fixed' and args.year is None:
        p.error('--year-mode fixed wymaga --year')
    if args.year is not None and args.year_mode not in ('fixed', None):
        args.year_mode = 'fixed'
    if args.period < 2:
        p.error('--period musi być ≥ 2')

    args.api_url = (args.api_url or os.environ.get('LA_API_URL') or DEFAULT_API_URL).rstrip('/')
    args.basic_auth = args.basic_auth or os.environ.get('LA_BASIC_AUTH')
    args.email = args.email or os.environ.get('LA_EMAIL')
    args.password = args.password or os.environ.get('LA_PASSWORD')
    missing = [n for n, v in (('Basic Auth', args.basic_auth), ('e-mail', args.email), ('hasło', args.password)) if not v]
    if missing:
        p.error(f'brak danych logowania: {", ".join(missing)} – podaj parametry, zmienne LA_* lub generator/.env')
    if ':' not in args.basic_auth:
        p.error('Basic Auth w formacie "użytkownik:hasło"')
    return args


# ───────────────────────────── generowanie obrazów ─────────────────────────────

def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def render_scene(scene, light, rnd):
    """Rysuje krajobraz 1200×800; light ∈ [0, 1] steruje kolorem nieba (noc → południe). Zwraca bajty JPEG."""
    w, h = 1200, 800
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    sky_top = mix((10, 15, 40), (40, 110, 200), light)
    sky_bottom = mix((40, 30, 70), (200, 225, 245), light)
    if 0.3 < light < 0.6:                       # świt/zmierzch – ciepły horyzont
        sky_bottom = mix(sky_bottom, (250, 150, 90), 0.6)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(sky_top, sky_bottom, y / h))
    dim = 0.35 + 0.65 * light                   # przyciemnienie terenu nocą

    if light < 0.3:                             # gwiazdy
        for _ in range(120):
            x, y = rnd.randint(0, w), rnd.randint(0, h // 2)
            d.point((x, y), fill=(230, 230, 255))

    if scene == 'mountains':
        base_color = (70, 90, 80)
        for shade, base in ((0.6, 520), (1.0, 600)):
            pts, x = [(0, h)], 0
            while x <= w:
                pts.append((x, base - rnd.randint(0, 300)))
                x += rnd.randint(80, 180)
            pts += [(w, base), (w, h)]
            d.polygon(pts, fill=tuple(int(c * shade * dim) for c in base_color))
            for px, py in pts[1:-2]:
                if py < base - 180:
                    d.polygon([(px, py), (px - 30, py + 40), (px + 30, py + 40)], fill=mix((120, 120, 140), (245, 245, 250), light))
    elif scene in ('sea', 'lake'):
        water = (30, 80, 140) if scene == 'sea' else (40, 110, 60)
        sun_y = int(470 - 200 * light)
        sun = (250, 245, 220) if light >= 0.3 else (220, 220, 240)    # nocą księżyc
        d.ellipse([w // 2 - 70, sun_y - 70, w // 2 + 70, sun_y + 70], fill=sun)
        d.rectangle([0, 450, w, h], fill=tuple(int(c * dim) for c in water))
        for _ in range(60):
            x, y = rnd.randint(0, w), rnd.randint(460, h)
            d.line([(x, y), (x + rnd.randint(20, 60), y)], fill=tuple(min(255, int(c * dim) + 60) for c in water), width=2)
        if scene == 'lake':
            for x in range(0, w, 25):
                th = rnd.randint(60, 140)
                d.polygon([(x, 450), (x + 12, 450 - th), (x + 24, 450)], fill=tuple(int(c * dim) for c in (20, 70, 35)))
    else:  # city
        d.rectangle([0, 620, w, h], fill=tuple(int(c * dim) for c in (50, 40, 40)))
        x = 0
        lit = 0.75 - 0.6 * light                # nocą świeci się więcej okien
        while x < w:
            bw, bh = rnd.randint(60, 130), rnd.randint(150, 420)
            d.rectangle([x, 620 - bh, x + bw, 620], fill=tuple(int(c * dim) for c in (70, 65, 80)))
            for wy in range(620 - bh + 15, 610, 30):
                for wx in range(x + 10, x + bw - 10, 22):
                    if rnd.random() < lit:
                        d.rectangle([wx, wy, wx + 10, wy + 14], fill=(250, 210, 120))
            x += bw + rnd.randint(0, 15)

    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=82)
    return buf.getvalue()


def phase_name(light):
    return next(name for limit, name in PHASES if light < limit)


# ───────────────────────────── klient API ─────────────────────────────

class ApiError(Exception):
    pass


class LocalArchiveClient:
    """Sesja z aplikacją: Basic Auth (nginx) + logowanie konta, odświeżanie tokenu (ważny 15 min)."""

    def __init__(self, api_url, basic_auth, email, password):
        self.api = api_url + '/api/v1'
        self.email, self.password = email, password
        self.s = requests.Session()
        self.s.auth = tuple(basic_auth.split(':', 1))
        self.token_time = 0

    def _check_basic(self, r):
        if r.status_code == 401 and 'WWW-Authenticate' in r.headers:
            raise ApiError('błędne dane Basic Auth (odrzucone przez serwer przed aplikacją)')

    def login(self):
        r = self.s.post(f'{self.api}/login', json={'email': self.email, 'password': self.password}, timeout=REQUEST_TIMEOUT)
        self._check_basic(r)
        if r.status_code == 429:
            raise ApiError('zbyt wiele prób logowania (limit 10/min) – odczekaj minutę')
        if r.status_code != 200:
            raise ApiError(f'logowanie nieudane ({r.status_code}): {self._msg(r)}')
        self.token_time = time.monotonic()
        info = self.s.get(f'{self.api}/user/info', timeout=REQUEST_TIMEOUT).json()
        if info.get('role') not in ('editor', 'admin'):
            raise ApiError(f'konto {self.email} ma rolę „{info.get("role")}” – dodawanie zdjęć wymaga roli editor lub admin')
        return info

    def ensure_session(self):
        if time.monotonic() - self.token_time < SESSION_REFRESH_AFTER:
            return
        r = self.s.post(f'{self.api}/token/refresh', timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            self.token_time = time.monotonic()
        else:                                    # token odświeżania wygasł (60 min) lub sesję unieważniono
            self.login()

    def upload(self, image_bytes, title, location, year):
        self.ensure_session()
        data = {'title': title, 'location': location}
        if year is not None:
            data['year'] = str(year)
        files = {'file': ('generator.jpg', image_bytes, 'image/jpeg')}
        r = self.s.post(f'{self.api}/photos/add', files=files, data=data, timeout=REQUEST_TIMEOUT)
        if r.status_code == 401:                 # sesja wygasła w międzyczasie – jedna ponowna próba
            self._check_basic(r)
            self.login()
            r = self.s.post(f'{self.api}/photos/add', files=files, data=data, timeout=REQUEST_TIMEOUT)
        return r

    @staticmethod
    def _msg(r):
        try:
            body = r.json()
            return body.get('error') or body.get('message') or '; '.join(body.get('errors', [])) or r.text
        except ValueError:
            return r.text.strip()[:200] or r.reason


# ───────────────────────────── główna pętla ─────────────────────────────

def main():
    load_env_file(Path(__file__).resolve().parent / '.env')
    args = parse_args()
    rnd = random.Random(args.seed)
    client = LocalArchiveClient(args.api_url, args.basic_auth, args.email, args.password)

    try:
        info = client.login()
    except (ApiError, requests.RequestException) as e:
        sys.exit(f'✖ {e}')
    live = args.interval is not None
    print(f'Połączono z {args.api_url} jako {info["email"]} ({info["role"]}). '
          f'Tryb: {"bieżący, co " + str(args.interval) + " s" if live else "historyczny"}'
          f'{", limit " + str(args.count) if args.count else ""}. Ctrl+C kończy.\n')

    stopping = False
    def stop(*_):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGINT, stop)

    stats = {'ok': 0, 'rejected': 0, 'error': 0}
    year_from, year_to = args.years
    i = 0
    while not stopping and (args.count is None or i < args.count):
        if args.year_mode == 'random':
            year = rnd.randint(year_from, year_to)
        elif args.year_mode == 'sequence':
            year = year_from + i % (year_to - year_from + 1)
        elif args.year_mode == 'fixed':
            year = args.year
        else:
            year = datetime.now().year
        if args.light_mode == 'sine':
            light = 0.5 + 0.5 * math.sin(2 * math.pi * i / args.period - math.pi / 2)   # start: noc
        else:
            light = rnd.uniform(0.1, 1.0)
        scene = rnd.choice(list(SCENES)) if args.scene == 'random' else args.scene
        label, places = SCENES[scene]
        title = f'{label} – {phase_name(light)}'
        location = f'{rnd.choice(places)}, Polska'

        prefix = f'[{i + 1}{"/" + str(args.count) if args.count else ""}]'
        try:
            r = client.upload(render_scene(scene, light, rnd), title, location, year)
            if r.status_code == 201:
                stats['ok'] += 1
                print(f'{prefix} ✔ 201  „{title}” ({year}, {location})  id={r.json()["id"]}')
            elif r.status_code in (400, 413, 422):
                stats['rejected'] += 1
                print(f'{prefix} ✖ {r.status_code}  ODRZUCONO przez serwer: {client._msg(r)}  (rok {year})')
            else:
                stats['error'] += 1
                print(f'{prefix} ✖ {r.status_code}  błąd serwera: {client._msg(r)}')
        except (ApiError, requests.RequestException) as e:
            stats['error'] += 1
            print(f'{prefix} ✖ błąd połączenia: {e}')

        i += 1
        if live and not stopping and (args.count is None or i < args.count):
            deadline = time.monotonic() + args.interval
            while not stopping and time.monotonic() < deadline:
                time.sleep(0.2)

    print(f'\nWysłano: {stats["ok"]}, odrzucono: {stats["rejected"]}, błędy: {stats["error"]}.')
    sys.exit(0 if stats['error'] == 0 else 1)


if __name__ == '__main__':
    main()
