import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoSherlock — Perícia Visual & Resolução Autônoma de Backoffice",
  description: "Investigação multimodal e triagem Zero-Touch de avarias de produtos para o ecossistema GoGroup",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

