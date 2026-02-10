import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";
import { DateProvider } from "../context/DateContext";
import { UserProvider } from "../context/UserContext";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import PWARegistration from "../PWARegistration";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { i18n } from "@/i18n/config";

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

export function generateStaticParams() {
  return i18n.locales.map((locale: string) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  // Validate that the incoming `locale` parameter is valid
  if (!i18n.locales.includes(locale as typeof i18n.locales[number])) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages({ locale });
  const isRTL = locale === 'fa';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
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

              // Set RTL/LTR on page load
              const locale = '${locale}';
              document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
              document.documentElement.lang = locale;
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
