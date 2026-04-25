import { Leaf, Sparkles, MapPin } from 'lucide-react';
import type { Tag, TagKind } from '@/lib/produit';

const ICONS: Record<Exclude<TagKind, 'france'>, typeof Leaf> = {
  bio: Leaf,
  saison: Sparkles,
  local: MapPin,
};

type Props = {
  tags: Tag[];
  variant?: 'overlay' | 'inline';
};

export default function ProductTags({ tags, variant = 'overlay' }: Props) {
  if (tags.length === 0) return null;

  const base =
    variant === 'overlay'
      ? 'bg-white/95 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-black/5'
      : 'bg-white ring-1 ring-neutral-200';

  return (
    <div className={variant === 'overlay' ? 'flex flex-col items-end gap-1.5' : 'flex flex-wrap gap-1.5'}>
      {tags.map((tag) => {
        if (tag.kind === 'france') {
          return (
            <span
              key={tag.kind}
              className={`inline-flex items-center gap-1 sm:gap-1.5 ${base} h-[21px] sm:h-6 px-2 sm:px-2.5 text-[9px] sm:text-[10px] uppercase tracking-[0.12em] font-semibold leading-none ${tag.textColor}`}
              aria-label="Origine France"
            >
              <span aria-hidden className="text-[11px] sm:text-[13px] leading-none relative -top-px">🇫🇷</span>
              <span className="relative top-px">{tag.label}</span>
            </span>
          );
        }
        const Icon = ICONS[tag.kind];
        return (
          <span
            key={tag.kind}
            className={`inline-flex items-center gap-1 sm:gap-1.5 ${base} h-[21px] sm:h-6 px-2 sm:px-2.5 text-[9px] sm:text-[10px] uppercase tracking-[0.12em] font-semibold leading-none ${tag.textColor}`}
          >
            <Icon strokeWidth={2.25} className="shrink-0 w-2.5 h-2.5 sm:w-[11px] sm:h-[11px]" />
            <span className="relative top-px">{tag.label}</span>
          </span>
        );
      })}
    </div>
  );
}
