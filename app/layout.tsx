// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "CNTT K19 CĐ - Hệ thống Điểm danh & Thời khóa biểu",
  description:
    "Hệ thống theo dõi điểm danh, thời khóa biểu và chuyên cần trực tuyến lớp CNTT K19 CĐ, đồng bộ dữ liệu trực tiếp từ Google Sheets.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CNTT K19",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "554x554", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.png" },
    ],
    shortcut: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 pb-12">{children}</main>
        <Footer />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
