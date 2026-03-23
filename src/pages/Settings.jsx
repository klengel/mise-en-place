import { db } from "@/lib/db";

import { useState, useEffect } from 'react';

import { Save, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Settings() {
  const [form, setForm] = useState({
    kitchen_name: '',
    staff_count: 4,
    prep_start_time: '08:00',
    service_start_time: '12:00',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const data = await db.entities.KitchenSettings.filter({ is_default: true });
    if (data.length > 0) {
      const s = data[0];
      setSettingsId(s.id);
      setForm({
        kitchen_name: s.kitchen_name || '',
        staff_count: s.staff_count || 4,
        prep_start_time: s.prep_start_time || '08:00',
        service_start_time: s.service_start_time || '12:00',
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, is_default: true, staff_count: Number(form.staff_count) };
    if (settingsId) {
      await db.entities.KitchenSettings.update(settingsId, payload);
    } else {
      const created = await db.entities.KitchenSettings.create(payload);
      setSettingsId(created.id);
    }
    setSaving(false);
    toast.success('Settings saved!');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Kitchen Settings</h1>
          <p className="text-sm text-muted-foreground">Default configuration for your kitchen</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="text-sm font-medium mb-1 block">Kitchen / Restaurant Name</label>
          <Input
            value={form.kitchen_name}
            onChange={e => setForm(p => ({ ...p, kitchen_name: e.target.value }))}
            placeholder="e.g. The Grand Bistro"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Kitchen Staff on Duty</label>
          <Input
            type="number"
            min={1}
            value={form.staff_count}
            onChange={e => setForm(p => ({ ...p, staff_count: e.target.value }))}
            placeholder="4"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">Number of cooks available for mise en place</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Prep Start Time</label>
            <Input
              type="time"
              value={form.prep_start_time}
              onChange={e => setForm(p => ({ ...p, prep_start_time: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">When mise en place begins</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Service Start Time</label>
            <Input
              type="time"
              value={form.service_start_time}
              onChange={e => setForm(p => ({ ...p, service_start_time: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">When kitchen opens for service</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Default Settings
        </Button>
      </div>
    </div>
  );
}