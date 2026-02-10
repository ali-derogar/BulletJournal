export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-gray-600 mt-2">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
