import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
import { tournamentOrchestrator } from "./tournament-orchestrator";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
      // Also add .repl.co variant for embedded preview
      const replCoVariant = process.env.REPLIT_DEV_DOMAIN.replace('.replit.dev', '.repl.co');
      origins.add(`https://${replCoVariant}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
        // Also add .repl.co variant
        const replCoVariant = d.trim().replace('.replit.dev', '.repl.co');
        origins.add(`https://${replCoVariant}`);
      });
    }

    // Add roachy.games webapp for admin API access
    origins.add("https://roachy.games");
    origins.add("https://www.roachy.games");

    const origin = req.header("origin");

    // Allow Replit origins (both .replit.dev and .repl.co) and roachy.games
    const isAllowedOrigin = origin && (
      origins.has(origin) ||
      origin.includes('.replit.dev') ||
      origin.includes('.repl.co') ||
      origin.includes('riker.replit.dev') ||
      origin.includes('riker.repl.co') ||
      origin.includes('roachy.games')
    );

    if (isAllowedOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, X-Admin-API-Key");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function getBuildId(): string {
  try {
    const staticBuildPath = path.resolve(process.cwd(), "static-build");
    if (!fs.existsSync(staticBuildPath)) {
      return Date.now().toString();
    }
    const entries = fs.readdirSync(staticBuildPath);
    const buildFolder = entries.find(entry => /^\d+-\d+$/.test(entry));
    return buildFolder || Date.now().toString();
  } catch {
    return Date.now().toString();
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
  buildId,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
  buildId: string;
}) {
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  
  const baseUrl = replitDevDomain ? `https://${replitDevDomain}` : `${protocol}://${host}`;
  
  const expsUrl = replitDevDomain || host?.replace(/:\d+$/, "") || "localhost";
  const expsUrlWithCache = `${expsUrl}?build=${buildId}`;

  log(`REPLIT_DEV_DOMAIN`, replitDevDomain);
  log(`baseUrl`, baseUrl);
  log(`expsUrl with cache bust`, expsUrlWithCache);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrlWithCache)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const buildId = getBuildId();
  const isDevelopment = process.env.NODE_ENV === "development";

  log("Serving static Expo files with dynamic manifest routing");
  log(`Build ID for cache busting: ${buildId}`);

  if (isDevelopment) {
    const metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      logger: console,
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }

      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }

      return metroProxy(req, res, next);
    });

    log("Development mode: Proxying web requests to Metro on port 8081");
  } else {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }

      if (req.path !== "/" && req.path !== "/manifest") {
        return next();
      }

      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }

      if (req.path === "/") {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName,
          buildId,
        });
      }

      next();
    });

    app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
    app.use(express.static(path.resolve(process.cwd(), "static-build")));
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  // Register API routes BEFORE the Metro proxy so /api requests are handled first
  const server = await registerRoutes(app);

  configureExpoAndLanding(app);

  setupErrorHandler(app);

  // Use port 8081 for static serving (maps to external port 80 in Replit)
  // This makes static bundles accessible via HTTPS on the default port
  const staticMode = process.env.EXPO_STATIC_SERVE === "true";
  const port = staticMode ? 8081 : parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}${staticMode ? " (static mode)" : ""}`);
      
      tournamentOrchestrator.start();
    },
  );
})();
