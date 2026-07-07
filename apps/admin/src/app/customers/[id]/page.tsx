'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  ArrowLeft, ShoppingCart, DollarSign, TrendingUp, CalendarDays,
  Mail, Phone, User, Star, Package, StickyNote,
  AlertTriangle, MapPin, Gift, ChevronDown, ChevronUp, Save,
} from 'lucide-react';

interface OrderItem {
  id: string; quantity: number; price: number; subtotal: number;
  product: { id: string; name: string; image: string | null };
}

interface Order {
  id: string; orderNumber: string; total: number; subtotal: number;
  deliveryFee: number; discountAmount: number;
  status: string; paymentMethod: string; paymentRef?: string;
  createdAt: string; deliveryArea?: string;
  items: OrderItem[];
}

interface Review {
  id: string; rating: number; comment: string | null; createdAt: string;
  product: { id: string; name: string };
}

interface BatchOrder {
  id: string; orderNumber: string; quantity: number; pricePerChick: number;
  totalPrice: number; depositAmount: number; depositPaid: boolean;
  status: string; createdAt: string;
  batch: { id: string; batchNumber: string; type: string };
}

interface PromoUsed {
  code: string; discountType: string; discountValue: number; discountAmount: number;
}

interface CustomerDetail {
  id: string; name: string; email: string; phone: string | null;
  customerType?: string; location?: string; adminNotes?: string;
  referralCode?: string; referredby?: string;
  createdAt: string;
  addresses: { area: string; street: string; landmark?: string; isDefault: boolean }[];
  orders: Order[];
  reviews: Review[];
  batchOrders: BatchOrder[];
  stats: { totalSpent: number; orderCount: number; avgOrderValue: number; lastOrderDate: string | null };
  mostOrderedProducts: { productId: string; productName: string; totalQuantity: number }[];
  segment: string;
  referralsMade: number;
  promosUsed: PromoUsed[];
  pendingBalance: number;
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700', PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-cyan-100 text-cyan-700', PAID: 'bg-cyan-100 text-cyan-700',
  PROCESSING: 'bg-blue-100 text-blue-700', PACKED: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700', FAILED: 'bg-red-100 text-red-700',
};

const SEGMENT_CONFIG: Record<string, { label: string; color: string }> = {
  VIP: { label: 'VIP', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  REPEAT: { label: 'Repeat', color: 'bg-green-100 text-green-700 border border-green-300' },
  AT_RISK: { label: 'At Risk', color: 'bg-amber-100 text-amber-800 border border-amber-300' },
  LAPSED: { label: 'Lapsed', color: 'bg-red-100 text-red-700 border border-red-300' },
  NEW: { label: 'New', color: 'bg-blue-100 text-blue-700 border border-blue-300' },
};

const CUSTOMER_TYPES = ['RETAIL', 'WHOLESALE', 'RESTAURANT', 'INDIVIDUAL'];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOrders, setShowOrders] = useState(true);
  const [showProducts, setShowProducts] = useState(true);
  const [showBatchOrders, setShowBatchOrders] = useState(true);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user && customerId) fetchCustomer(); }, [session, customerId]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        if (res.status === 404) { toast.error('Customer not found'); router.push('/customers'); return; }
        throw new Error('Failed');
      }
      const data = await res.json();
      setCustomer(data.data);
      setNotes(data.data.adminNotes || '');
      setCustomerType(data.data.customerType || '');
      setLocation(data.data.location || '');
    } catch { toast.error('Failed to load customer'); }
    finally { setIsLoading(false); }
  };

  const saveCustomerDetails = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerType: customerType || null, location: location || null, adminNotes: notes || null }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Customer details saved');
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100 p-4 mt-16 lg:mt-0">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}</div>
            <div className="h-64 bg-gray-200 rounded-lg mt-6" />
          </div>
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex"><Sidebar /><main className="flex-1 lg:ml-64 min-h-screen bg-gray-100 p-8 text-center text-gray-600">Customer not found.</main></div>
    );
  }

  const seg = SEGMENT_CONFIG[customer.segment] || SEGMENT_CONFIG.NEW;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} className="text-gray-600" /></Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${seg.color}`}>{seg.label}</span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">Customer since {formatDate(new Date(customer.createdAt))}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Contact + Admin Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-5 lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={28} className="text-green-700" />
                </div>
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <div className="flex items-center gap-1"><Mail size={13} className="text-gray-400" /><p className="text-sm text-gray-700 truncate">{customer.email}</p></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <div className="flex items-center gap-1"><Phone size={13} className="text-gray-400" /><p className="text-sm text-gray-700">{customer.phone || '—'}</p></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivery Location</p>
                    <div className="flex items-center gap-1"><MapPin size={13} className="text-gray-400" />
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                        className="text-sm text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none w-full" placeholder="Set location..." />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Customer Type</p>
                    <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}
                      className="text-sm text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none w-full bg-transparent">
                      <option value="">—</option>
                      {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {customer.addresses.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Saved Addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {customer.addresses.map((a, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{a.area} — {a.street}{a.isDefault ? ' (default)' : ''}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-gray-400" />
                <p className="text-xs text-gray-500">Referral Code</p>
              </div>
              <p className="font-mono text-sm font-semibold text-gray-900">{customer.referralCode || '—'}</p>
              <p className="text-xs text-gray-500">Referrals made: <strong>{customer.referralsMade}</strong></p>
              {customer.promosUsed.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Promos Used</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.promosUsed.map((p, i) => (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono">{p.code}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart size={16} className="text-blue-600" />
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
              <p className="text-2xl font-bold">{customer.stats.orderCount}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-green-600" />
                <p className="text-xs text-gray-500">Lifetime Spend</p>
              </div>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(customer.stats.totalSpent)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-purple-600" />
                <p className="text-xs text-gray-500">Avg Order</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(customer.stats.avgOrderValue)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={16} className="text-orange-600" />
                <p className="text-xs text-gray-500">Last Order</p>
              </div>
              <p className="text-lg font-bold">{customer.stats.lastOrderDate ? formatDate(new Date(customer.stats.lastOrderDate)) : '—'}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-amber-600" />
                <p className="text-xs text-gray-500">Balance</p>
              </div>
              <p className={`text-2xl font-bold ${customer.pendingBalance > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                {customer.pendingBalance > 0 ? formatCurrency(customer.pendingBalance) : '—'}
              </p>
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowOrders(!showOrders)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Order History</h2>
                <span className="text-xs text-gray-400">{customer.orders.length} orders</span>
              </div>
              {showOrders ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showOrders && (
              <div className="border-t">
                {customer.orders.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">No orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-gray-600">Order #</th>
                          <th className="px-4 py-2.5 text-left text-gray-600">Date</th>
                          <th className="px-4 py-2.5 text-left text-gray-600">Items</th>
                          <th className="px-4 py-2.5 text-right text-gray-600">Amount</th>
                          <th className="px-4 py-2.5 text-left text-gray-600">Payment</th>
                          <th className="px-4 py-2.5 text-left text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customer.orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-mono font-medium text-gray-900">{order.orderNumber}</td>
                            <td className="px-4 py-2.5 text-gray-500">{formatDate(new Date(order.createdAt))}</td>
                            <td className="px-4 py-2.5">
                              <div className="space-y-0.5 max-w-[200px]">
                                {order.items.slice(0, 2).map((item) => (
                                  <p key={item.id} className="text-xs text-gray-600 truncate">{item.product.name} × {item.quantity}</p>
                                ))}
                                {order.items.length > 2 && <p className="text-[10px] text-gray-400">+{order.items.length - 2} more</p>}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-800">{formatCurrency(Number(order.total))}</td>
                            <td className="px-4 py-2.5">
                              <p className="text-xs text-gray-600">{order.paymentMethod}</p>
                              {order.paymentRef && <p className="text-[10px] text-gray-400 font-mono">{order.paymentRef}</p>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Two column: Most Ordered Products + Batch Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border">
              <button onClick={() => setShowProducts(!showProducts)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-500" />
                  <h2 className="font-bold">Most Ordered Products</h2>
                </div>
                {showProducts ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {showProducts && (
                <div className="border-t">
                  {customer.mostOrderedProducts.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No data yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {customer.mostOrderedProducts.map((p, i) => (
                        <div key={p.productId} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                            <p className="text-sm font-medium text-gray-900">{p.productName}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-700">{p.totalQuantity} ordered</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border">
              <button onClick={() => setShowBatchOrders(!showBatchOrders)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-green-600" />
                  <h2 className="font-bold">Batch Orders</h2>
                  <span className="text-xs text-gray-400">{customer.batchOrders.length}</span>
                </div>
                {showBatchOrders ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {showBatchOrders && (
                <div className="border-t">
                  {customer.batchOrders.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No batch orders.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max text-sm">
                        <thead className="bg-gray-50 border-b"><tr>
                          <th className="px-4 py-2 text-left text-gray-600">Order</th>
                          <th className="px-4 py-2 text-left text-gray-600">Batch</th>
                          <th className="px-4 py-2 text-right text-gray-600">Qty</th>
                          <th className="px-4 py-2 text-right text-gray-600">Total</th>
                          <th className="px-4 py-2 text-left text-gray-600">Status</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {customer.batchOrders.map((bo) => (
                            <tr key={bo.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs">{bo.orderNumber}</td>
                              <td className="px-4 py-2 text-gray-600">{bo.batch.batchNumber}</td>
                              <td className="px-4 py-2 text-right">{bo.quantity}</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-800">{formatCurrency(Number(bo.totalPrice))}</td>
                              <td className="px-4 py-2">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[bo.status] || 'bg-gray-100 text-gray-700'}`}>
                                  {bo.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          {customer.reviews.length > 0 && (
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center gap-2">
                <Star size={18} className="text-orange-500" />
                <h2 className="font-bold">Reviews ({customer.reviews.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {customer.reviews.map((review) => (
                  <div key={review.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-gray-900">{review.product.name}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(new Date(review.createdAt))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center gap-2">
              <StickyNote size={18} className="text-gray-500" />
              <h2 className="font-bold">Admin Notes</h2>
              <span className="text-[10px] text-gray-400">Internal only — customer never sees this</span>
            </div>
            <div className="p-5">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this customer..."
                className="w-full h-28 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
              <div className="mt-3 flex justify-end">
                <button onClick={saveCustomerDetails} disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  <Save size={14} /> {isSaving ? 'Saving...' : 'Save Notes & Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
