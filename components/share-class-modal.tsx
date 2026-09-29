// components/share-class-modal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  X,
  ExternalLink,
  Smartphone,
  Sparkles,
  Send,
  Users,
} from "lucide-react";

interface ShareClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInstallGuide?: () => void;
}

export function ShareClassModal({
  isOpen,
  onClose,
  onOpenInstallGuide,
}: ShareClassModalProps) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.origin);
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        setCanShare(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (canShare) {
      try {
        await navigator.share({
          title: "CNTT - K19 CĐ | Điểm Danh & Thời Khóa Biểu",
          text: "Link theo dõi lịch học, phòng Zoom và điểm danh chuyên cần lớp CNTT - K19 CĐ:",
          url: currentUrl || window.location.href,
        });
      } catch (e) {
        // User cancelled share
      }
    }
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    currentUrl || "http://localhost:3000"
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Chia Sẻ Link Lớp Học
              </h3>
              <p className="text-xs text-slate-500">
                Gửi cho cả lớp để ai cũng truy cập được trên điện thoại
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

        {/* Link Copy Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Đường link truy cập trực tiếp:</span>
          </label>

          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 px-2 outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "ĐÃ CHÉP!" : "SAO CHÉP"}</span>
            </button>
          </div>
        </div>

        {/* Native Share Button (if mobile supports) */}
        {canShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Gửi Qua Zalo / Messenger / Tin Nhắn</span>
          </button>
        )}

        {/* QR Code Section */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Quét mã QR bằng Camera điện thoại:</span>
          </div>

          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrApiUrl}
                alt="Mã QR lớp học CNTT K19"
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Mở Camera trên iPhone hoặc Zalo trên Android và quét vào mã trên để vào lớp ngay tức thì.
          </p>
        </div>

        {/* PWA Install shortcut banner */}
        {onOpenInstallGuide && (
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
              <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-[11px]">
                Muốn đưa biểu tượng App ra màn hình chính điện thoại?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInstallGuide();
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
            >
              Xem cách thêm ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
