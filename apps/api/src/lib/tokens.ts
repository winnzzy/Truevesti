import jwt from "jsonwebtoken";
import { env } from "./env.js";

export function signAccessToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(user: { id: string; role: string }, sessionId: string) {
  return jwt.sign({ sub: user.id, role: user.role, sid: sessionId }, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

