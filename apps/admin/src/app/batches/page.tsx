'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@ecokuku/ui';
import { formatDate } from '@ecokuku/ui';
import { Plus, Edit2, Eye } from 'lucide-react';

interface Batch {
  id: string;
  batchNumber: string;
  type: string;
  quantity: number;
  startDate: string;
  status: string;
  mortalities: number;
  notes: string;
}

export default function BatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    type: 'LAYERS',
    quantity: '',
    startDate: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchBatches();
    }
  }, [session]);

  const fetchBatches = async () => {
    try {
      // This will connect to the actual API once the endpoint is created
      console.log('Fetching batches...');
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          batchNumber: '',
          type: 'LAYERS',
          quantity: '',
          startDate: '',
          notes: '',
        });
        setShowForm(false);
        fetchBatches();
      }
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'QUARANTINE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-8">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus size={20} />
          New Batch
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Batch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="LAYERS">Layers</option>
                  <option value="BROILERS">Broilers</option>
                  <option value="BREEDERS">Breeders</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Batch</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No batches yet. Create your first batch to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Batch Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Mortalities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{batch.type}</td>
                    <td className="px-6 py-4 text-gray-600">{batch.quantity}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(new Date(batch.startDate))}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(batch.status)}>
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{batch.mortalities}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-green-900 hover:text-green-800 p-1">
                          <Eye size={18} />
                        </button>
                        <button className="text-blue-900 hover:text-blue-800 p-1">
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
