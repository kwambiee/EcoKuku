'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus, Calendar } from 'lucide-react';

interface VaccinationLog {
  id: string;
  vaccineType: string;
  dateAdministered: string;
  dosage?: string;
  administeredBy?: string;
  batchNo?: string;
  notes?: string;
}

export default function HealthPage() {
  const [logs, setLogs] = useState<VaccinationLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    vaccineType: '',
    dateAdministered: '',
    batchId: '',
    dosage: '',
    administeredBy: '',
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/health-logs');
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
      const response = await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to log vaccination');
      }

      alert('Vaccination logged successfully');
      setFormData({ vaccineType: '', dateAdministered: '', batchId: '', dosage: '', administeredBy: '' });
      setShowForm(false);
      fetchLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to log vaccination');
      console.error('Error logging vaccination:', err);
    }
  };

  const vaccinationSchedule = [
    { vaccine: 'Newcastle Disease', days: '7-10', status: 'COMPLETED' },
    { vaccine: 'Gumboro', days: '14-18', status: 'PENDING' },
    { vaccine: 'Fowl Pox', days: '10-12', status: 'PENDING' },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Health & Vaccination</h1>
              <p className="text-gray-600 mt-1">Track vaccinations and health events</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus size={18} /> Log Vaccination
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Vaccination Status */}
          <Card className="mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Vaccination Schedule</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {vaccinationSchedule.map((item) => (
                <div key={item.vaccine} className="p-6 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{item.vaccine}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Calendar size={14} /> Days {item.days}
                    </p>
                  </div>
                  <Badge className={item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Vaccination History */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Vaccination History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Vaccine</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Dosage</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Administered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No vaccination logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{new Date(log.dateAdministered).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-semibold">{log.vaccineType}</td>
                        <td className="px-6 py-4 text-sm">{log.dosage || '-'}</td>
                        <td className="px-6 py-4 text-sm">{log.administeredBy || '-'}</td>
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
                <h2 className="text-xl font-bold mb-4">Log Vaccination</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date Administered</label>
                    <input
                      type="date"
                      required
                      value={formData.dateAdministered}
                      onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vaccine Type</label>
                    <select
                      required
                      value={formData.vaccineType}
                      onChange={(e) => setFormData({ ...formData, vaccineType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    >
                      <option value="">Select Vaccine</option>
                      <option value="Newcastle">Newcastle Disease</option>
                      <option value="Gumboro">Gumboro</option>
                      <option value="Fowl Pox">Fowl Pox</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Batch ID</label>
                    <input
                      type="text"
                      placeholder="Enter batch ID (optional)"
                      value={formData.batchId}
                      onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g., 0.5ml per bird"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Administered By</label>
                    <input
                      type="text"
                      placeholder="Staff member name"
                      value={formData.administeredBy}
                      onChange={(e) => setFormData({ ...formData, administeredBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 text-white">
                      Log Vaccination
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
