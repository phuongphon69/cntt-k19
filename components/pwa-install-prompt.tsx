// components/pwa-install-prompt.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles,
  Laptop,
  Check,
} from "lucide-react";

interface PwaInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaInstallPrompt({ isOpen, onClose }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if already installed / running in standalone PWA mode
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen to beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md shadow-indigo-600/30 shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-900">
              <img src="/logo.png" alt="App Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Đưa Ứng Dụng Ra Màn Hình Chính
              </h3>
              <p className="text-xs text-slate-500">
                Mở nhanh như App tải từ Store, không cần mở trình duyệt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Strip */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2 text-xs text-indigo-900 dark:text-indigo-200">
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Lợi ích khi đưa ra màn hình chính:</span>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-disc pl-4">
            <li>Bấm mở ngay lập tức từ biểu tượng trên màn hình điện thoại.</li>
            <li>Toàn màn hình, không bị vướng thanh địa chỉ URL của trình duyệt.</li>
            <li>Tự động cập nhật thời khóa biểu và kết quả điểm danh mới nhất.</li>
          </ul>
        </div>

        {/* Dynamic Instructions Based on OS */}
        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Bạn đã cài đặt và đang sử dụng ứng dụng ở chế độ toàn màn hình!</span>
          </div>
        ) : isIos ? (
          /* iOS Safari Guide */
          <div className="space-y-3">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Hướng dẫn dành cho iPhone / iPad (Safari):
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  Bấm vào biểu tượng <strong>Chia sẻ</strong> (hình vuông có mũi tên chỉ lên{" "}
                  <Share className="inline w-3.5 h-3.5 mx-0.5 text-indigo-600" />) ở thanh dưới cùng của Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  Cuộn xuống danh sách tùy chọn và chọn <strong>"Thêm vào MH chính"</strong> (
                  <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-indigo-600" />
                  <em>Add to Home Screen</em>).
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  Bấm nút <strong>"Thêm" (Add)</strong> ở góc trên bên phải. Biểu tượng ứng dụng sẽ xuất hiện ngay trên màn hình chính!
                </div>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          /* Android / Chrome One-Tap Install */
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>CÀI ĐẶT ỨNG DỤNG NGAY</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Hệ điều hành Android sẽ tự động thêm icon CNTT K19 vào màn hình ứng dụng của bạn.
            </p>
          </div>
        ) : (
          /* General Android Chrome / Desktop Guide */
          <div className="space-y-3">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Hướng dẫn trên Chrome (Android & Máy tính):
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <div>
                1. Bấm vào biểu tượng <strong>3 dấu chấm (⋮)</strong> ở góc phải phía trên trình duyệt Chrome.
              </div>
              <div>
                2. Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.
              </div>
              <div>
                3. Bấm xác nhận <strong>Cài đặt</strong> để đưa app ra màn hình.
              </div>
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
