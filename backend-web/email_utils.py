import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    """
    Send a password reset email to the given address.

    Required environment variables:
        SMTP_HOST       — SMTP server hostname (e.g. smtp.gmail.com)
        SMTP_PORT       — SMTP port (e.g. 587 for STARTTLS, 465 for SSL)
        SMTP_USER       — Login username / sender address
        SMTP_PASSWORD   — SMTP password or app password
        SMTP_FROM       — Display "From" address (defaults to SMTP_USER)
        FRONTEND_URL    — Base URL of the frontend (e.g. http://localhost:3000)
    """
    smtp_host = os.getenv("SMTP_HOST", "localhost")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    reset_url = f"{frontend_url}/reset_password/{reset_token}"

    # ── Plain-text version ──────────────────────────────────────────────────
    text_body = f"""\
Witaj,

Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.

Kliknij poniższy link, aby ustawić nowe hasło (link wygasa po 15 minutach):

{reset_url}

Jeśli to nie Ty wysłałeś(aś) tę prośbę, zignoruj tę wiadomość — Twoje hasło
pozostanie bez zmian.

Pozdrawiamy,
Zespół OKNO
"""

    # ── HTML version ────────────────────────────────────────────────────────
    html_body = f"""\
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c3e50;">Reset hasła</h2>
  <p>Witaj,</p>
  <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
  <p>Kliknij poniższy przycisk, aby ustawić nowe hasło.
     <strong>Link wygasa po 15 minutach.</strong></p>
  <p style="margin: 24px 0;">
    <a href="{reset_url}"
       style="background:#2980b9; color:#fff; padding:12px 24px;
              text-decoration:none; border-radius:4px; font-size:15px;">
      Resetuj hasło
    </a>
  </p>
  <p style="font-size:13px; color:#666;">
    Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:<br>
    <a href="{reset_url}">{reset_url}</a>
  </p>
  <hr style="border:none; border-top:1px solid #eee; margin:32px 0;">
  <p style="font-size:12px; color:#999;">
    Jeśli to nie Ty wysłałeś(aś) tę prośbę, zignoruj tę wiadomość.
    Twoje hasło pozostanie bez zmian.
  </p>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset hasła — OKNO"
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
