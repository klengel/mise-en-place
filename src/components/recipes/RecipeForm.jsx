import { db } from "@/lib/db";
import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { estimateStepTime } from '@/lib/gemini';
import { toast } from 'sonner';

const CATEGORIES = ['Starters', 'Mains', 'Sides', 'Desserts', 'Sauces', 'Salads', 'Other'];

export default function RecipeForm({ recipe, labels = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    name: recipe?.name || '',
    category: recipe?.category || '',
    base_portions: recipe?.base_portions || '',
    description: recipe?.description || '',
    plating_instructions: recipe?.plating_instructions || '',
    label_id: recipe?.label_id || '',
    ingredients: recipe?.ingredients || [{ name: '', quantity: '', unit: '' }],
    steps: recipe?.steps || [{ description: '', duration_minutes: '' }],
  });
  const [estimatingStep, setEstimatingStep] = useState(null);
  const [lastEstimate, setLastEstimate] = useState(0);

  function updateField(key, value) { setForm(prev => ({ ...prev, [key]: value })); }
  function updateIngredient(i, key, val) { updateField('ingredients', form.ingredients.map((ing, idx) => idx === i ? { ...ing, [key]: val } : ing)); }
  function addIngredient() { updateField('ingredients', [...form.ingredients, { name: '', quantity: '', unit: '' }]); }
  function removeIngredient(i) { updateField('ingredients', form.ingredients.filter((_, idx) => idx !== i)); }
  function updateStep(i, key, val) { updateField('steps', form.steps.map((s, idx) => idx === i ? { ...s, [key]: val } : s)); }
  function addStep() { updateField('steps', [...form.steps, { description: '', duration_minutes: '' }]); }
  function removeStep(i) { updateField('steps', form.steps.filter((_, idx) => idx !== i)); }

  async function estimateTime(i) {
    const secondsSinceLast = (Date.now() - lastEstimate) / 1000;
    if (secondsSinceLast < 5) {
      toast.error(`Wait ${Math.ceil(5 - secondsSinceLast)}s before estimating again.`);
      return;
    }
    setLastEstimate(Date.now());
    if (!form.steps[i].description) return toast.error('Enter a step description first');
    setEstimatingStep(i);
    try {
      const result = await estimateStepTime(form.steps[i].description, form.name || 'Unknown dish');
      updateStep(i, 'duration_minutes', result.estimated_minutes);
      toast.success(`Estimated: ${result.estimated_minutes} min`);
    } catch (err) { 
      const msg = err?.message?.includes('429') 
        ? 'AI rate limit reached — wait a minute and try again.' 
        : 'Could not estimate time. Check your Gemini API key.';
      toast.error(msg);
    }
    finally { setEstimatingStep(null); }
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Recipe name is required');

    const payload = {
      ...form,
      label_id: form.label_id || null,
      base_portions: form.base_portions !== '' ? Number(form.base_portions) : null,
      ingredients: form.ingredients.filter(i => i.name.trim()),
      steps: form.steps.filter(s => s.description.trim()).map(s => ({ ...s, duration_minutes: s.duration_minutes ? Number(s.duration_minutes) : null }))
    };

    // Optimistic update — close immediately with a temporary record
    const optimistic = {
      ...payload,
      id: recipe?.id || `temp_${Date.now()}`,
      created_date: recipe?.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    onSaved(optimistic);

    // Save to Supabase in the background
    try {
      let saved;
      if (recipe?.id) { saved = await db.entities.Recipe.update(recipe.id, payload); }
      else { saved = await db.entities.Recipe.create(payload); }
      // Replace the optimistic record with the real one (gets the proper UUID)
      onSaved(saved);
    } catch {
      toast.error('Failed to save recipe. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{recipe ? 'Edit Recipe' : 'New Recipe'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1 block">Recipe Name *</label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Braised Short Rib" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Base Portions</label>
              <Input value={form.base_portions} onChange={e => updateField('base_portions', e.target.value)} placeholder="e.g. 4" type="number" min="1" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => updateField('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Label</label>
              <Select value={form.label_id || 'none'} onValueChange={v => updateField('label_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No label" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No label</SelectItem>
                  {labels.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Ingredients</label>
              <Button size="sm" variant="outline" onClick={addIngredient} className="gap-1 h-7 text-xs"><Plus className="w-3.5 h-3.5" /> Add</Button>
            </div>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} placeholder="Qty" className="w-20" />
                  <Input value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} placeholder="Unit" className="w-24" />
                  <Input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient name" className="flex-1" />
                  <button onClick={() => removeIngredient(i)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Preparation Steps</label>
              <Button size="sm" variant="outline" onClick={addStep} className="gap-1 h-7 text-xs"><Plus className="w-3.5 h-3.5" /> Add Step</Button>
            </div>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium mt-2 shrink-0">{i + 1}</div>
                  <Input value={step.description} onChange={e => updateStep(i, 'description', e.target.value)} placeholder="Step description..." className="flex-1" />
                  <div className="flex items-center gap-1">
                    <Input value={step.duration_minutes} onChange={e => updateStep(i, 'duration_minutes', e.target.value)} placeholder="min" type="number" className="w-20" />
                    <button onClick={() => estimateTime(i)} disabled={estimatingStep === i} className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="AI estimate time">
                      {estimatingStep === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={() => removeStep(i)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground mt-0.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Plating Instructions (optional)</label>
            <Textarea value={form.plating_instructions} onChange={e => updateField('plating_instructions', e.target.value)} placeholder="How to plate this dish..." rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="min-w-[100px]">
            {recipe ? 'Save Changes' : 'Create Recipe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
