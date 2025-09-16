import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { ENV } from "../config/auth";
import { registerCSRF } from "./csrf";

export async function registerSecurity(app: FastifyInstance) {
  if (ENV.AUTH_TRUST_PROXY) {
    app.addHook('onRequest', async (request, reply) => {
      // Trust proxy headers for IP address
      const forwardedFor = request.headers['x-forwarded-for'] as string;
      if (forwardedFor) {
        (request.raw as any).ip = forwardedFor.split(',')[0].trim();
      }
    });
  }

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      const allowedOrigins = ENV.CORS_ORIGIN.split(',').map(o => o.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, allow localhost with any port
      if (ENV.NODE_ENV === 'development' && origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: ENV.CORS_CREDENTIALS,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Requested-With","X-CSRF-Token"]
  });

  // Enable helmet with proper CSP
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development
    hsts: ENV.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false
  });

  await app.register(cookie, { 
    parseOptions: {},
    secret: ENV.JWT_ACCESS_SECRET // Use JWT secret for cookie signing
  });

  // Register CSRF protection
  await registerCSRF(app);
}

