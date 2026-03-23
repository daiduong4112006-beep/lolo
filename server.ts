import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { addDays, isAfter } from "date-fns";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(process.cwd(), "keys.json");

app.use(cors());
app.use(express.json());

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

interface Key {
  id: string;
  code: string;
  type: "1day" | "1week" | "permanent";
  createdAt: string;
  expiresAt: string | null;
  status: "active" | "expired" | "used";
  note?: string;
  username?: string;
  hwid?: string;
}

const getKeys = (): Key[] => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveKeys = (keys: Key[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(keys, null, 2));
};

// API Routes
app.get("/api/keys", (req, res) => {
  const keys = getKeys();
  // Update status based on expiration
  const now = new Date();
  const updatedKeys = keys.map(k => {
    if (k.status === "active" && k.expiresAt && isAfter(now, new Date(k.expiresAt))) {
      return { ...k, status: "expired" as const };
    }
    return k;
  });
  if (JSON.stringify(keys) !== JSON.stringify(updatedKeys)) {
    saveKeys(updatedKeys);
  }
  res.json(updatedKeys);
});

app.post("/api/keys/generate", (req, res) => {
  const { type, note, username } = req.body;
  const now = new Date();
  let expiresAt: Date | null = null;

  if (type === "1day") expiresAt = addDays(now, 1);
  else if (type === "1week") expiresAt = addDays(now, 7);

  const newKey: Key = {
    id: uuidv4(),
    code: `KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    type,
    createdAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    status: "active",
    note: note || "",
    username: username || "",
    hwid: ""
  };

  const keys = getKeys();
  keys.push(newKey);
  saveKeys(keys);
  res.json(newKey);
});

app.delete("/api/keys/:id", (req, res) => {
  const { id } = req.params;
  const keys = getKeys();
  const filtered = keys.filter(k => k.id !== id);
  saveKeys(filtered);
  res.json({ success: true });
});

app.put("/api/keys/:id", (req, res) => {
  const { id } = req.params;
  const { username, note } = req.body;
  const keys = getKeys();
  const index = keys.findIndex(k => k.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Key not found" });
  }

  keys[index] = { 
    ...keys[index], 
    username: username !== undefined ? username : keys[index].username,
    note: note !== undefined ? note : keys[index].note
  };
  
  saveKeys(keys);
  res.json(keys[index]);
});

// Validation endpoint for the Python app (Public API)
app.get("/api/validate/:code", (req, res) => {
  const { code } = req.params;
  const { hwid } = req.query;
  const keys = getKeys();
  const keyIndex = keys.findIndex(k => k.code === code);
  const key = keys[keyIndex];

  // Always return JSON, even for errors
  res.setHeader('Content-Type', 'application/json');

  if (!key) {
    return res.json({ 
      valid: false, 
      message: "Key không tồn tại trong hệ thống", 
      type: "none" 
    });
  }

  const now = new Date();
  if (key.expiresAt && isAfter(now, new Date(key.expiresAt))) {
    return res.json({ 
      valid: false, 
      message: "Key đã hết hạn sử dụng", 
      type: key.type 
    });
  }

  if (key.status === "used") {
    // Check if it's the same machine
    if (hwid && key.hwid && key.hwid !== hwid) {
      return res.json({ 
        valid: false, 
        message: "Key này đã được sử dụng trên máy khác", 
        type: key.type 
      });
    }
    // If same machine, it's still valid until expiration
    if (key.expiresAt && isAfter(now, new Date(key.expiresAt))) {
       return res.json({ 
        valid: false, 
        message: "Key đã hết hạn sử dụng", 
        type: key.type 
      });
    }
    
    // If it's the same machine and not expired, it's valid
    if (hwid && key.hwid === hwid) {
       return res.json({ 
        valid: true, 
        message: "Key hợp lệ (Máy đã đăng ký)", 
        type: key.type,
        username: key.username
      });
    }

    return res.json({ 
      valid: false, 
      message: "Key này đã được sử dụng", 
      type: key.type 
    });
  }

  // If key is active and hwid is provided, lock it to this machine
  if (hwid) {
    keys[keyIndex] = { ...key, hwid: hwid as string, status: "used" };
    saveKeys(keys);
    return res.json({ 
      valid: true, 
      message: "Kích hoạt Key thành công cho máy này", 
      type: key.type,
      username: key.username
    });
  }

  res.json({ 
    valid: true, 
    message: "Key hợp lệ (Chưa kích hoạt)", 
    type: key.type,
    username: key.username
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
