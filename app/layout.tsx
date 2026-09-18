import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEICIM | Estoque e Agenda",
  description: "Sistema de controle de estoque e agenda de visitas do CEICIM.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
