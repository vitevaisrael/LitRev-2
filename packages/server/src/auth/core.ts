import type { FastifyInstance, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { ENV } from "../config/auth";

export type JwtUser = { id: string; email: string; name?: string };

export async function registerJwt(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: ENV.JWT_ACCESS_SECRET,
    cookie: { cookieName: ENV.AUTH_COOKIE_NAME, signed: false },
    sign: { expiresIn: ENV.JWT_ACCESS_TTL }
  });

  app.decorate("signAccess", (payload: JwtUser) =>
    app.jwt.sign(payload, { expiresIn: ENV.JWT_ACCESS_TTL })
  );

  app.decorate("signRefresh", (payload: JwtUser) =>
    app.jwt.sign(payload, { expiresIn: ENV.JWT_REFRESH_TTL })
  );

  app.decorate("setAuthCookies", (reply: FastifyReply, access: string, refresh: string) => {
    const common = {
      httpOnly: true,
      sameSite: ENV.AUTH_SECURE_COOKIES ? "none" : "lax",
      secure: ENV.AUTH_SECURE_COOKIES,
      path: "/",
      domain: ENV.AUTH_COOKIE_DOMAIN || undefined
    } as const;
    reply
      .setCookie(ENV.AUTH_COOKIE_NAME, access, common)
      .setCookie(ENV.AUTH_REFRESH_COOKIE_NAME, refresh, common);
  });

  app.decorate("clearAuthCookies", (reply: FastifyReply) => {
    reply
      .clearCookie(ENV.AUTH_COOKIE_NAME, { path: "/" })
      .clearCookie(ENV.AUTH_REFRESH_COOKIE_NAME, { path: "/" });
  });
}

declare module "fastify" {
  interface FastifyInstance {
    signAccess(payload: JwtUser): string;
    signRefresh(payload: JwtUser): string;
    setAuthCookies(reply: FastifyReply, access: string, refresh: string): void;
    clearAuthCookies(reply: FastifyReply): void;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: JwtUser;
  }
}

