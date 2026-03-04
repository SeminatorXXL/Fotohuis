# Fotohuis

Website + CMS voor Fotohuis Venray, gebouwd met Node.js, Express, EJS en MySQL.

## Functionaliteit

- Publieke website met dynamische pagina's en categorieen
- CMS voor o.a. pagina's, menu, categorieen, impressies, redirects en algemene bedrijfsinfo
- Dropdown menu met parent/child positie (bijv. `1` en `1.2`)
- Contactpagina met formulier, onderwerpveld, reCAPTCHA v3 en honeypot anti-spam
- `/sitemap` (visuele HTML sitemap) en `/sitemap.xml` (XML sitemap)
- Favicon upload in CMS (opslag in `public/images/fav`)

## Tech stack

- Node.js + Express
- EJS templates
- MySQL (`mysql2/promise`)
- Multer (uploads), Sharp (image processing), Nodemailer (mail)

## Vereisten

- Node.js 18+
- MySQL/MariaDB
- NPM

## Installatie

1. Installeer dependencies:

```bash
npm install
```

2. Maak een database aan (standaardnaam: `fotohuis`) en importeer:

```bash
fotohuis.sql
```

3. Maak een `.env` bestand en zet minimaal je DB en mail configuratie.

## Omgevingsvariabelen (voorbeeld)

```env
PORT=3000
USE_HTTPS=false
BASE_URL=http://localhost:3000

DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=your-password
MAIL_FROM="Website contact <mailer@example.com>"
```

Optioneel voor HTTPS:

```env
CERT_KEY_PATH=/path/to/privkey.pem
CERT_FULLCHAIN_PATH=/path/to/fullchain.pem
```

## Starten

```bash
node server.js
```

Server draait dan standaard op `http://localhost:3000`.

## Contactformulier flow

1. Form post naar `POST /contact/send`
2. Honeypot check (`company_website`) blokkeert simpele bots direct
3. Validatie op verplichte velden (`name`, `email`, `message`)
4. reCAPTCHA v3 verificatie (als keys zijn ingesteld in CMS)
5. Mail verzending via SMTP (Nodemailer)

Bij ontbrekende SMTP-configuratie wordt niet verstuurd, maar wel gelogd op de server.

## Sitemap

- `GET /sitemap` -> visuele HTML sitemap
- `GET /sitemap.xml` -> XML sitemap

## Belangrijke paden

- Publieke templates: `views/pages`
- Gedeelde onderdelen: `views/parts`
- CMS views: `admin/views`
- Routes/workers: `workers`
- Styles: `public/css`

