import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Key as KeyIcon, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  LogOut, 
  Search,
  Calendar,
  Clock,
  Tag,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { Key, KeyType } from "./types";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "4112006";

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [newKeyType, setNewKeyType] = useState<KeyType>("1day");
  const [newKeyNote, setNewKeyNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchKeys();
    }
  }, [isLoggedIn]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      setError("Không thể tải danh sách Key từ Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setError("");
    } else {
      setError("Mật khẩu không chính xác");
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newKeyType, note: newKeyNote }),
      });
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
      setNewKeyNote("");
    } catch (err) {
      setError("Lỗi khi tạo Key");
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (code: string, id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Key này?")) return;
    try {
      await fetch(`/api/keys/${code}`, { method: "DELETE" });
      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      setError("Lỗi khi xóa Key");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map data to keys
        const newKeys = data.map((item: any) => ({
          code: item.Code || item.code || item.Key || item.key,
          type: item.Type || item.type || "permanent",
          note: item.Note || item.note || item.GhiChu || "",
          status: "active",
          createdAt: new Date().toISOString()
        })).filter(k => k.code);

        if (newKeys.length === 0) {
          setError("Không tìm thấy dữ liệu Key hợp lệ trong file");
          return;
        }

        setLoading(true);
        const res = await fetch("/api/keys/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: newKeys }),
        });

        if (res.ok) {
          fetchKeys();
          alert(`Đã tải lên thành công ${newKeys.length} Key`);
        } else {
          setError("Lỗi khi tải lên hàng loạt");
        }
      } catch (err) {
        setError("Lỗi khi đọc file Excel/CSV");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToTxt = () => {
    const content = keys.map(k => {
      const expiry = k.expiresAt ? new Date(k.expiresAt).toLocaleString("vi-VN") : "Vĩnh viễn";
      return `MÃ KEY: ${k.code}\nLOẠI: ${k.type}\nTRẠNG THÁI: ${k.status}\nHẾT HẠN: ${expiry}\nGHI CHÚ: ${k.note || "Không có"}\n----------------------------`;
    }).join("\n\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DANH_SACH_KEY_${new Date().toLocaleDateString("vi-VN")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredKeys = keys.filter(k => 
    k.code.toLowerCase().includes(filter.toLowerCase()) || 
    k.note?.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <Shield className="text-emerald-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight italic uppercase">Admin Access</h1>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Key Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 ml-1">Master Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-4 px-4 text-center text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-[11px] bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
              XÁC THỰC QUẢN TRỊ
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#E4E3E0] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Shield className="text-emerald-500" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold italic uppercase tracking-tight">Key Master Dashboard</h1>
              <p className="text-white/40 text-[10px] uppercase tracking-widest">Quản lý hệ thống Key (Google Sheets)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all"
            >
              <Upload size={16} /> UP FILE EXCEL/DOC
            </button>
            <button 
              onClick={exportToTxt}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
            >
              <Download size={16} /> XUẤT FILE TXT
            </button>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut size={16} /> ĐĂNG XUẤT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Generator */}
          <div className="space-y-6">
            <div className="bg-[#141414] p-6 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-2">
                <Plus className="text-emerald-500" size={18} />
                <h2 className="text-sm font-bold uppercase tracking-widest">Tạo Key Mới</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-white/40 ml-1">Loại Key</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["1day", "1week", "permanent"] as KeyType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewKeyType(t)}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                          newKeyType === t 
                            ? "bg-emerald-500 border-emerald-500 text-black" 
                            : "bg-[#0a0a0a] border-white/10 text-white/40 hover:border-white/20"
                        }`}
                      >
                        {t === "1day" ? "1 NGÀY" : t === "1week" ? "1 TUẦN" : "VĨNH VIỄN"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-white/40 ml-1">Ghi chú (Tên khách, SĐT...)</label>
                  <input
                    type="text"
                    value={newKeyNote}
                    onChange={(e) => setNewKeyNote(e.target.value)}
                    placeholder="Ví dụ: Anh Tuấn - 098xxx"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <button
                  onClick={generateKey}
                  disabled={generating}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-black font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                  TẠO KEY NGAY
                </button>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-[#141414] p-6 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest">Thống kê (G-Sheets)</h2>
                <Tag className="text-emerald-500" size={18} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-white/5">
                  <div className="text-white/40 text-[9px] uppercase mb-1">Tổng Key</div>
                  <div className="text-2xl font-black italic">{keys.length}</div>
                </div>
                <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-white/5">
                  <div className="text-emerald-500/40 text-[9px] uppercase mb-1">Đang Active</div>
                  <div className="text-2xl font-black italic text-emerald-500">
                    {keys.filter(k => k.status === "active").length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141414] p-6 rounded-3xl border border-white/10 min-h-[600px] flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <FileText className="text-emerald-500" size={18} />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Danh sách Key</h2>
                  <button 
                    onClick={fetchKeys}
                    className="p-1 hover:bg-white/5 rounded-full transition-colors"
                    title="Làm mới"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm mã Key hoặc ghi chú..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-[#0a0a0a] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs w-full md:w-64 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-[10px] uppercase tracking-widest">Đang truy xuất dữ liệu...</p>
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/10 gap-4">
                  <AlertCircle size={48} />
                  <p className="text-[10px] uppercase tracking-widest">Không tìm thấy Key nào</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                  {filteredKeys.map((k) => (
                    <motion.div
                      layout
                      key={k.id}
                      className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 hover:border-white/20 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-bold tracking-wider text-emerald-500">{k.code}</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              k.type === "permanent" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                              k.type === "1week" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            }`}>
                              {k.type}
                            </span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              k.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {k.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-white/30 font-mono">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>Tạo: {k.createdAt ? new Date(k.createdAt).toLocaleDateString("vi-VN") : "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} />
                              <span>Hết hạn: {k.expiresAt && k.expiresAt !== "Never" ? new Date(k.expiresAt).toLocaleString("vi-VN") : "Vĩnh viễn"}</span>
                            </div>
                            {k.note && (
                              <div className="flex items-center gap-1.5 text-white/50">
                                <Tag size={12} />
                                <span>{k.note}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(k.code, k.id)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                            title="Copy Key"
                          >
                            {copiedId === k.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={() => deleteKey(k.code, k.id)}
                            className="p-2 bg-red-500/5 hover:bg-red-500/20 rounded-lg transition-colors text-red-500/50 hover:text-red-500"
                            title="Xóa Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
