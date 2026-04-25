export default function Loading() {
  return (
    <main className="flex-grow py-8 px-4 bg-neutral-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 bg-neutral-200 animate-pulse" />
          <div className="h-9 w-72 bg-neutral-200 animate-pulse" />
        </div>

        <div className="bg-white border border-neutral-200">
          <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200">
            <div className="h-5 w-48 bg-neutral-200 animate-pulse" />
          </div>
          <div className="px-6 divide-y divide-neutral-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-5 flex justify-between gap-3">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-5 w-2/3 bg-neutral-200 animate-pulse" />
                  <div className="h-3 w-20 bg-neutral-100 animate-pulse" />
                  <div className="h-4 w-1/3 bg-neutral-100 animate-pulse" />
                </div>
                <div className="h-10 w-16 bg-neutral-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-6 md:p-8 space-y-6">
          <div className="h-6 w-48 bg-neutral-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-neutral-100 animate-pulse" />
                <div className="h-12 w-full bg-neutral-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-14 w-full bg-neutral-200 animate-pulse mt-8" />
        </div>
      </div>
    </main>
  );
}
