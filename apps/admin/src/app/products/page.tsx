'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Plus, Edit2, ImageIcon, Upload, AlertTriangle, Trash2,
  ChevronDown, ChevronUp, Package, Egg, Bird, ShoppingBag, Wheat, Syringe, Sparkles,
} from 'lucide-react';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Product {
  id: string; sku: string; name: string; description: string;
  price: number; wholesalePrice?: number; type: string; category: string;
  unit: string; stock: number; available: boolean; image?: string;
  status: string; visibleInStore: boolean; reorderLevel: number; minOrderQty?: number;
}

interface InventoryData {
  eggsInStore: number; goodEggsProduced: number; totalEggsSold: number;
  totalLiveBirds: number; liveBirdsByType: Record<string, number>;
  lowStockProducts: number;
}

// ── Categories — the only grouping that matters ───────────────────────────────
const ALL_CATEGORIES = [
  { value: 'EGGS',          label: 'Table Eggs',      color: 'bg-yellow-100 text-yellow-800', icon: <Egg size={13} />,        defaultUnit: 'per tray (30 eggs)' },
  { value: 'HATCHING_EGGS', label: 'Hatching Eggs',   color: 'bg-amber-100 text-amber-800',   icon: <Egg size={13} />,        defaultUnit: 'per tray (30 eggs)' },
  { value: 'LIVE_POULTRY',  label: 'Live Poultry',    color: 'bg-green-100 text-green-800',   icon: <Bird size={13} />,       defaultUnit: 'per bird' },
  { value: 'DRESSED_MEAT',  label: 'Dressed Meat',    color: 'bg-red-100 text-red-800',       icon: <ShoppingBag size={13} />,defaultUnit: 'per bird (dressed)' },
  { value: 'CHICKS',        label: 'Day-old Chicks',  color: 'bg-lime-100 text-lime-800',     icon: <Bird size={13} />,       defaultUnit: 'per chick' },
  { value: 'FEED',          label: 'Feed',            color: 'bg-orange-100 text-orange-800', icon: <Wheat size={13} />,      defaultUnit: 'per bag (50kg)' },
  { value: 'SERVICES',      label: 'Services',        color: 'bg-purple-100 text-purple-800', icon: <Syringe size={13} />,    defaultUnit: 'per session' },
  { value: 'OTHER',         label: 'Other',           color: 'bg-gray-100 text-gray-600',     icon: <Package size={13} />,    defaultUnit: 'per unit' },
] as const;

const CAT_MAP = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.value, c]));

// Suggested starting products — clicking one pre-fills the form
const QUICK_STARTERS: { category: string; name: string; unit?: string }[] = [
  { category: 'EGGS',          name: 'Kienyeji Table Eggs' },
  { category: 'HATCHING_EGGS', name: 'Hatching Eggs — KARI Improved' },
  { category: 'HATCHING_EGGS', name: 'Hatching Eggs — Pure Kienyeji' },
  { category: 'HATCHING_EGGS', name: 'Hatching Eggs — KC1' },
  { category: 'HATCHING_EGGS', name: 'Hatching Eggs — KC2' },
  { category: 'HATCHING_EGGS', name: 'Hatching Eggs — KC3' },
  { category: 'LIVE_POULTRY',  name: 'Rainbow Rooster (Live)' },
  { category: 'LIVE_POULTRY',  name: 'Improved Kienyeji (Live)' },
  { category: 'LIVE_POULTRY',  name: 'Pure Kienyeji (Live)' },
  { category: 'DRESSED_MEAT',  name: 'Rainbow Rooster (Dressed)' },
  { category: 'DRESSED_MEAT',  name: 'Pure Kienyeji (Dressed)' },
  { category: 'CHICKS',        name: 'Day-old Chicks — KARI Improved', unit: 'per chick' },
  { category: 'CHICKS',        name: 'Day-old Chicks — Rainbow Rooster', unit: 'per chick' },
  { category: 'CHICKS',        name: 'Day-old Chicks — Pure Kienyeji', unit: 'per chick' },
  { category: 'FEED',          name: 'Chick Starter Mash',  unit: 'per bag (70kg)' },
  { category: 'FEED',          name: 'Chick Starter Crumbs', unit: 'per bag (70kg)' },
  { category: 'FEED',          name: 'Growers Mash',         unit: 'per bag (50kg)' },
  { category: 'FEED',          name: 'Layers Mash',          unit: 'per bag (50kg)' },
  { category: 'FEED',          name: 'Kienyeji Mash',        unit: 'per bag (50kg)' },
  { category: 'SERVICES',      name: 'Chick Vaccination Service', unit: 'per session' },
];

const UNITS = [
  'per tray (30 eggs)',
  'per crate (360 eggs)',
  'per bird',
  'per bird (dressed)',
  'per chick',
  'per kg',
  'per bag (70kg)',
  'per bag (50kg)',
  'per bag (25kg)',
  'per session',
  'per unit',
];

const STATUS_OPTIONS = [
  { value: 'available',    label: 'Available',      color: 'bg-green-100 text-green-700' },
  { value: 'pre_order',    label: 'Pre-order only', color: 'bg-blue-100 text-blue-700' },
  { value: 'out_of_stock', label: 'Out of stock',   color: 'bg-red-100 text-red-700' },
];

const EMPTY_FORM = {
  name: '', description: '', price: '', wholesalePrice: '',
  category: '', unit: 'per tray (30 eggs)', status: 'available',
  stock: '0', reorderLevel: '5', minOrderQty: '', visibleInStore: true,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [showInventory, setShowInventory] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) fetchProducts(); }, [session]);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products?limit=200');
      const data = await res.json();
      setProducts(data.data || []);
      setInventory(data.inventory || null);
    } catch { toast.error('Failed to load products'); }
    finally { setIsLoading(false); }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    return (await res.json()).url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true); setFormError('');
    try {
      let imageUrl: string | undefined = editProduct?.image;
      if (imageFile) {
        const up = await uploadImage(imageFile);
        if (!up) throw new Error('Image upload failed');
        imageUrl = up;
      }
      // Derive type from category — keeps the DB column populated without exposing it in the UI
      const payload: any = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
        type: formData.category,   // type = category; hidden from user
        category: formData.category,
        unit: formData.unit,
        stock: parseInt(formData.stock) || 0,
        status: formData.status,
        available: formData.status !== 'out_of_stock',
        visibleInStore: formData.visibleInStore,
        reorderLevel: parseInt(formData.reorderLevel) || 5,
        minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : null,
      };
      if (imageUrl) payload.image = imageUrl;

      const res = editProduct
        ? await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: editProduct.id, ...payload }) })
        : await fetch('/api/products', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editProduct ? 'Product updated' : 'Product created');
      closeForm(); fetchProducts();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setFormData({
      name: p.name, description: p.description, price: String(p.price),
      wholesalePrice: p.wholesalePrice ? String(p.wholesalePrice) : '',
      category: p.category, unit: p.unit || 'per unit',
      status: p.status || 'available',
      stock: String(p.stock), reorderLevel: String(p.reorderLevel || 5),
      minOrderQty: p.minOrderQty ? String(p.minOrderQty) : '',
      visibleInStore: p.visibleInStore !== false,
    });
    setImagePreview(p.image || null); setImageFile(null);
    setShowForm(true); setFormError('');
  }

  function openWithStarter(s: { category: string; name: string; unit?: string }) {
    const cat = CAT_MAP[s.category];
    setEditProduct(null);
    setFormData({ ...EMPTY_FORM, category: s.category, name: s.name, unit: s.unit || cat?.defaultUnit || 'per unit' });
    setImagePreview(null); setImageFile(null);
    setShowForm(true); setFormError('');
  }

  function openAdd() {
    setEditProduct(null);
    setFormData(EMPTY_FORM);
    setImagePreview(null); setImageFile(null);
    setShowForm(true); setFormError('');
  }

  function closeForm() {
    setShowForm(false); setEditProduct(null); setFormData(EMPTY_FORM);
    setImageFile(null); setImagePreview(null); setFormError('');
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: deleteTarget.id }) });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null); fetchProducts();
    } catch { toast.error('Failed to delete'); }
    finally { setIsDeleting(false); }
  }

  const filtered = filterCategory ? products.filter((p) => p.category === filterCategory) : products;
  const lowStockItems = products.filter((p) => p.stock <= p.reorderLevel && p.status !== 'out_of_stock');
  const inv = inventory;
  const usedCategories = [...new Set(products.map((p) => p.category))];

  // Group quick starters by category
  const startersByCategory = QUICK_STARTERS.reduce<Record<string, typeof QUICK_STARTERS>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Products & Inventory</h1>
            <p className="text-gray-500 text-sm mt-1">Catalogue, pricing, stock levels and inventory tracking</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
            <Plus size={15} /> Add Product
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* ── Low stock alert ───────────────────────────────────────────────── */}
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Low stock</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {lowStockItems.map((p) => (
                    <p key={p.id} className="text-sm text-amber-800">
                      <strong>{p.name}</strong>: {p.stock} {p.unit} (reorder at {p.reorderLevel})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Quick add starters ────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-green-700" />
              <h2 className="font-bold text-gray-900 text-sm">Quick Add</h2>
              <span className="text-xs text-gray-400">Pre-fills the form — just set the price</span>
            </div>
            <div className="space-y-3">
              {ALL_CATEGORIES.filter((cat) => startersByCategory[cat.value]).map((cat) => (
                <div key={cat.value} className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 w-28 justify-center ${cat.color}`}>
                    {cat.icon} {cat.label}
                  </span>
                  {startersByCategory[cat.value].map((s) => {
                    const exists = products.some((p) => p.name === s.name && p.category === s.category);
                    return (
                      <button key={s.name} onClick={() => openWithStarter(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                          exists
                            ? 'border-green-200 text-green-600 bg-green-50'
                            : 'border-gray-200 text-gray-600 bg-white hover:border-green-400 hover:bg-green-50 hover:text-green-800'
                        }`}>
                        {exists ? '✓ ' : '+ '}{s.name}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── Inventory overview ────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowInventory(!showInventory)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-green-700" />
                <h2 className="font-bold text-lg">Inventory Overview</h2>
                {inv && inv.lowStockProducts > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{inv.lowStockProducts} low</span>
                )}
              </div>
              {showInventory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showInventory && inv && (
              <div className="border-t p-5 space-y-4">
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1"><Egg size={14} className="text-yellow-700" /><p className="text-xs text-gray-500 font-medium">Good Eggs in Store</p></div>
                    <p className="text-2xl font-bold text-yellow-800">{inv.eggsInStore.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">≈ {Math.floor(inv.eggsInStore / 30)} trays · {inv.totalEggsSold.toLocaleString()} sold</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1"><Bird size={14} className="text-green-700" /><p className="text-xs text-gray-500 font-medium">Live Birds</p></div>
                    <p className="text-2xl font-bold text-green-800">{inv.totalLiveBirds.toLocaleString()}</p>
                    <div className="mt-1">
                      {Object.entries(inv.liveBirdsByType).map(([type, count]) => (
                        <p key={type} className="text-[11px] text-gray-500">{type}: {(count as number).toLocaleString()}</p>
                      ))}
                    </div>
                  </div>
                  {products.filter((p) => p.category === 'DRESSED_MEAT').map((p) => (
                    <div key={p.id} className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1"><ShoppingBag size={14} className="text-red-700" /><p className="text-xs text-gray-500 font-medium truncate">{p.name}</p></div>
                      <p className={`text-2xl font-bold ${p.stock <= p.reorderLevel ? 'text-red-600' : 'text-red-800'}`}>{p.stock}</p>
                      <p className="text-[11px] text-gray-400">{p.unit}</p>
                    </div>
                  ))}
                  {products.filter((p) => p.category === 'FEED').map((p) => (
                    <div key={p.id} className={`bg-orange-50 rounded-lg p-4 ${p.stock <= p.reorderLevel ? 'ring-1 ring-amber-300' : ''}`}>
                      <div className="flex items-center gap-2 mb-1"><Wheat size={14} className="text-orange-700" /><p className="text-xs text-gray-500 font-medium truncate">{p.name}</p></div>
                      <p className={`text-xl font-bold ${p.stock <= p.reorderLevel ? 'text-amber-700' : 'text-orange-800'}`}>{p.stock}</p>
                      <p className="text-[11px] text-gray-400">{p.unit}{p.stock <= p.reorderLevel ? ' · reorder' : ''}</p>
                    </div>
                  ))}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">Catalogue</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold">{products.length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">In shop</span><span className="font-bold text-green-700">{products.filter((p) => p.visibleInStore && p.status === 'available').length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hidden</span><span className="font-bold text-gray-400">{products.filter((p) => !p.visibleInStore).length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Out of stock</span><span className="font-bold text-red-500">{products.filter((p) => p.status === 'out_of_stock').length}</span></div>
                    </div>
                  </div>
                </div>

                {/* Stock table */}
                {products.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full min-w-[520px]">
                      <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Product</th>
                          <th className="px-4 py-2.5 text-left">Category</th>
                          <th className="px-4 py-2.5 text-left">Unit</th>
                          <th className="px-4 py-2.5 text-right">Stock</th>
                          <th className="px-4 py-2.5 text-right">Reorder</th>
                          <th className="px-4 py-2.5 text-left">Status</th>
                          <th className="px-4 py-2.5 text-center">Shop</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map((p) => {
                          const isLow = p.stock <= p.reorderLevel && p.status !== 'out_of_stock';
                          const statusOpt = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
                          const cat = CAT_MAP[p.category];
                          return (
                            <tr key={p.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50/40' : ''}`}>
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.name}</td>
                              <td className="px-4 py-2.5">
                                {cat
                                  ? <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                                  : <span className="text-xs text-gray-400">{p.category}</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{p.unit}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-sm font-bold tabular-nums ${isLow ? 'text-amber-700' : p.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>{p.stock}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-xs text-gray-400 tabular-nums">{p.reorderLevel}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center text-sm">
                                {p.visibleInStore ? <span className="text-green-600">✓</span> : <span className="text-gray-300">–</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Product catalogue ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowProducts(!showProducts)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-green-700" />
                <h2 className="font-bold text-lg">Product Catalogue</h2>
                <span className="text-xs text-gray-400">{products.length} products</span>
              </div>
              {showProducts ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showProducts && (
              <div className="border-t p-5 space-y-4">
                {/* Category filter tabs */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!filterCategory ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    All ({products.length})
                  </button>
                  {ALL_CATEGORIES.filter((c) => usedCategories.includes(c.value)).map((c) => {
                    const count = products.filter((p) => p.category === c.value).length;
                    return (
                      <button key={c.value} onClick={() => setFilterCategory(c.value)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterCategory === c.value ? 'bg-green-900 text-white' : `${c.color} hover:opacity-80`}`}>
                        {c.icon} {c.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-50 rounded-lg h-56 animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <ImageIcon size={36} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-sm">No products yet</p>
                    <p className="text-xs mt-1">Use Quick Add above or click "Add Product".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((p) => {
                      const isLow = p.stock <= p.reorderLevel && p.status !== 'out_of_stock';
                      const statusOpt = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
                      const cat = CAT_MAP[p.category];
                      return (
                        <div key={p.id} className={`bg-white rounded-xl border overflow-hidden transition hover:shadow-md ${!p.visibleInStore ? 'opacity-60' : ''} ${isLow ? 'border-amber-300' : 'border-gray-200'}`}>
                          <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="text-center text-gray-300"><ImageIcon size={28} className="mx-auto mb-1" /><p className="text-xs">No image</p></div>
                            }
                            <span className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                            {!p.visibleInStore && <span className="absolute top-2 right-2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded">Hidden</span>}
                            {isLow && <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle size={9} /> Low</span>}
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h3>
                              {cat && <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cat.color}`}>{cat.label}</span>}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                            <div className="flex items-end justify-between mb-3">
                              <div>
                                <p className="text-base font-bold text-green-800">KSh {Number(p.price).toLocaleString()}</p>
                                {p.wholesalePrice && <p className="text-[11px] text-gray-400">Wholesale: KSh {Number(p.wholesalePrice).toLocaleString()}</p>}
                                <p className="text-[11px] text-gray-400">{p.unit}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold tabular-nums ${isLow ? 'text-amber-700' : 'text-gray-700'}`}>{p.stock}</p>
                                <p className="text-[10px] text-gray-400">in stock</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(p)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                                <Edit2 size={12} /> Edit
                              </button>
                              <button onClick={() => setDeleteTarget(p)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-100">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            ADD / EDIT PRODUCT FORM
        ════════════════════════════════════════ */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-6">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-lg">{editProduct ? `Edit: ${editProduct.name}` : 'Add Product'}</h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{formError}</div>}

                {/* Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors">
                    {imagePreview
                      ? <><img src={imagePreview} alt="preview" className="max-h-28 mx-auto rounded-lg object-contain" /><p className="text-xs text-gray-400 mt-2">Click to change</p></>
                      : <div className="py-2"><Upload size={22} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-500">Click to upload</p><p className="text-xs text-gray-400">PNG, JPG, WebP · max 5 MB</p></div>
                    }
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setImageFile(f); setImagePreview(URL.createObjectURL(f));
                  }} />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Kienyeji Table Eggs, Hatching Eggs — KARI" />
                </div>

                {/* Category + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                    <select required value={formData.category}
                      onChange={(e) => {
                        const cat = CAT_MAP[e.target.value];
                        setFormData({ ...formData, category: e.target.value, unit: cat?.defaultUnit || formData.unit });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select…</option>
                      {ALL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit *</label>
                    <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price (KSh) *</label>
                    <input type="number" step="0.01" required value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale <span className="font-normal text-gray-400">(optional)</span></label>
                    <input type="number" step="0.01" value={formData.wholesalePrice}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
                    <input type="number" value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reorder at</label>
                    <input type="number" value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min order</label>
                    <input type="number" value={formData.minOrderQty}
                      onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—" />
                  </div>
                </div>

                {/* Status + visibility */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.visibleInStore}
                        onChange={(e) => setFormData({ ...formData, visibleInStore: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded border-gray-300" />
                      <span className="text-sm font-medium text-gray-700">Show in customer shop</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <textarea required rows={3} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Describe for customers — breed, size, freshness, how it's packaged…" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? (imageFile ? 'Uploading…' : 'Saving…') : editProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                  <button type="button" onClick={closeForm}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-1">Delete Product?</h3>
              <p className="text-gray-600 text-sm mb-6">Remove <strong>{deleteTarget.name}</strong> from the catalogue permanently?</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
