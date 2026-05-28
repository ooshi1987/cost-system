import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Costra — 飲食店の原価管理",
  description: "飲食店の食材原価・利益率をスマートに管理するSaaS「Costra」",
  appleWebApp: {
    capable: true,
    title: "Costra",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c84a1f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
