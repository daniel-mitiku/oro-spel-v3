import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose"; // Import from jose

export const JWT_SECRET = process.env.JWT_SECRET; // || "my-dummy-secret";

// // For Production

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function generateToken(userId: string): Promise<string> {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  // Use jose's SignJWT for creating tokens
  const secret = new TextEncoder().encode(JWT_SECRET);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 7; // 7 days

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret);
}

// Updated verifyToken to be an async function using jose
export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string };
  } catch (e) {
    console.error("JWT verification failed:", e);
    return null;
  }
}
