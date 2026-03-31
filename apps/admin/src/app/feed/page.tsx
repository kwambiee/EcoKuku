'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus, AlertTriangle } from 'lucide-react';

interface FeedLog {
  id: string;
  feedType: string;
  recordedDate: string;
  quantityUsed: number;
  quantityRemaining?: number;
  supplier?: string;
  notes?: string;
}

export default function FeedPage() {
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    feedType: '',
    quantityUsed: '',
    quantityRemaining: '',
    supplier: '',
    recordedDate: '',
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feed-logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/feed-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to log feed consumption');
      }

      alert('Feed consumption logged successfully');
      setFormData({ feedType: '', quantityUsed: '', quantityRemaining: '', supplier: '', recordedDate: '' });
      setShowForm(false);
      fetchLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to log feed consumption');
      console.error('Error logging feed:', err);
    }
  };

  const feedInventory = [
    { type: 'Layer Mash', quantity: '1,200', unit: 'kg', reorder: false },
    { type: 'Starter Crumb', quantity: '450', unit: 'kg', reorder: true },
    { type: 'Grower Pellets', quantity: '800', unit: 'kg', reorder: false },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Feed Management</h1>
              <p className="text-gray-600 mt-1">Track feed stock and consumption</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus size={18} /> Log Feed
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Total Stock</p>
              <p className="text-2xl font-bold mt-2">2,450 kg</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Today's Consumption</p>
              <p className="text-2xl font-bold mt-2">580 kg</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Estimated Days Left</p>
              <p className="text-2xl font-bold mt-2">4.2</p>
            </Card>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Low Stock Alert</p>
              <p className="text-sm mt-1">Starter Crumb stock is low (450 kg). Reorder recommended.</p>
            </div>
          </div>

          {/* Feed Inventory */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Feed Consumption Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Feed Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Quantity Used</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Remaining</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No feed logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{new Date(log.recordedDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-semibold">{log.feedType}</td>
                        <td className="px-6 py-4 text-sm">{log.quantityUsed} kg</td>
                        <td className="px-6 py-4 text-sm">{log.quantityRemaining || '-'} kg</td>
                        <td className="px-6 py-4 text-sm">{log.supplier || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Log Feed Consumption</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      value={formData.recordedDate}
                      onChange={(e) => setFormData({ ...formData, recordedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Feed Type</label>
                    <select
                      value={formData.feedType}
                      onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    >
                      <option value="">Select Feed Type</option>
                      <option value="Layer Mash">Layer Mash</option>
                      <option value="Starter Crumb">Starter Crumb</option>
                      <option value="Grower Pellets">Grower Pellets</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity Used (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g., 50"
                      value={formData.quantityUsed}
                      onChange={(e) => setFormData({ ...formData, quantityUsed: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity Remaining (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g., 200"
                      value={formData.quantityRemaining}
                      onChange={(e) => setFormData({ ...formData, quantityRemaining: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier</label>
                    <input
                      type="text"
                      placeholder="Supplier name (optional)"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 text-white">
                      Log Consumption
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
