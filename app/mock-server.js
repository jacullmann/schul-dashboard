/* eslint-disable no-console */
import http from 'node:http';

/**
 * Mock Backend for local development.
 * Simulates authentication and session endpoints.
 */
const server = http.createServer((req, res) => {
  // Simulate network latency (200ms)
  const delay = 200;

  // JSON Helper
  const json = (data, status = 200) => {
    setTimeout(() => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }, delay);
  };

  console.log(`[Mock API] ${req.method} ${req.url}`);

  // Endpoint: CSRF Init (always succeed)
  if (req.url === '/api/system/csrf/init') {
    return json({ ok: true });
  }

  // Endpoint: Auth Check / User Data
  if (req.url === '/api/auth/me') {
    return json({
      authenticated: true,
      id: "mock-user-123",
      email: "test.user@example.com",
      role: "user",
      emailVerified: true,
      doneSetup: true,
      personalized: true,
      mfaEnabled: false,
      tenantRole: "admin"
    });
  }

  // Endpoint: Group Status
  if (req.url === '/api/groups/status') {
    return json({
      authenticated: true,
      group: { 
        id: "mock-group-1", 
        name: "Test Class 10A", 
        ownerId: "mock-user-123" 
      },
      groups: [
        { id: "mock-group-1", name: "Test Class 10A", role: "admin" },
        // This is where "AppHeader.vue" picks up unread notifications for other groups
        { 
          id: "mock-group-2", 
          name: "Programming Club", 
          role: "user", 
          hasUnreadContent: true 
        }
      ]
    });
  }

  // Fallback for any other /api requests
  if (req.url.startsWith('/api')) {
    return json({ ok: true, items: [] });
  }

  // 404
  res.writeHead(404);
  res.end();
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Mock Backend running at http://localhost:${PORT}`);
});
