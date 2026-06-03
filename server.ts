import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import path from "path";
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import { WebSocketServer } from "ws";

let aiClient: any = null;
function getAi() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Generate VAPID keys for push notifications (in a real app, save these to env vars)
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Mock Module Catalog
  const moduleCatalog = [
    {
      id: "sticker-pack",
      name: "Sticker Pack",
      description: "Express yourself with custom stickers.",
      icon: "Smile",
      bundleUrl: "/modules/sticker-pack.js",
    },
    {
      id: "crypto-wallet",
      name: "Crypto Wallet",
      description: "Send and receive crypto directly in chat.",
      icon: "Wallet",
      bundleUrl: "/modules/crypto-wallet.js",
    },
    {
      id: "ai-assistant",
      name: "AI Assistant",
      description: "Get smart suggestions and help from Gemini.",
      icon: "Sparkles",
      bundleUrl: "/modules/ai-assistant.js",
    },
  ];

  // API Routes
  app.get("/api/modules/catalog", (req, res) => {
    res.json(moduleCatalog);
  });

  app.post("/api/gemini/constitution", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      // Check if API key is populated
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          text: "⚠️ **Demo Mode:** The `GEMINI_API_KEY` is not defined in this environment. Once configured in **Settings > Secrets**, this panel queries the production `@google/genai` Gemini SDK. To keep continuity, here is a localized simulation:\n\n*\"PNexus Article I validation confirmed. To protect individual sovereignty, all private message vectors must use hybrid post-quantum key constructs. Sandbox execution limits are active.\"*"
        });
      }

      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are the PNexus Sovereign Civilization Advisor. You are an expert in the Federation Constitution, Ecosystem Governance, and decentralized law.
Here is the official Federation Constitution:
ARTICLE I: Sovereign Privacy
The right of every identity to absolute post-quantum cryptographic privacy, local-first storage, and zero unconsented data leakage is inviolable.

ARTICLE II: Human-in-the-Loop Supremacy
No autonomous AI agent or algorithmic scheduler shall override direct human intention. Autonomous execution loops must operate within strict sandboxed permissions.

ARTICLE III: Post-Quantum Defense
All nodes, communication lines, and identity endorsements must use hybrid post-quantum cryptographic signatures to defend against legacy or near-future computing threats.

ARTICLE IV: Decentralized Peer Equality
The federation has no central arbiter. Power is distributed. Coordination is peer-to-peer. Consensus is decentralized and verifiable.

ARTICLE V: Democratic Evolution
Changes to the governing structure require verifiable multi-party signature thresholds, public cryptographic casting, and consensus-focused validation.

When the user queries you, answer concisely, objectively, and with high-fidelity professional authority, citing specific articles where appropriate. Give direct, actionable guidance under PNexus laws. Respond using readable Markdown.`
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI response" });
    }
  });

  app.get("/api/contacts", (req, res) => {
    // Mock contacts
    res.json([
      { id: "1", name: "Alice", phoneNumber: "+1234567890", avatar: "https://picsum.photos/seed/alice/200", lastSeen: new Date().toISOString() },
      { id: "2", name: "Bob", phoneNumber: "+1987654321", avatar: "https://picsum.photos/seed/bob/200", lastSeen: new Date().toISOString() },
    ]);
  });

  app.get("/api/stories/friends", (req, res) => {
    res.json([]);
  });

  app.get("/api/calls", (req, res) => {
    res.json([
      { id: "c1", contactId: "1", type: "audio", direction: "incoming", status: "completed", timestamp: new Date(Date.now() - 3600000).toISOString(), duration: 120 },
      { id: "c2", contactId: "2", type: "video", direction: "outgoing", status: "missed", timestamp: new Date(Date.now() - 86400000).toISOString() },
    ]);
  });

  // Push Notifications
  app.get("/api/vapidPublicKey", (req, res) => {
    res.send(vapidKeys.publicKey);
  });

  let subscriptions: any[] = [];
  app.post("/api/subscribe", (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({});
  });

  // Socket.io Setup
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const users = new Map(); // socket.id -> userId

  io.on("connection", (socket) => {
    console.log("New Socket.io connection:", socket.id);

    socket.on("register", (userId) => {
      users.set(socket.id, userId);
      socket.join(userId);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("message", (message) => {
      console.log("Received message:", message);
      // Broadcast to all clients (simple mock for MVP)
      socket.broadcast.emit("message", message);
      
      // Simulate Push Notification
      const payload = JSON.stringify({ title: 'New Message', body: message.text || 'You received a new message' });
      subscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => console.error(err));
      });
    });

    socket.on("typing", ({ senderId, recipientId, isTyping }) => {
      socket.to(recipientId).emit("typing", { senderId, isTyping });
    });

    // WebRTC Signaling
    socket.on("call-user", (data) => {
      socket.to(data.userToCall).emit("call-made", {
        offer: data.offer,
        callerId: data.callerId
      });
    });

    socket.on("make-answer", (data) => {
      socket.to(data.to).emit("answer-made", {
        answer: data.answer
      });
    });

    socket.on("disconnect", () => {
      const userId = users.get(socket.id);
      if (userId) {
        users.delete(socket.id);
        io.emit("user_status", { userId, status: "offline", lastSeen: new Date().toISOString() });
      }
      console.log("Socket.io connection closed:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  // Real WebSocket Transport Relay
  const wss = new WebSocketServer({ noServer: true });
  const wsClients = new Set<any>();

  wss.on("connection", (ws) => {
    console.log("[WebSocketServer] Direct P2P transport client connected.");
    wsClients.add(ws);

    ws.on("message", (message, isBinary) => {
      // Broadcast this transport packet to all other connected clients
      for (const client of wsClients) {
        if (client !== ws && client.readyState === 1) { // 1 = WebSocket.OPEN
          client.send(message, { binary: isBinary });
        }
      }
    });

    ws.on("close", () => {
      console.log("[WebSocketServer] Direct P2P transport client disconnected.");
      wsClients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("[WebSocketServer] Client socket error:", err);
      wsClients.delete(ws);
    });
  });

  server.on("upgrade", (request, bSocket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname === "/api/transport/socket") {
      wss.handleUpgrade(request, bSocket as any, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
