import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "@/app/globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "AI Portal",
  description: "Virtual keys, usage, models and spend for LiteLLM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={kanit.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
