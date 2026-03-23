import { db } from "@/lib/db";
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PRESET_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6b7280'];

export default function LabelManager({ labels, onClose, onChange }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  async function handleAdd() {
    if (!newName.trim()) return toast.error('Label name required');
    const created = await db.entities.Label.create({ name: newName.trim(), color: newColor });
    onChange(prev => [...prev, created]);
    setNewName('');
    toast.success('Label created!');
  }

  async function handleDelete(id) {
    await db.entities.Label.delete(id);
    onChange(prev => prev.filter(l => l.id !== id));
    toast.success('Label deleted');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Manage Labels</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {labels.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No labels yet</p>}
            {labels.map(label => (
              <div key={label.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="flex-1 text-sm font-medium">{label.name}</span>
                <button onClick={() => handleDelete(label.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-medium">Add new label</h3>
            <Input placeholder="Label name (e.g. Menu A)" value={newName} onChange={e => setNewName(e.target.value)} />
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap items-center">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-foreground' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-7 h-7 rounded-full cursor-pointer border-0 p-0" title="Custom color" />
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full gap-2"><Plus className="w-4 h-4" />Add Label</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
