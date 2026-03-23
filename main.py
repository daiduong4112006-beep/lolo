import webview
import os
import sys
import time
import ctypes
import subprocess
import threading
from io import BytesIO

# Thư viện cho Tool chính
try:
    import win32gui
    import win32con
    import win32api
    import win32clipboard
    from PIL import ImageGrab
    import tkinter as tk
except ImportError:
    print("❌ Thiếu thư viện! Vui lòng chạy: pip install pywin32 Pillow")

# DPI FIX
ctypes.windll.shcore.SetProcessDpiAwareness(2)

# CONFIG TOOL
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
CHAT_URL = "https://chat.openai.com"
WIDTH, HEIGHT = 420, 650
MOVE_STEP = 30

def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

# ============================================================
# TOOL LOGIC (PHẦN CODE CỦA BẠN)
# ============================================================

def kill_old():
    try:
        current_pid = os.getpid()
        for line in os.popen("tasklist | findstr python.exe"):
            parts = line.split()
            if len(parts) >= 2 and parts[1] != str(current_pid):
                os.system(f"taskkill /F /PID {parts[1]} >nul 2>&1")
        os.system("taskkill /F /IM brave.exe /T >nul 2>&1")
    except:
        pass

def apply_style(hwnd):
    ex = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
    ex |= (win32con.WS_EX_TOPMOST | win32con.WS_EX_TOOLWINDOW | win32con.WS_EX_NOACTIVATE)
    win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, ex)
    st = win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE)
    st &= ~win32con.WS_CAPTION
    win32gui.SetWindowLong(hwnd, win32con.GWL_STYLE, st)

def set_position(hwnd):
    sw = win32api.GetSystemMetrics(0)
    x = sw - WIDTH - 40
    y = 80
    win32gui.MoveWindow(hwnd, x, y, WIDTH, HEIGHT, True)
    win32gui.ShowWindow(hwnd, win32con.SW_SHOW)

def find_brave_window():
    result = []
    def callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd)
            if title and "Brave" in title:
                result.append(hwnd)
    win32gui.EnumWindows(callback, None)
    return result[0] if result else None

def copy_to_clipboard(img):
    output = BytesIO()
    img.convert("RGB").save(output, "BMP")
    data = output.getvalue()[14:]
    output.close()
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardData(win32con.CF_DIB, data)
    win32clipboard.CloseClipboard()

def screenshot():
    root = tk.Tk()
    root.attributes("-fullscreen", True)
    root.attributes("-alpha", 0.25)
    root.attributes("-topmost", True)
    root.overrideredirect(True)
    canvas = tk.Canvas(root, bg="black", cursor="cross")
    canvas.pack(fill=tk.BOTH, expand=True)
    pos = {}
    def start(e):
        pos["x"] = canvas.canvasx(e.x)
        pos["y"] = canvas.canvasy(e.y)
        pos["rect"] = canvas.create_rectangle(pos["x"], pos["y"], pos["x"], pos["y"], outline="red", width=2)
    def drag(e):
        canvas.coords(pos["rect"], pos["x"], pos["y"], canvas.canvasx(e.x), canvas.canvasy(e.y))
    def end(e):
        root.withdraw()
        time.sleep(0.15)
        x1, y1 = pos["x"], pos["y"]
        x2, y2 = canvas.canvasx(e.x), canvas.canvasy(e.y)
        img = ImageGrab.grab(bbox=(min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)), all_screens=True)
        img.save(f"shot_{int(time.time())}.png")
        copy_to_clipboard(img)
        root.destroy()
    canvas.bind("<ButtonPress-1>", start)
    canvas.bind("<B1-Motion>", drag)
    canvas.bind("<ButtonRelease-1>", end)
    root.bind("<Escape>", lambda e: root.destroy())
    root.mainloop()

def run_main_tool_loop():
    kill_old()
    time.sleep(1)
    
    print("🚀 Đang khởi động Brave...")
    proc = subprocess.Popen(f'"{BRAVE_PATH}" {CHAT_URL}', shell=True)
    
    brave_hwnd = None
    for _ in range(20):
        brave_hwnd = find_brave_window()
        if brave_hwnd: break
        time.sleep(0.5)

    if not brave_hwnd:
        print("❌ Không tìm thấy cửa sổ Brave!")
        return

    apply_style(brave_hwnd)
    set_position(brave_hwnd)
    
    print("🔥 TOOL ĐÃ SẴN SÀNG!")
    print("ESC: Thoát | Alt+D: Ẩn/Hiện | F8: Chụp màn hình | Ctrl+\\: Copy-Paste")

    is_hidden = False
    last_rect = None

    while True:
        time.sleep(0.01)
        
        # Kiểm tra nếu cửa sổ Brave đã bị đóng bởi người dùng
        if not win32gui.IsWindow(brave_hwnd):
            print("👋 Cửa sổ Brave đã đóng. Thoát Tool...")
            break

        # Thoát bằng phím ESC
        if win32api.GetKeyState(win32con.VK_ESCAPE) < 0:
            print("👋 Nhấn ESC. Đang đóng Brave...")
            try:
                if win32gui.IsWindow(brave_hwnd):
                    win32gui.PostMessage(brave_hwnd, win32con.WM_CLOSE, 0, 0)
            except:
                pass
            break

        # Giữ cửa sổ luôn trên cùng
        try:
            if win32gui.IsWindow(brave_hwnd):
                win32gui.SetWindowPos(brave_hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_SHOWWINDOW | win32con.SWP_NOACTIVATE)
        except:
            pass

        if win32api.GetAsyncKeyState(win32con.VK_MENU) & 0x8000:
            if win32api.GetAsyncKeyState(win32con.VK_LEFT) & 1:
                l, t, r, b = win32gui.GetWindowRect(brave_hwnd)
                win32gui.MoveWindow(brave_hwnd, l - MOVE_STEP, t, r - l, b - t, True)
            if win32api.GetAsyncKeyState(win32con.VK_RIGHT) & 1:
                l, t, r, b = win32gui.GetWindowRect(brave_hwnd)
                win32gui.MoveWindow(brave_hwnd, l + MOVE_STEP, t, r - l, b - t, True)
            if win32api.GetAsyncKeyState(win32con.VK_UP) & 1:
                l, t, r, b = win32gui.GetWindowRect(brave_hwnd)
                win32gui.MoveWindow(brave_hwnd, l, t - MOVE_STEP, r - l, b - t, True)
            if win32api.GetAsyncKeyState(win32con.VK_DOWN) & 1:
                l, t, r, b = win32gui.GetWindowRect(brave_hwnd)
                win32gui.MoveWindow(brave_hwnd, l, t + MOVE_STEP, r - l, b - t, True)

        if (win32api.GetAsyncKeyState(win32con.VK_MENU) & 0x8000 and win32api.GetAsyncKeyState(ord('D')) & 1):
            if not is_hidden:
                last_rect = win32gui.GetWindowRect(brave_hwnd)
                win32gui.MoveWindow(brave_hwnd, -5000, -5000, last_rect[2] - last_rect[0], last_rect[3] - last_rect[1], True)
                is_hidden = True
            else:
                l, t, r, b = last_rect
                win32gui.MoveWindow(brave_hwnd, l, t, r - l, b - t, True)
                is_hidden = False
            time.sleep(0.2)

        if (win32api.GetAsyncKeyState(win32con.VK_CONTROL) & 0x8000 and win32api.GetAsyncKeyState(0xDC) & 1):
            win32api.keybd_event(win32con.VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(ord('C'), 0, 0, 0)
            win32api.keybd_event(ord('C'), 0, 2, 0)
            win32api.keybd_event(win32con.VK_CONTROL, 0, 2, 0)
            time.sleep(0.15)
            win32api.keybd_event(win32con.VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(ord('V'), 0, 0, 0)
            win32api.keybd_event(ord('V'), 0, 2, 0)
            win32api.keybd_event(win32con.VK_CONTROL, 0, 2, 0)
            time.sleep(0.4)
            win32api.keybd_event(win32con.VK_RETURN, 0, 0, 0)
            win32api.keybd_event(win32con.VK_RETURN, 0, 2, 0)

        if win32api.GetAsyncKeyState(win32con.VK_F8) & 1:
            screenshot()

    # Khi thoát vòng lặp, đóng Brave nếu còn chạy
    try:
        proc.terminate()
    except:
        pass
# WEBVIEW API
# ============================================================

class Api:
    def __init__(self):
        self.is_activated = False

    def on_activated(self, data):
        print(f"✅ Đã kích hoạt: {data.get('key')}")
        self.is_activated = True
        time.sleep(1)
        window.destroy()

    def close_app(self):
        print("👋 Đang thoát ứng dụng...")
        os._exit(0)

api = Api()
html_file = get_resource_path("dist/index.html")

window = webview.create_window(
    title='Key Master Pro', 
    url=html_file, 
    js_api=api,
    width=420,
    height=720,
    resizable=False
)

if __name__ == '__main__':
    if not os.path.exists(html_file):
        print("❌ Thiếu thư mục dist! Hãy chạy 'npm run build'")
    else:
        webview.start()
        # Sau khi cửa sổ kích hoạt đóng lại, chỉ chạy Tool nếu đã kích hoạt thành công
        if api.is_activated:
            run_main_tool_loop()
            sys.exit(0)
        else:
            print("❌ Chưa kích hoạt. Thoát ứng dụng.")
            sys.exit(0)
