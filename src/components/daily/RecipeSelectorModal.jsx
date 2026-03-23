import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function RecipeSelectorModal({ recipes, labels = [], onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Select a Recipe</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map(recipe => {
            const label = labels.find(l => l.id === recipe.label_id);
            return (
              <button key={recipe.id} onClick={() => onSelect(recipe)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-3">
                {label && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{recipe.name}</p>
                  <p className="text-xs text-muted-foreground">{recipe.category}{label ? ` · ${label.name}` : ''}</p>
                </div>
                <span className="text-xs text-muted-foreground">{(recipe.steps || []).length} steps</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recipes found</p>}
        </div>
      </div>
    </div>
  );
}
