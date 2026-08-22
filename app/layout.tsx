// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "CNTT K19 CĐ - Hệ thống Điểm danh & Thời khóa biểu",
  description:
    "Hệ thống theo dõi điểm danh, thời khóa biểu và chuyên cần trực tuyến lớp CNTT K19 CĐ, đồng bộ dữ liệu trực tiếp từ Google Sheets.",
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
      </body>
    </html>
  );
}
