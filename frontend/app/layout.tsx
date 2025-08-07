import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BackendProvider } from "@/providers/BackendProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobMate AI - Your AI Career Mentor",
  description: "AI-powered career development and interview preparation platform",
  keywords: ["career", "interview", "AI", "resume", "job application"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BackendProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {children}
          </div>
        </BackendProvider>
      </body>
    </html>
  );
}
