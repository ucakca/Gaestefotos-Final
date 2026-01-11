type QueuedUploadStatus = 'PENDING' | 'UPLOADING';

export type QueuedUploadItem = {
  id: string;
  createdAt: number;
  endpoint: string;
  method: 'POST';
  fields: Record<string, string>;
  file: {
    name: string;
    type: string;
    blob: Blob;
  };
  status: QueuedUploadStatus;
  lastError?: string | null;
};

const DB_NAME = 'gaestefotos_upload_queue';
const DB_VERSION = 1;
const STORE = 'uploads';

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

async function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    throw new Error('IndexedDB not available');
  }

  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);

    const out = await fn(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    if (out && typeof (out as any).then === 'function') {
      return await out as any;
    }

    return await new Promise<T>((resolve, reject) => {
      const req = out as IDBRequest<T>;
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function enqueueUpload(params: {
  endpoint: string;
  fields: Record<string, string>;
  file: File;
}): Promise<QueuedUploadItem> {
  const item: QueuedUploadItem = {
    id: randomId(),
    createdAt: Date.now(),
    endpoint: params.endpoint,
    method: 'POST',
    fields: params.fields,
    file: {
      name: params.file.name,
      type: params.file.type || 'application/octet-stream',
      blob: params.file,
    },
    status: 'PENDING',
    lastError: null,
  };

  await withStore('readwrite', (store) => store.put(item));
  return item;
}

export async function listQueuedUploads(): Promise<QueuedUploadItem[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const idx = store.index('createdAt');

    const items: QueuedUploadItem[] = await new Promise((resolve, reject) => {
      const req = idx.getAll();
      req.onsuccess = () => resolve(req.result as any);
      req.onerror = () => reject(req.error);
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return (items || []).sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    db.close();
  }
}

export async function deleteQueuedUpload(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function updateQueuedUpload(id: string, patch: Partial<QueuedUploadItem>): Promise<void> {
  const items = await listQueuedUploads();
  const existing = items.find((i) => i.id === id);
  if (!existing) return;
  const next = { ...existing, ...patch };
  await withStore('readwrite', (store) => store.put(next as any));
}

export async function getQueueCount(): Promise<number> {
  if (!isBrowser()) {
    return 0;
  }
  try {
    const items = await listQueuedUploads();
    return items.filter((i) => i.status === 'PENDING').length;
  } catch {
    return 0;
  }
}

export async function processUploadQueue(opts: {
  fetchFn: (endpoint: string, body: FormData) => Promise<void>;
  maxItems?: number;
}): Promise<{ processed: number; failed: number } > {
  if (!isBrowser()) {
    return { processed: 0, failed: 0 };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, failed: 0 };
  }

  const maxItems = typeof opts.maxItems === 'number' ? opts.maxItems : 5;
  const items = await listQueuedUploads();

  let processed = 0;
  let failed = 0;

  for (const item of items.slice(0, maxItems)) {
    try {
      await updateQueuedUpload(item.id, { status: 'UPLOADING', lastError: null });

      const body = new FormData();
      body.append('file', item.file.blob, item.file.name);
      for (const [k, v] of Object.entries(item.fields || {})) {
        body.append(k, v);
      }

      await opts.fetchFn(item.endpoint, body);
      await deleteQueuedUpload(item.id);
      processed += 1;
    } catch (e: any) {
      failed += 1;
      await updateQueuedUpload(item.id, { status: 'PENDING', lastError: (e as any)?.message || String(e) });
      continue; // Continue with remaining uploads instead of stopping
    }
  }

  return { processed, failed };
}
