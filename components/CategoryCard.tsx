import Image from 'next/image';
import Link from 'next/link';

type Props = {
  title: string;
  imageSrc: string;
};

export default function CategoryCard({ title, imageSrc }: Props) {
  return (
    <Link href="/boutique" className="group block w-full">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        <div className="relative w-full aspect-[4/3] bg-gray-200">
          <Image 
            src={imageSrc} 
            alt={title} 
            fill 
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
          />
        </div>
        <div className="p-4 text-center bg-white">
          <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#1D9E75] transition-colors">{title}</h3>
        </div>
      </div>
    </Link>
  );
}
