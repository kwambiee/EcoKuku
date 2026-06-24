'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stock management is now part of Products & Inventory (/products)
export default function InventoryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/products'); }, [router]);
  return <div className="p-8 text-gray-500">Redirecting to Products & Inventory...</div>;
}
