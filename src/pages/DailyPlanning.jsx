import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { Plus, Loader2, Wand2, Printer, Save, X, Clock, CheckSquare, Square, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateDailySchedule, generateCleaningSchedule, reviseDailySchedule } from '@/lib/gemini';
import ScheduleTimeline from '@/components/daily/ScheduleTimeline';
import RecipeSelectorModal from '@/components/daily/RecipeSelectorModal';
import { format } from 'date-fns';

function generateTaskId(task, index) {
  return `task-${index}-${task.task?.slice(0, 10)}`;
}

export default function DailyPlanning() {
  const [recipes, setRecipes] = useState([]);
  const [allCleaningTasks, setAllCleaningTasks] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [selectedCleaningIds, setSelectedCleaningIds] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [cleaningSchedule, setCleaningSchedule] = useState([]);
  const [settings, setSettings] = useState({ staff_count: 4, prep_start_time: '08:00', service_start_time: '12:00', service_end_time: '22:00', closing_time: '23:00', kitchen_name: '' });
  const [loading, setLoading] = useState(false);
  const [loadingCleaning, setLoadingCleaning] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [planDate, setPlanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [serviceToggles, setServiceToggles] = useState({});
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [showRevisePanel, setShowRevisePanel] = useState(false);
  const [revising, setRevising] = useState(false);
  const [showCleaningPanel, setShowCleaningPanel] = useState(true);
  const [cleaningFeasibilityWarning, setCleaningFeasibilityWarning] = useState(null);
  const [labels, setLabels] = useState([]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadPlanForDate(planDate); }, [planDate]);

  async function loadData() {
    const [s, ct, r, l] = await Promise.all([
      db.entities.KitchenSettings.filter({ is_default: true }),
      db.entities.CleaningTask.list(),
      db.entities.Recipe.list('-created_date', 100),
      db.entities.Label.list('name'),
    ]);
    if (s.length > 0) setSettings(prev => ({ ...prev, ...s[0] }));
    setAllCleaningTasks(ct);
    setRecipes(r);
    setLabels(l);
  }

  async function loadPlanForDate(date) {
    const plans = await db.entities.DailyPlan.filter({ plan_date: date });
    if (plans.length > 0) {
      const plan = plans[0];
      setSelectedDishes(plan.dishes || []);
      setSchedule(plan.schedule || []);
      setCleaningSchedule(plan.cleaning_schedule || []);
      setSelectedCleaningIds(plan.selected_cleaning_ids || []);
      setPresetName(plan.preset_name || '');
      setCompletedTaskIds([]);
      setShowRevisePanel(false);
    } else {
      setSelectedDishes([]);
      setSchedule([]);
      setCleaningSchedule([]);
      setSelectedCleaningIds([]);
      setPresetName('');
      setCompletedTaskIds([]);
      setShowRevisePanel(false);
    }
  }

  function addDish(recipe) {
    setSelectedDishes(prev => {
      if (prev.find(d => d.recipe_id === recipe.id)) return prev;
      return [...prev, { recipe_id: recipe.id, recipe_name: recipe.name, portions: 10, steps: recipe.steps, ingredients: recipe.ingredients, label_id: recipe.label_id }];
    });
    setShowRecipeSelector(false);
  }

  function removeDish(id) { setSelectedDishes(prev => prev.filter(d => d.recipe_id !== id)); }
  function updatePortions(id, val) { setSelectedDishes(prev => prev.map(d => d.recipe_id === id ? { ...d, portions: Number(val) } : d)); }

  function toggleCleaningTask(id) {
    setSelectedCleaningIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function handleGenerate() {
    if (selectedDishes.length === 0) return toast.error('Add at least one dish first');
    setLoading(true);
    try {
      const sched = await generateDailySchedule(selectedDishes, settings.staff_count, settings.prep_start_time, settings.service_start_time);
      const schedWithIds = sched.map((t, i) => ({ ...t, id: generateTaskId(t, i) }));

      // Add MEP cleaning tasks inline
      const mepCleaningTasks = allCleaningTasks.filter(t => t.during_mep && selectedCleaningIds.includes(t.id));
      const mepEntries = mepCleaningTasks.map((t, i) => ({
        id: `cleaning-mep-${t.id}`,
        task: t.title,
        dish: 'Cleaning (MEP)',
        start_time: settings.prep_start_time,
        end_time: settings.prep_start_time,
        staff_needed: 1,
        during_service: false,
        notes: t.description || '',
        is_cleaning: true,
        duration_minutes: t.duration_minutes || 10,
      }));

      setSchedule([...schedWithIds, ...mepEntries]);
      setCompletedTaskIds([]);
      setShowRevisePanel(false);
      toast.success('MEP schedule generated!');
    } catch (e) {
      toast.error('Failed to generate schedule. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCleaning() {
    const postServiceTasks = allCleaningTasks.filter(t => !t.during_mep && selectedCleaningIds.includes(t.id));
    if (postServiceTasks.length === 0) return toast.error('Select at least one after-service cleaning task');
    setLoadingCleaning(true);
    try {
      const result = await generateCleaningSchedule(postServiceTasks, settings.service_end_time, settings.closing_time, settings.staff_count);
      setCleaningSchedule(result.schedule || []);
      setCleaningFeasibilityWarning(result.feasibility_warning || null);
      if (result.feasibility_warning) {
        toast.warning(result.feasibility_warning);
      } else {
        toast.success('Cleaning schedule generated!');
      }
    } catch (e) {
      toast.error('Failed to generate cleaning schedule.');
    } finally {
      setLoadingCleaning(false);
    }
  }

  function toggleTaskComplete(taskId) {
    setCompletedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
    setShowRevisePanel(true);
  }

  async function handleRevise() {
    setRevising(true);
    try {
      const revised = await reviseDailySchedule(selectedDishes, completedTaskIds, schedule, settings.staff_count, settings.prep_start_time, settings.service_start_time);
      const revisedWithIds = revised.map((t, i) => ({ ...t, id: generateTaskId(t, i) }));
      const cleaningItems = schedule.filter(t => t.is_cleaning && !completedTaskIds.includes(t.id));
      setSchedule([...revisedWithIds, ...cleaningItems]);
      setShowRevisePanel(false);
      toast.success('Schedule revised!');
    } catch (e) {
      toast.error('Failed to revise schedule.');
    } finally {
      setRevising(false);
    }
  }

  async function savePreset() {
    if (!presetName.trim()) return toast.error('Enter a preset name');
    setSavingPreset(true);
    const existing = await db.entities.DailyPlan.filter({ plan_date: planDate });
    const payload = { plan_date: planDate, preset_name: presetName, dishes: selectedDishes, schedule, cleaning_schedule: cleaningSchedule, selected_cleaning_ids: selectedCleaningIds };
    if (existing.length > 0) { await db.entities.DailyPlan.update(existing[0].id, payload); }
    else { await db.entities.DailyPlan.create(payload); }
    setSavingPreset(false);
    toast.success('Plan saved!');
  }

  const prepTasks = schedule.filter(t => !t.during_service);
  const serviceTasks = schedule.filter(t => t.during_service);
  const mepCleaningTasks = allCleaningTasks.filter(t => t.during_mep);
  const postServiceCleaningTasks = allCleaningTasks.filter(t => !t.during_mep);

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-0">
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold">{settings.kitchen_name || 'Kitchen'} — Daily Mise en Place</h1>
        <p className="text-lg">{planDate} | Staff: {settings.staff_count} | Prep: {settings.prep_start_time} → Service: {settings.service_start_time}</p>
      </div>

      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Daily Planning</h1>
          <p className="text-muted-foreground text-sm">Build your mise en place & cleaning schedule</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      {/* Date + Settings */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Staff</label>
            <Input type="number" value={settings.staff_count} onChange={e => setSettings(p => ({ ...p, staff_count: Number(e.target.value) }))} className="w-20" min={1} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prep Start</label>
            <Input type="time" value={settings.prep_start_time} onChange={e => setSettings(p => ({ ...p, prep_start_time: e.target.value }))} className="w-32" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Start</label>
            <Input type="time" value={settings.service_start_time} onChange={e => setSettings(p => ({ ...p, service_start_time: e.target.value }))} className="w-32" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Service End</label>
            <Input type="time" value={settings.service_end_time} onChange={e => setSettings(p => ({ ...p, service_end_time: e.target.value }))} className="w-32" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Closing Time</label>
            <Input type="time" value={settings.closing_time} onChange={e => setSettings(p => ({ ...p, closing_time: e.target.value }))} className="w-32" />
          </div>
        </div>
      </div>

      {/* Dishes */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Dishes for Today</h2>
          <Button size="sm" variant="outline" onClick={() => setShowRecipeSelector(true)} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> Add Dish
          </Button>
        </div>
        {selectedDishes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">No dishes added yet</p>
        ) : (
          <div className="space-y-2">
            {selectedDishes.map(dish => {
              const label = labels.find(l => l.id === dish.label_id);
              return (
                <div key={dish.recipe_id} className="flex items-center gap-3 bg-accent/40 rounded-lg px-3 py-2">
                  {label && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} title={label.name} />}
                  <span className="flex-1 text-sm font-medium">{dish.recipe_name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Portions:</span>
                    <Input type="number" value={dish.portions} onChange={e => updatePortions(dish.recipe_id, e.target.value)} className="w-16 h-7 text-sm" min={1} />
                  </div>
                  <button onClick={() => removeDish(dish.recipe_id)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
        <Button onClick={handleGenerate} disabled={loading || selectedDishes.length === 0} className="mt-3 gap-2 w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Generate AI MEP Schedule
        </Button>
      </div>

      {/* Cleaning Tasks Selection */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 print:hidden">
        <button className="flex items-center justify-between w-full" onClick={() => setShowCleaningPanel(p => !p)}>
          <h2 className="font-semibold text-sm">Cleaning Tasks for Today</h2>
          {showCleaningPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showCleaningPanel && (
          <div className="mt-4 space-y-4">
            {mepCleaningTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">During MEP</p>
                <div className="space-y-2">
                  {mepCleaningTasks.map(task => (
                    <label key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                      <input type="checkbox" checked={selectedCleaningIds.includes(task.id)} onChange={() => toggleCleaningTask(task.id)} className="w-4 h-4 rounded" />
                      <span className="flex-1 text-sm">{task.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{task.duration_minutes || 10} min</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {postServiceCleaningTasks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">After Service</p>
                <div className="space-y-2">
                  {postServiceCleaningTasks.map(task => (
                    <label key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                      <input type="checkbox" checked={selectedCleaningIds.includes(task.id)} onChange={() => toggleCleaningTask(task.id)} className="w-4 h-4 rounded" />
                      <span className="flex-1 text-sm">{task.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{task.duration_minutes || 10} min</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {allCleaningTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No cleaning tasks configured. Add them in the Cleaning Tasks page.</p>
            )}

            <Button onClick={handleGenerateCleaning} disabled={loadingCleaning} variant="outline" className="w-full gap-2">
              {loadingCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate AI Cleaning Schedule
            </Button>

            {cleaningFeasibilityWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                ⚠️ {cleaningFeasibilityWarning}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MEP Schedule */}
      {schedule.length > 0 && (
        <div className="mb-5">
          <ScheduleTimeline
            prepTasks={prepTasks}
            serviceTasks={serviceTasks}
            serviceToggles={serviceToggles}
            onToggleService={(i) => setServiceToggles(prev => ({ ...prev, [i]: !prev[i] }))}
            completedTaskIds={completedTaskIds}
            onToggleComplete={toggleTaskComplete}
          />

          {showRevisePanel && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                {completedTaskIds.length} task{completedTaskIds.length !== 1 ? 's' : ''} marked as done
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">AI can revise the remaining schedule based on what's already completed.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRevise} disabled={revising} className="gap-2">
                  {revising ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Revise Schedule
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRevisePanel(false)}>Continue Without Revising</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cleaning Schedule */}
      {cleaningSchedule.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Post-Service Cleaning Schedule
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/50 dark:text-blue-300">{cleaningSchedule.length} tasks</span>
          </h3>
          <div className="space-y-2">
            {cleaningSchedule.map((task, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 print:break-inside-avoid">
                <div className="text-xs font-mono font-semibold text-muted-foreground w-24 shrink-0 pt-0.5">{task.start_time} – {task.end_time}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.task}</p>
                  {task.notes && <p className="text-xs text-muted-foreground mt-0.5">{task.notes}</p>}
                </div>
                {task.staff_needed > 0 && (
                  <span className="text-xs text-muted-foreground">{task.staff_needed} staff</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      {(schedule.length > 0 || cleaningSchedule.length > 0) && (
        <div className="flex gap-2 print:hidden">
          <Input placeholder="Plan name (e.g. Friday Dinner Service)" value={presetName} onChange={e => setPresetName(e.target.value)} className="flex-1" />
          <Button onClick={savePreset} disabled={savingPreset} variant="outline" className="gap-1.5">
            {savingPreset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Plan
          </Button>
        </div>
      )}

      {showRecipeSelector && (
        <RecipeSelectorModal recipes={recipes} labels={labels} onSelect={addDish} onClose={() => setShowRecipeSelector(false)} />
      )}
    </div>
  );
}
