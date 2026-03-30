import { db } from '@/lib/db';
import { useState, useEffect } from 'react';
import { Loader2, Upload, Wand2, Plus, Trash2, Save, X, Check, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { parseOrderList, linkIngredientsToDishes } from '@/lib/gemini';
import { format } from 'date-fns';

const UNITS = ['kg', 'g', 'l', 'ml', 'units', 'stuks', 'box', 'crate', 'bottle'];

const EMPTY_LINE = { ingredient_name: '', matched_ingredient_id: '', amount: '', unit: 'kg', cost_per_unit: '', total_cost: '', supplier_name: '', dish_links: [] };

function OrderLine({ line, index, ingredients, suppliers, recipes, onChange, onRemove }) {
  const matchedIng = ingredients.find(i => i.id === line.matched_ingredient_id);
  const total = line.amount && line.cost_per_unit ? (Number(line.amount) * Number(line.cost_per_unit)).toFixed(2) : line.total_cost || '';

  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-3 py-2">
        <Input value={line.ingredient_name} onChange={e => onChange(index, 'ingredient_name', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent focus-visible:ring-1 min-w-[130px]" placeholder="Ingredient..." />
      </td>
      <td className="px-2 py-2">
        <Select value={line.matched_ingredient_id || 'none'} onValueChange={v => onChange(index, 'matched_ingredient_id', v === 'none' ? '' : v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 min-w-[130px]">
            <SelectValue placeholder="Link to ingredient..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not linked</SelectItem>
            {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input type="number" value={line.amount} onChange={e => onChange(index, 'amount', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent focus-visible:ring-1 w-20" placeholder="0" />
      </td>
      <td className="px-2 py-2">
        <Select value={line.unit} onValueChange={v => onChange(index, 'unit', v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input type="number" value={line.cost_per_unit} onChange={e => onChange(index, 'cost_per_unit', e.target.value)}
          className="h-7 text-sm border-0 bg-transparent focus-visible:ring-1 w-24" placeholder="€0.00" />
      </td>
      <td className="px-2 py-2 text-sm text-muted-foreground text-right w-24">
        {total ? `€${total}` : '—'}
      </td>
      <td className="px-2 py-2 text-xs text-muted-foreground max-w-[140px] truncate">
        {(line.dish_links || []).join(', ') || '—'}
      </td>
      <td className="px-2 py-2">
        <button onClick={() => onRemove(index)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Form state
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [rawImport, setRawImport] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [notes, setNotes] = useState('');
  const [parsing, setParsing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [ords, ings, sups, recs] = await Promise.all([
      db.entities.Order.list('-created_date'),
      db.entities.Ingredient.list('name'),
      db.entities.Supplier.list('name'),
      db.entities.Recipe.list('name'),
    ]);
    setOrders(ords);
    setIngredients(ings);
    setSuppliers(sups);
    setRecipes(recs);
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file.name);
    const text = await file.text();
    setRawImport(text);
    toast.success('File loaded! Click "Parse with AI" to extract items.');
  }

  async function handleParseAI() {
    if (!rawImport.trim()) return toast.error('Paste or upload an order list first');
    setParsing(true);
    try {
      const parsed = await parseOrderList(rawImport, suppliers, ingredients);
      const newLines = parsed.map(item => ({
        ingredient_name: item.ingredient_name || '',
        matched_ingredient_id: ingredients.find(i => i.name.toLowerCase() === item.matched_ingredient_name?.toLowerCase())?.id || '',
        amount: item.amount || '',
        unit: item.unit || 'kg',
        cost_per_unit: item.cost_per_unit || '',
        total_cost: item.total_cost || '',
        supplier_name: item.supplier_name || '',
        dish_links: [],
        category: item.category || 'other',
      }));
      setLines(newLines);
      toast.success(`Extracted ${newLines.length} items from order list`);

      // Auto-link dishes
      setLinking(true);
      try {
        const dishLinks = await linkIngredientsToDishes(newLines, recipes);
        setLines(prev => prev.map(l => ({ ...l, dish_links: dishLinks[l.ingredient_name] || [] })));
        toast.success('Dishes linked automatically');
      } catch { /* silent fail */ }
      setLinking(false);
    } catch (e) {
      toast.error('AI parsing failed. Check your Gemini API key.');
    }
    setParsing(false);
  }

  function updateLine(index, key, value) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [key]: value } : l));
  }

  function removeLine(index) {
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }]);
  }

  const totalCost = lines.reduce((acc, l) => {
    if (l.amount && l.cost_per_unit) return acc + Number(l.amount) * Number(l.cost_per_unit);
    if (l.total_cost) return acc + Number(l.total_cost);
    return acc;
  }, 0);

  async function handleSubmit() {
    if (lines.length === 0) return toast.error('Add at least one line');
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      const payload = {
        order_date: orderDate,
        supplier_id: selectedSupplierId || null,
        supplier_name: supplier?.name || '',
        raw_import: rawImport,
        notes,
        lines,
        total_cost: totalCost,
        status: 'submitted',
      };
      const created = await db.entities.Order.create(payload);

      // Update stock for each linked ingredient
      for (const line of lines) {
        if (line.matched_ingredient_id && line.amount) {
          const ing = ingredients.find(i => i.id === line.matched_ingredient_id);
          if (ing) {
            const newStock = (ing.current_stock || 0) + Number(line.amount);
            await db.entities.Ingredient.update(ing.id, { current_stock: newStock });
            await db.entities.StockAdjustment.create({
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              change_amount: Number(line.amount),
              reason: 'order',
              reference_id: created.id,
            });
          }
        }
      }

      // Save to files
      await db.entities.DailyPlan.create; // no-op, just update local state
      setOrders(prev => [created, ...prev]);
      setShowForm(false);
      setLines([{ ...EMPTY_LINE }]);
      setRawImport('');
      setNotes('');
      setImportFile(null);
      toast.success('Order submitted! Stock levels updated.');

      // Reload ingredients
      const ings = await db.entities.Ingredient.list('name');
      setIngredients(ings);
    } catch (e) {
      toast.error('Failed to submit order: ' + e.message);
    }
    setSaving(false);
  }

  async function deleteOrder(id) {
    await db.entities.Order.delete(id);
    setOrders(prev => prev.filter(o => o.id !== id));
    toast.success('Order deleted');
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">Import order lists and update stock levels</p>
        </div>
        <Button onClick={() => setShowForm(p => !p)} className="gap-2">
          <Plus className="w-4 h-4" /> New Order
        </Button>
      </div>

      {/* New order form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-5">
          <h2 className="font-semibold">New Order</h2>

          {/* Header info */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Order Date</label>
              <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Supplier</label>
              <Select value={selectedSupplierId || 'none'} onValueChange={v => setSelectedSupplierId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Import section */}
          <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Import Order List (optional)</p>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg text-sm cursor-pointer hover:bg-accent/80 transition-colors">
                <Upload className="w-4 h-4" />
                {importFile ? importFile : 'Upload PDF / CSV / TXT'}
                <input type="file" accept=".pdf,.csv,.txt,.xlsx" onChange={handleFileUpload} className="hidden" />
              </label>
              <Button variant="outline" size="sm" onClick={handleParseAI} disabled={parsing || !rawImport} className="gap-2">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {linking ? 'Linking dishes...' : 'Parse with AI'}
              </Button>
            </div>
            <Textarea
              placeholder="Or paste order list text here (invoice, email, etc.)..."
              value={rawImport}
              onChange={e => setRawImport(e.target.value)}
              rows={4}
              className="text-sm font-mono"
            />
          </div>

          {/* Order lines table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Order Lines</p>
              <Button size="sm" variant="outline" onClick={addLine} className="gap-1.5 h-7 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground font-semibold">
                    <th className="text-left px-3 py-2">Ingredient</th>
                    <th className="text-left px-2 py-2">Link to inventory</th>
                    <th className="text-left px-2 py-2">Amount</th>
                    <th className="text-left px-2 py-2">Unit</th>
                    <th className="text-left px-2 py-2">Cost/unit</th>
                    <th className="text-right px-2 py-2">Total</th>
                    <th className="text-left px-2 py-2">Used in dishes</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <OrderLine key={i} line={line} index={i} ingredients={ingredients} suppliers={suppliers} recipes={recipes}
                      onChange={updateLine} onRemove={removeLine} />
                  ))}
                </tbody>
                {totalCost > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-right">Total:</td>
                      <td className="px-2 py-2 text-sm font-bold text-right">€{totalCost.toFixed(2)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit Order & Update Stock
            </Button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No orders yet. Create your first order above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">order</span>
                    <span className="text-xs text-muted-foreground">{order.order_date}</span>
                    {order.supplier_name && <span className="text-xs text-muted-foreground">· {order.supplier_name}</span>}
                    {order.total_cost > 0 && <span className="text-xs font-medium">· €{Number(order.total_cost).toFixed(2)}</span>}
                  </div>
                  <p className="font-medium text-sm mt-0.5">{(order.lines || []).length} items ordered</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); deleteOrder(order.id); }}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              {expandedOrder === order.id && (
                <div className="px-4 pb-4 border-t border-border overflow-x-auto">
                  <table className="w-full text-xs mt-3">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1 pr-4">Ingredient</th>
                        <th className="text-left py-1 pr-4">Amount</th>
                        <th className="text-left py-1 pr-4">Unit</th>
                        <th className="text-right py-1 pr-4">Cost/unit</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.lines || []).map((l, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="py-1.5 pr-4 font-medium">{l.ingredient_name}</td>
                          <td className="py-1.5 pr-4">{l.amount}</td>
                          <td className="py-1.5 pr-4">{l.unit}</td>
                          <td className="py-1.5 pr-4 text-right">{l.cost_per_unit ? `€${l.cost_per_unit}` : '—'}</td>
                          <td className="py-1.5 text-right">{l.amount && l.cost_per_unit ? `€${(l.amount * l.cost_per_unit).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
