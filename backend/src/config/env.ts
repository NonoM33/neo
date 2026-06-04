import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // S3/MinIO
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET_PHOTOS: z.string().default('neo-photos'),
  S3_BUCKET_DOCUMENTS: z.string().default('neo-documents'),
  S3_BUCKET_SCANS: z.string().default('neo-scans'),
  S3_REGION: z.string().default('us-east-1'),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_MAX_TOKENS: z.coerce.number().default(2048),
  AI_MONTHLY_BUDGET_CENTS: z.coerce.number().default(50000),

  // OpenRouter (chatbot du site vitrine) — agrégateur compatible OpenAI.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  // Meilleur modèle pour un chatbot de conversion (FR chaleureux + tool-calling).
  OPENROUTER_MODEL: z.string().default('anthropic/claude-sonnet-4.5'),

  // Whisper (Speech-to-Text)
  WHISPER_URL: z.string().default('http://localhost:8000'),
  WHISPER_API_KEY: z.string().optional(),

  // Client Auth
  CLIENT_JWT_SECRET: z.string().min(32).optional(),
  CLIENT_JWT_EXPIRES_IN: z.string().default('1h'),
  CLIENT_JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Support S3
  S3_BUCKET_SUPPORT: z.string().default('neo-support'),

  // Recette (centre de recette / acceptance testing)
  S3_BUCKET_RECETTE: z.string().default('neo-recette'),
  RECETTE_EXPORT_TOKEN: z.string().optional(),

  // GitLab (creation auto de tickets depuis les retours de recette)
  GITLAB_URL: z.string().url().default('https://gitlab.com'),
  GITLAB_TOKEN: z.string().optional(),
  GITLAB_PROJECT_ID: z.string().optional(),

  // SMS Gateway
  SMS_API_URL: z.string().default('https://api.sms-gate.app/3rdparty/v1/messages'),
  SMS_API_USER: z.string().default('EZMOAP'),
  SMS_API_PASSWORD: z.string().default('mx3yvylh7y-8-o'),
  SMS_ENABLED: z.string().default('true'),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),

  // Tracking
  TRACKING_EXPIRY_HOURS: z.coerce.number().default(4),
  PUBLIC_URL: z.string().default('http://localhost:3000'),
  // Base URL du site vitrine (où vit /configurateur) — sert à construire les
  // liens de reprise + QR code des configurations sauvegardées.
  SITE_BASE_URL: z.string().default('https://neo-domotique.fr'),

  // Multi-domaine : hôtes (séparés par des virgules) servant UNIQUEMENT l'API.
  // Sur ces hôtes, les interfaces HTML (/backoffice, /admin, /swagger) renvoient 404.
  // Le back-office reste accessible via le domaine staff (proxy). Vide = aucun filtrage.
  API_ONLY_HOSTS: z.string().default(''),

  // DocuSeal (signature electronique)
  DOCUSEAL_API_KEY: z.string().optional(),
  DOCUSEAL_BASE_URL: z.string().default('https://api.docuseal.com'),
  DOCUSEAL_WEBHOOK_SECRET: z.string().optional(),

  // Email (Resend by default)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Neo Domotique <devis@neo-domotique.fr>'),
  EMAIL_REPLY_TO: z.string().optional(),
  COMPANY_NAME: z.string().default('Neo Domotique'),
  COMPANY_ADDRESS: z.string().default(''),
  COMPANY_SIRET: z.string().optional(),
  COMPANY_TVA: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

// Le centre de recette est visible hors production (staging + dev).
export const isRecetteEnabled = env.APP_ENV !== 'production';

// L'integration GitLab n'est active que si un token ET un projet cible sont fournis.
export const isGitlabEnabled = Boolean(env.GITLAB_TOKEN && env.GITLAB_PROJECT_ID);

// Le chatbot du site vitrine ne répond automatiquement que si une clé OpenRouter est fournie.
export const isChatbotEnabled = Boolean(env.OPENROUTER_API_KEY);

// Hôtes servant uniquement l'API : les interfaces HTML y sont masquées (404).
export const apiOnlyHosts = new Set(
  env.API_ONLY_HOSTS.split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);
