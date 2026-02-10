import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { DateProvider } from "./context/DateContext";
import { UserProvider } from "./context/UserContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import PWARegistration from "./PWARegistration";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export const metadata: Metadata = {
  title: "Bullet Journal v1.1.0",
  description: "Offline-first Progressive Web Application",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bullet Journal",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const isRTL = locale === "fa";

  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global error handler to catch all errors
              window.addEventListener('error', function(event) {
                console.error('🔴 GLOBAL ERROR:', {
                  message: event.message,
                  filename: event.filename,
                  lineno: event.lineno,
                  colno: event.colno,
                  error: event.error ? {
                    name: event.error.name,
                    message: event.error.message,
                    stack: event.error.stack
                  } : null
                });
              });

              window.addEventListener('unhandledrejection', function(event) {
                console.error('🔴 UNHANDLED PROMISE REJECTION:', {
                  reason: event.reason,
                  promise: event.promise
                });
              });
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            <AuthProvider>
              <EmailVerificationBanner />
              <UserProvider>
                <DateProvider>{children}</DateProvider>
                <NotificationPermissionPrompt />
              </UserProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <PWARegistration />
      </body>
    </html>
  );
}
