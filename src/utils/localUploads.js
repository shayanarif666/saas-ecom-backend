const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const getPublicBaseUrl = () =>
  String(process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(
    /\/$/,
    ''
  );

const ensureUploadsDir = () => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
};

const extFromMime = (mime) => {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  return map[String(mime || '').toLowerCase()] || '.bin';
};

const parseDataUrl = (value) => {
  const raw = String(value || '');
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(raw);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
};

const isDataUrl = (value) => String(value || '').startsWith('data:image');

/**
 * Persist a buffer (or multer file) under /uploads and return a public URL.
 */
const saveBufferLocally = ({ buffer, mime, filename }) => {
  ensureUploadsDir();
  const ext =
    path.extname(String(filename || '')) ||
    extFromMime(mime) ||
    '.bin';
  const base = String(filename || 'image')
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
  const id = crypto.randomBytes(6).toString('hex');
  const storedName = `${base || 'image'}-${id}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), buffer);
  return `${getPublicBaseUrl()}/uploads/${storedName}`;
};

/**
 * If value is a data URL, write it to disk and return the public URL; otherwise return as-is.
 */
const persistDataUrlIfNeeded = (value, filenameHint = 'image') => {
  if (!isDataUrl(value)) return value;
  const parsed = parseDataUrl(value);
  if (!parsed) return value;
  return saveBufferLocally({
    buffer: parsed.buffer,
    mime: parsed.mime,
    filename: `${filenameHint}${extFromMime(parsed.mime)}`,
  });
};

module.exports = {
  UPLOADS_DIR,
  ensureUploadsDir,
  getPublicBaseUrl,
  isDataUrl,
  parseDataUrl,
  saveBufferLocally,
  persistDataUrlIfNeeded,
};
