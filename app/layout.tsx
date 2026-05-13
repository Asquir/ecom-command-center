import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { SettingsProvider } from "@/lib/settings-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ecom Command Center",
  description: "Dropshipping & ecommerce operations OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <SettingsProvider>
          <ToastProvider>{children}</ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
