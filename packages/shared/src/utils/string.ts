/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
  // German umlauts mapping
  const umlautMap: Record<string, string> = {
    'ä': 'ae',
    'ö': 'oe',
    'ü': 'ue',
    'Ä': 'Ae',
    'Ö': 'Oe',
    'Ü': 'Ue',
    'ß': 'ss',
  };

  return text
    .split('')
    .map(char => umlautMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a random string
 */
export function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate an event slug from title with 4-char hash
 * Example: "Hochzeit Anna & Max" -> "hochzeit-anna-max-x7jt"
 */
export function generateEventSlug(title: string): string {
  const baseSlug = slugify(title);
  const hash = randomString(4).toLowerCase();
  
  // If title produces a valid slug, use it with hash
  if (baseSlug && baseSlug.length >= 2) {
    // Limit slug length to keep URLs manageable
    const truncatedSlug = baseSlug.substring(0, 30);
    return `${truncatedSlug}-${hash}`;
  }
  
  // Fallback for empty/invalid titles
  return `event-${hash}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

