import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const parseCloudinaryUrl = (url: string): { cloudName: string; apiKey: string; apiSecret: string } | null => {
  if (!url) return null;
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?]+)$/i);
  if (!match) return null;
  return {
    apiKey: decodeURIComponent(match[1]),
    apiSecret: decodeURIComponent(match[2]),
    cloudName: decodeURIComponent(match[3]),
  };
};

const getCloudinaryCredentials = () => {
  const fromUrl = parseCloudinaryUrl(env.cloudinaryUrl);
  const cloudName = env.cloudinaryCloudName || fromUrl?.cloudName || '';
  const apiKey = env.cloudinaryApiKey || fromUrl?.apiKey || '';
  const apiSecret = env.cloudinaryApiSecret || fromUrl?.apiSecret || '';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      400,
      'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your .env file or Secrets.'
    );
  }

  return { cloudName, apiKey, apiSecret };
};

export const uploadService = {
  async uploadToCloudinary(imageBase64: string, fileName?: string, subFolder?: string) {
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const trimmed = imageBase64.trim();
    const isDataUri = /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(trimmed);
    const dataUri = isDataUri ? trimmed : `data:image/png;base64,${trimmed}`;

    let cleanOriginal = 'asset';
    if (fileName) {
      cleanOriginal =
        fileName
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .substring(0, 32) || 'asset';
    }

    const folder = subFolder
      ? `${env.cloudinaryFolder}/${subFolder.replace(/^\/+|\/+$/g, '')}`
      : env.cloudinaryFolder;
    const publicId = `${cleanOriginal}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: result.original_filename || publicId,
        sizeBytes: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cloudinary upload failed';
      throw new ApiError(502, `Cloudinary upload failed: ${msg}`);
    }
  },

  async resolveCloudinaryImageUrl(
    value: string,
    options?: { fileName?: string; folder?: string }
  ): Promise<string> {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('/uploads/')) {
      throw new ApiError(
        400,
        'Local /uploads paths are disabled. Please upload the image via Cloudinary or provide an HTTPS URL.'
      );
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const uploaded = await this.uploadToCloudinary(trimmed, options?.fileName, options?.folder);
    return uploaded.url;
  },
};
