'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Batch {
  id: string;
  batchNumber: string;
  type: string;
  quantity: number;
  status: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

interface MortalityLog {
  id: string;
  date: string;
  count: number;
  cause?: string;
  notes?: string;
}

interface GrowthLog {
  id: string;
  date: string;
  avgWeight: number | null;
  notes?: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [mortalityLogs, setMortalityLogs] = useState<MortalityLog[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMortalityForm, setShowMortalityForm] = useState(false);
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [editData, setEditData] = useState({
    status: '',
    expectedReady: '',
    notes: '',
  });

  const [mortalityForm, setMortalityForm] = useState({
    date: '',
    count: '',
    cause: '',
    notes: '',
  });

  const [growthForm, setGrowthForm] = useState({
    date: '',
    avgWeight: '',
    notes: '',
  });

  const fetchBatchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const batchRes = await fetch(`/api/batches?limit=1`, { credentials: 'include' });
      if (batchRes.ok) {
        const data = await batchRes.json();
        const foundBatch = data.data.find((b: Batch) => b.id === batchId);
        if (foundBatch) {
          setBatch(foundBatch);
          setEditData({
            status: foundBatch.status,
            expectedReady: foundBatch.expectedReady 
              ? new Date(foundBatch.expectedReady).toISOString().split('T')[0]
              : '',
            notes: foundBatch.notes || '',
          });
        }
      }

      // Fetch mortality logs
      const mortalityRes = await fetch(`/api/mortality-logs?batchId=${batchId}`, {
        credentials: 'include',
      });
      if (mortalityRes.ok) {
        const data = await mortalityRes.json();
        setMortalityLogs(data.data);
      }

      // Fetch growth logs
      const growthRes = await fetch(`/api/growth-logs?batchId=${batchId}`, {
        credentials: 'include',
      });
      if (growthRes.ok) {
        const data = await growthRes.json();
        setGrowthLogs(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batchId,
          ...editData,
        }),
      });

      if (!res.ok) throw new Error('Failed to update batch');
      setShowEditForm(false);
      fetchBatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update batch');
    }
  };

  const handleAddMortalityLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mortality-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batchId,
          date: mortalityForm.date,
          count: parseInt(mortalityForm.count),
          cause: mortalityForm.cause,
          notes: mortalityForm.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to add mortality log');
      setMortalityForm({ date: '', count: '', cause: '', notes: '' });
      setShowMortalityForm(false);
      fetchBatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mortality log');
    }
  };

  const handleAddGrowthLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/growth-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batchId,
          date: growthForm.date,
          avgWeight: growthForm.avgWeight ? parseFloat(growthForm.avgWeight) : null,
          notes: growthForm.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to add growth log');
      setGrowthForm({ date: '', avgWeight: '', notes: '' });
      setShowGrowthForm(false);
      fetchBatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add growth log');
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Link href="/batches" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                {batch?.batchNumber || 'Batch'} Details
              </h1>
              <p className="text-gray-600 mt-1">
                {batch?.type} • {batch?.quantity} birds
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Batch Info Card */}
          {batch && (
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{batch.batchNumber}</h2>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {batch.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 text-sm">Type</p>
                    <p className="font-semibold">{batch.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Quantity</p>
                    <p className="font-semibold">{batch.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Start Date</p>
                    <p className="font-semibold">
                      {new Date(batch.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Age (Days)</p>
                    <p className="font-semibold">
                      {Math.floor(
                        (new Date().getTime() - new Date(batch.startDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}
                    </p>
                  </div>
                </div>

                {batch.notes && (
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p>{batch.notes}</p>
                  </div>
                )}

                <Button
                  onClick={() => setShowEditForm(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Edit Batch
                </Button>
              </div>
            </Card>
          )}

          {/* Mortality Logs */}
          <div className="mb-6">
            <Card>
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold">Mortality Logs</h3>
                <Button
                  onClick={() => setShowMortalityForm(true)}
                  className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                >
                  <Plus size={18} /> Add Log
                </Button>
              </div>

              {mortalityLogs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No mortality logs</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Count</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Cause</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mortalityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            {new Date(log.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">{log.count}</td>
                          <td className="px-6 py-4 text-sm">{log.cause || '-'}</td>
                          <td className="px-6 py-4 text-sm">{log.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Growth Logs */}
          <div className="mb-6">
            <Card>
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-bold">Growth Logs</h3>
                <Button
                  onClick={() => setShowGrowthForm(true)}
                  className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <Plus size={18} /> Add Log
                </Button>
              </div>

              {growthLogs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No growth logs</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">
                          Avg Weight (kg)
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {growthLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            {new Date(log.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">
                            {log.avgWeight}
                          </td>
                          <td className="px-6 py-4 text-sm">{log.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Edit Batch Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Edit Batch</h2>
                <form onSubmit={handleUpdateBatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="RESTING">Resting</option>
                      <option value="SOLD_OUT">Sold Out</option>
                      <option value="CULLED">Culled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Ready Date
                    </label>
                    <input
                      type="date"
                      value={editData.expectedReady}
                      onChange={(e) =>
                        setEditData({ ...editData, expectedReady: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editData.notes}
                      onChange={(e) =>
                        setEditData({ ...editData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white"
                    >
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Add Mortality Log Modal */}
        {showMortalityForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Add Mortality Log</h2>
                <form onSubmit={handleAddMortalityLog} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={mortalityForm.date}
                      onChange={(e) =>
                        setMortalityForm({
                          ...mortalityForm,
                          date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Count *
                    </label>
                    <input
                      type="number"
                      required
                      value={mortalityForm.count}
                      onChange={(e) =>
                        setMortalityForm({
                          ...mortalityForm,
                          count: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Number of birds"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cause
                    </label>
                    <input
                      type="text"
                      value={mortalityForm.cause}
                      onChange={(e) =>
                        setMortalityForm({
                          ...mortalityForm,
                          cause: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Disease, Predator"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={mortalityForm.notes}
                      onChange={(e) =>
                        setMortalityForm({
                          ...mortalityForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowMortalityForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-red-600 text-white"
                    >
                      Add Log
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Add Growth Log Modal */}
        {showGrowthForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Add Growth Log</h2>
                <form onSubmit={handleAddGrowthLog} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={growthForm.date}
                      onChange={(e) =>
                        setGrowthForm({
                          ...growthForm,
                          date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Average Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={growthForm.avgWeight}
                      onChange={(e) =>
                        setGrowthForm({
                          ...growthForm,
                          avgWeight: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={growthForm.notes}
                      onChange={(e) =>
                        setGrowthForm({
                          ...growthForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowGrowthForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 text-white"
                    >
                      Add Log
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
