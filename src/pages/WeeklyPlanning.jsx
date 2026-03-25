import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { Plus, Printer, Save, Loader2, X, ChevronLeft, ChevronRight, Wand2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import RecipeSelectorModal from '@/components/daily/RecipeSelectorModal';
import { generateWeeklySchedule } from '@/lib/gemini';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export default function WeeklyPlanning() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  const [recipes, setRecipes] = useState([]);
  const [showSelector, setShowSelector] = useState(null);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [settings, setSettings] = useState({ staff_count: 4, prep_start_time: '08:00', service_start_time: '12:00' });
  const [expandedDay, setExpandedDay] = useState(null);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    db.entities.Recipe.list('-created_date', 100).then(setRecipes);
    db.entities.KitchenSettings.filter({ is_default: true }).then(s => {
      if (s.length > 0) setSettings(prev => ({ ...prev, ...s[0] }));
    });
  }, []);

  useEffect(() => { loadWeek(); }, [weekStart]);

  async function loadWeek() {
    const plans = await db.entities.WeeklyPlan.filter({ week_start: weekStartStr });
    if (plans.length > 0) {
      setPlanId(plans[0].id);
      setWeekDays(plans[0].days || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
      setGeneratedSchedule(plans[0].generated_schedule || null);
    } else {
      setPlanId(null);
      setWeekDays({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
      setGeneratedSchedule(null);
    }
  }

  function addDishToDay(day, recipe) {
    setWeekDays(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { recipe_id: recipe.id, recipe_name: recipe.name, portions: 10, deadline_time: '' }]
    }));
    setShowSelector(null);
  }

  function removeDishFromDay(day, recipeId) {
    setWeekDays(prev => ({ ...prev, [day]: (prev[day] || []).filter(d => d.recipe_id !== recipeId) }));
  }

  function updateDish(day, recipeId, field, val) {
    setWeekDays(prev => ({
      ...prev,
      [day]: (prev[day] || []).map(d => d.recipe_id === recipeId ? { ...d, [field]: val } : d)
    }));
  }

  async function handleGenerate() {
    const hasDishes = Object.values(weekDays).some(d => d && d.length > 0);
    if (!hasDishes) return toast.error('Add at least one dish to any day first');
    setGenerating(true);
    try {
      const result = await generateWeeklySchedule(weekDays, settings);
      setGeneratedSchedule(result);
      toast.success('Weekly schedule generated!');
    } catch {
      toast.error('Failed to generate schedule. Check your Gemini API key.');
    } finally {
      setGenerating(false);
    }
  }

  async function savePlan() {
    setSaving(true);
    const payload = { week_start: weekStartStr, preset_name: presetName || undefined, days: weekDays, generated_schedule: generatedSchedule };
    if (planId) {
      await db.entities.WeeklyPlan.update(planId, payload);
    } else {
      const created = await db.entities.WeeklyPlan.create(payload);
      setPlanId(created.id);
    }

    // Save to Files
    await db.entities.WeeklyPlan.create({
      title: `Weekly Plan — ${weekStartStr}${presetName ? ` (${presetName})` : ''}`,
      type: 'weekly',
      content: { weekStartStr, presetName, weekDays, generatedSchedule },
      file_date: weekStartStr,
    });

    setSaving(false);
    toast.success('Weekly plan saved to Files!');
  }

  const totalDishes = Object.values(weekDays).reduce((acc, day) => acc + (day?.length || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-0">
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Weekly Kitchen Plan — {weekStartStr}</h1>
      </div>

      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Weekly Planning</h1>
          <p className="text-muted-foreground text-sm">{totalDishes} dishes planned this week</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-sm">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-5">
        {DAYS.map((day, i) => {
          const date = addDays(weekStart, i);
          const dishes = weekDays[day] || [];
          const isExpanded = expandedDay === day;
          return (
            <div key={day} className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-[160px] print:min-h-[200px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-xs">{DAY_LABELS[day].slice(0, 3).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{format(date, 'MMM d')}</p>
                </div>
                <button
                  onClick={() => setShowSelector(day)}
                  className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center print:hidden"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
              <div className="flex-1 space-y-1">
                {dishes.map(dish => (
                  <div key={dish.recipe_id} className="bg-accent/50 rounded-md px-2 py-1 group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate flex-1">{dish.recipe_name}</span>
                      <button
                        onClick={() => removeDishFromDay(day, dish.recipe_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive print:hidden ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="flex gap-1 mt-1 print:hidden">
                        <Input
                          type="number"
                          value={dish.portions}
                          onChange={e => updateDish(day, dish.recipe_id, 'portions', Number(e.target.value))}
                          className="h-5 text-xs w-14 px-1"
                          placeholder="qty"
                          min={1}
                        />
                        <Input
                          type="time"
                          value={dish.deadline_time || ''}
                          onChange={e => updateDish(day, dish.recipe_id, 'deadline_time', e.target.value)}
                          className="h-5 text-xs flex-1 px-1"
                          title="Ready by time"
                        />
                      </div>
                    )}
                    {!isExpanded && dish.deadline_time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5" /> by {dish.deadline_time}
                      </p>
                    )}
                  </div>
                ))}
                {dishes.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center pt-4">No dishes</p>
                )}
              </div>
              {dishes.length > 0 && (
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground print:hidden"
                >
                  {isExpanded ? 'Done' : 'Edit portions & times'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Generate */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 print:hidden">
        <h2 className="font-semibold text-sm mb-3">Generate Weekly Schedule</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Staff</label>
            <Input type="number" value={settings.staff_count} onChange={e => setSettings(p => ({ ...p, staff_count: Number(e.target.value) }))} className="w-20 h-8" min={1} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Daily Prep Start</label>
            <Input type="time" value={settings.prep_start_time} onChange={e => setSettings(p => ({ ...p, prep_start_time: e.target.value }))} className="w-32 h-8" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Daily Service Start</label>
            <Input type="time" value={settings.service_start_time} onChange={e => setSettings(p => ({ ...p, service_start_time: e.target.value }))} className="w-32 h-8" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2 w-full">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Generate AI Weekly Schedule
        </Button>
      </div>

      {/* Generated Schedule */}
      {generatedSchedule && (
        <div className="mb-5 space-y-4">
          <h2 className="font-semibold">Generated Weekly Schedule</h2>
          {DAYS.filter(day => generatedSchedule[day]?.length > 0).map(day => (
            <div key={day} className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2">{DAY_LABELS[day]}</h3>
              <div className="space-y-1.5">
                {generatedSchedule[day].map((task, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="font-mono text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{task.start_time} – {task.end_time}</span>
                    <div className="flex-1">
                      <span className="font-medium">{task.task}</span>
                      {task.dish && task.dish !== task.task && <span className="text-muted-foreground ml-1">({task.dish})</span>}
                      {task.notes && <p className="text-xs text-muted-foreground">{task.notes}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{task.staff_needed} staff</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      <div className="flex gap-2 print:hidden">
        <Input placeholder="Plan name (optional)" value={presetName} onChange={e => setPresetName(e.target.value)} className="flex-1 max-w-xs" />
        <Button onClick={savePlan} disabled={saving} variant="outline" className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save to Files
        </Button>
      </div>

      {showSelector && (
        <RecipeSelectorModal
          recipes={recipes}
          onSelect={(recipe) => addDishToDay(showSelector, recipe)}
          onClose={() => setShowSelector(null)}
        />
      )}
    </div>
  );
}
