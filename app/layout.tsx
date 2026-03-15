import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "sonner";
import { BadgeCheck, BadgeX } from "lucide-react";

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
        <Toaster
          closeButton={false}
          position="top-center"
          icons={{
            success: <BadgeCheck className="h-5 w-5" fill="#00c951" stroke="#fff" />,
            error: <BadgeX className="h-5 w-5" fill="#ff0000" stroke="#fff" />,
          }}
          toastOptions={{
            classNames: {
              toast:
                "bg-white text-zinc-900 border border-zinc-200 shadow-xl rounded-xl! dark:bg-white dark:text-zinc-900",
              description: "text-zinc-600",
            },
          }}
        />
      </body>
    </html>
  );
}
