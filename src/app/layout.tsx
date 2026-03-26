import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Fritz Calculadora",
  description: "Calculadora de métricas para distribuidores Fritz",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-bg-white-0 text-text-strong-950 antialiased">{children}</body>
    </html>
  );
}
