'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card } from '@ecokuku/ui';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    farmName: 'EcoKuku Farm',
    email: 'info@ecokuku.com',
    phone: '+254712345678',
    location: 'Nairobi, Kenya',
    notifications: true,
    automatedReports: true,
  });

  const handleSave = () => {
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
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
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm">Enable email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.automatedReports}
                  onChange={(e) => setSettings({ ...settings, automatedReports: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm">Send automated reports</span>
              </label>
            </div>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <Save size={18} /> Save Settings
          </Button>
        </div>
      </main>
    </div>
  );
}
