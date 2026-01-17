/**
 * Upload Performance Metrics Tracking
 * 
 * Tracks:
 * - Original file size vs resized file size
 * - Upload success/failure rates
 * - Upload duration
 * - Bandwidth savings from client-side resize
 */

interface UploadMetric {
  originalSize: number;
  resizedSize: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
  fileType: string;
  timestamp: number;
}

const METRICS_STORAGE_KEY = 'gf_upload_metrics';
const MAX_STORED_METRICS = 100;

/**
 * Track a single upload attempt
 */
export function trackUpload(metric: UploadMetric): void {
  try {
    const stored = getStoredMetrics();
    stored.push(metric);
    
    // Keep only last 100 metrics
    const trimmed = stored.slice(-MAX_STORED_METRICS);
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent fail - don't break upload flow
  }
}

/**
 * Get stored metrics from localStorage
 */
function getStoredMetrics(): UploadMetric[] {
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Calculate upload statistics
 */
export interface UploadStats {
  totalUploads: number;
  successRate: number;
  failureRate: number;
  avgOriginalSize: number;
  avgResizedSize: number;
  bandwidthSavings: number; // Percentage
  avgDuration: number;
  lastHour: {
    uploads: number;
    successes: number;
    failures: number;
  };
}

export function getUploadStats(): UploadStats {
  const metrics = getStoredMetrics();
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  const recentMetrics = metrics.filter(m => m.timestamp > oneHourAgo);
  
  const totalUploads = metrics.length;
  const successes = metrics.filter(m => m.success).length;
  const failures = totalUploads - successes;
  
  const avgOriginalSize = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.originalSize, 0) / metrics.length
    : 0;
  
  const avgResizedSize = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.resizedSize, 0) / metrics.length
    : 0;
  
  const bandwidthSavings = avgOriginalSize > 0
    ? ((avgOriginalSize - avgResizedSize) / avgOriginalSize) * 100
    : 0;
  
  const avgDuration = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
    : 0;
  
  return {
    totalUploads,
    successRate: totalUploads > 0 ? (successes / totalUploads) * 100 : 0,
    failureRate: totalUploads > 0 ? (failures / totalUploads) * 100 : 0,
    avgOriginalSize,
    avgResizedSize,
    bandwidthSavings,
    avgDuration,
    lastHour: {
      uploads: recentMetrics.length,
      successes: recentMetrics.filter(m => m.success).length,
      failures: recentMetrics.filter(m => !m.success).length,
    },
  };
}

/**
 * Get recent failures for debugging
 */
export function getRecentFailures(limit: number = 10): UploadMetric[] {
  const metrics = getStoredMetrics();
  return metrics
    .filter(m => !m.success)
    .slice(-limit)
    .reverse();
}

/**
 * Clear all stored metrics
 */
export function clearMetrics(): void {
  try {
    localStorage.removeItem(METRICS_STORAGE_KEY);
  } catch {
    // Silent fail
  }
}
