import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Save,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  Server,
  DollarSign,
  Loader2
} from 'lucide-react';
import { api } from '../../api/client';
import type { CompanySettings, UserRole } from '../../types';

interface SettingsViewProps {
  userRole: UserRole;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userRole }) => {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Sri Venkateswara Chit Funds Private Limited',
    registrationNumber: 'CIN: U65992TN2018PTC120491',
    address: '42, North Usman Road, T. Nagar, Chennai - 600017',
    phone: '+91 44 2814 9000',
    email: 'contact@svchitfunds.in',
    website: 'www.svchitfunds.in',
    defaultForemanCommissionPercent: 5.0,
    currencySymbol: '₹',
    receiptPrefix: 'RCP-'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('Only administrators can modify company settings.');
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all data back to the clean initial demo seed? All custom entries will be restored to defaults.'
      )
    ) {
      return;
    }

    try {
      await api.resetDemoData();
      alert('Demo data re-seeded successfully! The application will refresh.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo data');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Company Profile & Scheme Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal company headers for printed payment receipts, regulatory commission rates, and branch details
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Company Identity */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Chit Fund Company Information (Receipt Header)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Company Registered Name *</label>
              <input
                type="text"
                required
                disabled={userRole !== 'admin'}
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Registration / CIN / License Number *</label>
              <input
                type="text"
                required
                disabled={userRole !== 'admin'}
                value={settings.registrationNumber}
                onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Official Contact Phone *</label>
              <input
                type="text"
                required
                disabled={userRole !== 'admin'}
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Email Address</label>
              <input
                type="email"
                disabled={userRole !== 'admin'}
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Website URL</label>
              <input
                type="text"
                disabled={userRole !== 'admin'}
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">Registered Office & Branch Address *</label>
              <textarea
                required
                rows={2}
                disabled={userRole !== 'admin'}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Regulatory & Receipt Policy */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-sm">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Chit Funds Act Statutory & Financial Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Foreman Commission (%) *</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                required
                disabled={userRole !== 'admin'}
                value={settings.defaultForemanCommissionPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultForemanCommissionPercent: Number(e.target.value)
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 disabled:bg-slate-50"
              />
              <p className="text-[10px] text-slate-500 mt-1">Capped at 5.0% under Section 21 of the Chit Funds Act.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Receipt Number Prefix</label>
              <input
                type="text"
                disabled={userRole !== 'admin'}
                value={settings.receiptPrefix}
                onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Currency Symbol</label>
              <input
                type="text"
                disabled={userRole !== 'admin'}
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Database & Architecture Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Database & Storage Architecture</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1 text-xs">
            <p><strong>Storage Engine:</strong> Production JSON Data Store with MySQL-Compliant Schema</p>
            <p><strong>Database File:</strong> <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">data/chitfund_data.json</code></p>
            <p><strong>Audit Trail:</strong> Active HMAC session tokens, sequential receipts, immutable financial ledger.</p>
          </div>

          {userRole === 'admin' && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Re-populate initial test customers, groups, and installment ledger:</span>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Demo Seed Data</span>
              </button>
            </div>
          )}
        </div>

        {userRole === 'admin' && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs text-xs transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Company Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
