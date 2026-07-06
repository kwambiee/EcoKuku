'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  Plus, Edit2, ImageIcon, Upload, AlertTriangle, Settings, Trash2,
  ChevronDown, ChevronUp, Package, Egg, Bird, ShoppingBag,
} from 'lucide-react';

interface Product {
  id: string; sku: string; name: string; description: string;
  price: number; wholesalePrice?: number; type: string; category: string;
  unit: string; stock: number; available: boolean; image?: string;
  status: string; visibleInStore: boolean; reorderLevel: number; minOrderQty?: number;
}

interface ProductTypeConfig {
  id: string; name: string; label: string; category: string; isDefault: boolean;
}

interface InventoryData {
  eggsInStore: number; goodEggsProduced: number; totalEggsSold: number;
  totalLiveBirds: number; liveBirdsByType: Record<string, number>;
  lowStockProducts: number;
}

const DEFAULT_CATEGORIES = [
  { value: 'EGGS', label: 'Eggs' }, { value: 'LIVE_POULTRY', label: 'Live Poultry' },
  { value: 'DRESSED_MEAT', label: 'Dressed Meat' }, { value: 'CHICKS', label: 'Chicks' },
  { value: 'OTHER', label: 'Other' },
];

const UNITS = ['per tray (30 pcs)', 'per crate (360 pcs)', 'per kg', 'per bird', 'per unit'];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'bg-green-100 text-green-700' },
  { value: 'pre_order', label: 'Pre-order only', color: 'bg-blue-100 text-blue-700' },
  { value: 'out_of_stock', label: 'Out of stock', color: 'bg-red-100 text-red-700' },
];

const EMPTY_FORM = {
  name: '', description: '', price: '', wholesalePrice: '', type: '', category: '',
  stock: '0', unit: 'per unit', status: 'available', visibleInStore: true,
  reorderLevel: '10', minOrderQty: '',
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeConfig[]>([]);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ name: '', label: '', category: 'OTHER' });
  const [isSavingType, setIsSavingType] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [showInventory, setShowInventory] = useState(true);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) { fetchProducts(); fetchProductTypes(); } }, [session]);

  const fetchProductTypes = async () => {
    try {
      const res = await fetch('/api/product-types');
      const data = await res.json();
      setProductTypes(data.data || []);
    } catch { /* */ }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      setProducts(data.data || []);
      setInventory(data.inventory || null);
    } catch { toast.error('Failed to load products'); }
    finally { setIsLoading(false); }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingType(true);
    try {
      const res = await fetch('/api/product-types', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTypeForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Product type added');
      setNewTypeForm({ name: '', label: '', category: 'OTHER' });
      fetchProductTypes();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSavingType(false); }
  };

  const deleteType = async (id: string) => {
    try {
      const res = await fetch('/api/product-types', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Deleted');
      fetchProductTypes();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const categories = [...new Set([
    ...DEFAULT_CATEGORIES.map((c) => c.value),
    ...productTypes.map((t) => t.category),
  ])].map((v) => ({
    value: v, label: DEFAULT_CATEGORIES.find((c) => c.value === v)?.label || v,
  }));
  const catLabels: Record<string, string> = Object.fromEntries(categories.map((c) => [c.value, c.label]));

  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    try {
      let imageUrl: string | undefined = editProduct?.image;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (!uploaded) throw new Error('Image upload failed');
        imageUrl = uploaded;
      }

      const payload: any = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
        type: formData.type, category: formData.category,
        unit: formData.unit,
        stock: parseInt(formData.stock) || 0,
        status: formData.status,
        available: formData.status !== 'out_of_stock',
        visibleInStore: formData.visibleInStore,
        reorderLevel: parseInt(formData.reorderLevel) || 10,
        minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : null,
      };
      if (imageUrl) payload.image = imageUrl;

      const res = editProduct
        ? await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: editProduct.id, ...payload }) })
        : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      toast.success(editProduct ? 'Product updated' : 'Product created');
      closeForm();
      fetchProducts();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: deleteTarget.id }) });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchProducts();
    } catch { toast.error('Failed to delete'); }
    finally { setIsDeleting(false); }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setFormData({
      name: p.name, description: p.description, price: String(p.price),
      wholesalePrice: p.wholesalePrice ? String(p.wholesalePrice) : '',
      type: p.type, category: p.category, stock: String(p.stock),
      unit: p.unit || 'per unit', status: p.status || 'available',
      visibleInStore: p.visibleInStore !== false,
      reorderLevel: String(p.reorderLevel || 10),
      minOrderQty: p.minOrderQty ? String(p.minOrderQty) : '',
    });
    setImagePreview(p.image || null);
    setImageFile(null); setShowForm(true); setFormError('');
  };

  const closeForm = () => {
    setShowForm(false); setEditProduct(null); setFormData(EMPTY_FORM);
    setImageFile(null); setImagePreview(null); setFormError('');
  };

  const filtered = filterCategory ? products.filter((p) => p.category === filterCategory) : products;
  const lowStockItems = products.filter((p) => p.stock <= p.reorderLevel && p.status !== 'out_of_stock');
  const inv = inventory;

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Products & Inventory</h1>
            <p className="text-gray-500 text-sm mt-1">Product catalogue, pricing, stock levels and inventory tracking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTypesModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Settings size={14} /> Manage Types
            </button>
            <button onClick={() => {
              setEditProduct(null);
              const firstType = productTypes[0];
              setFormData({ ...EMPTY_FORM, type: firstType?.name || '', category: firstType?.category || '' });
              setImagePreview(null); setShowForm(true); setFormError('');
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} /> Add Product
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Low stock alert</p>
                <div className="mt-1 space-y-0.5">
                  {lowStockItems.map((p) => (
                    <p key={p.id} className="text-sm text-amber-800">
                      <strong>{p.name}</strong>: {p.stock} units (reorder level: {p.reorderLevel})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== INVENTORY SECTION ===== */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowInventory(!showInventory)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Inventory Overview</h2>
                {inv && inv.lowStockProducts > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{inv.lowStockProducts} low</span>
                )}
              </div>
              {showInventory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showInventory && inv && (
              <div className="border-t p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Egg size={16} className="text-amber-700" />
                      <p className="text-xs text-gray-600 font-medium">Good Eggs in Store</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-800">{inv.eggsInStore.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Produced: {inv.goodEggsProduced.toLocaleString()} · Sold: {inv.totalEggsSold.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400">Auto-updated from egg production logs</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Bird size={16} className="text-green-700" />
                      <p className="text-xs text-gray-600 font-medium">Live Birds Available</p>
                    </div>
                    <p className="text-2xl font-bold text-green-800">{inv.totalLiveBirds.toLocaleString()}</p>
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(inv.liveBirdsByType).map(([type, count]) => (
                        <p key={type} className="text-[11px] text-gray-500">{type}: {count.toLocaleString()}</p>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">From active batch counts</p>
                  </div>
                  {products.filter((p) => p.category === 'DRESSED_MEAT').map((p) => (
                    <div key={p.id} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag size={16} className="text-blue-700" />
                        <p className="text-xs text-gray-600 font-medium">{p.name}</p>
                      </div>
                      <p className={`text-2xl font-bold ${p.stock <= p.reorderLevel ? 'text-red-600' : 'text-blue-800'}`}>{p.stock} {p.unit}</p>
                      {p.stock <= p.reorderLevel && <p className="text-[11px] text-red-500 mt-0.5">Below reorder level ({p.reorderLevel})</p>}
                    </div>
                  ))}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-medium mb-1">Catalogue Summary</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Total products</span><span className="font-bold">{products.length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Active in shop</span><span className="font-bold text-green-700">{products.filter((p) => p.visibleInStore && p.status === 'available').length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hidden</span><span className="font-bold text-gray-400">{products.filter((p) => !p.visibleInStore).length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Out of stock</span><span className="font-bold text-red-600">{products.filter((p) => p.status === 'out_of_stock').length}</span></div>
                    </div>
                  </div>
                </div>

                {/* Product stock table */}
                {products.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                          <th className="px-4 py-3 text-right">Reorder Level</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-center">Visible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map((p) => {
                          const isLow = p.stock <= p.reorderLevel && p.status !== 'out_of_stock';
                          const statusOpt = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
                          return (
                            <tr key={p.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.name}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-500">{catLabels[p.category] || p.category}</td>
                              <td className="px-4 py-2.5 text-right text-sm">
                                <span className={`font-semibold ${isLow ? 'text-amber-700' : p.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-500">{p.reorderLevel}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center text-sm">
                                {p.visibleInStore ? <span className="text-green-600">✓</span> : <span className="text-gray-300">✗</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-xs text-gray-400">Stock auto-deducts when an order is marked "Processing" — not when placed, to avoid deducting for cancelled orders.</p>
              </div>
            )}
          </div>

          {/* ===== PRODUCTS CATALOGUE ===== */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowProducts(!showProducts)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Product Catalogue</h2>
                <span className="text-xs text-gray-400">{products.length} products</span>
              </div>
              {showProducts ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showProducts && (
              <div className="border-t p-5 space-y-4">
                {/* Category filters */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCategory ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    All ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter((p) => p.category === c.value).length;
                    if (count === 0) return null;
                    return (
                      <button key={c.value} onClick={() => setFilterCategory(c.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCategory === c.value ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {c.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Product cards */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-50 rounded-lg h-64 animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <ImageIcon size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No products yet</p>
                    <p className="text-sm mt-1">Click &quot;Add Product&quot; to create your first listing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((p) => {
                      const isLow = p.stock <= p.reorderLevel && p.status !== 'out_of_stock';
                      const statusOpt = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
                      return (
                        <div key={p.id} className={`bg-white rounded-lg border overflow-hidden transition hover:shadow-md ${!p.visibleInStore ? 'opacity-60' : ''} ${isLow ? 'border-amber-300' : 'border-gray-200'}`}>
                          <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center text-gray-300">
                                <ImageIcon size={32} className="mx-auto mb-1" />
                                <p className="text-xs">No image</p>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 flex gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusOpt.color}`}>{statusOpt.label}</span>
                            </div>
                            {!p.visibleInStore && (
                              <span className="absolute top-2 right-2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Hidden</span>
                            )}
                            {isLow && (
                              <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Low Stock</span>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h3>
                              <Badge className="bg-gray-100 text-gray-600 text-[10px] flex-shrink-0">{catLabels[p.category] || p.category}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-base font-bold text-green-800">KSh {Number(p.price).toLocaleString()}</p>
                                {p.wholesalePrice && <p className="text-[11px] text-gray-400">Wholesale: KSh {Number(p.wholesalePrice).toLocaleString()}</p>}
                                <p className="text-[11px] text-gray-400">{p.unit}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${isLow ? 'text-amber-700' : 'text-gray-700'}`}>{p.stock} units</p>
                                {p.minOrderQty && <p className="text-[11px] text-gray-400">Min: {p.minOrderQty}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(p)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                                <Edit2 size={12} /> Edit
                              </button>
                              <button onClick={() => setDeleteTarget(p)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-100">
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

        {/* ADD / EDIT PRODUCT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-4">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">{editProduct ? `Edit: ${editProduct.name}` : 'Add New Product'}</h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{formError}</div>}

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Photo</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors">
                    {imagePreview ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="preview" className="max-h-32 mx-auto rounded-lg object-contain" />
                        <p className="text-xs text-gray-400 mt-2">Click to change</p>
                      </div>
                    ) : (
                      <div className="py-3">
                        <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — max 5MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Free Range Eggs Tray" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                    <select required value={formData.type} onChange={(e) => {
                      const selected = productTypes.find((t) => t.name === e.target.value);
                      setFormData({ ...formData, type: e.target.value, category: selected?.category || formData.category });
                    }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select type...</option>
                      {productTypes.map((t) => <option key={t.name} value={t.name}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                    <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price (KSh) *</label>
                    <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale Price <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="number" step="0.01" value={formData.wholesalePrice} onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Qty</label>
                    <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reorder Level</label>
                    <input type="number" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min Order Qty</label>
                    <input type="number" value={formData.minOrderQty} onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.visibleInStore}
                        onChange={(e) => setFormData({ ...formData, visibleInStore: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded border-gray-300" />
                      <span className="text-sm font-medium text-gray-700">Visible on customer store</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Describe for customers — freshness, breed, size, packaging, etc." />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? (imageFile ? 'Uploading...' : 'Saving...') : editProduct ? 'Save Changes' : 'Create Product'}
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

        {/* DELETE MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Delete Product?</h3>
                <p className="text-gray-600 text-sm">
                  Delete <strong>{deleteTarget.name}</strong>? This removes it from the shop permanently.
                </p>
                <div className="flex gap-3 mt-6">
                  <button onClick={confirmDeleteProduct} disabled={isDeleting}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MANAGE PRODUCT TYPES MODAL */}
        {showTypesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">Manage Product Types</h2>
                <button onClick={() => setShowTypesModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full min-w-max text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700">Type Name</th>
                        <th className="px-3 py-2 text-left text-gray-700">Label</th>
                        <th className="px-3 py-2 text-left text-gray-700">Category</th>
                        <th className="px-3 py-2 text-center w-16">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productTypes.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{t.name}</td>
                          <td className="px-3 py-2">{t.label}</td>
                          <td className="px-3 py-2 text-gray-500">{catLabels[t.category] || t.category}</td>
                          <td className="px-3 py-2 text-center">
                            {t.isDefault ? <span className="text-xs text-gray-400">Default</span> : (
                              <button onClick={() => deleteType(t.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {productTypes.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No types configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <form onSubmit={handleAddType} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-sm mb-3">Add New Product Type</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input type="text" required value={newTypeForm.name}
                        onChange={(e) => setNewTypeForm({ ...newTypeForm, name: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. DOC" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                      <input type="text" required value={newTypeForm.label}
                        onChange={(e) => setNewTypeForm({ ...newTypeForm, label: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. Day-old Chicks" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                      <select value={newTypeForm.category}
                        onChange={(e) => setNewTypeForm({ ...newTypeForm, category: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                        {DEFAULT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isSavingType}
                    className="mt-3 w-full py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSavingType ? 'Adding...' : 'Add Type'}
                  </button>
                </form>
              </div>
              <div className="p-5 border-t flex justify-end">
                <button onClick={() => setShowTypesModal(false)} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300">Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
