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
app.use(express.static(path.join(process.cwd(), "public")));

// Endpoint tải file cài đặt trực tiếp
app.get(["/api/download", "/KeyMaster.zip", "/hu_hi.zip"], (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), "public", "KeyMaster.zip"),
    path.join(process.cwd(), "public", "hu_hi.zip"),
    path.join(process.cwd(), "dist", "KeyMaster.zip"),
    path.join(process.cwd(), "dist", "hu_hi.zip")
  ];

  const targetPath = possiblePaths.find(p => fs.existsSync(p));

  if (targetPath) {
    res.download(targetPath, "KeyMaster.zip", (err) => {
      if (err) {
        console.error("Lỗi khi gửi file tải về:", err);
      }
    });
  } else {
    res.status(404).json({ error: "File cài đặt chưa có sẵn trên hệ thống" });
  }
});

// Endpoint kiểm tra thông tin file cài đặt
app.get("/api/download/info", (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), "public", "KeyMaster.zip"),
    path.join(process.cwd(), "public", "hu_hi.zip"),
    path.join(process.cwd(), "dist", "KeyMaster.zip"),
    path.join(process.cwd(), "dist", "hu_hi.zip")
  ];

  const targetPath = possiblePaths.find(p => fs.existsSync(p));

  if (targetPath) {
    const stats = fs.statSync(targetPath);
    res.json({
      available: true,
      filename: "KeyMaster.zip",
      size: stats.size,
      sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
    });
  } else {
    res.json({ available: false });
  }
});

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

const ADMIN_MASTER_CODE = "411206";

const getKeys = (): Key[] => {
  let list: Key[] = [];
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    list = JSON.parse(data);
  } catch (e) {
    list = [];
  }

  // Đảm bảo Key đặc biệt Quản trị viên 411206 luôn tồn tại
  if (!list.some(k => k.code === ADMIN_MASTER_CODE)) {
    list.unshift({
      id: "admin-master-411206",
      code: ADMIN_MASTER_CODE,
      type: "permanent",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
      status: "active",
      note: "Key đặc biệt Quản trị viên (Vĩnh viễn - Không giới hạn máy)",
      username: "Quản trị viên (Admin)",
      hwid: "ALL (Không khóa máy)"
    });
    saveKeys(list);
  }

  return list;
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
    if (k.code === ADMIN_MASTER_CODE) {
      return { ...k, status: "active" as const, expiresAt: null };
    }
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
  const { type, note, username, customCode, isMaster } = req.body;
  const now = new Date();
  let expiresAt: Date | null = null;

  if (type === "1day") expiresAt = addDays(now, 1);
  else if (type === "1week") expiresAt = addDays(now, 7);

  const keys = getKeys();

  let code = "";
  if (customCode && typeof customCode === "string" && customCode.trim()) {
    code = customCode.trim();
    // Kiểm tra xem key đã tồn tại chưa
    if (keys.some(k => k.code.toLowerCase() === code.toLowerCase())) {
      return res.status(400).json({ error: `Mã key "${code}" đã tồn tại trên hệ thống!` });
    }
  } else {
    code = `KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  const newKey: Key = {
    id: uuidv4(),
    code,
    type,
    createdAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    status: "active",
    note: note || (isMaster ? "Key Quản trị viên (Không giới hạn máy)" : ""),
    username: username || (isMaster ? "Administrator" : ""),
    hwid: isMaster ? "ALL" : ""
  };

  keys.push(newKey);
  saveKeys(keys);
  res.json(newKey);
});

app.delete("/api/keys/:id", (req, res) => {
  const { id } = req.params;
  const keys = getKeys();
  const target = keys.find(k => k.id === id);
  if (target && target.code === ADMIN_MASTER_CODE) {
    return res.status(400).json({ error: "Không thể xóa Key đặc biệt của Quản trị viên!" });
  }
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

  // Always return JSON, even for errors
  res.setHeader('Content-Type', 'application/json');

  // Key đặc biệt vĩnh viễn cho Quản trị viên (Master Admin Key)
  if (code && code.trim() === ADMIN_MASTER_CODE) {
    return res.json({ 
      valid: true, 
      message: "Key đặc biệt Quản trị viên (Vĩnh viễn - Không giới hạn thiết bị)", 
      type: "permanent",
      username: "Administrator",
      isAdmin: true,
      expiresAt: null
    });
  }

  const keys = getKeys();
  const keyIndex = keys.findIndex(k => k.code === code);
  const key = keys[keyIndex];

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

  // Nếu là Key Quản trị viên hoặc hwid === "ALL" (Không giới hạn máy)
  if (key.hwid === "ALL" || key.hwid === "all") {
    return res.json({ 
      valid: true, 
      message: "Key Quản trị viên hợp lệ (Không giới hạn máy)", 
      type: key.type,
      username: key.username || "Administrator",
      isAdmin: true,
      expiresAt: key.expiresAt
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
