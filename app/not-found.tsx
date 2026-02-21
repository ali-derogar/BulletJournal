import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-gray-600 mt-2">{t("description")}</p>
      </div>
    </div>
  );
}
