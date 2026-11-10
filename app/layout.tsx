import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pagelet — A little page. A big beginning.",
  description: "Create a beautiful landing page without the blank canvas. Pick a layout, make it yours, and export a responsive website.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
