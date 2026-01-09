type QaLogLevel = 'IMPORTANT' | 'DEBUG';

export type QaLogEventInput = {
  level?: QaLogLevel;
  type: string;
  message?: string;
  data?: any;
  eventId?: string;
  path?: string;
  method?: string;
};

type QaLogConfig = {
  debugEnabled: boolean;
  debugEnabledUntil: string | null;
};

let cachedConfig: QaLogConfig | null = null;
let cachedAtMs = 0;

async function fetchConfig(): Promise<QaLogConfig> {
  const res = await fetch('/api/qa-logs/config', {
    method: 'GET',
    credentials: 'include',
    headers: {
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    return { debugEnabled: false, debugEnabledUntil: null };
  }

  const data = (await res.json()) as any;
  return {
    debugEnabled: Boolean(data?.debugEnabled),
    debugEnabledUntil: typeof data?.debugEnabledUntil === 'string' ? data.debugEnabledUntil : null,
  };
}

export async function isQaDebugEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedConfig && now - cachedAtMs < 10_000) {
    return cachedConfig.debugEnabled;
  }

  try {
    const cfg = await fetchConfig();
    cachedConfig = cfg;
    cachedAtMs = now;
    return cfg.debugEnabled;
  } catch {
    cachedConfig = { debugEnabled: false, debugEnabledUntil: null };
    cachedAtMs = now;
    return false;
  }
}

export async function qaLog(input: QaLogEventInput): Promise<void> {
  try {
    const level: QaLogLevel = input.level || 'IMPORTANT';

    if (level === 'DEBUG') {
      const enabled = await isQaDebugEnabled();
      if (!enabled) return;
    }

    await fetch('/api/qa-logs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        level,
        type: input.type,
        message: input.message,
        data: input.data,
        eventId: input.eventId,
        path: input.path,
        method: input.method,
      }),
    });
  } catch {
    // ignore logging errors
  }
}
