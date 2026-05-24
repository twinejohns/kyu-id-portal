import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

export const metadata: Metadata = {
  title: "KyU Staff ID Portal",
  description: "Official Staff Identification Portal for Kyambogo University",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

