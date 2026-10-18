// Dopuszczalny rok zdjęcia – musi zgadzać się z YEAR_MIN/YEAR_MAX w backend-web/app.py
export const YEAR_MIN = 1;
export const YEAR_MAX = 2026;

// Status błędów logowania/sesji aplikacji (zamiast 401, które zarezerwowane jest dla Basic Auth
// w nginx – inaczej przeglądarka zapomina hasło Basic Auth i pyta o nie ponownie). Patrz app.py.
export const SESSION_REQUIRED = 419;
