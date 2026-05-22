import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashSecret(secret: string) {
  return bcrypt.hash(secret, BCRYPT_ROUNDS);
}

export async function verifySecret(secret: string, secretHash: string) {
  return bcrypt.compare(secret, secretHash);
}
