import { db } from '@/lib/db';
import { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, ShoppingBag, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SalesPage() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState([]);
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [recs, ings, sales] = await Promise.all([
      db.entities.Recipe.list('name'),
      db.entities.Ingredient.list('name'),
      db.entities.SalesRecord.list('-sale_date', 20),
    ]);
    setRecipes(recs);
    setIngredients(ings);
    setSalesHistory(sales);
    setLoading(false);

    // Pre-populate with all recipes at 0
    setEntries(recs.map(r => ({ recipe_id: r.id, recipe_name: r.name, portions_sold: '', ingredients: r.ingredients || [], base_portions: r.base_portions || 1 })));
  }

  function updatePortions(recipeId, val) {
    setEntries(prev => prev.map(e => e.recipe_id === recipeId ? { ...e, portions_sold: val } : e));
  }

  // Calculate ingredient deductions
  function calculateDeductions() {
    const deductions = {};
    for (const entry of entries) {
      const portions = Number(entry.portions_sold) || 0;
      if (portions === 0) continue;
      const multiplier = portions / (entry.base_portions || 1);
      for (const ing of (entry.ingredients || [])) {
        const matched = ingredients.find(i => i.name.toLowerCase() === ing.name?.toLowerCase());
        if (matched && ing.quantity) {
          deductions[matched.id] = (deductions[matched.id] || { ingredient: matched, total: 0 });
          deductions[matched.id].total += Number(ing.quantity) * multiplier;
        }
      }
    }
    return Object.values(deductions);
  }

  const deductions = calculateDeductions();
  const soldEntries = entries.filter(e => Number(e.portions_sold) > 0);

  async function handleSave() {
    if (soldEntries.length === 0) return toast.error('Enter at least one dish sold');
    setSaving(true);
    try {
      // Save sales record
      const record = await db.entities.SalesRecord.create({
        sale_date: saleDate,
        entries: soldEntries.map(e => ({ recipe_id: e.recipe_id, recipe_name: e.recipe_name, portions_sold: Number(e.portions_sold) })),
        notes,
      });

      // Deduct from stock
      for (const ded of deductions) {
        const newStock = Math.max((ded.ingredient.current_stock || 0) - ded.total, 0);
        await db.entities.Ingredient.update(ded.ingredient.id, { current_stock: newStock });
        await db.entities.StockAdjustment.create({
          ingredient_id: ded.ingredient.id,
          ingredient_name: ded.ingredient.name,
          change_amount: -ded.total,
          reason: 'sale',
          reference_id: record.id,
        });
        // Update local state
        setIngredients(prev => prev.map(i => i.id === ded.ingredient.id ? { ...i, current_stock: newStock } : i));
      }

      setSalesHistory(prev => [record, ...prev]);
      setEntries(prev => prev.map(e => ({ ...e, portions_sold: '' })));
      setNotes('');
      toast.success(`Sales registered! ${deductions.length} ingredient${deductions.length !== 1 ? 's' : ''} deducted from stock.`);
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground text-sm">Register portions sold — automatically updates stock</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(p => !p)} className="gap-1.5">
          <History className="w-4 h-4" /> History
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Date</label>
            <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-44" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Portions sold per dish</p>
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.recipe_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="flex-1 text-sm font-medium">{entry.recipe_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">portions sold:</span>
                  <Input
                    type="number"
                    min={0}
                    value={entry.portions_sold}
                    onChange={e => updatePortions(entry.recipe_id, e.target.value)}
                    className="w-20 h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {deductions.length > 0 && (
          <div className="border border-border rounded-lg p-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stock will be deducted:</p>
            <div className="space-y-1">
              {deductions.map(d => (
                <div key={d.ingredient.id} className="flex items-center justify-between text-sm">
                  <span>{d.ingredient.name}</span>
                  <span className="text-red-600 font-medium">−{d.total.toFixed(2)} {d.ingredient.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

        <Button onClick={handleSave} disabled={saving || soldEntries.length === 0} className="w-full gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Sales & Update Stock
        </Button>
      </div>

      {/* History */}
      {showHistory && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent Sales</h2>
          {salesHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No sales recorded yet</p>
          ) : salesHistory.map(record => (
            <div key={record.id} className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">sales</span>
                <span className="text-xs text-muted-foreground">{record.sale_date}</span>
              </div>
              <div className="space-y-1">
                {(record.entries || []).map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{e.recipe_name}</span>
                    <span className="text-muted-foreground">{e.portions_sold} portions</span>
                  </div>
                ))}
              </div>
              {record.notes && <p className="text-xs text-muted-foreground mt-2">{record.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
