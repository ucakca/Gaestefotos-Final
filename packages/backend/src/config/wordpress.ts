import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import bcryptNative from 'bcrypt';
import crypto from 'crypto';
import { PasswordHash } from 'phpass';
import { verify } from '@cbashik/wp-password-hash';
import { logger } from '../utils/logger';

export class WordPressAuthUnavailableError extends Error {
  code = 'WP_AUTH_UNAVAILABLE' as const;
  constructor(message: string) {
    super(message);
    this.name = 'WordPressAuthUnavailableError';
  }
}

// WordPress uses SHA-384 for pre-hashing passwords longer than 72 bytes
// Then applies bcrypt. We need to replicate this process.
function preHashPassword(password: string): string {
  // WordPress uses SHA-384 and base64 encoding for pre-hashing
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return crypto.createHash('sha384').update(password).digest('base64');
  }
  return password;
}

// WordPress password verification using WordPress REST API (most reliable)
// This uses WordPress's own wp_check_password function
async function verifyWordPressPasswordREST(email: string, password: string): Promise<{
  id: number;
  user_email: string;
  user_login: string;
  display_name: string;
  is_admin: boolean;
} | null> {
  try {
    const wpUrl = process.env.WORDPRESS_URL || 'https://xn--gstefotos-v2a.com';
    const url = `${wpUrl}/wp-json/gaestefotos/v1/verify-password`;

    const verifySecret = process.env.WORDPRESS_VERIFY_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (verifySecret && verifySecret.trim().length > 0) {
      headers['X-GF-Verify-Secret'] = verifySecret;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      // 400 can be used by an implementation to indicate "invalid credentials".
      // 401/403/404 usually indicate endpoint misconfiguration (auth required / missing route).
      if (response.status === 400) {
        return null;
      }
      throw new WordPressAuthUnavailableError(`wordpress_rest_http_${response.status}`);
    }
    
    const data = (await response.json()) as any;

    // If the endpoint exists but returns an unexpected shape, treat as misconfigured.
    if (!data || typeof data.verified !== 'boolean') {
      throw new WordPressAuthUnavailableError('wordpress_rest_unexpected_response');
    }

    if (data.verified === true) {
      return {
        id: data.user_id,
        user_email: data.email,
        user_login: data.login,
        display_name: data.display_name || data.login,
        is_admin: data.is_admin === true || data.role === 'administrator',
      };
    }

    // Verified is false -> credentials invalid or user not found.
    // Log only non-sensitive diagnostic details.
    logger.info('[WordPress Auth] REST verification failed', {
      identifier: email,
      reason: typeof data?.error === 'string' ? data.error : 'unknown',
    });

    return null;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      logger.warn('[WordPress Auth] REST API timeout');
      throw new WordPressAuthUnavailableError('wordpress_rest_timeout');
    }
    if (error instanceof WordPressAuthUnavailableError) {
      logger.warn('[WordPress Auth] REST API unavailable', { message: error.message });
      throw error;
    }
    // Network errors (DNS, TLS, connection refused, etc.) must be treated as infra unavailable.
    logger.warn('[WordPress Auth] REST API verification error', { message: error?.message || String(error) });
    throw new WordPressAuthUnavailableError('wordpress_rest_unreachable');
  }
}

// WordPress password verification using PHP script as fallback
// This calls a PHP script that uses WordPress's own password verification
async function verifyWordPressPasswordPHP(email: string, password: string): Promise<boolean> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Use PHP to verify password via WordPress
    const phpScript = '/root/gaestefotos-app-v2/packages/backend/verify-wp-password.php';
    const { stdout, stderr } = await execAsync(
      `php ${phpScript} "${email}" "${password.replace(/"/g, '\\"')}" 2>&1`
    );
    
    // PHP script returns exit code 0 for success, 1 for failure
    return stdout.includes('TRUE') || stdout.includes('Verification result: 1');
  } catch (error: any) {
    // Exit code 1 means password is wrong, which is expected
    if (error.code === 1) {
      return false;
    }
    logger.warn('[WordPress Auth] PHP verification error', { message: error.message });
    return false;
  }
}

// WordPress password verification - PRIMARY METHOD: PHP-based (most reliable)
// Falls back to Node.js methods if PHP fails
async function verifyWordPressPassword(password: string, hash: string, email?: string): Promise<boolean> {
  try {
    // PRIMARY METHOD: Use PHP password_verify (most reliable for WordPress 6.8+)
    // This works directly with the database and handles all WordPress hash formats correctly
    if (email) {
      logger.debug('[WordPress Auth] Verifying via PHP password_verify');
      try {
        const result = await verifyWordPressPasswordPHP(email, password);
        if (result) {
          logger.debug('[WordPress Auth] PHP verification: success');
          return true;
        }
        logger.debug('[WordPress Auth] PHP verification: failed; will try fallbacks');
      } catch (e) {
        logger.warn('[WordPress Auth] PHP verification error');
      }
    }
    
    // FALLBACK METHODS: Try Node.js libraries if PHP fails
    
    // Remove $wp$ prefix if present (WordPress 6.8+ format)
    let cleanHash = hash;
    if (hash.startsWith('$wp$')) {
      // WordPress 6.8+ uses $wp$ prefix, remove it to get standard bcrypt hash
      cleanHash = '$' + hash.substring(4);
      logger.debug('[WordPress Auth] Removed $wp$ prefix');
    }
    
    // Also handle $P$ format (old WordPress format)
    if (hash.startsWith('$P$')) {
      logger.debug('[WordPress Auth] Detected old WordPress hash format ($P$); using PHP method');
      // Old format requires PHP verification
      if (email) {
        const phpResult = await verifyWordPressPasswordPHP(email, password);
        if (phpResult) return true;
      }
    }
    
    // Pre-hash password if longer than 72 bytes (WordPress behavior)
    const passwordBytes = Buffer.byteLength(password, 'utf8');
    const needsPreHash = passwordBytes > 72;
    const preHashedPassword = needsPreHash ? preHashPassword(password) : password;
    
    logger.debug('[WordPress Auth] Password pre-hash decision', { needsPreHash });
    
    // Fallback 1: Try native bcrypt with $2y$ format (supports $2y$ natively)
    if (cleanHash.startsWith('$2y$') || cleanHash.startsWith('$2a$') || cleanHash.startsWith('$2b$')) {
      logger.debug('[WordPress Auth] Fallback 1: native bcrypt');
      try {
        const result = await bcryptNative.compare(password, cleanHash);
        logger.debug('[WordPress Auth] Native bcrypt result', { ok: result });
        if (result) return true;
      } catch (e) {
        logger.debug('[WordPress Auth] Native bcrypt error');
      }
    }
    
    // Fallback 2: Try bcryptjs with $2a$ conversion (for $2y$ hashes)
    if (cleanHash.startsWith('$2y$')) {
      const hash2a = '$2a$' + cleanHash.substring(4);
      logger.debug('[WordPress Auth] Fallback 2: bcryptjs with $2a$ conversion');
      try {
        const result = await bcrypt.compare(password, hash2a);
        logger.debug('[WordPress Auth] bcryptjs result', { ok: result });
        if (result) return true;
      } catch (e) {
        logger.debug('[WordPress Auth] bcryptjs error');
      }
    }
    
    // Fallback 3: Try WordPress library
    logger.debug('[WordPress Auth] Fallback 3: WordPress library');
    try {
      const result = verify(password, hash);
      logger.debug('[WordPress Auth] WordPress library result', { ok: result });
      if (result) return true;
    } catch (e) {
      logger.debug('[WordPress Auth] WordPress library error');
    }
    
    logger.debug('[WordPress Auth] All verification methods failed');
    return false;
  } catch (error) {
    logger.error('[WordPress Auth] Password verification error', { error });
    return false;
  }
}

// WordPress Database Configuration
export const wpConfig = {
  host: process.env.WORDPRESS_DB_HOST || 'localhost',
  port: parseInt(process.env.WORDPRESS_DB_PORT || '3306'),
  user: process.env.WORDPRESS_DB_USER || 'wp_wlpny',
  password: process.env.WORDPRESS_DB_PASSWORD || '',
  database: process.env.WORDPRESS_DB_NAME || 'wp_szgpu',
  tablePrefix: process.env.WORDPRESS_TABLE_PREFIX || 'PECLa_',
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getWordPressConnection(): mysql.Pool {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.WORDPRESS_DB_PASSWORD) {
        throw new Error('WORDPRESS_DB_PASSWORD must be set in production');
      }
      if (!process.env.WORDPRESS_DB_USER) {
        throw new Error('WORDPRESS_DB_USER must be set in production');
      }
      if (!process.env.WORDPRESS_DB_NAME) {
        throw new Error('WORDPRESS_DB_NAME must be set in production');
      }
    }

    const { tablePrefix: _tablePrefix, ...mysqlConfig } = wpConfig as any;
    pool = mysql.createPool({
      ...mysqlConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

async function getWordPressUsersTableCandidates(connection: mysql.Pool): Promise<string[]> {
  const candidates = new Set<string>();

  const configured = `${wpConfig.tablePrefix}users`;
  if (configured && configured.length > 0) candidates.add(configured);

  // Common default prefix
  candidates.add('wp_users');

  try {
    const [rows] = await connection.query(`SHOW TABLES LIKE '%users'`);
    if (Array.isArray(rows)) {
      for (const row of rows as any[]) {
        const value = row ? row[Object.keys(row)[0]] : undefined;
        if (typeof value === 'string' && value.toLowerCase().endsWith('users')) {
          candidates.add(value);
        }
      }
    }
  } catch (e: any) {
    logger.warn('[WordPress Auth] Could not list WP tables', { message: e?.message || String(e) });
  }

  // Some DB users can't run SHOW TABLES; information_schema often still works.
  try {
    const [rows] = await connection.execute(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name LIKE '%users'`
    );
    if (Array.isArray(rows)) {
      for (const row of rows as any[]) {
        const value = row?.table_name;
        if (typeof value === 'string' && value.toLowerCase().endsWith('users')) {
          candidates.add(value);
        }
      }
    }
  } catch (e: any) {
    logger.warn('[WordPress Auth] Could not query information_schema for WP tables', { message: e?.message || String(e) });
  }

  if (candidates.size === 0) {
    logger.warn('[WordPress Auth] No users table candidates found');
  }

  return Array.from(candidates);
}

// Verify WordPress user credentials
export async function verifyWordPressUser(email: string, password: string): Promise<{
  id: number;
  user_email: string;
  user_login: string;
  display_name: string;
  is_admin: boolean;
} | null> {
  let restUnavailable = false;
  let hasWpDbConfig = false;
  try {
    // PRIMARY METHOD: Use WordPress REST API (most reliable - uses wp_check_password)
    logger.debug('[WordPress Auth] Verifying via WordPress REST API');
    const restResult = await verifyWordPressPasswordREST(email, password);
    if (restResult) {
      logger.debug('[WordPress Auth] REST API verification: success');
      return restResult;
    }

    // REST is reachable and responded as expected, but credentials are invalid.
    // Only attempt DB fallback if WP DB credentials are explicitly configured.
    // Otherwise we'd turn a normal "wrong password" into a 503 due to missing DB config.
    hasWpDbConfig =
      !!process.env.WORDPRESS_DB_HOST &&
      !!process.env.WORDPRESS_DB_USER &&
      !!process.env.WORDPRESS_DB_PASSWORD &&
      !!process.env.WORDPRESS_DB_NAME;

    if (!hasWpDbConfig) {
      logger.debug('[WordPress Auth] REST API verification: invalid credentials; skipping DB fallback (no WP DB config)');
      return null;
    }

    logger.debug('[WordPress Auth] REST API verification: failed; will try DB method');
  } catch (error: any) {
    if (error instanceof WordPressAuthUnavailableError) {
      restUnavailable = true;
    }
    logger.warn('[WordPress Auth] REST API error', { message: error?.message || String(error) });
  }

  // If REST is unavailable and we don't have DB fallback configured, treat this as infra unavailable.
  // Otherwise the caller will incorrectly receive 401 "Invalid credentials" for valid users.
  if (restUnavailable && !hasWpDbConfig) {
    throw new WordPressAuthUnavailableError('wordpress_auth_unavailable_no_db_fallback');
  }

  logger.info('[WordPress Auth] attempting DB fallback', { email, restUnavailable });

  // FALLBACK METHOD: Direct database verification
  let connection: mysql.Pool;
  try {
    connection = getWordPressConnection();
  } catch (e: any) {
    throw new WordPressAuthUnavailableError(e?.message || 'wordpress_db_misconfigured');
  }
  
  try {
    // Get user from WordPress database
    const tableCandidates = await getWordPressUsersTableCandidates(connection);
    logger.info('[WordPress Auth] users table candidates', { email, count: tableCandidates.length });

    let users: any[] | null = null;
    let selectedUsersTable: string | null = null;

    for (const tableName of tableCandidates) {
      try {
        const [result] = await connection.execute(
          `SELECT ID, user_email, user_login, display_name, user_pass 
           FROM ${tableName} 
           WHERE user_email = ? OR user_login = ?`,
          [email, email]
        );
        if (Array.isArray(result) && result.length > 0) {
          users = result as any[];
          selectedUsersTable = tableName;
          break;
        }
      } catch (e: any) {
        logger.warn('[WordPress Auth] Users table query failed', { tableName, message: e?.message || String(e) });
      }
    }

    if (!Array.isArray(users) || users.length === 0 || !selectedUsersTable) {
      logger.info('[WordPress Auth] DB fallback: no user found in any users table', { email });
      return null;
    }

    logger.info('[WordPress Auth] DB fallback: selected users table', { email, selectedUsersTable });

    const user = users[0] as any;
    
    // Verify password using WordPress hash format
    logger.debug('[WordPress Auth] Verifying user via DB method');
    
    // Use the improved WordPress password verification (pass email for PHP fallback)
    const isValid = await verifyWordPressPassword(password, user.user_pass, user.user_email);
    logger.debug('[WordPress Auth] Database verification result', { ok: isValid });
    
    if (!isValid) {
      return null;
    }
    
    // Check if user is admin by querying user capabilities
    let isAdmin = false;
    try {
      const prefix = selectedUsersTable.endsWith('users')
        ? selectedUsersTable.slice(0, selectedUsersTable.length - 'users'.length)
        : wpConfig.tablePrefix;
      const [capabilities] = await connection.execute(
        `SELECT meta_value FROM ${prefix}usermeta 
         WHERE user_id = ? AND meta_key = '${prefix}capabilities'`,
        [user.ID]
      );
      
      if (Array.isArray(capabilities) && capabilities.length > 0) {
        const caps = JSON.parse((capabilities[0] as any).meta_value);
        isAdmin = caps['administrator'] === true;
      }
    } catch (error) {
      logger.warn('[WordPress Auth] Error checking admin status');
    }
    
    return {
      id: user.ID,
      user_email: user.user_email,
      user_login: user.user_login,
      display_name: user.display_name || user.user_login,
      is_admin: isAdmin,
    };
  } catch (error: any) {
    // If REST was unavailable and DB also fails, surface as infrastructure issue.
    const msg = error?.message || String(error);

    // Common MySQL connectivity/auth errors should be treated as infra unavailable.
    const mysqlCode = error?.code;
    const isInfra =
      restUnavailable ||
      mysqlCode === 'ECONNREFUSED' ||
      mysqlCode === 'ENOTFOUND' ||
      mysqlCode === 'ETIMEDOUT' ||
      mysqlCode === 'EHOSTUNREACH' ||
      mysqlCode === 'PROTOCOL_CONNECTION_LOST' ||
      mysqlCode === 'ER_ACCESS_DENIED_ERROR' ||
      mysqlCode === 'ER_BAD_DB_ERROR';

    if (isInfra) {
      throw new WordPressAuthUnavailableError(msg || 'wordpress_auth_unavailable');
    }

    // Otherwise treat as a normal verification failure (do not leak details)
    logger.error('WordPress verification error', { message: msg });
    return null;
  }
}

// Get WordPress user by email
export async function getWordPressUserByEmail(email: string): Promise<{
  id: number;
  user_email: string;
  user_login: string;
  display_name: string;
} | null> {
  const connection = getWordPressConnection();
  
  try {
    const tableCandidates = await getWordPressUsersTableCandidates(connection);
    for (const tableName of tableCandidates) {
      try {
        const [users] = await connection.execute(
          `SELECT ID, user_email, user_login, display_name 
           FROM ${tableName} 
           WHERE user_email = ? OR user_login = ?`,
          [email, email]
        );

        if (!Array.isArray(users) || users.length === 0) {
          continue;
        }

        const user = (users as any[])[0] as any;
        return {
          id: user.ID,
          user_email: user.user_email,
          user_login: user.user_login,
          display_name: user.display_name || user.user_login,
        };
      } catch (e: any) {
        logger.warn('[WordPress Auth] User lookup by email failed', { tableName, message: e?.message || String(e) });
      }
    }

    return null;
  } catch (error: any) {
    logger.error('WordPress user lookup error', { message: error?.message || String(error) });
    return null;
  }
}

// Get WordPress user by ID
export async function getWordPressUserById(userId: number): Promise<{
  id: number;
  user_email: string;
  user_login: string;
  display_name: string;
} | null> {
  const connection = getWordPressConnection();
  
  try {
    const tableCandidates = await getWordPressUsersTableCandidates(connection);
    for (const tableName of tableCandidates) {
      try {
        const [users] = await connection.execute(
          `SELECT ID, user_email, user_login, display_name 
           FROM ${tableName} 
           WHERE ID = ?`,
          [userId]
        );

        if (!Array.isArray(users) || users.length === 0) {
          continue;
        }

        const user = (users as any[])[0] as any;
        return {
          id: user.ID,
          user_email: user.user_email,
          user_login: user.user_login,
          display_name: user.display_name || user.user_login,
        };
      } catch (e: any) {
        logger.warn('[WordPress Auth] User lookup by id failed', { tableName, message: e?.message || String(e) });
      }
    }

    return null;
  } catch (error: any) {
    logger.error('WordPress user lookup by ID error', { message: error?.message || String(error) });
    return null;
  }
}
