// Custom Next.js + Socket.io server
// Runs both the Next app and a Socket.io server on the same HTTP server

const http = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Unique color assignment across current connections
function makeColorFromHue(hue) {
  return `hsl(${hue} 90% 50%)`;
}

function parseHueFromColorString(color) {
  if (typeof color !== 'string') return null;
  const m = color.match(/hsl\(\s*(\d{1,3})/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isFinite(n)) return Math.max(0, Math.min(359, n));
  return null;
}

function getUsedHues(connected) {
  const used = new Set();
  for (const meta of connected.values()) {
    if (typeof meta?.hue === 'number') {
      used.add(meta.hue);
    } else if (meta?.color) {
      const parsed = parseHueFromColorString(meta.color);
      if (parsed !== null) used.add(parsed);
    }
  }
  return used;
}

let hueSeed = Math.floor(Math.random() * 360);
function assignUniqueHue(connected) {
  const used = getUsedHues(connected);
  const golden = 137; // degrees; golden-angle approx
  // Try 360 attempts rotating from a moving seed
  for (let i = 0; i < 360; i += 1) {
    const hue = (hueSeed + i * golden) % 360;
    if (!used.has(hue)) {
      hueSeed = (hue + golden) % 360; // advance seed for next assignment
      return hue;
    }
  }
  // Fallback if somehow all taken
  return Math.floor(Math.random() * 360);
}

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  let connectedSockets = new Map(); // socketId -> { color, name }
  /**
   * In-memory stroke history. Each entry is a draw event with metadata
   * { x, y, prevX, prevY, color, lineWidth, username, authorId }
   */
  let strokes = [];

  function broadcastUsersCount() {
    io.emit('users', { count: connectedSockets.size });
  }

  function broadcastPresence() {
    const users = Array.from(connectedSockets.entries()).map(([id, meta]) => ({
      id,
      name: meta.name,
      color: meta.color,
    }));
    io.emit('presence', { count: users.length, users });
  }

  function freeHueFor(socketId) {
    const meta = connectedSockets.get(socketId);
    if (!meta) return;
    // No explicit pool to free since we compute from connected set, but keep for future
  }

  function emitBoardState(target /* Socket or IO */) {
    const payload = { strokes };
    target.emit('boardState', payload);
  }

  io.on('connection', (socket) => {
    const hue = assignUniqueHue(connectedSockets);
    const color = makeColorFromHue(hue);
    const defaultName = `User-${Math.floor(1000 + Math.random() * 9000)}`;
    connectedSockets.set(socket.id, { color, hue, name: defaultName });

    socket.emit('init', { color, name: defaultName });
    // Send current board state to the new user
    emitBoardState(socket);
    broadcastUsersCount();
    broadcastPresence();

    socket.on('requestBoardState', () => {
      emitBoardState(socket);
    });

    socket.on('setName', (payload) => {
      const rawName = typeof payload?.name === 'string' ? payload.name : '';
      const sanitized = rawName.trim().slice(0, 24) || `User-${Math.floor(1000 + Math.random() * 9000)}`;
      const meta = connectedSockets.get(socket.id);
      if (meta) {
        meta.name = sanitized;
        connectedSockets.set(socket.id, meta);
        broadcastPresence();
      }
    });

    socket.on('draw', (payload) => {
      // payload: { x, y, prevX, prevY, lineWidth }
      const meta = connectedSockets.get(socket.id);
      const safePayload = {
        x: payload?.x,
        y: payload?.y,
        prevX: payload?.prevX ?? null,
        prevY: payload?.prevY ?? null,
        color: meta?.color || '#3333ff',
        lineWidth: typeof payload?.lineWidth === 'number' ? payload.lineWidth : 4,
        username: meta?.name || 'User',
        authorId: socket.id,
      };
      // Store stroke for future newcomers and potential redraws
      strokes.push(safePayload);
      socket.broadcast.emit('draw', safePayload);
    });

    // Back-compat: treat legacy 'clear' as 'clearMine'
    socket.on('clear', () => {
      const meta = connectedSockets.get(socket.id);
      const myColor = meta?.color;
      strokes = strokes.filter(
        (s) => s.authorId !== socket.id && s.username !== meta?.name && s.color !== myColor
      );
      emitBoardState(io);
    });

    socket.on('clearMine', () => {
      const meta = connectedSockets.get(socket.id);
      const myColor = meta?.color;
      // Keep strokes that are NOT authored by me, AND not with my name, AND not with my color
      // i.e., remove anything that matches any of my identifiers (authorId OR username OR color)
      strokes = strokes.filter(
        (s) => s.authorId !== socket.id && s.username !== meta?.name && s.color !== myColor
      );
      emitBoardState(io);
    });

    // New: targeted clear controls
    // Clear all strokes that match the provided color string exactly
    socket.on('clearByColor', (payload) => {
      const color = typeof payload?.color === 'string' ? payload.color : null;
      if (!color) return;
      strokes = strokes.filter((s) => s.color !== color);
      emitBoardState(io);
    });

    // Clear all strokes authored by the provided username
    socket.on('clearByUsername', (payload) => {
      const name = typeof payload?.username === 'string' ? payload.username.trim() : '';
      if (!name) return;
      strokes = strokes.filter((s) => (s.username || '').trim() !== name);
      emitBoardState(io);
    });

    // Clear all strokes authored by the provided authorId (socket id when drawn)
    socket.on('clearByAuthor', (payload) => {
      const authorId = typeof payload?.authorId === 'string' ? payload.authorId : '';
      if (!authorId) return;
      strokes = strokes.filter((s) => s.authorId !== authorId);
      emitBoardState(io);
    });

    socket.on('requestClearAll', () => {
      // Clear all strokes from server memory
      strokes = [];
      // Tell all clients to clear their canvases
      io.emit('clear');
      // Broadcast empty board state to everyone
      emitBoardState(io);
    });

    socket.on('disconnect', () => {
      connectedSockets.delete(socket.id);
      freeHueFor(socket.id);
      broadcastUsersCount();
      broadcastPresence();
    });
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});


