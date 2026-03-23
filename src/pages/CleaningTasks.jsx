import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Sparkles, Clock, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const EMPTY_FORM = { title: '', description: '', duration_minutes: '', during_mep: false };

export default function CleaningTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    const data = await db.entities.CleaningTask.list('-created_date');
    setTasks(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.title.trim()) return toast.error('Task title required');
    setSaving(true);
    const created = await db.entities.CleaningTask.create({ ...form, duration_minutes: Number(form.duration_minutes) || 10 });
    setTasks(prev => [created, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    toast.success('Task created!');
  }

  async function handleDelete(id) {
    await db.entities.CleaningTask.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditForm({ ...task });
  }

  async function saveEdit() {
    const saved = await db.entities.CleaningTask.update(editingId, { ...editForm, duration_minutes: Number(editForm.duration_minutes) || 10 });
    setTasks(prev => prev.map(t => t.id === editingId ? saved : t));
    setEditingId(null);
    setEditForm(null);
    toast.success('Task updated!');
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center dark:bg-blue-950/30">
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cleaning Tasks</h1>
            <p className="text-muted-foreground text-sm">{tasks.length} tasks configured</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5 space-y-4">
          <h3 className="font-semibold text-sm">New Cleaning Task</h3>
          <Input placeholder="Task title (e.g. Clean fryer)" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Duration (minutes)</label>
              <Input type="number" min={1} placeholder="10" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.during_mep} onChange={e => setForm(p => ({ ...p, during_mep: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">During MEP only</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">Check if this must be done during prep, not after service</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No cleaning tasks yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4">
              {editingId === task.id ? (
                <div className="space-y-3">
                  <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  <Textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Duration (minutes)</label>
                      <Input type="number" min={1} value={editForm.duration_minutes || ''} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.during_mep || false} onChange={e => setEditForm(p => ({ ...p, during_mep: e.target.checked }))} className="w-4 h-4 rounded" />
                        <span className="text-sm font-medium">During MEP only</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.during_mep && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full dark:bg-orange-900/30 dark:text-orange-300">MEP only</span>
                      )}
                      {!task.during_mep && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full dark:bg-blue-900/30 dark:text-blue-300">After service</span>
                      )}
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{task.duration_minutes || 10} min</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(task)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
