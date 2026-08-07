/**
 * Cashfree may return:
 * - short upi:// intent → render with react-native-qrcode-svg
 * - image URL / data:image / raw base64 PNG → render with <Image>
 * Never feed large base64 into QRCode (throws "data is too big").
 */

const MAX_QR_CHARS = 800;

function looksLikeBase64(value) {
  const s = String(value || '').replace(/\s/g, '');
  if (s.length < 64) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(s.slice(0, 120));
}

/**
 * @returns {{ mode: 'image', uri: string } | { mode: 'svg', value: string } | null }
 */
export function resolveQrDisplay(qrPayload, qrImageUrl) {
  if (qrImageUrl && typeof qrImageUrl === 'string') {
    const uri = normalizeImageUri(qrImageUrl);
    if (uri) return { mode: 'image', uri };
  }

  if (!qrPayload || typeof qrPayload !== 'string') return null;
  const value = qrPayload.trim();
  if (!value) return null;

  if (value.startsWith('data:image')) {
    return { mode: 'image', uri: value };
  }

  if (/^https?:\/\//i.test(value)) {
    if (/\.(png|jpe?g|svg|webp)(\?|$)/i.test(value) || /qr|image/i.test(value)) {
      return { mode: 'image', uri: value };
    }
    if (value.length <= MAX_QR_CHARS) {
      return { mode: 'svg', value };
    }
    return { mode: 'image', uri: value };
  }

  if (/^upi:\/\//i.test(value) || value.length <= MAX_QR_CHARS) {
    if (looksLikeBase64(value) && value.length > MAX_QR_CHARS) {
      return { mode: 'image', uri: `data:image/png;base64,${value.replace(/\s/g, '')}` };
    }
    return { mode: 'svg', value };
  }

  if (looksLikeBase64(value)) {
    return { mode: 'image', uri: `data:image/png;base64,${value.replace(/\s/g, '')}` };
  }

  // Too large for QR matrix — last resort as image if it might be raw bytes as base64
  return {
    mode: 'image',
    uri: `data:image/png;base64,${value.replace(/\s/g, '')}`,
  };
}

function normalizeImageUri(raw) {
  const v = String(raw).trim();
  if (!v) return null;
  if (v.startsWith('data:image') || /^https?:\/\//i.test(v)) return v;
  if (looksLikeBase64(v)) return `data:image/png;base64,${v.replace(/\s/g, '')}`;
  return v;
}

export default resolveQrDisplay;
