'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus } from 'lucide-react';

interface IncubationBatch {
  id: string;
  batchNumber: string;
  eggCount: number;
  startDate: string;
  expectedHatchDate: string;
  hatchedCount?: number;
  failedCount?: number;
  notes?: string;
}

export default function IncubationPage() {
  const [batches, setBatches] = useState<IncubationBatch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IncubationBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultData, setResultData] = useState({
    hatchedCount: '',
    failedCount: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    batchNumber: '',
    eggCount: '',
    startDate: '',
    expectedHatchDate: '',
    temperature: '',
    humidity: '',
    notes: '',
  });

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/incubation');
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      setBatches(data.data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/incubation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create incubation batch');
      }

      alert('Incubation batch created successfully');
      setFormData({
        batchNumber: '',
        eggCount: '',
        startDate: '',
        expectedHatchDate: '',
        temperature: '',
        humidity: '',
        notes: '',
      });
      setShowForm(false);
      fetchBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create incubation batch');
      console.error('Error creating incubation batch:', err);
    }
  };

  const handleUpdateResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const response = await fetch(`/api/incubation/${selectedBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hatchedCount: parseInt(resultData.hatchedCount || '0'),
          failedCount: parseInt(resultData.failedCount || '0'),
          notes: resultData.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update hatch results');
      }

      alert('Hatch results updated successfully');
      setResultData({ hatchedCount: '', failedCount: '', notes: '' });
      setShowResultsModal(false);
      setSelectedBatch(null);
      fetchBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update hatch results');
      console.error('Error updating hatch results:', err);
    }
  };

  const openResultsModal = (batch: IncubationBatch) => {
    setSelectedBatch(batch);
    setResultData({
      hatchedCount: batch.hatchedCount?.toString() || '',
      failedCount: batch.failedCount?.toString() || '',
      notes: batch.notes || '',
    });
    setShowResultsModal(true);
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Incubation Management</h1>
              <p className="text-gray-600 mt-1">Monitor egg incubation progress</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus size={18} /> New Batch
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Incubation Batches */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Incubations', value: '3' },
              { label: 'Eggs Incubating', value: '8,500' },
              { label: 'Avg Hatch Date', value: '15 days' },
              { label: 'Humidity Avg', value: '65%' },
            ].map((metric) => (
              <Card key={metric.label} className="p-4">
                <p className="text-gray-600 text-sm">{metric.label}</p>
                <p className="text-2xl font-bold mt-2">{metric.value}</p>
              </Card>
            ))}
          </div>

          {/* Batches Table */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Incubation Batches</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Batch</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Eggs</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Start Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Expected Hatch</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Hatched/Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading batches...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No incubation batches found
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openResultsModal(batch)}>
                        <td className="px-6 py-4 font-semibold">{batch.batchNumber}</td>
                        <td className="px-6 py-4">{batch.eggCount}</td>
                        <td className="px-6 py-4 text-sm">{new Date(batch.startDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{new Date(batch.expectedHatchDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <Button
                            onClick={() => openResultsModal(batch)}
                            className="bg-blue-600 text-white text-xs px-2 py-1 hover:bg-blue-700"
                          >
                            {batch.hatchedCount || batch.failedCount ? '✓ Update' : 'Record'}
                          </Button>
                        </td>
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
                <h2 className="text-xl font-bold mb-4">New Incubation Batch</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Batch Number</label>
                    <input
                      type="text"
                      placeholder="e.g., INC-001"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Egg Count</label>
                    <input
                      type="number"
                      placeholder="e.g., 3000"
                      value={formData.eggCount}
                      onChange={(e) => setFormData({ ...formData, eggCount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expected Hatch Date</label>
                    <input
                      type="date"
                      value={formData.expectedHatchDate}
                      onChange={(e) => setFormData({ ...formData, expectedHatchDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 37.5"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Humidity (%)</label>
                      <input
                        type="number"
                        placeholder="e.g., 65"
                        value={formData.humidity}
                        onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      placeholder="Add notes about this batch"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 text-white">
                      Create Batch
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Results Modal */}
        {showResultsModal && selectedBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Record Hatch Results - {selectedBatch.batchNumber}</h2>
                <form onSubmit={handleUpdateResults} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Total Eggs Started</label>
                    <div className="text-2xl font-bold text-blue-600 mt-2">{selectedBatch.eggCount}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Hatched</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={resultData.hatchedCount}
                        onChange={(e) => setResultData({ ...resultData, hatchedCount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Failed</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={resultData.failedCount}
                        onChange={(e) => setResultData({ ...resultData, failedCount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Summary</label>
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm">Hatched: <span className="font-bold text-green-600">{resultData.hatchedCount || 0}</span></p>
                      <p className="text-sm">Failed: <span className="font-bold text-red-600">{resultData.failedCount || 0}</span></p>
                      <p className="text-sm">Unaccounted: <span className="font-bold text-gray-600">{Math.max(0, selectedBatch.eggCount - (parseInt(resultData.hatchedCount || '0') + parseInt(resultData.failedCount || '0')))}</span></p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      placeholder="Add notes about this hatch cycle"
                      value={resultData.notes}
                      onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => { setShowResultsModal(false); setSelectedBatch(null); }} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-green-600 text-white">
                      Save Results
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
