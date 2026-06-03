'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card } from '@ecokuku/ui';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    farmName: 'EcoKuku Farm',
    email: 'info@ecokuku.com',
    phone: '+254712345678',
    location: 'Nairobi, Kenya',
    notifications: 'true',
    automatedReports: 'true',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600 mt-1">Manage farm and system preferences</p>
          </div>
        </div>

        <div className="p-6">
          {/* Farm Information */}
          <Card className="mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Farm Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                <input
                  type="text"
                  value={settings.farmName}
                  onChange={(e) => setSettings({ ...settings, farmName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="mb-6">
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Preferences</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.notifications === 'true'}
                  onChange={(e) => setSettings({ ...settings, notifications: String(e.target.checked) })}
                  className="w-5 h-5 accent-green-700"
                />
                <span className="text-sm">Enable email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.automatedReports === 'true'}
                  onChange={(e) => setSettings({ ...settings, automatedReports: String(e.target.checked) })}
                  className="w-5 h-5 accent-green-700"
                />
                <span className="text-sm">Send automated reports</span>
              </label>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-800 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
            {saveStatus === 'saved' && <span className="text-sm text-green-700 font-medium">✓ Settings saved</span>}
            {saveStatus === 'error' && <span className="text-sm text-red-600 font-medium">Failed to save</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
