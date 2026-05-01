export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-56 bg-neutral-200 mb-2" />
        <div className="h-4 w-80 bg-neutral-100 mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-32 bg-neutral-100 border border-neutral-200" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-neutral-200 p-5">
            <div className="flex gap-3 mb-4">
              <div className="h-5 w-24 bg-neutral-200" />
              <div className="h-5 w-20 bg-neutral-100" />
            </div>
            <div className="h-6 w-48 bg-neutral-200 mb-2" />
            <div className="h-4 w-40 bg-neutral-100 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 bg-neutral-50 border border-neutral-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
