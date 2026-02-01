/**
 * HTML Sanitization Utility
 * Uses DOMPurify to prevent XSS attacks when rendering HTML content
 */

'use client';

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Safe for use with dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR: return as-is, sanitize client-side
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
      'img', 'figure', 'figcaption', 'hr', 'sup', 'sub', 'mark',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id', 'style', 'src', 'alt',
      'width', 'height', 'title', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  }) as string;
}

/**
 * Sanitize SVG content (more permissive for QR codes, etc.)
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  if (typeof window === 'undefined') return svg;
  
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'style'],
    ADD_ATTR: ['style', 'fill', 'stroke', 'stroke-width', 'rx', 'ry', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'viewBox', 'xmlns', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'transform', 'd', 'points', 'opacity'],
  }) as string;
}

/**
 * Sanitize CMS HTML content (same as sanitizeHtml but explicit for CMS)
 */
export function sanitizeCmsHtml(html: string): string {
  return sanitizeHtml(html);
}

export default { sanitizeHtml, sanitizeSvg, sanitizeCmsHtml };
