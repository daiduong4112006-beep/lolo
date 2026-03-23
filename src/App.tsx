import React, { useState } from "react";
import { 
  Shield, 
  Key as KeyIcon, 
  MousePointer2, 
  Move, 
  Send, 
  EyeOff, 
  XCircle, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Command,
  Cpu,
  Lock,
  Globe,
  HelpCircle,
  X,
  Minus,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [userKey, setUserKey] = useState("");
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error" | "loading";
    message: string;
  }>({ type: "idle", message: "" });

  const handleClose = () => {
    if ((window as any).pywebview && (window as any).pywebview.api) {
      (window as any).pywebview.api.close_app();
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUserKeyCheck = async () => {
    if (!userKey.trim()) {
      setStatus({ type: "error", message: "Vui lòng nhập mã Key!" });
      return;
    }
    
    setStatus({ type: "loading", message: "Đang xác thực..." });
    try {
      const res = await fetch(`https://lolo-dx4o.onrender.com/api/validate/${userKey.trim()}`);
      const data = await res.json();
      
      if (data.valid) {
        setStatus({ 
          type: "success", 
          message: `Kích hoạt thành công! Hết hạn: ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("vi-VN") : "Vĩnh viễn"}` 
        });
        
        if ((window as any).pywebview && (window as any).pywebview.api) {
          (window as any).pywebview.api.on_activated(data);
        }
      } else {
        setStatus({ type: "error", message: data.message || "Key không hợp lệ!" });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Lỗi kết nối đến Server Render!" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#E4E3E0] flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
      >
        {/* Hardware Header */}
        <div className="bg-[#1a1a1a] border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">System Online</span>
          </div>
          <div className="flex items-center gap-3 text-white/30">
            <Minus size={14} className="cursor-pointer hover:text-white transition-colors" />
            <X size={14} onClick={handleClose} className="cursor-pointer hover:text-red-500 transition-colors" />
          </div>
        </div>

        <div className="p-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <Cpu className="text-emerald-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center italic uppercase">KEY MASTER PRO</h1>
            <p className="text-white/40 text-[9px] mt-1 uppercase tracking-[0.4em] font-mono">Security Module v2.5</p>
          </div>

          {/* Input Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 ml-1">
                Authorization Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyIcon className="text-white/20 group-focus-within:text-emerald-500 transition-colors" size={18} />
                </div>
                <input
                  type="text"
                  value={userKey}
                  onChange={(e) => setUserKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserKeyCheck()}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-white/10 tracking-widest text-center"
                />
              </div>
            </div>

            {/* Status Message */}
            <AnimatePresence mode="wait">
              {status.type !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    status.type === "success" 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                      : status.type === "error"
                      ? "bg-red-500/5 border-red-500/20 text-red-400"
                      : "bg-blue-500/5 border-blue-500/20 text-blue-400"
                  }`}
                >
                  {status.type === "loading" ? <Loader2 className="animate-spin shrink-0" size={18} /> : 
                   status.type === "success" ? <CheckCircle2 className="shrink-0 text-emerald-500" size={18} /> : 
                   <AlertCircle className="shrink-0 text-red-500" size={18} />}
                  <span className="text-[11px] leading-relaxed font-medium">{status.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <button
              onClick={handleUserKeyCheck}
              disabled={status.type === "loading"}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group shadow-[0_10px_20px_rgba(16,185,129,0.1)]"
            >
              {status.type === "loading" ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Lock size={18} />
                  KÍCH HOẠT HỆ THỐNG
                </>
              )}
            </button>
          </div>

          {/* Instructions Section */}
          <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-2">
              <Command className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Hướng dẫn & Phím tắt</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl group hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <EyeOff className="w-3 h-3 text-emerald-500" />
                  <span className="text-[8px] font-mono uppercase text-white/20">Toggle</span>
                </div>
                <div className="text-sm font-black tracking-widest">ALT + D</div>
                <div className="text-[9px] text-white/30 mt-1">Ẩn / Bật App</div>
              </div>
              <div className="p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl group hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="text-[8px] font-mono uppercase text-white/20">Kill</span>
                </div>
                <div className="text-sm font-black tracking-widest">ESC</div>
                <div className="text-[9px] text-white/30 mt-1">Tắt hoàn toàn</div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { id: "01", text: "Bôi chọn phần câu hỏi cần tìm.", icon: <MousePointer2 className="w-3 h-3" /> },
                { id: "02", text: "Kéo phần đã bôi vào ChatGPT.", icon: <Move className="w-3 h-3" /> },
                { id: "03", text: "Ấn gửi để nhận câu trả lời.", icon: <Send className="w-3 h-3" /> }
              ].map((step) => (
                <div key={step.id} className="flex gap-4 group items-center">
                  <div className="flex-none w-8 h-8 rounded-lg bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-[10px] font-black group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    {step.id}
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/40 group-hover:text-white/80 transition-colors">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1a1a] p-4 text-center border-t border-white/5">
          <p className="text-[8px] font-mono text-white/10 uppercase tracking-[0.5em]">
            Secured by Key Master Technology
          </p>
        </div>
      </motion.div>
    </div>
  );
}
