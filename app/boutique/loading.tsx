export default function Loading() {
  return (
    <main className="flex-grow pb-28 min-h-screen bg-neutral-50">
      <div className="bg-neutral-50 border-b border-neutral-200 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="h-10 md:h-12 w-72 md:w-96 bg-neutral-200 mx-auto mb-4 animate-pulse" />
          <div className="h-4 w-64 bg-neutral-200 mx-auto animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-neutral-200 flex flex-col overflow-hidden">
              <div className="aspect-[4/3] w-full bg-neutral-100 animate-pulse" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-3 w-16 bg-neutral-100 animate-pulse" />
                <div className="h-5 w-3/4 bg-neutral-200 animate-pulse" />
                <div className="h-4 w-1/2 bg-neutral-100 animate-pulse" />
                <div className="h-9 w-full bg-neutral-100 animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
