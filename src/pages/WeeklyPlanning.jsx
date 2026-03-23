import { db } from "@/lib/db";

import { useState, useEffect } from 'react';

import { Plus, Printer, Save, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import RecipeSelectorModal from '@/components/daily/RecipeSelectorModal';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export default function WeeklyPlanning() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  const [recipes, setRecipes] = useState([]);
  const [showSelector, setShowSelector] = useState(null); // which day key
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState(null);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    db.entities.Recipe.list('-created_date', 100).then(setRecipes);
  }, []);

  useEffect(() => {
    loadWeek();
  }, [weekStart]);

  async function loadWeek() {
    const plans = await db.entities.WeeklyPlan.filter({ week_start: weekStartStr });
    if (plans.length > 0) {
      setPlanId(plans[0].id);
      setWeekDays(plans[0].days || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    } else {
      setPlanId(null);
      setWeekDays({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }
  }

  function addDishToDay(day, recipe) {
    setWeekDays(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { recipe_id: recipe.id, recipe_name: recipe.name, portions: 10 }]
    }));
    setShowSelector(null);
  }

  function removeDishFromDay(day, recipeId) {
    setWeekDays(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter(d => d.recipe_id !== recipeId)
    }));
  }

  async function savePlan() {
    setSaving(true);
    const payload = { week_start: weekStartStr, preset_name: presetName || undefined, days: weekDays };
    if (planId) {
      await db.entities.WeeklyPlan.update(planId, payload);
    } else {
      const created = await db.entities.WeeklyPlan.create(payload);
      setPlanId(created.id);
    }
    setSaving(false);
    toast.success('Weekly plan saved!');
  }

  const totalDishes = Object.values(weekDays).reduce((acc, day) => acc + (day?.length || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-0">
      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Weekly Kitchen Plan — {weekStartStr}</h1>
      </div>

      {/* Header */}
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
                  <div key={dish.recipe_id} className="flex items-center justify-between bg-accent/50 rounded-md px-2 py-1 group">
                    <span className="text-xs font-medium truncate flex-1">{dish.recipe_name}</span>
                    <span className="text-xs text-muted-foreground mr-1">×{dish.portions}</span>
                    <button
                      onClick={() => removeDishFromDay(day, dish.recipe_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive print:hidden"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {dishes.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center pt-4">No dishes</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex gap-2 print:hidden">
        <Input placeholder="Preset name (optional)" value={presetName} onChange={e => setPresetName(e.target.value)} className="flex-1 max-w-xs" />
        <Button onClick={savePlan} disabled={saving} variant="outline" className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Week
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