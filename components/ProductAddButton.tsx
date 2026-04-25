'use client'

import type { Product } from '@/lib/produit';
import OptionPicker from './OptionPicker';

export default function ProductAddButton({ product }: { product: Product }) {
  return <OptionPicker product={product} variant="detail" />;
}
