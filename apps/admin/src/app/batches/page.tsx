'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus, Edit, Trash2, AlertCircle, Eye, X } from 'lucide-react';
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
  createdAt: string;
}

interface MortalityLog {
  id: string;
  count: number;
  date: string;
  notes?: string;
}

interface GrowthLog {
  id: string;
  date: string;
  avgWeight: number;
  notes?: string;
}

interface ApiResponse {
  data: Batch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [mortalityLogs, setMortalityLogs] = useState<MortalityLog[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    type: 'CHICKEN',
    quantity: '',
    startDate: '',
    notes: '',
  });

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/batches?${params}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch batches');
      const data: ApiResponse = await res.json();
      setBatches(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, statusFilter]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
        }),
      });

      if (!res.ok) throw new Error('Failed to create batch');
      
      setFormData({
        batchNumber: '',
        type: 'CHICKEN',
        quantity: '',
        startDate: '',
        notes: '',
      });
      setShowCreateModal(false);
      fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    
    try {
      const res = await fetch('/api/batches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batchId }),
      });

      if (!res.ok) throw new Error('Failed to delete batch');
      fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete batch');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'RESTING':
        return 'bg-blue-100 text-blue-800';
      case 'SOLD_OUT':
        return 'bg-gray-100 text-gray-800';
      case 'CULLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const openLogsModal = async (batch: Batch) => {
    setSelectedBatch(batch);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      // Fetch mortality logs
      const mortalityRes = await fetch(`/api/mortality-logs?batchId=${batch.id}`, {
        credentials: 'include',
      });
      if (mortalityRes.ok) {
        const data = await mortalityRes.json();
        setMortalityLogs(data.data || []);
      }

      // Fetch growth logs
      const growthRes = await fetch(`/api/growth-logs?batchId=${batch.id}`, {
        credentials: 'include',
      });
      if (growthRes.ok) {
        const data = await growthRes.json();
        setGrowthLogs(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Batch Management</h1>
              <p className="text-gray-600 mt-1">Manage farm batches and track their lifecycle</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} /> New Batch
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg mb-6 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RESTING">Resting</option>
              <option value="SOLD_OUT">Sold Out</option>
              <option value="CULLED">Culled</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Batches Table */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No batches found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Batch Number
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {batch.batchNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{batch.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{batch.quantity}</td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(batch.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openLogsModal(batch)}
                              className="text-green-600 hover:text-green-800"
                              title="View Logs"
                            >
                              <Eye size={18} />
                            </button>
                            <Link
                              href={`/batches/${batch.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit size={18} />
                            </Link>
                            <button
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Logs Modal */}
        {showLogsModal && selectedBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Batch Logs: {selectedBatch.batchNumber}</h2>
                  <button
                    onClick={() => setShowLogsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                {logsLoading ? (
                  <div className="text-center text-gray-500">Loading logs...</div>
                ) : (
                  <div className="space-y-6">
                    {/* Mortality Logs */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Mortality Logs</h3>
                      {mortalityLogs.length === 0 ? (
                        <p className="text-gray-500">No mortality logs recorded</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Count</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {mortalityLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">{new Date(log.date).toLocaleDateString()}</td>
                                  <td className="px-4 py-2">{log.count}</td>
                                  <td className="px-4 py-2">{log.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Growth Logs */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Growth Logs</h3>
                      {growthLogs.length === 0 ? (
                        <p className="text-gray-500">No growth logs recorded</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Avg Weight (kg)</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {growthLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">{new Date(log.date).toLocaleDateString()}</td>
                                  <td className="px-4 py-2">{log.avgWeight}</td>
                                  <td className="px-4 py-2">{log.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setShowLogsModal(false)}
                    className="bg-gray-300 text-gray-800 hover:bg-gray-400"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Create Batch Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Create New Batch</h2>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.batchNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, batchNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., BATCH-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="CHICKEN">Chicken</option>
                      <option value="LAYER">Layer</option>
                      <option value="BROILER">Broiler</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Add any notes..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Create Batch
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
