export default function Loading() {
  return (
    <main className="flex-grow pb-28 min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
        <div className="h-4 w-40 bg-neutral-200 animate-pulse" />
      </div>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="aspect-square w-full bg-neutral-100 animate-pulse" />

        <div className="flex flex-col gap-4">
          <div className="h-3 w-20 bg-neutral-100 animate-pulse" />
          <div className="h-10 w-3/4 bg-neutral-200 animate-pulse" />
          <div className="h-6 w-1/3 bg-neutral-100 animate-pulse" />
          <div className="h-4 w-2/3 bg-neutral-100 animate-pulse" />
          <div className="h-24 w-full bg-neutral-100 animate-pulse mt-4" />
          <div className="h-12 w-full bg-neutral-200 animate-pulse mt-4" />
        </div>
      </div>
    </main>
  );
}
