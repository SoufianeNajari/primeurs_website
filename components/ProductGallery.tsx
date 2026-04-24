'use client'

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full bg-neutral-100 flex items-center justify-center text-neutral-300">
        <ShoppingBag size={80} strokeWidth={1} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        <Image
          src={images[active]}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden border transition-colors ${
                i === active ? 'border-green-primary' : 'border-neutral-200 hover:border-neutral-400'
              }`}
              aria-label={`Voir image ${i + 1}`}
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
