import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";
import { TRPCProvider } from "@/trpc/client";
import {
  ClerkProvider,

} from '@clerk/nextjs'
import { Toaster } from "@/components/ui/sonner";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextTube",
  description: "Where Music Meets Visuals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/"  >
      <html lang="en" suppressHydrationWarning >
        <body
          className={inter.className}
        >
          <TRPCProvider>
            <Toaster />
            {children}
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
