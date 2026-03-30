import { db } from '@/lib/db';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, Package, TrendingDown, ChevronDown, ChevronUp, Pencil, Trash2, Plus, Check, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { calculateAiMinStock } from '@/lib/gemini';

const UNITS = ['kg', 'g', 'l', 'ml', 'units', 'stuks', 'box', 'crate', 'bottle'];
const CATEGORIES = ['dairy', 'meat', 'fish', 'produce', 'dry goods', 'beverages', 'cleaning', 'other'];

function StockBar({ current, min, aiMin }) {
  const threshold = aiMin || min || 1;
  const pct = Math.min((current / (threshold * 2)) * 100, 100);
  const isLow = current <= threshold;
  const isVeryLow = current <= threshold * 0.5;

  const color = isVeryLow
    ? 'bg-red-500'
    : isLow
    ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className={`text-xs font-mono shrink-0 w-20 text-right ${isLow ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
        {current} / {threshold}
      </span>
      {isLow && <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />}
    </div>
  );
}

function IngredientRow({ ingredient, suppliers, onEdit, onDelete, onAiMin, loadingAiMin }) {
  const supplier = suppliers.find(s => s.id === ingredient.supplier_id);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 group">
      <div className="w-44 shrink-0">
        <p className="text-sm font-medium truncate">{ingredient.name}</p>
        <p className="text-xs text-muted-foreground">{ingredient.unit} · {ingredient.category || 'other'}</p>
      </div>
      <StockBar current={ingredient.current_stock} min={ingredient.min_stock} aiMin={ingredient.ai_suggested_min} />
      <div className="shrink-0 text-right w-28">
        {supplier && <p className="text-xs text-muted-foreground truncate">{supplier.name}</p>}
        {ingredient.ai_suggested_min && ingredient.ai_suggested_min !== ingredient.min_stock && (
          <p className="text-xs text-blue-500">AI: {ingredient.ai_suggested_min}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onAiMin(ingredient)} disabled={loadingAiMin === ingredient.id}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-blue-500" title="AI suggest min stock">
          {loadingAiMin === ingredient.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onEdit(ingredient)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(ingredient.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function EditIngredientModal({ ingredient, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: ingredient?.name || '',
    unit: ingredient?.unit || 'kg',
    category: ingredient?.category || 'other',
    supplier_id: ingredient?.supplier_id || '',
    current_stock: ingredient?.current_stock ?? 0,
    min_stock: ingredient?.min_stock ?? 0,
    cost_per_unit: ingredient?.cost_per_unit ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Name required');
    setSaving(true);
    const payload = { ...form, current_stock: Number(form.current_stock), min_stock: Number(form.min_stock), cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null, supplier_id: form.supplier_id || null };
    let saved;
    if (ingredient?.id) saved = await db.entities.Ingredient.update(ingredient.id, payload);
    else saved = await db.entities.Ingredient.create(payload);
    setSaving(false);
    onSaved(saved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{ingredient?.id ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Name</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Butter" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Unit</label>
              <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Supplier</label>
            <Select value={form.supplier_id || 'none'} onValueChange={v => setForm(p => ({ ...p, supplier_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="No supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Current Stock</label>
              <Input type="number" value={form.current_stock} onChange={e => setForm(p => ({ ...p, current_stock: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Min Stock</label>
              <Input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Cost / unit</label>
              <Input type="number" value={form.cost_per_unit} onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="€" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end p-5 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {ingredient?.id ? 'Save' : 'Add Ingredient'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SupplierPanel({ supplier, ingredients, onClose }) {
  const items = ingredients
    .filter(i => i.supplier_id === supplier.id)
    .sort((a, b) => {
      const aLow = a.current_stock <= (a.ai_suggested_min || a.min_stock);
      const bLow = b.current_stock <= (b.ai_suggested_min || b.min_stock);
      return bLow - aLow;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">{supplier.name}</h2>
            <p className="text-xs text-muted-foreground">{items.length} ingredients · {items.filter(i => i.current_stock <= (i.ai_suggested_min || i.min_stock)).length} running low</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No ingredients linked to this supplier</p>
          ) : items.map(ing => {
            const threshold = ing.ai_suggested_min || ing.min_stock || 1;
            const isLow = ing.current_stock <= threshold;
            const pct = Math.min((ing.current_stock / (threshold * 2)) * 100, 100);
            return (
              <div key={ing.id} className={`p-3 rounded-lg border ${isLow ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{ing.name}</span>
                  <span className={`text-xs font-mono ${isLow ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                    {ing.current_stock} / {threshold} {ing.unit}
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${ing.current_stock <= threshold * 0.5 ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                {isLow && <p className="text-xs text-red-600 mt-1 font-medium">⚠ Order more</p>}
                {ing.ai_suggested_min && ing.ai_suggested_min !== ing.min_stock && (
                  <p className="text-xs text-blue-500 mt-1">AI recommends min: {ing.ai_suggested_min} {ing.unit}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name'); // name | category | supplier | stock
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editIngredient, setEditIngredient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loadingAiMin, setLoadingAiMin] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', email: '', phone: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [ings, sups, recs, sales] = await Promise.all([
      db.entities.Ingredient.list('name'),
      db.entities.Supplier.list('name'),
      db.entities.Recipe.list('name'),
      db.entities.SalesRecord.list('-sale_date', 30),
    ]);
    setIngredients(ings);
    setSuppliers(sups);
    setRecipes(recs);
    setSalesHistory(sales);
    setLoading(false);
  }

  async function handleDelete(id) {
    await db.entities.Ingredient.delete(id);
    setIngredients(prev => prev.filter(i => i.id !== id));
    toast.success('Ingredient deleted');
  }

  function handleSaved(saved) {
    setIngredients(prev => {
      const exists = prev.find(i => i.id === saved.id);
      return exists ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved];
    });
    setShowEditModal(false);
    setEditIngredient(null);
    toast.success('Ingredient saved!');
  }

  async function handleAiMin(ingredient) {
    setLoadingAiMin(ingredient.id);
    try {
      const result = await calculateAiMinStock(ingredient, salesHistory, recipes);
      if (result) {
        const updated = await db.entities.Ingredient.update(ingredient.id, { ai_suggested_min: result.suggested_min });
        setIngredients(prev => prev.map(i => i.id === ingredient.id ? { ...i, ai_suggested_min: result.suggested_min } : i));
        toast.success(`AI suggests min: ${result.suggested_min} ${ingredient.unit} — ${result.reasoning}`);
      }
    } catch { toast.error('AI calculation failed'); }
    setLoadingAiMin(null);
  }

  async function addSupplier() {
    if (!supplierForm.name.trim()) return toast.error('Supplier name required');
    const created = await db.entities.Supplier.create(supplierForm);
    setSuppliers(prev => [...prev, created]);
    setSupplierForm({ name: '', contact: '', email: '', phone: '' });
    setShowSupplierForm(false);
    toast.success('Supplier added!');
  }

  const sorted = useMemo(() => {
    let list = [...ingredients];
    if (filterSupplier !== 'all') list = list.filter(i => i.supplier_id === filterSupplier);
    if (filterCategory !== 'all') list = list.filter(i => i.category === filterCategory);
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'category') list.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    else if (sortBy === 'supplier') list.sort((a, b) => {
      const sa = suppliers.find(s => s.id === a.supplier_id)?.name || '';
      const sb = suppliers.find(s => s.id === b.supplier_id)?.name || '';
      return sa.localeCompare(sb);
    });
    else if (sortBy === 'stock') list.sort((a, b) => {
      const aRatio = a.current_stock / Math.max(a.ai_suggested_min || a.min_stock, 1);
      const bRatio = b.current_stock / Math.max(b.ai_suggested_min || b.min_stock, 1);
      return aRatio - bRatio;
    });
    return list;
  }, [ingredients, suppliers, sortBy, filterSupplier, filterCategory]);

  const lowStockCount = ingredients.filter(i => i.current_stock <= (i.ai_suggested_min || i.min_stock)).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">
            {ingredients.length} ingredients · {lowStockCount > 0 && <span className="text-red-500 font-medium">{lowStockCount} running low</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSupplierForm(p => !p)}>Suppliers</Button>
          <Button size="sm" onClick={() => { setEditIngredient(null); setShowEditModal(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Ingredient
          </Button>
        </div>
      </div>

      {/* Supplier quick buttons */}
      {suppliers.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {suppliers.map(s => {
            const low = ingredients.filter(i => i.supplier_id === s.id && i.current_stock <= (i.ai_suggested_min || i.min_stock)).length;
            return (
              <button key={s.id} onClick={() => setSelectedSupplier(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors hover:bg-accent ${low > 0 ? 'border-red-300 text-red-600' : 'border-border text-muted-foreground'}`}>
                {s.name}
                {low > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{low}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Supplier form */}
      {showSupplierForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm">Add Supplier</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Contact person" value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} />
            <Input placeholder="Email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowSupplierForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addSupplier} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Add</Button>
          </div>
        </div>
      )}

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sort by..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="category">Sort: Category</SelectItem>
            <SelectItem value="supplier">Sort: Supplier</SelectItem>
            <SelectItem value="stock">Sort: Stock level</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All suppliers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredient list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No ingredients yet. Add your first ingredient or import an order.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="w-44 shrink-0">Ingredient</span>
            <span className="flex-1">Stock level (current / min)</span>
            <span className="w-28 text-right shrink-0">Supplier / AI</span>
            <span className="w-20 shrink-0" />
          </div>
          {sorted.map(ing => (
            <IngredientRow key={ing.id} ingredient={ing} suppliers={suppliers}
              onEdit={i => { setEditIngredient(i); setShowEditModal(true); }}
              onDelete={handleDelete}
              onAiMin={handleAiMin}
              loadingAiMin={loadingAiMin}
            />
          ))}
        </div>
      )}

      {showEditModal && (
        <EditIngredientModal ingredient={editIngredient} suppliers={suppliers} onClose={() => { setShowEditModal(false); setEditIngredient(null); }} onSaved={handleSaved} />
      )}
      {selectedSupplier && (
        <SupplierPanel supplier={selectedSupplier} ingredients={ingredients} onClose={() => setSelectedSupplier(null)} />
      )}
    </div>
  );
}
