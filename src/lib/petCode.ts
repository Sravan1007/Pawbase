// Universal Pet ID: a short, human-shareable code distinct from the
// internal UUID — the thing an owner can quote to any vet/service.
// Excludes visually ambiguous characters (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePetCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `PP-${code}`;
}
