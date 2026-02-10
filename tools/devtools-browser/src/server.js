import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store active browser sessions
const sessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Create browser session
async function createSession(sessionId) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const log = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: Date.now()
    };
    consoleLogs.push(log);
    broadcast('console', log);
  });
  
  // Collect network requests
  const networkRequests = [];
  page.on('request', request => {
    const req = {
      id: request.url() + Date.now(),
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      resourceType: request.resourceType(),
      timestamp: Date.now()
    };
    networkRequests.push(req);
    broadcast('request', req);
  });
  
  page.on('response', response => {
    const res = {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      timestamp: Date.now()
    };
    broadcast('response', res);
    
    // Update network request with response
    const reqIndex = networkRequests.findIndex(r => r.url === response.url());
    if (reqIndex !== -1) {
      networkRequests[reqIndex].response = res;
    }
  });
  
  // Collect page errors
  page.on('pageerror', error => {
    const err = {
      type: 'error',
      text: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    consoleLogs.push(err);
    broadcast('console', err);
  });
  
  sessions.set(sessionId, {
    browser,
    context,
    page,
    consoleLogs,
    networkRequests
  });
  
  return sessions.get(sessionId);
}

// API Routes

// Navigate to URL
app.post('/api/navigate', async (req, res) => {
  try {
    const { url, sessionId = 'default' } = req.body;
    
    let session = sessions.get(sessionId);
    if (!session) {
      session = await createSession(sessionId);
    }
    
    // Clear previous logs
    session.consoleLogs.length = 0;
    session.networkRequests.length = 0;
    
    broadcast('clear', {});
    
    await session.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const title = await session.page.title();
    const currentUrl = session.page.url();
    
    res.json({ 
      success: true, 
      title, 
      url: currentUrl,
      consoleLogs: session.consoleLogs,
      networkRequests: session.networkRequests
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Take screenshot
app.get('/api/screenshot', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const screenshot = await session.page.screenshot({ 
      type: 'png',
      fullPage: req.query.fullPage === 'true'
    });
    
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get page source
app.get('/api/source', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const content = await session.page.content();
    res.json({ source: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get console logs
app.get('/api/console', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    res.json({ logs: session.consoleLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get network requests
app.get('/api/network', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    res.json({ requests: session.networkRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute JavaScript in page context
app.post('/api/evaluate', async (req, res) => {
  try {
    const { script, sessionId = 'default' } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const result = await session.page.evaluate(script);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get DOM tree (simplified)
app.get('/api/dom', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const dom = await session.page.evaluate(() => {
      function serializeNode(node, depth = 0) {
        if (depth > 5) return null;
        if (node.nodeType !== 1) return null;
        
        const result = {
          tag: node.tagName.toLowerCase(),
          id: node.id || undefined,
          classes: node.className ? node.className.split(' ').filter(Boolean) : [],
          children: []
        };
        
        if (node.children.length <= 20) {
          for (const child of node.children) {
            const serialized = serializeNode(child, depth + 1);
            if (serialized) result.children.push(serialized);
          }
        } else {
          result.childCount = node.children.length;
        }
        
        return result;
      }
      return serializeNode(document.documentElement);
    });
    
    res.json({ dom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Click element
app.post('/api/click', async (req, res) => {
  try {
    const { selector, sessionId = 'default' } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    await session.page.click(selector);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Type text
app.post('/api/type', async (req, res) => {
  try {
    const { selector, text, sessionId = 'default' } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    await session.page.fill(selector, text);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cookies
app.get('/api/cookies', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const cookies = await session.context.cookies();
    res.json({ cookies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get localStorage
app.get('/api/storage', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default';
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const storage = await session.page.evaluate(() => {
      const local = {};
      const session = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        local[key] = localStorage.getItem(key);
      }
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        session[key] = sessionStorage.getItem(key);
      }
      
      return { localStorage: local, sessionStorage: session };
    });
    
    res.json(storage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close session
app.post('/api/close', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    const session = sessions.get(sessionId);
    
    if (session) {
      await session.browser.close();
      sessions.delete(sessionId);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    sessions: sessions.size,
    uptime: process.uptime()
  });
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  for (const [id, session] of sessions) {
    await session.browser.close();
  }
  process.exit(0);
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`DevTools Browser running on http://localhost:${PORT}`);
});
