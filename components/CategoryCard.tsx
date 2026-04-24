import Image from 'next/image';
import Link from 'next/link';

type Props = {
  title: string;
  imageSrc: string;
};

export default function CategoryCard({ title, imageSrc }: Props) {
  return (
    <Link href="/boutique" className="group block w-full">
      <div className="bg-white overflow-hidden border border-neutral-200 transition-colors duration-300 group-hover:border-green-primary">
        <div className="relative w-full aspect-[4/3] bg-neutral-100">
          <Image 
            src={imageSrc} 
            alt={title} 
            fill 
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
          />
        </div>
        <div className="p-6 text-center bg-white border-t border-neutral-100">
          <h3 className="text-xl font-serif text-neutral-800 group-hover:text-green-primary transition-colors">{title}</h3>
        </div>
      </div>
    </Link>
  );
}
