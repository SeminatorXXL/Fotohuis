const crypto = require('crypto');

const ENCRYPTED_PREFIX = 'enc:v1:';

function getSecretKey() {
  const raw = String(process.env.SMTP_SECRET_KEY || process.env.APP_SECRET || '').trim();
  if (!raw) {
    throw new Error('SMTP_SECRET_KEY ontbreekt in .env');
  }

  return crypto.createHash('sha256').update(raw).digest();
}

function isEncryptedSecret(value) {
  return String(value || '').startsWith(ENCRYPTED_PREFIX);
}

function encryptSecret(value) {
  const plaintext = String(value || '');
  if (!plaintext) return '';

  const key = getSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(value, { fallbackToPlaintext = true } = {}) {
  const raw = String(value || '');
  if (!raw) return '';
  if (!isEncryptedSecret(raw)) {
    return fallbackToPlaintext ? raw : '';
  }

  const payload = raw.slice(ENCRYPTED_PREFIX.length);
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Versleutelde secret heeft een ongeldig formaat');
  }

  const key = getSecretKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret
};
