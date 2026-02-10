import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { i18n } from "@/i18n/config";

export const dynamic = "force-dynamic";

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

  setRequestLocale(locale);
  return <>{children}</>;
}
