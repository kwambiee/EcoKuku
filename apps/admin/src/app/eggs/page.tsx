'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card } from '@ecokuku/ui';
import { Plus, TrendingUp, Edit, Trash2, X } from 'lucide-react';

interface EggProduction {
  id: string;
  date: string;
  collected: number;
  broken?: number;
  cracked?: number;
  notes?: string;
  batch?: {
    id: string;
    batchNumber: string;
  };
}

interface Batch {
  id: string;
  batchNumber: string;
}

export default function EggsPage() {
  const [eggs, setEggs] = useState<EggProduction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEgg, setSelectedEgg] = useState<EggProduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    collected: '',
    broken: '',
    cracked: '',
    notes: '',
    batchId: '',
  });
  const [editData, setEditData] = useState({
    date: '',
    collected: '',
    broken: '',
    cracked: '',
    notes: '',
    batchId: '',
  });

  const fetchEggs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eggs', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch eggs');
      const data = await response.json();
      setEggs(data.data || []);
    } catch (err) {
      console.error('Error fetching eggs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches?status=ACTIVE&limit=100', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      setBatches(data.data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  useEffect(() => {
    fetchEggs();
    fetchBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to log egg production');
      }

      alert('Egg production logged successfully');
      setFormData({ date: new Date().toISOString().split('T')[0], collected: '', broken: '', cracked: '', notes: '', batchId: '' });
      setShowForm(false);
      fetchEggs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error logging eggs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (record: EggProduction) => {
    setSelectedEgg(record);
    setEditData({
      date: record.date.split('T')[0],
      collected: record.collected.toString(),
      broken: (record.broken || 0).toString(),
      cracked: (record.cracked || 0).toString(),
      notes: record.notes || '',
      batchId: record.batch?.id || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEgg) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/eggs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eggProductionId: selectedEgg.id,
          date: new Date(editData.date),
          collected: parseInt(editData.collected),
          broken: editData.broken ? parseInt(editData.broken) : 0,
          cracked: editData.cracked ? parseInt(editData.cracked) : 0,
          notes: editData.notes,
          ...(editData.batchId && { batchId: editData.batchId }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update egg production');
      }

      alert('Egg production updated successfully');
      setShowEditModal(false);
      setSelectedEgg(null);
      fetchEggs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating eggs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this egg production record?')) return;

    try {
      const response = await fetch('/api/eggs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eggProductionId: id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete egg production');
      }

      alert('Egg production deleted successfully');
      fetchEggs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete egg production');
      console.error('Error deleting eggs:', err);
    }
  };

  const todayStats = [
    { label: 'Eggs Collected', value: '3,850', trend: '+240' },
    { label: 'Daily Average', value: '2,925', trend: '+15%' },
    { label: 'Quality Rate', value: '98.2%', trend: '+0.5%' },
    { label: 'Broken Eggs', value: '28', trend: '-5' },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Egg Production</h1>
              <p className="text-gray-600 mt-1">Daily egg collection and tracking</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus size={18} /> Log Collection
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {todayStats.map((stat) => (
              <Card key={stat.label} className="p-4">
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <div className="flex justify-between items-end mt-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <TrendingUp size={14} /> {stat.trend}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Production History */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Collection History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Batch</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Collected</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Good Eggs</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Destroyed (Broken + Cracked)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Notes</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Loading data...
                      </td>
                    </tr>
                  ) : eggs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No egg production records found
                      </td>
                    </tr>
                  ) : (
                    eggs.map((record) => {
                      const destroyed = (record.broken || 0) + (record.cracked || 0);
                      const goodEggs = record.collected - destroyed;
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {record.batch?.batchNumber || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-blue-600">{record.collected}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-600">{goodEggs}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-red-600">{destroyed}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{record.notes || '-'}</td>
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              onClick={() => openEditModal(record)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Log Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Log Egg Collection</h2>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Batch (Optional)</label>
                    <select
                      value={formData.batchId}
                      onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    >
                      <option value="">No Batch Selected</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Eggs Collected</label>
                    <input
                      type="number"
                      required
                      value={formData.collected}
                      onChange={(e) => setFormData({ ...formData, collected: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Broken</label>
                      <input
                        type="number"
                        value={formData.broken}
                        onChange={(e) => setFormData({ ...formData, broken: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cracked</label>
                      <input
                        type="number"
                        value={formData.cracked}
                        onChange={(e) => setFormData({ ...formData, cracked: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white">
                      {isLoading ? 'Logging...' : 'Log Collection'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedEgg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Edit Egg Collection</h2>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
                <form onSubmit={handleUpdateRecord} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      required
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Batch (Optional)</label>
                    <select
                      value={editData.batchId}
                      onChange={(e) => setEditData({ ...editData, batchId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    >
                      <option value="">No Batch Selected</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Eggs Collected</label>
                    <input
                      type="number"
                      required
                      value={editData.collected}
                      onChange={(e) => setEditData({ ...editData, collected: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Broken</label>
                      <input
                        type="number"
                        value={editData.broken}
                        onChange={(e) => setEditData({ ...editData, broken: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cracked</label>
                      <input
                        type="number"
                        value={editData.cracked}
                        onChange={(e) => setEditData({ ...editData, cracked: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <input
                      type="text"
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white">
                      {isLoading ? 'Updating...' : 'Update'}
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
