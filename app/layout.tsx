import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DateProvider } from "./context/DateContext";
import { UserProvider } from "./context/UserContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import PWARegistration from "./PWARegistration";

export const metadata: Metadata = {
  title: "Bullet Journal v1.1.0",
  description: "Offline-first Progressive Web Application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bullet Journal",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              <DateProvider>{children}</DateProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
        <PWARegistration />
      </body>
    </html>
  );
}
