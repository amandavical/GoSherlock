import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoVerdict — Central de Governança e Decisão Autônoma de Backoffice",
  description: "Governança e triagem autônoma de avarias com IA multimodal para e-commerce",
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

