/**
 * CDN Configuration
 * 
 * Cloudflare CDN Integration für statische Assets
 */

export interface CDNConfig {
  enabled: boolean;
  domain: string;
  cacheControl: {
    images: string;
    videos: string;
    assets: string;
    api: string;
  };
}

export const CDN_CONFIG: CDNConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  domain: process.env.CDN_DOMAIN || 'cdn.gaestefotos.com',
  cacheControl: {
    images: 'public, max-age=31536000, immutable', // 1 year
    videos: 'public, max-age=31536000, immutable', // 1 year
    assets: 'public, max-age=604800', // 1 week
    api: 'public, max-age=300', // 5 minutes
  },
};

/**
 * Get CDN URL for a resource
 */
export function getCdnUrl(path: string): string {
  if (!CDN_CONFIG.enabled) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `https://${CDN_CONFIG.domain}/${cleanPath}`;
}

/**
 * Get cache-control header for resource type
 */
export function getCacheControl(type: 'image' | 'video' | 'asset' | 'api'): string {
  switch (type) {
    case 'image':
      return CDN_CONFIG.cacheControl.images;
    case 'video':
      return CDN_CONFIG.cacheControl.videos;
    case 'asset':
      return CDN_CONFIG.cacheControl.assets;
    case 'api':
      return CDN_CONFIG.cacheControl.api;
    default:
      return 'public, max-age=300';
  }
}

/**
 * Set CDN headers on response
 */
export function setCdnHeaders(
  res: any,
  type: 'image' | 'video' | 'asset' | 'api'
): void {
  const cacheControl = getCacheControl(type);
  
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('CDN-Cache-Control', cacheControl);
  
  if (type === 'image' || type === 'video') {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}
