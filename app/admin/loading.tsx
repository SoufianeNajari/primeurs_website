import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-primary" size={32} strokeWidth={1.5} />
      </div>
    </div>
  );
}
