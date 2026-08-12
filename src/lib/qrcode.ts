import QRCode from "qrcode";

// Fully offline — no external QR/maps API involved, just the `qrcode` npm
// package rendering the emergency page URL to a data URL.
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 512, margin: 2 });
}
