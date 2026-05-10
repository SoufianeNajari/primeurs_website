import { absoluteUrl } from './site';

export type BreadcrumbItem = { name: string; href: string };

// BreadcrumbList JSON-LD selon schema.org/BreadcrumbList. Les URLs sont
// systématiquement absolutisées (Google attend une URL complète, pas un path
// relatif). Usage type :
//   <script type="application/ld+json"
//     dangerouslySetInnerHTML={{ __html: JSON.stringify(
//       breadcrumbJsonLd([
//         { name: 'Accueil', href: '/' },
//         { name: 'Boutique', href: '/boutique' },
//         { name: product.nom, href: `/boutique/${product.slug}` },
//       ])
//     ) }}
//   />
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}
