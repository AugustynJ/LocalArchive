# Generator danych LocalArchive (F13 / T11)

Konsolowe narzędzie w Pythonie emulujące urządzenie (aparat, fotopułapkę), które **wysyła
zdjęcia przez API aplikacji** – `POST /api/v1/photos/add` – dokładnie tak jak użytkownik
z rolą `editor`. Generator nigdy nie zapisuje danych bezpośrednio do bazy.

Każde zdjęcie to wygenerowany obraz krajobrazu (JPEG 1200×800, ok. 25–75 kB) z metadanymi:

| Pole | Wartość |
|---|---|
| tytuł | rodzaj sceny i pora dnia, np. „Morze – zmierzch” |
| lokalizacja | losowa miejscowość pasująca do sceny, np. „Łeba, Polska” |
| rok | wg `--year-mode` – odpowiednik znacznika czasu pomiaru |

## Wymagania i instalacja

- Python 3.10+
- dostęp do aplikacji (dane Basic Auth) i konto z rolą `editor` lub `admin`

```bash
cd generator
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Dane logowania

Dane logowania **nie są zapisane w kodzie**. Generator pobiera je (w tej kolejności) z:

1. parametrów `--basic-auth`, `--email`, `--password`, `--api-url`,
2. zmiennych środowiskowych `LA_BASIC_AUTH`, `LA_EMAIL`, `LA_PASSWORD`, `LA_API_URL`,
3. pliku `generator/.env` – wczytywanego automatycznie, wyłączonego z repozytorium
   (`.gitignore`). Wzór: `generator/.env.example`.

Do generatora przeznaczone jest osobne konto edytora `generator@localarchive.test`
(zakłada je administrator: rejestracja + nadanie roli `editor` w panelu „Zarządzanie użytkownikami”).

## Parametry

| Parametr | Opis | Domyślnie |
|---|---|---|
| `--api-url URL` | adres aplikacji | `LA_API_URL` lub adres produkcyjny |
| `--basic-auth U:H` | dane Basic Auth (nginx) | `LA_BASIC_AUTH` |
| `--email`, `--password` | konto z rolą `editor`/`admin` | `LA_EMAIL`, `LA_PASSWORD` |
| `--count N` | liczba zdjęć; w trybie bieżącym – limit | – |
| `--interval S` | **tryb bieżący**: jedno zdjęcie co S sekund (≥ 1), do Ctrl+C lub `--count` | – |
| `--scene` | `mountains`, `sea`, `lake`, `city`, `random` | `random` |
| `--year-mode` | `random` – losowy rok z `--years`; `sequence` – kolejne lata od początku `--years`; `fixed` – zawsze `--year`; `current` – bieżący rok | `current` dla `--interval`, `random` dla `--count` |
| `--years OD-DO` | zakres lat dla `random` / `sequence` | `1990-<bieżący rok>` |
| `--year R` | stały rok (włącza `fixed`), np. `2030` do pokazania odrzucenia | – |
| `--light-mode` | jasność sceny: `random` albo `sine` – sinusoidalny cykl dnia (noc → świt → południe → zmierzch) | `random` |
| `--period N` | liczba zdjęć na pełny cykl dnia w trybie `sine` | `12` |
| `--seed N` | ziarno losowości (powtarzalne dane) | – |

Wymagane jest `--count` (tryb historyczny) lub `--interval` (tryb bieżący), albo oba.

## Przykłady

```bash
# Tryb historyczny – seria 15 zdjęć gór z kolejnych lat 2010–2024 (dane przykładowe)
python generator.py --count 15 --scene mountains --year-mode sequence --years 2010-2024

# Dane przykładowe dla trzech „serii” (scen) po 15 zdjęć
for s in mountains sea city; do python generator.py --count 15 --scene $s --year-mode sequence --years 2010-2024; done

# Tryb bieżący – zdjęcie co 10 s z cyklem dnia, do Ctrl+C
python generator.py --interval 10 --light-mode sine

# Odrzucenie przez serwer – rok spoza dopuszczalnego zakresu 1–2026
python generator.py --count 1 --year 2030
```

Przykładowy wynik:

```
$ python generator.py --count 3 --scene mountains --year-mode sequence --years 2010-2012 --light-mode sine --period 4
Połączono z https://… jako generator@localarchive.test (editor). Tryb: historyczny, limit 3. Ctrl+C kończy.

[1/3] ✔ 201  „Góry – noc” (2010, Zakopane, Polska)  id=42
[2/3] ✔ 201  „Góry – świt” (2011, Szczyrk, Polska)  id=43
[3/3] ✔ 201  „Góry – południe” (2012, Karpacz, Polska)  id=44

Wysłano: 3, odrzucono: 0, błędy: 0.

$ python generator.py --count 1 --year 2030
[1/1] ✖ 422  ODRZUCONO przez serwer: Year must be between 1 and 2026  (rok 2030)

Wysłano: 0, odrzucono: 1, błędy: 0.
```

Odrzucenia (kody 400/413/422) są wypisywane z komunikatem serwera, a serwer zapisuje je
w logu błędów. Kod wyjścia: `0` – bez błędów połączenia/serwera, `1` – wystąpiły błędy.

## Uwagi

- Sesja: token dostępu aplikacji jest ważny 15 min – generator odświeża go automatycznie
  (`/api/v1/token/refresh`), a po wygaśnięciu tokenu odświeżania (60 min) loguje się ponownie.
- Limit logowań w aplikacji to 10/min – generator loguje się raz na uruchomienie.
- Wygenerowane zdjęcia można usunąć w panelu „Moje zdjęcia” konta generatora
  albo w „Zarządzanie zdjęciami” (administrator).
