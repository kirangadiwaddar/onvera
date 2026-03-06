import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sora",
})


export const metadata: Metadata = {
  title: "Onvera",
  description: "Onboard your clients with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={sora.className}>
           {children}
           <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
