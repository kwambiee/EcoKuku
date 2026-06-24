'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@ecokuku/ui';
import { toast } from 'sonner';
import { Plus, Edit2, ToggleLeft, ToggleRight, ImageIcon, Upload, AlertTriangle, Settings, Trash2 } from 'lucide-react';

interface Product {
  id: string; sku: string; name: string; description: string;
  price: number; wholesalePrice?: number; type: string; category: string;
  stock: number; available: boolean; image?: string;
}

interface ProductTypeConfig {
  id: string; name: string; label: string; category: string; isDefault: boolean;
}

const DEFAULT_CATEGORIES = [
  { value: 'EGGS', label: 'Eggs' }, { value: 'LIVE_POULTRY', label: 'Live Poultry' },
  { value: 'DRESSED_MEAT', label: 'Dressed Meat' }, { value: 'CHICKS', label: 'Chicks' },
  { value: 'OTHER', label: 'Other' },
];
const EMPTY_FORM = { name: '', description: '', price: '', wholesalePrice: '', type: '', category: '', stock: '0' };

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  useEffect(() => { if (session?.user) { fetchProducts(); fetchProductTypes(); } }, [session]);

  const fetchProductTypes = async () => {
    try {
      const res = await fetch('/api/product-types');
      const data = await res.json();
      setProductTypes(data.data || []);
    } catch { /* fallback to empty */ }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingType(true);
    try {
      const res = await fetch('/api/product-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTypeForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Product type added');
      setNewTypeForm({ name: '', label: '', category: 'OTHER' });
      fetchProductTypes();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add type'); }
    finally { setIsSavingType(false); }
  };

  const deleteType = async (id: string) => {
    try {
      const res = await fetch('/api/product-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Product type deleted');
      fetchProductTypes();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to delete'); }
  };

  const categories = [...new Set([
    ...DEFAULT_CATEGORIES.map((c) => c.value),
    ...productTypes.map((t) => t.category),
  ])].map((v) => ({
    value: v,
    label: DEFAULT_CATEGORIES.find((c) => c.value === v)?.label || v,
  }));

  const catLabels: Record<string, string> = Object.fromEntries(categories.map((c) => [c.value, c.label]));

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      setProducts(data.data || []);
    } catch { toast.error('Failed to load products'); }
    finally { setIsLoading(false); }
  };

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
        if (!uploaded) throw new Error('Image upload failed — check file type and size');
        imageUrl = uploaded;
      }

      const payload: any = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
        type: formData.type, category: formData.category,
        stock: parseInt(formData.stock) || 0, available: true,
      };
      if (imageUrl) payload.image = imageUrl;

      const res = editProduct
        ? await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: editProduct.id, ...payload }) })
        : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to save'); }

      toast.success(editProduct ? 'Product updated' : 'Product created');
      closeForm();
      fetchProducts();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed to save product'); }
    finally { setIsSubmitting(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleAvailable = async (product: Product) => {
    await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, available: !product.available }) });
    fetchProducts();
  };

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: deleteTarget.id }) });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchProducts();
    } catch { toast.error('Failed to delete product'); }
    finally { setIsDeleting(false); }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setFormData({ name: p.name, description: p.description, price: String(p.price), wholesalePrice: p.wholesalePrice ? String(p.wholesalePrice) : '', type: p.type, category: p.category, stock: String(p.stock) });
    setImagePreview(p.image || null);
    setImageFile(null); setShowForm(true); setFormError('');
  };

  const closeForm = () => { setShowForm(false); setEditProduct(null); setFormData(EMPTY_FORM); setImageFile(null); setImagePreview(null); setFormError(''); };

  const filtered = filterCategory ? products.filter((p) => p.category === filterCategory) : products;
  const lowStockCount = products.filter((p) => p.stock < 50 && p.available).length;

  if (status === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products & Inventory</h1>
            <p className="text-gray-600 mt-1">Manage your product catalogue, prices, stock levels and images</p>
          </div>
          <button onClick={() => {
              setEditProduct(null);
              const firstType = productTypes[0];
              setFormData({ ...EMPTY_FORM, type: firstType?.name || '', category: firstType?.category || '' });
              setImagePreview(null); setShowForm(true); setFormError('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700">
            <Plus size={18} /> Add Product
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: products.length, color: 'text-gray-900' },
              { label: 'Active in Shop', value: products.filter((p) => p.available && p.stock > 0).length, color: 'text-green-700' },
              { label: 'Low / Out of Stock', value: lowStockCount, color: lowStockCount > 0 ? 'text-red-600' : 'text-gray-900' },
              { label: 'Hidden from Shop', value: products.filter((p) => !p.available).length, color: 'text-gray-500' },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{lowStockCount} product{lowStockCount > 1 ? 's' : ''}</strong> {lowStockCount > 1 ? 'are' : 'is'} low on stock (under 50 units). Update stock levels by clicking Edit on each product.
              </p>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCategory ? 'bg-green-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              All ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.category === c.value).length;
              if (count === 0 && !DEFAULT_CATEGORIES.some((d) => d.value === c.value)) return null;
              return (
                <button key={c.value} onClick={() => setFilterCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCategory === c.value ? 'bg-green-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {c.label} ({count})
                </button>
              );
            })}
            <button onClick={() => setShowTypesModal(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1">
              <Settings size={13} /> Manage Types
            </button>
          </div>

          {/* Products grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-lg border border-gray-200 h-64 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
              <ImageIcon size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No products yet</p>
              <p className="text-sm mt-1">Click "Add Product" to create your first listing — it will appear on the customer shop automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const isLow = p.stock < 50;
                return (
                  <div key={p.id} className={`bg-white rounded-lg border overflow-hidden transition hover:shadow-md ${!p.available ? 'opacity-60' : ''} ${isLow && p.available ? 'border-amber-300' : 'border-gray-200'}`}>
                    <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-gray-300">
                          <ImageIcon size={36} className="mx-auto mb-1" />
                          <p className="text-xs">No image</p>
                        </div>
                      )}
                      {!p.available && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded font-medium">Hidden</span>
                        </div>
                      )}
                      {isLow && p.available && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded font-medium">Low Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h3>
                        <Badge className="bg-gray-100 text-gray-600 text-xs flex-shrink-0">{catLabels[p.category] || p.category}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">{p.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-green-800">KSh {Number(p.price).toLocaleString()}</p>
                          {p.wholesalePrice && <p className="text-xs text-gray-400">Wholesale: KSh {Number(p.wholesalePrice).toLocaleString()}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isLow && p.available ? 'text-amber-700' : 'text-gray-700'}`}>{p.stock} units</p>
                          <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                          <Edit2 size={13} /> Edit
                        </button>
                        <button onClick={() => toggleAvailable(p)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition ${p.available ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                          {p.available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {p.available ? 'Live' : 'Hidden'}
                        </button>
                        <button onClick={() => setDeleteTarget(p)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-100 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADD / EDIT PRODUCT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-4">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-xl">{editProduct ? `Edit: ${editProduct.name}` : 'Add New Product'}</h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{formError}</div>}

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Photo <span className="font-normal text-gray-400">(shown in customer shop)</span></label>
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors">
                    {imagePreview ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="preview" className="max-h-36 mx-auto rounded-lg object-contain" />
                        <p className="text-xs text-gray-400 mt-2">Click to change</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload product image</p>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                      placeholder="e.g. Free Range Eggs Tray" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                    <select required value={formData.type} onChange={(e) => {
                      const selected = productTypes.find((t) => t.name === e.target.value);
                      setFormData({ ...formData, type: e.target.value, category: selected?.category || formData.category });
                    }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                      <option value="">Select type...</option>
                      {productTypes.map((t) => <option key={t.name} value={t.name}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                    <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                      <option value="">Select category...</option>
                      {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price (KSh) *</label>
                    <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale Price <span className="text-gray-400 font-normal">optional</span></label>
                    <input type="number" step="0.01" value={formData.wholesalePrice} onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Quantity</label>
                    <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" placeholder="0" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                    placeholder="Describe for customers — freshness, breed, size, packaging, etc." />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? (imageFile ? 'Uploading image...' : 'Saving...') : editProduct ? 'Save Changes' : 'Create Product'}
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

        {/* DELETE CONFIRMATION MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Delete Product?</h3>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This will remove it from the shop and cannot be undone.
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
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-xl">Manage Product Types</h2>
                <button onClick={() => setShowTypesModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700">Type Name</th>
                        <th className="px-3 py-2 text-left text-gray-700">Label</th>
                        <th className="px-3 py-2 text-left text-gray-700">Category</th>
                        <th className="px-3 py-2 text-center text-gray-700 w-16">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productTypes.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{t.name}</td>
                          <td className="px-3 py-2">{t.label}</td>
                          <td className="px-3 py-2 text-gray-500">{catLabels[t.category] || t.category}</td>
                          <td className="px-3 py-2 text-center">
                            {t.isDefault ? (
                              <span className="text-xs text-gray-400">Default</span>
                            ) : (
                              <button onClick={() => deleteType(t.id)} className="p-1 text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {productTypes.length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No product types configured</td></tr>
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
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="e.g. MANURE" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                      <input type="text" required value={newTypeForm.label}
                        onChange={(e) => setNewTypeForm({ ...newTypeForm, label: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        placeholder="e.g. Chicken Manure" />
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
                <button onClick={() => setShowTypesModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
