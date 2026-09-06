import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import type { Env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

export interface VerifiedIdentity {
  userId: string;
  email: string | null;
  role: string | null;
  claims: JWTPayload;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

/**
 * Verifies Supabase-issued JWTs. Supports the legacy shared HS256 secret and the newer asymmetric
 * signing keys published at `/auth/v1/.well-known/jwks.json`.
 */
export class SupabaseTokenVerifier implements TokenVerifier {
  private readonly secret: Uint8Array | null;
  private readonly jwks: JWTVerifyGetKey | null;
  private readonly issuer: string | undefined;

  constructor(env: Pick<Env, "SUPABASE_URL" | "SUPABASE_JWT_SECRET" | "SUPABASE_JWKS_URL" | "SUPABASE_JWT_ISSUER">) {
    this.secret = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : null;
    const jwksUrl = env.SUPABASE_JWKS_URL ?? (this.secret ? null : `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    this.jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
    this.issuer = env.SUPABASE_JWT_ISSUER ?? `${env.SUPABASE_URL}/auth/v1`;
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    let payload: JWTPayload;
    try {
      payload = await this.verifyWithAvailableKeys(token);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.authRequired("Invalid or expired access token");
    }
    if (!payload.sub) {
      throw AppError.authRequired("Token is missing a subject");
    }
    if (payload.aud && payload.aud !== "authenticated" && !(Array.isArray(payload.aud) && payload.aud.includes("authenticated"))) {
      throw AppError.authRequired("Token audience is not permitted");
    }
    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      role: typeof payload.role === "string" ? payload.role : null,
      claims: payload,
    };
  }

  private async verifyWithAvailableKeys(token: string): Promise<JWTPayload> {
    const options = { issuer: this.issuer, clockTolerance: 5 };
    if (this.secret) {
      try {
        return (await jwtVerify(token, this.secret, { ...options, algorithms: ["HS256"] })).payload;
      } catch (error) {
        if (!this.jwks) throw error;
      }
    }
    if (this.jwks) {
      return (await jwtVerify(token, this.jwks, { ...options, algorithms: ["ES256", "RS256"] })).payload;
    }
    throw AppError.authRequired("No token verification key configured");
  }
}
