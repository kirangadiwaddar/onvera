import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sora",
})

import { MockProvider } from '../src/mocks/MockProvider'


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
        <MockProvider>
           {children}
        </MockProvider>
      </body>
    </html>
  );
}
