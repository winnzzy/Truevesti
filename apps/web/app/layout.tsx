import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Truevestii | Crypto Investment Operations",
  description: "Compliance-ready crypto investment brokerage platform."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

