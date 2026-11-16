import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env and root .env regardless of whether started from root or backend/
const candidateEnvPaths = Array.from(
  new Set([
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(process.cwd(), '.env'),
  ])
);

const shouldOverrideDevEnv = process.env.NODE_ENV !== 'production';
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [key, val] of Object.entries(parsed)) {
      const trimmedVal = (val || '').trim();
      if (!trimmedVal) continue;
      if (shouldOverrideDevEnv || !process.env[key]) {
        process.env[key] = trimmedVal;
      }
    }
  }
}

const cleanEnvValue = (value?: string): string => {
  const trimmed = (value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const extractDbNameFromUri = (uri: string): string => {
  if (!uri) return '';
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
  if (!match || !match[1]) return '';
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
};

const rawMongoUri = cleanEnvValue(process.env.MONGODB_URI || process.env.MONGO_URI);
const explicitDbName = cleanEnvValue(process.env.MONGODB_DB_NAME);
const uriDbName = extractDbNameFromUri(rawMongoUri);

export const env = {
  port: Number(process.env.BACKEND_PORT || process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appUrl: cleanEnvValue(process.env.APP_URL),
  corsOrigin: cleanEnvValue(process.env.CORS_ORIGIN) || '*',
  mongodbUri: rawMongoUri,
  explicitMongodbDbName: explicitDbName,
  uriHasDbName: Boolean(uriDbName),
  mongodbDbName: explicitDbName || uriDbName || 'zeek_softwares',
  adminSecretKey: cleanEnvValue(process.env.ADMIN_SECRET_KEY),
  authJwtSecret: cleanEnvValue(process.env.AUTH_JWT_SECRET),
  enableSwagger: cleanEnvValue(process.env.ENABLE_SWAGGER).toLowerCase() === 'true',
  paystackSecretKey: cleanEnvValue(process.env.PAYSTACK_SECRET_KEY),
  paystackPublicKey: cleanEnvValue(process.env.PAYSTACK_PUBLIC_KEY) || 'pk_test_zeek_paystack_public',
  paystackMode: (cleanEnvValue(process.env.PAYSTACK_MODE) as 'test' | 'live') || 'test',
  paystackAllowSimulation:
    cleanEnvValue(process.env.PAYSTACK_ALLOW_SIMULATION).toLowerCase() === 'true',
  brevoApiKey: cleanEnvValue(process.env.BREVO_API_KEY),
  brevoSenderEmail: cleanEnvValue(process.env.BREVO_SENDER_EMAIL),
  brevoSenderName: cleanEnvValue(process.env.BREVO_SENDER_NAME) || 'Zeek Softwares',
  resendApiKey: cleanEnvValue(process.env.RESEND_API_KEY),
  smtpHost: cleanEnvValue(process.env.SMTP_HOST),
  smtpPort: Number(cleanEnvValue(process.env.SMTP_PORT) || 587),
  smtpSecure:
    cleanEnvValue(process.env.SMTP_SECURE).toLowerCase() === 'true' ||
    Number(cleanEnvValue(process.env.SMTP_PORT)) === 465,
  smtpUser: cleanEnvValue(process.env.SMTP_USER),
  smtpPass: cleanEnvValue(process.env.SMTP_PASS),
  emailFrom: cleanEnvValue(
    process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM
  ),
  contactRecipientEmail: cleanEnvValue(process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL),
  cloudinaryUrl: cleanEnvValue(process.env.CLOUDINARY_URL),
  cloudinaryCloudName: cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: cleanEnvValue(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: cleanEnvValue(process.env.CLOUDINARY_API_SECRET),
  cloudinaryFolder: cleanEnvValue(process.env.CLOUDINARY_FOLDER) || 'zeek-softwares',
};
