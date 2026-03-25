import { db } from '@/lib/db';
import { useState, useEffect } from 'react';
import { Loader2, Trash2, Printer, CalendarDays, Calendar, Sparkles, ClipboardList, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CATEGORIES = [
  { key: 'all', label: 'All Files', icon: FileText },
  { key: 'daily', label: 'Daily Plans', icon: CalendarDays },
  { key: 'weekly', label: 'Weekly Plans', icon: Calendar },
  { key: 'cleaning', label: 'Cleaning Plans', icon: Sparkles },
  { key: 'haccp', label: 'HACCP Records', icon: ClipboardList },
];

const TYPE_COLORS = {
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-purple-100 text-purple-700',
  cleaning: 'bg-green-100 text-green-700',
  haccp: 'bg-orange-100 text-orange-700',
};

function PrintPreviewModal({ file, onClose }) {
  const c = file.content;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border print:hidden">
          <h2 className="font-semibold">{file.title}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">✕</button>
          </div>
        </div>

        <div className="p-6 print:p-4 space-y-4 text-sm">
          <h1 className="text-xl font-bold print:text-2xl">{file.title}</h1>

          {file.type === 'daily' && (
            <>
              <p className="text-muted-foreground">
                Date: {file.plan_date} | Staff: {file.dishes?.[0]?.staff_count || '—'}
              </p>
              {file.dishes?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Dishes</h3>
                  {file.dishes.map((d, i) => (
                    <p key={i} className="text-muted-foreground">
                      • {d.recipe_name} × {d.portions}
                      {d.deadline_time ? ` — ready by ${d.deadline_time}` : ''}
                    </p>
                  ))}
                </div>
              )}
              {file.schedule?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">MEP Schedule</h3>
                  {file.schedule.map((t, i) => (
                    <div key={i} className="flex gap-3 py-1 border-b border-border/50 last:border-0">
                      <span className="font-mono text-xs w-24 shrink-0 text-muted-foreground pt-0.5">
                        {t.start_time} – {t.end_time}
                      </span>
                      <span className="flex-1">
                        {t.task} <span className="text-muted-foreground">({t.dish})</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{t.staff_needed} staff</span>
                    </div>
                  ))}
                </div>
              )}
              {file.cleaning_schedule?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Cleaning Schedule</h3>
                  {file.cleaning_schedule.map((t, i) => (
                    <div key={i} className="flex gap-3 py-1 border-b border-border/50 last:border-0">
                      <span className="font-mono text-xs w-24 shrink-0 text-muted-foreground">
                        {t.start_time} – {t.end_time}
                      </span>
                      <span className="flex-1">{t.task}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {file.type === 'weekly' && (
            <>
              <p className="text-muted-foreground">Week starting: {file.week_start}</p>
              {file.week_days && Object.entries(file.week_days).map(([day, dishes]) =>
                dishes?.length > 0 && (
                  <div key={day}>
                    <h3 className="font-semibold capitalize">{day}</h3>
                    {dishes.map((d, i) => (
                      <p key={i} className="text-muted-foreground ml-3">
                        • {d.recipe_name} × {d.portions}
                        {d.deadline_time ? ` — ready by ${d.deadline_time}` : ''}
                      </p>
                    ))}
                  </div>
                )
              )}
            </>
          )}

          {file.type === 'haccp' && (
            <p className="text-muted-foreground">
              HACCP record. Open the HACCP page to view and edit this record.
            </p>
          )}

          {file.type === 'cleaning' && (
            <p className="text-muted-foreground">
              Cleaning plan saved on {file.created_date?.slice(0, 10)}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Normalize raw DB rows into a consistent shape for the UI
function normalizeDailyPlan(row) {
  return {
    ...row,
    type: 'daily',
    title: row.preset_name
      ? `Daily Plan — ${row.plan_date} (${row.preset_name})`
      : `Daily Plan — ${row.plan_date}`,
    _entity: 'DailyPlan',
  };
}

function normalizeWeeklyPlan(row) {
  return {
    ...row,
    type: 'weekly',
    title: row.preset_name
      ? `Weekly Plan — ${row.week_start || row.created_date?.slice(0, 10)} (${row.preset_name})`
      : `Weekly Plan — ${row.week_start || row.created_date?.slice(0, 10)}`,
    _entity: 'WeeklyPlan',
  };
}

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => { loadFiles(); }, []);

  async function loadFiles() {
    setLoading(true);
    try {
      const [daily, weekly] = await Promise.all([
        db.entities.DailyPlan.list('-created_date'),
        db.entities.WeeklyPlan.list('-created_date'),
      ]);
      const all = [
        ...daily.map(normalizeDailyPlan),
        ...weekly.map(normalizeWeeklyPlan),
      ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setFiles(all);
    } catch (e) {
      toast.error('Failed to load files.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(file) {
    try {
      if (file._entity === 'WeeklyPlan') {
        await db.entities.WeeklyPlan.delete(file.id);
      } else {
        await db.entities.DailyPlan.delete(file.id);
      }
      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('File deleted');
    } catch (e) {
      toast.error('Failed to delete file.');
    }
  }

  const filtered = activeCategory === 'all'
    ? files
    : files.filter(f => f.type === activeCategory);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Files</h1>
        <p className="text-muted-foreground text-sm">All saved plannings and HACCP records</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className="text-xs opacity-70">
              ({key === 'all' ? files.length : files.filter(f => f.type === key).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No files saved yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Save a daily or weekly plan to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => (
            <div
              key={file.id}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[file.type] || 'bg-muted text-muted-foreground'}`}>
                    {file.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file.created_date?.slice(0, 10)}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{file.title}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setPreviewFile(file)}
                >
                  <Printer className="w-3.5 h-3.5" /> View & Print
                </Button>
                <button
                  onClick={() => deleteFile(file)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewFile && (
        <PrintPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
