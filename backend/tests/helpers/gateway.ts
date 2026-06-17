import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface MockGatewayOptions {
  port?: number;
  response?: { data: Array<{ url?: string; b64_json?: string }> } | null;
  statusCode?: number;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
  });
}

export function createMockGateway(options: MockGatewayOptions = {}) {
  let port = options.port ?? 0;
  let statusCode = options.statusCode ?? 200;
  let response = options.response ?? null;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/' && req.method === 'POST') {
      const body = await readBody(req);
      const json = (() => {
        try {
          return JSON.parse(body);
        } catch {
          return {};
        }
      })();

      const code = response ? statusCode : 200;
      const payload = response ?? {
        data: Array.from({ length: Math.min(Math.max(1, parseInt(json.n) || 1), 10) }, () => ({
          url: 'https://example.com/dummy.png',
        })),
      };

      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(port, '127.0.0.1', () => {
          const address = server.address();
          if (address && typeof address !== 'string') {
            port = address.port;
          }
          resolve();
        });
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
    get url() {
      return `http://127.0.0.1:${port}/`;
    },
    setResponse(code: number, body: { data: Array<{ url?: string; b64_json?: string }> } | null) {
      statusCode = code;
      response = body;
    },
    reset() {
      statusCode = 200;
      response = null;
    },
  };
}
