import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "sonner";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sora",
})

// import { MockProvider } from '../src/mocks/MockProvider'


export const metadata: Metadata = {
  title: "Onvera",
  description: "Onboard your clients with ease",
};

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("onvera-theme");
    const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (_) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={sora.className}>
        {/* <MockProvider> */}
        <AuthProvider>{children}</AuthProvider>
        {/* </MockProvider> */}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
