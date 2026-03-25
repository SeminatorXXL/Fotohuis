# 🚀 Fotohuis VPS Handleiding

Deze handleiding beschrijft:
- Inloggen op de VPS
- Website updaten
- Problemen controleren
- (Optioneel) database import

---

## 🔐 Inloggen op de VPS

Open PuTTY en log in met:

- Host: 217.160.194.31
- User: root
- SSH credentials selcteer juiste key

---

## 📂 Naar projectmap gaan

```bash
cd /opt/fotohuis && git pull origin main && ./scripts/init-production-storage.sh && docker compose -f docker-compose.production.yml up -d --build