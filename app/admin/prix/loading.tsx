export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse">
      <div className="mb-4">
        <div className="h-9 w-full bg-neutral-100 border border-neutral-200 mb-2" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-neutral-100 border border-neutral-200" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-neutral-200">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-40 bg-neutral-200 mb-1.5" />
                <div className="h-3 w-28 bg-neutral-100" />
              </div>
              <div className="h-9 w-16 bg-neutral-100 border border-neutral-200" />
            </div>
            <div className="border-t border-neutral-100 px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 h-4 bg-neutral-100" />
              <div className="w-[110px] h-10 bg-neutral-100 border border-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
