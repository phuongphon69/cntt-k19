// components/pwa-install-banner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Download, X, Share2 } from "lucide-react";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import { ShareClassModal } from "./share-class-modal";

export function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Do not show banner if already running as standalone app
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa_banner_dismissed");
    if (!dismissed) {
      // Delay showing banner by 1.5 seconds for pleasant entrance
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_banner_dismissed", "true");
  };

  return (
    <>
      {showBanner && (
        <aside
          aria-label="Cài đặt ứng dụng lên màn hình chính"
          className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-indigo-200/80 dark:border-indigo-800/80 shadow-xl shadow-indigo-500/10 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-indigo-500/30 shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-900">
              <img src="/logo.png" alt="App Logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                Cài App ra màn hình chính
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Mở nhanh như ứng dụng tải từ Store
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsInstallOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Cài Đặt
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      <PwaInstallPrompt
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <ShareClassModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        onOpenInstallGuide={() => setIsInstallOpen(true)}
      />
    </>
  );
}
