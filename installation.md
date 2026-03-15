# Installation Guide

Deze handleiding zet deze applicatie live op een STRATO VPS/Server met:

- Docker
- Traefik als reverse proxy
- automatische Let's Encrypt SSL
- geforceerde redirect naar de `www`-variant
- geen `:3000` in de URL
- deploys via `git pull`
- MariaDB + optioneel phpMyAdmin
- persistente opslag voor uploads, images en WebP-bestanden

Deze route gebruikt **geen SSL in `server.js` zelf**. De Node-app draait intern op HTTP en Traefik handelt HTTPS af.

## 1. Uitgangspunten

- Server: STRATO VPS / Linux server met Docker-ondersteuning
- Domein: `fotohuisvenray.nl`
- Canonieke URL: `https://www.fotohuisvenray.nl`
- Repo: deze repository
- App draait intern op poort `3000`
- SSL wordt automatisch vernieuwd door Traefik

Belangrijk voor deze codebase:

- `server.js` gebruikt nu `USE_HTTPS` om te kiezen tussen HTTP en HTTPS
- voor deze setup moet `USE_HTTPS=false` blijven
- `db.js` gebruikt nu `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `DB_NAME` uit `.env`
- je database mag dus via `DB_NAME` bepaald worden, bijvoorbeeld `fotohuis`
- `SSL_KEY_PATH` en `SSL_CERT_PATH` zijn in deze Docker/Traefik setup niet nodig
- uploads gaan naar `public/media`
- logo's, favicons en andere site-images kunnen in `public/images` staan
- gegenereerde WebP-bestanden gaan naar `public/media-webp`
- deze mappen moeten buiten de container persistent worden opgeslagen
- alle submappen die gebruikers in het CMS onder `public/media` aanmaken moeten ook persistent blijven

## 2. DNS instellen

Zet bij STRATO DNS:

- `A` record `@` -> IP van je server
- `A` record `www` -> IP van je server

In deze handleiding draait phpMyAdmin niet op een subdomein, maar op dezelfde host via poort `8443`.

## 3. Inloggen op de server

Log in via SSH:

```bash
ssh root@JOUW_SERVER_IP
```

Of met een andere gebruiker:

```bash
ssh jouwgebruiker@JOUW_SERVER_IP
```

## 4. Docker en basispackages installeren

Voer dit uit op de server:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

Firewall openen:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8443
sudo ufw enable
sudo ufw status
```

## 5. Projectmap maken

Maak een vaste map voor het project:

```bash
sudo mkdir -p /opt/fotohuis
sudo chown -R $USER:$USER /opt/fotohuis
cd /opt/fotohuis
```

## 6. Repository clonen

Clone de repository:

```bash
git clone https://github.com/JOUW_GITHUB_ACCOUNT/Fotohuis.git .
```

Controleer:

```bash
ls -la
```

Je moet hier onder andere zien:

- `server.js`
- `package.json`
- `Dockerfile`
- `.env.example`
- `docker-compose.production.yml`
- `scripts/init-production-storage.sh`

## 7. Productie `.env` maken

Kopieer eerst het voorbeeldbestand:

```bash
cd /opt/fotohuis
cp .env.example .env
```

Open daarna `.env`:

```bash
nano /opt/fotohuis/.env
```

Vul minimaal deze waarden aan of controleer ze:

- `BASE_URL=https://www.fotohuisvenray.nl`
- `SESSION_SECRET=...`
- `TRAEFIK_ACME_EMAIL=...`
- `SMTP_SECRET_KEY=...`
- `DB_HOST=db`
- `DB_USER=fotohuis`
- `DB_PASSWORD=...`
- `DB_ROOT_PASSWORD=...`
- `DB_NAME=fotohuis`

Opslaan in `nano`:

1. `Ctrl + O`
2. `Enter`
3. `Ctrl + X`

Controleer:

```bash
cat /opt/fotohuis/.env
```

## 8. `server.js` hoeft niet meer handmatig aangepast te worden

Deze repository is nu al voorbereid op reverse proxy gebruik:

- `trust proxy` staat al aan
- sessies gebruiken nu `SESSION_SECRET` uit `.env`
- SSL env-namen ondersteunen zowel `CERT_*` als `SSL_*`

## 9. Production storage initialiseren

De repository bevat nu een init-script dat automatisch:

- `storage/media` maakt
- `storage/media-webp` maakt
- `storage/images` maakt
- `letsencrypt/acme.json` maakt
- standaard assets uit `public/media`, `public/media-webp` en `public/images` kopieert als de storage nog leeg is

Voer uit:

```bash
cd /opt/fotohuis
chmod +x scripts/init-production-storage.sh
./scripts/init-production-storage.sh
```

Controleer:

```bash
ls -la /opt/fotohuis/storage
ls -la /opt/fotohuis/letsencrypt
```

Belangrijk:

- alles wat in het CMS onder `/media` wordt aangemaakt, inclusief zelfgemaakte submappen en bestanden in die submappen, blijft bewaard in `/opt/fotohuis/storage/media`
- WebP-varianten blijven bewaard in `/opt/fotohuis/storage/media-webp`
- alles onder `/images`, inclusief logo's en favicons, blijft bewaard in `/opt/fotohuis/storage/images`
- een nieuwe deploy met `git pull` en `docker compose -f docker-compose.production.yml up -d --build` verwijdert deze bestanden niet
- bestanden verdwijnen alleen als iemand ze bewust verwijdert via het CMS of rechtstreeks op de server

## 10. Production compose-template gebruiken

De repository bevat nu al een productieconfig:

- `/opt/fotohuis/docker-compose.production.yml`

Controleer:

```bash
cat /opt/fotohuis/docker-compose.production.yml
```

## 11. Dockerfile controleren

Deze repository heeft al een `Dockerfile`. Controleer of die bestaat:

```bash
cat /opt/fotohuis/Dockerfile
```

Als het bestand ontbreekt, maak het dan zo:

```bash
nano /opt/fotohuis/Dockerfile
```

Met deze inhoud:

```dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

## 12. Containers starten

Start eerst alleen de database:

```bash
cd /opt/fotohuis
docker compose -f docker-compose.production.yml up -d db
```

Controleer:

```bash
docker compose -f docker-compose.production.yml ps
```

## 13. Database importeren

De `db_export.sql` in deze repository moet je **niet** behandelen als je productiebackup. Dat bestand is hier alleen handig als referentie voor structuur.

Gebruik voor live data een eigen exportbestand, bijvoorbeeld `backup-live.sql`.

Kopieer eerst je eigen databasebackup naar de server, bijvoorbeeld:

```bash
scp backup-live.sql jouwgebruiker@JOUW_SERVER_IP:/opt/fotohuis/backup-live.sql
```

Importeer daarna je eigen dump:

```bash
cd /opt/fotohuis
docker compose -f docker-compose.production.yml exec -T db mariadb -u root -pJOUW_DB_ROOT_PASSWORD fotohuis < backup-live.sql
```

Controleer eventueel:

```bash
docker compose -f docker-compose.production.yml exec db mariadb -u root -pJOUW_DB_ROOT_PASSWORD -e "SHOW DATABASES;"
docker compose -f docker-compose.production.yml exec db mariadb -u root -pJOUW_DB_ROOT_PASSWORD -e "USE fotohuis; SHOW TABLES;"
```

## 14. Alles starten

Start de volledige stack:

```bash
cd /opt/fotohuis
docker compose -f docker-compose.production.yml up -d --build
```

Controleer:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100
```

## 15. Website testen

Open:

- `https://www.fotohuisvenray.nl`

Voor phpMyAdmin:

- `https://www.fotohuisvenray.nl:8443`

Belangrijk:

- `https://fotohuisvenray.nl` zal automatisch redirecten naar `https://www.fotohuisvenray.nl`
- `https://www.fotohuisvenray.nl:8443` moet direct phpMyAdmin tonen
- bij de eerste start kan Let's Encrypt enkele minuten nodig hebben
- DNS moet al goed naar de server wijzen
- poort `80`, `443` en `8443` moeten open staan

## 16. Wat je niet hoeft te doen

In deze setup hoef je dit niet te gebruiken:

- `USE_HTTPS=true`
- `SSL_KEY_PATH`
- `SSL_CERT_PATH`
- certificaten in Node laden
- `server.js` handmatig herstarten voor SSL-renewal

Traefik handelt SSL en vernieuwing automatisch af.

## 17. Nieuwe versie live zetten

Voor een update hoef je `docker-compose.production.yml` normaal niet aan te passen.

Omdat uploads en gegenereerde afbeeldingen in `./storage/...` staan, blijven die behouden als je een nieuwe versie bouwt of de app-container opnieuw maakt.

Dat geldt ook voor:

- zelf aangemaakte mappen in de media manager
- bestanden in geneste submappen
- later geuploade afbeeldingen
- gegenereerde WebP-bestanden
- logo's in `/images`
- favicon uploads in `/images/fav`

Voer uit:

```bash
cd /opt/fotohuis
git pull origin main
./scripts/init-production-storage.sh
docker compose -f docker-compose.production.yml up -d --build
```

Controleer daarna:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100 app
```

## 18. Handige debug commando's

Status containers:

```bash
docker compose -f docker-compose.production.yml ps
```

Logs van app:

```bash
docker compose -f docker-compose.production.yml logs -f app
```

Logs van Traefik:

```bash
docker compose -f docker-compose.production.yml logs -f traefik
```

Logs van database:

```bash
docker compose -f docker-compose.production.yml logs -f db
```

App herstarten:

```bash
docker compose -f docker-compose.production.yml restart app
```

Volledige rebuild:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

## 19. Beveiligingsadvies

- Gebruik sterke wachtwoorden voor MariaDB root en de app-user
- Gebruik een lange willekeurige `SMTP_SECRET_KEY`
- Zet phpMyAdmin alleen open als nodig
- Overweeg phpMyAdmin achter extra auth of IP-restrictie te zetten, ook op `:8443`
- Maak back-ups van de databasevolume

## 20. Samenvatting van de bestanden

Bestanden die op de server moeten bestaan:

- `/opt/fotohuis/.env`
- `/opt/fotohuis/.env.example`
- `/opt/fotohuis/docker-compose.production.yml`
- `/opt/fotohuis/Dockerfile`
- `/opt/fotohuis/server.js`
- `/opt/fotohuis/scripts/init-production-storage.sh`

Optioneel als je live data importeert:

- `/opt/fotohuis/backup-live.sql`

Map die je moet maken:

- `/opt/fotohuis/letsencrypt/`
- `/opt/fotohuis/storage/`
- `/opt/fotohuis/storage/media/`
- `/opt/fotohuis/storage/media-webp/`
- `/opt/fotohuis/storage/images/`

Bestand voor certificaatopslag:

- `/opt/fotohuis/letsencrypt/acme.json`
