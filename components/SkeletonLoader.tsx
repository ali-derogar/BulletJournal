export function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export function TaskSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 shadow animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 p-2 border rounded">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-12"></div>
            <div className="h-6 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpenseSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 shadow animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 p-2 border rounded">
            <div className="flex-1 h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InputSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 shadow animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-6 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}
