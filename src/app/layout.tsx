import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Be Positive", template: "%s · Be Positive" },
  description: "Goals, tasks, learning, decisions, finances and growth in one place.",
  applicationName: "Be Positive",
};

// viewportFit cover lets the layout use the notch area; safe-area insets keep content clear of it.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#07070d" };

// Runs before first paint so a light-theme user never sees a dark flash. Keep in sync with THEME_KEY in Settings.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches))document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      spellCheck // inherited by every text field; Firefox skips single-line inputs without it
      suppressHydrationWarning // the theme script sets data-theme before React hydrates
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
