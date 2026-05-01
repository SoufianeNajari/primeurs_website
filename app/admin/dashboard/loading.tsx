export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-56 bg-neutral-200 mb-2" />
        <div className="h-4 w-80 bg-neutral-100" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-neutral-200 p-4">
            <div className="h-3 w-20 bg-neutral-200 mb-3" />
            <div className="h-8 w-16 bg-neutral-100" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-neutral-200 p-5 mb-10">
        <div className="h-3 w-48 bg-neutral-200 mb-4" />
        <div className="h-40 bg-neutral-100" />
      </div>
      <div className="bg-white border border-neutral-200 p-5">
        <div className="h-3 w-48 bg-neutral-200 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
