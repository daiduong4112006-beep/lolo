import { useState, useEffect } from "react";
import { 
  Key as KeyIcon, 
  Trash2, 
  Clock, 
  Calendar, 
  Infinity, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Search,
  RefreshCw,
  Lock,
  ShieldCheck,
  LogIn
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Key, KeyType } from "./types";

export default function App() {
  const [view, setView] = useState<"gate" | "dashboard">("gate");
  const [adminPassword, setAdminPassword] = useState("");
  const [userKey, setUserKey] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateSuccess, setGateSuccess] = useState("");
  
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      console.error("Failed to fetch keys", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "dashboard") {
      fetchKeys();
    }
  }, [view]);

  const handleAdminLogin = () => {
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || "4112006";
    if (adminPassword === correctPassword) {
      setView("dashboard");
      setGateError("");
    } else {
      setGateError("Sai mật khẩu Admin!");
    }
  };

  const handleUserKeyCheck = async () => {
    setGateError("");
    setGateSuccess("");
    if (!userKey) return;

    try {
      const res = await fetch(`/api/validate/${userKey}`);
      const data = await res.json();
      if (data.valid) {
        setGateSuccess(`Key hợp lệ! Loại: ${data.type}. Hết hạn: ${data.expiresAt ? format(new Date(data.expiresAt), "dd/MM/yyyy HH:mm") : "Vĩnh viễn"}`);
      } else {
        setGateError(data.message || "Key không hợp lệ!");
      }
    } catch (err) {
      setGateError("Lỗi kết nối máy chủ!");
    }
  };

  const generateKey = async (type: KeyType) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
    } catch (err) {
      console.error("Failed to generate key", err);
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Xác nhận xóa key này?")) return;
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      console.error("Failed to delete key", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    const headers = ["Code", "Type", "Created At", "Expires At", "Status", "Note"];
    const rows = keys.map(k => [
      k.code,
      k.type,
      format(new Date(k.createdAt), "yyyy-MM-dd HH:mm:ss"),
      k.expiresAt ? format(new Date(k.expiresAt), "yyyy-MM-dd HH:mm:ss") : "Never",
      k.status,
      k.note || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `keys_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredKeys = keys.filter(k => 
    k.code.toLowerCase().includes(search.toLowerCase()) ||
    k.type.toLowerCase().includes(search.toLowerCase())
  );

  if (view === "gate") {
    return (
      <div className="min-h-screen bg-[#141414] text-[#E4E3E0] flex items-center justify-center p-6 font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-[#E4E3E0]/20 p-8 bg-[#1a1a1a] shadow-2xl"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold italic font-serif tracking-tighter mb-2">KEY MASTER</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Security Verification System</p>
          </div>

          <div className="space-y-8">
            {/* User Key Check */}
            <section>
              <label className="text-[10px] uppercase opacity-50 mb-2 block">Kiểm tra Key của bạn</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nhập mã key..."
                  className="flex-1 bg-transparent border border-[#E4E3E0]/30 px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                  value={userKey}
                  onChange={(e) => setUserKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserKeyCheck()}
                />
                <button 
                  onClick={handleUserKeyCheck}
                  className="bg-[#E4E3E0] text-[#141414] px-4 hover:bg-white transition-colors cursor-pointer"
                >
                  <LogIn size={18} />
                </button>
              </div>
            </section>

            <div className="relative py-4 flex items-center">
              <div className="flex-grow border-t border-[#E4E3E0]/10"></div>
              <span className="flex-shrink mx-4 text-[10px] opacity-20 uppercase">Hoặc</span>
              <div className="flex-grow border-t border-[#E4E3E0]/10"></div>
            </div>

            {/* Admin Login */}
            <section>
              <label className="text-[10px] uppercase opacity-50 mb-2 block">Quản trị viên (Admin)</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  placeholder="Mật khẩu Admin..."
                  className="flex-1 bg-transparent border border-[#E4E3E0]/30 px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <button 
                  onClick={handleAdminLogin}
                  className="border border-[#E4E3E0]/30 px-4 hover:bg-[#E4E3E0]/10 transition-colors cursor-pointer"
                >
                  <ShieldCheck size={18} />
                </button>
              </div>
            </section>

            {/* Feedback */}
            <AnimatePresence mode="wait">
              {gateError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-xs flex items-center gap-2"
                >
                  <AlertCircle size={14} /> {gateError}
                </motion.div>
              )}
              {gateSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 size={14} /> {gateSuccess}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[9px] opacity-20 uppercase tracking-widest">Authorized Access Only</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-5xl font-bold tracking-tighter italic font-serif">
                KEY MASTER
              </h1>
              <span className="bg-[#141414] text-[#E4E3E0] text-[10px] px-2 py-0.5 font-mono uppercase">Admin</span>
            </div>
            <p className="text-sm uppercase tracking-widest opacity-50 font-mono">
              Access Control & License Management
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => generateKey("1day")}
              disabled={generating}
              className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-sm font-mono cursor-pointer disabled:opacity-50"
            >
              <Clock size={16} /> +1 NGÀY
            </button>
            <button 
              onClick={() => generateKey("1week")}
              disabled={generating}
              className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-sm font-mono cursor-pointer disabled:opacity-50"
            >
              <Calendar size={16} /> +1 TUẦN
            </button>
            <button 
              onClick={() => generateKey("permanent")}
              disabled={generating}
              className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-sm font-mono cursor-pointer disabled:opacity-50"
            >
              <Infinity size={16} /> VĨNH VIỄN
            </button>
            <button 
              onClick={() => setView("gate")}
              className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-mono cursor-pointer"
            >
              <Lock size={16} /> THOÁT
            </button>
          </div>
        </header>

        {/* Stats & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-[#141414] p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] uppercase opacity-50 font-mono">Tổng số Key</span>
            <span className="text-3xl font-mono">{keys.length}</span>
          </div>
          <div className="border border-[#141414] p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] uppercase opacity-50 font-mono">Đang hoạt động</span>
            <span className="text-3xl font-mono">{keys.filter(k => k.status === 'active').length}</span>
          </div>
          <div className="md:col-span-2 border border-[#141414] p-4 flex items-center gap-4">
            <Search size={20} className="opacity-30" />
            <input 
              type="text" 
              placeholder="TÌM KIẾM THEO MÃ HOẶC LOẠI..."
              className="bg-transparent border-none outline-none w-full font-mono text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-serif italic opacity-50">Dữ liệu hệ thống</span>
            <button onClick={fetchKeys} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
              <RefreshCw size={14} />
            </button>
          </div>
          <button 
            onClick={exportToCSV}
            className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-2 hover:underline cursor-pointer"
          >
            <Download size={14} /> Xuất CSV (Google Sheets)
          </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_150px_100px_80px] gap-4 px-4 py-2 border-y border-[#141414] font-serif italic text-[11px] opacity-50 uppercase tracking-wider">
          <div>Mã Key</div>
          <div>Thời hạn</div>
          <div>Ngày hết hạn</div>
          <div>Trạng thái</div>
          <div className="text-right">Thao tác</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {loading ? (
            <div className="py-20 text-center font-mono opacity-30">ĐANG TẢI DỮ LIỆU...</div>
          ) : filteredKeys.length === 0 ? (
            <div className="py-20 text-center font-mono opacity-30">KHÔNG CÓ DỮ LIỆU</div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredKeys.map((key) => (
                <motion.div 
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-[1fr_120px_150px_100px_80px] gap-4 px-4 py-4 border-b border-[#141414]/10 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group cursor-default"
                >
                  <div className="flex items-center gap-3 font-mono text-sm truncate">
                    <KeyIcon size={14} className="opacity-30 group-hover:opacity-100" />
                    <span className="truncate">{key.code}</span>
                    <button 
                      onClick={() => copyToClipboard(key.code, key.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#E4E3E0] hover:text-[#141414] rounded cursor-pointer"
                    >
                      {copiedId === key.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs uppercase font-mono">
                    {key.type === '1day' && <Clock size={12} />}
                    {key.type === '1week' && <Calendar size={12} />}
                    {key.type === 'permanent' && <Infinity size={12} />}
                    {key.type === '1day' ? '1 Ngày' : key.type === '1week' ? '1 Tuần' : 'Vĩnh viễn'}
                  </div>

                  <div className="text-xs font-mono opacity-60 group-hover:opacity-100 flex items-center">
                    {key.expiresAt ? format(new Date(key.expiresAt), "dd/MM, HH:mm") : "KHÔNG"}
                  </div>

                  <div className="flex items-center">
                    <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                      key.status === 'active' 
                        ? 'border-emerald-500 text-emerald-600 group-hover:border-[#E4E3E0] group-hover:text-[#E4E3E0]' 
                        : key.status === 'expired'
                        ? 'border-red-500 text-red-600 group-hover:border-[#E4E3E0] group-hover:text-[#E4E3E0]'
                        : 'border-gray-400 text-gray-500 group-hover:border-[#E4E3E0] group-hover:text-[#E4E3E0]'
                    } uppercase`}>
                      {key.status === 'active' ? 'Hoạt động' : key.status === 'expired' ? 'Hết hạn' : 'Đã dùng'}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={() => deleteKey(key.id)}
                      className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all rounded cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Info */}
        <footer className="mt-20 pt-8 border-t border-[#141414]/20 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-md">
            <h3 className="text-xs font-mono uppercase mb-4 flex items-center gap-2">
              <AlertCircle size={14} /> Hướng dẫn tích hợp
            </h3>
            <p className="text-[11px] leading-relaxed opacity-60 font-serif italic">
              Để kiểm tra Key từ ứng dụng Python, hãy sử dụng API endpoint sau:
              <code className="block mt-2 p-2 bg-[#141414] text-[#E4E3E0] not-italic font-mono break-all">
                {window.location.origin}/api/validate/MÃ_KEY_CỦA_BẠN
              </code>
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-mono opacity-30 uppercase">
              Phiên bản 1.0.5<br />
              Cập nhật: {format(new Date(), "HH:mm:ss")}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
