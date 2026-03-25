import { db } from '@/lib/db';
import { useState, useEffect } from 'react';
import { Loader2, Trash2, Printer, CalendarDays, Calendar, Sparkles, ClipboardList, FileText, Clock, Users } from 'lucide-react';
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

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

function DishDot({ color }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-[3px]"
      style={{ backgroundColor: color }}
    />
  );
}

function ScheduleRow({ task, dishColorMap, isCleaning }) {
  const color = dishColorMap?.[task.dish];
  const bgClass = isCleaning || task.is_cleaning
    ? 'bg-blue-50 border-blue-100'
    : task.during_service
    ? 'bg-amber-50 border-amber-100'
    : 'bg-card border-border/60';

  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg border ${bgClass}`}>
      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0 pt-0.5">
        {task.start_time} – {task.end_time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{task.task}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <DishDot color={color} />
          <span className="text-xs text-muted-foreground">{task.dish}</span>
          {task.staff_needed > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Users className="w-3 h-3" />{task.staff_needed}
            </span>
          )}
          {(isCleaning || task.is_cleaning) && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Cleaning</span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>}
      </div>
    </div>
  );
}

function DailyPreview({ file }) {
  const dishes = file.dishes || [];
  const schedule = file.schedule || [];
  const cleaningSchedule = file.cleaning_schedule || [];

  const dishColorMap = Object.fromEntries(
    dishes.map(d => [d.recipe_name, d.label_color]).filter(([, c]) => c)
  );

  const prepTasks = schedule.filter(t => !t.during_service).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const serviceTasks = schedule.filter(t => t.during_service);

  return (
    <div className="space-y-5 text-sm">
      {dishes.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Dishes</h3>
          <div className="flex flex-wrap gap-2">
            {dishes.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-accent/50 rounded-lg px-3 py-1.5">
                <DishDot color={d.label_color} />
                <span className="text-sm font-medium">{d.recipe_name}</span>
                <span className="text-xs text-muted-foreground">× {d.portions}</span>
                {d.deadline_time && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> by {d.deadline_time}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {prepTasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Mise en Place Schedule
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs">{prepTasks.length}</span>
          </h3>
          <div className="space-y-1.5">
            {prepTasks.map((task, i) => (
              <ScheduleRow key={i} task={task} dishColorMap={dishColorMap} />
            ))}
          </div>
        </div>
      )}

      {serviceTasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> During-Service Add-ons
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">{serviceTasks.length}</span>
          </h3>
          <div className="space-y-1.5">
            {serviceTasks.map((task, i) => (
              <ScheduleRow key={i} task={task} dishColorMap={dishColorMap} />
            ))}
          </div>
        </div>
      )}

      {cleaningSchedule.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Post-Service Cleaning
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">{cleaningSchedule.length}</span>
          </h3>
          <div className="space-y-1.5">
            {cleaningSchedule.map((task, i) => (
              <ScheduleRow key={i} task={task} dishColorMap={dishColorMap} isCleaning />
            ))}
          </div>
        </div>
      )}

      {schedule.length === 0 && cleaningSchedule.length === 0 && (
        <p className="text-muted-foreground text-sm">No schedule generated for this plan.</p>
      )}
    </div>
  );
}

function WeeklyPreview({ file }) {
  const days = file.days || {};
  const generatedSchedule = file.generated_schedule || {};

  const dishColorMap = Object.fromEntries(
    Object.values(days).flat().map(d => [d.recipe_name, d.label_color]).filter(([, c]) => c)
  );

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-3">Dishes by Day</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DAYS.filter(day => days[day]?.length > 0).map(day => (
            <div key={day} className="bg-accent/40 rounded-lg p-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">{DAY_LABELS[day].slice(0, 3).toUpperCase()}</p>
              <div className="space-y-1">
                {days[day].map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <DishDot color={d.label_color} />
                    <span className="text-xs font-medium truncate">{d.recipe_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">×{d.portions}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {DAYS.filter(day => generatedSchedule[day]?.length > 0).map(day => (
        <div key={day}>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {DAY_LABELS[day]}
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs">{generatedSchedule[day].length}</span>
          </h3>
          <div className="space-y-1.5">
            {generatedSchedule[day].map((task, i) => (
              <ScheduleRow key={i} task={task} dishColorMap={dishColorMap} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintPreviewModal({ file, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border print:hidden">
          <div>
            <h2 className="font-semibold">{file.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{file.created_date?.slice(0, 10)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-2">
          <h1 className="text-lg font-bold mb-4">{file.title}</h1>
          {file.type === 'daily' && <DailyPreview file={file} />}
          {file.type === 'weekly' && <WeeklyPreview file={file} />}
          {file.type === 'haccp' && (
            <p className="text-muted-foreground">Open the HACCP page to view and edit this record.</p>
          )}
          {file.type === 'cleaning' && (
            <p className="text-muted-foreground">Cleaning plan saved on {file.created_date?.slice(0, 10)}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
    } catch {
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
    } catch {
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
          <p className="text-sm text-muted-foreground/60 mt-1">Save a daily or weekly plan to see it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => {
            const allDishes = file.dishes || Object.values(file.days || {}).flat();
            const uniqueColors = [...new Map(allDishes.filter(d => d.label_color).map(d => [d.label_color, d])).values()].slice(0, 6);
            return (
              <div
                key={file.id}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[file.type] || 'bg-muted text-muted-foreground'}`}>
                      {file.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{file.created_date?.slice(0, 10)}</span>
                    <div className="flex items-center gap-1">
                      {uniqueColors.map((d, i) => (
                        <span key={i} className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.label_color }} />
                      ))}
                    </div>
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
            );
          })}
        </div>
      )}

      {previewFile && (
        <PrintPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
