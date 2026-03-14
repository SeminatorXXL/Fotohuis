# Installation Guide

Deze handleiding zet deze applicatie live op een STRATO VPS/Server met:

- Docker
- Traefik als reverse proxy
- automatische Let's Encrypt SSL
- geforceerde redirect naar de `www`-variant
- geen `:3000` in de URL
- deploys via `git pull`
- MariaDB + optioneel phpMyAdmin
- persistente opslag voor uploads, favicons en WebP-bestanden

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
- favicons gaan naar `public/images/fav`
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

## 7. Productie `.env` maken

Maak een `.env` bestand in de projectroot:

```bash
nano /opt/fotohuis/.env
```

Plak dit erin:

```env
# Server
PORT=3000
USE_HTTPS=false
BASE_URL=https://www.fotohuisvenray.nl

# Niet gebruikt in deze Traefik setup, maar mag blijven staan
SSL_KEY_PATH=
SSL_CERT_PATH=

# Secret voor versleutelde SMTP-wachtwoorden in de database
SMTP_SECRET_KEY=VUL_HIER_EEN_LANGE_UNIEKE_GEHEIME_SLEUTEL_IN

# Database
DB_HOST=db
DB_USER=fotohuis
DB_PASSWORD=VUL_HIER_EEN_STERK_DB_WACHTWOORD_IN
DB_NAME=fotohuis

# Encryptie
BCRYPT_ROUNDS=12

# Uploads
UPLOAD_DIR=public/media

# CSRF
USE_CSRF=false
```

Opslaan in `nano`:

1. `Ctrl + O`
2. `Enter`
3. `Ctrl + X`

Controleer:

```bash
cat /opt/fotohuis/.env
```

## 8. `server.js` voorbereiden voor reverse proxy

Omdat de app achter Traefik draait, is deze wijziging aanbevolen:

Open bestand:

```bash
nano /opt/fotohuis/server.js
```

Zoek deze regel:

```js
const app = express();
```

Zet daar direct onder:

```js
app.set('trust proxy', 1);
```

Dus:

```js
const app = express();
app.set('trust proxy', 1);
```

Opslaan:

1. `Ctrl + O`
2. `Enter`
3. `Ctrl + X`

## 9. `docker-compose.yml` maken

Voordat je `docker-compose.yml` maakt, maak eerst de persistente opslagmappen:

```bash
mkdir -p /opt/fotohuis/storage/media
mkdir -p /opt/fotohuis/storage/media-webp
mkdir -p /opt/fotohuis/storage/favicons
```

Controleer:

```bash
ls -la /opt/fotohuis/storage
```

Belangrijk:

- alles wat in het CMS onder `/media` wordt aangemaakt, inclusief zelfgemaakte submappen en bestanden in die submappen, blijft bewaard in `/opt/fotohuis/storage/media`
- WebP-varianten blijven bewaard in `/opt/fotohuis/storage/media-webp`
- favicons blijven bewaard in `/opt/fotohuis/storage/favicons`
- een nieuwe deploy met `git pull` en `docker compose up -d --build` verwijdert deze bestanden niet
- bestanden verdwijnen alleen als iemand ze bewust verwijdert via het CMS of rechtstreeks op de server

Maak het bestand:

```bash
nano /opt/fotohuis/docker-compose.yml
```

Plak dit erin:

```yaml
services:
  traefik:
    image: traefik:v3.1
    command:
      - --api.dashboard=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.websecure-pma.address=:8443
      - --certificatesresolvers.le.acme.email=info@fotohuisvenray.nl
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.le.acme.httpchallenge=true
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web
    ports:
      - "80:80"
      - "443:443"
      - "8443:8443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    restart: unless-stopped

  app:
    build: .
    env_file:
      - .env
    depends_on:
      - db
    volumes:
      - ./storage/media:/app/public/media
      - ./storage/media-webp:/app/public/media-webp
      - ./storage/favicons:/app/public/images/fav
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.fotohuis.rule=Host(`www.fotohuisvenray.nl`)
      - traefik.http.routers.fotohuis.entrypoints=websecure
      - traefik.http.routers.fotohuis.tls.certresolver=le
      - traefik.http.services.fotohuis.loadbalancer.server.port=3000
      - traefik.http.routers.fotohuis-www-redirect.rule=Host(`fotohuisvenray.nl`)
      - traefik.http.routers.fotohuis-www-redirect.entrypoints=web,websecure
      - traefik.http.routers.fotohuis-www-redirect.middlewares=redirect-to-www
      - traefik.http.routers.fotohuis-www-redirect.tls.certresolver=le
      - traefik.http.routers.fotohuis-www-redirect.service=noop@internal
      - traefik.http.middlewares.redirect-to-www.redirectregex.regex=^https?://fotohuisvenray\\.nl/(.*)
      - traefik.http.middlewares.redirect-to-www.redirectregex.replacement=https://www.fotohuisvenray.nl/$${1}
      - traefik.http.middlewares.redirect-to-www.redirectregex.permanent=true

  db:
    image: mariadb:11
    environment:
      MYSQL_ROOT_PASSWORD=VUL_HIER_EEN_STERK_ROOT_WACHTWOORD_IN
      MYSQL_DATABASE=fotohuis
      MYSQL_USER=fotohuis
      MYSQL_PASSWORD=VUL_HIER_HETZELFDE_DB_WACHTWOORD_IN_ALS_IN_ENV
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  phpmyadmin:
    image: phpmyadmin:latest
    environment:
      PMA_HOST=db
      PMA_USER=root
      PMA_PASSWORD=VUL_HIER_HET_ROOT_WACHTWOORD_IN
    depends_on:
      - db
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.phpmyadmin.rule=Host(`www.fotohuisvenray.nl`)
      - traefik.http.routers.phpmyadmin.entrypoints=websecure-pma
      - traefik.http.routers.phpmyadmin.tls.certresolver=le
      - traefik.http.services.phpmyadmin.loadbalancer.server.port=80
      - traefik.http.routers.phpmyadmin-www-redirect.rule=Host(`fotohuisvenray.nl`)
      - traefik.http.routers.phpmyadmin-www-redirect.entrypoints=websecure-pma
      - traefik.http.routers.phpmyadmin-www-redirect.middlewares=redirect-to-www-pma
      - traefik.http.routers.phpmyadmin-www-redirect.tls.certresolver=le
      - traefik.http.routers.phpmyadmin-www-redirect.service=noop@internal
      - traefik.http.middlewares.redirect-to-www-pma.redirectregex.regex=^https://fotohuisvenray\\.nl:8443/(.*)
      - traefik.http.middlewares.redirect-to-www-pma.redirectregex.replacement=https://www.fotohuisvenray.nl:8443/$${1}
      - traefik.http.middlewares.redirect-to-www-pma.redirectregex.permanent=true

volumes:
  db_data:
```

Opslaan:

1. `Ctrl + O`
2. `Enter`
3. `Ctrl + X`

Controleer:

```bash
cat /opt/fotohuis/docker-compose.yml
```

## 10. Let's Encrypt opslagmap maken

Maak de map en het certificaatbestand:

```bash
mkdir -p /opt/fotohuis/letsencrypt
touch /opt/fotohuis/letsencrypt/acme.json
chmod 600 /opt/fotohuis/letsencrypt/acme.json
```

Controleer:

```bash
ls -la /opt/fotohuis/letsencrypt
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
docker compose up -d db
```

Controleer:

```bash
docker compose ps
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
docker compose exec -T db mariadb -u root -pVUL_HIER_EEN_STERK_ROOT_WACHTWOORD_IN fotohuis < backup-live.sql
```

Controleer eventueel:

```bash
docker compose exec db mariadb -u root -pVUL_HIER_EEN_STERK_ROOT_WACHTWOORD_IN -e "SHOW DATABASES;"
docker compose exec db mariadb -u root -pVUL_HIER_EEN_STERK_ROOT_WACHTWOORD_IN -e "USE fotohuis; SHOW TABLES;"
```

## 14. Alles starten

Start de volledige stack:

```bash
cd /opt/fotohuis
docker compose up -d --build
```

Controleer:

```bash
docker compose ps
docker compose logs --tail=100
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

Voor een update hoef je `docker-compose.yml` niet aan te passen.

Omdat uploads en gegenereerde afbeeldingen in `./storage/...` staan, blijven die behouden als je een nieuwe versie bouwt of de app-container opnieuw maakt.

Dat geldt ook voor:

- zelf aangemaakte mappen in de media manager
- bestanden in geneste submappen
- later geuploade afbeeldingen
- gegenereerde WebP-bestanden
- favicon uploads

Voer uit:

```bash
cd /opt/fotohuis
git pull origin main
docker compose up -d --build
```

Controleer daarna:

```bash
docker compose ps
docker compose logs --tail=100 app
```

## 18. Handige debug commando's

Status containers:

```bash
docker compose ps
```

Logs van app:

```bash
docker compose logs -f app
```

Logs van Traefik:

```bash
docker compose logs -f traefik
```

Logs van database:

```bash
docker compose logs -f db
```

App herstarten:

```bash
docker compose restart app
```

Volledige rebuild:

```bash
docker compose up -d --build
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
- `/opt/fotohuis/docker-compose.yml`
- `/opt/fotohuis/Dockerfile`
- `/opt/fotohuis/server.js`

Optioneel als je live data importeert:

- `/opt/fotohuis/backup-live.sql`

Map die je moet maken:

- `/opt/fotohuis/letsencrypt/`
- `/opt/fotohuis/storage/`
- `/opt/fotohuis/storage/media/`
- `/opt/fotohuis/storage/media-webp/`
- `/opt/fotohuis/storage/favicons/`

Bestand voor certificaatopslag:

- `/opt/fotohuis/letsencrypt/acme.json`
