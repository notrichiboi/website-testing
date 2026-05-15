import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BBS Studio Ultimate",
  description: "Universal Minecraft Bedrock model, particle, texture, animation, and BBS ZIP studio."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
