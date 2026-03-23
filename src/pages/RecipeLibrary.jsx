import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { Plus, Search, ChefHat, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RecipeCard from '@/components/recipes/RecipeCard';
import RecipeForm from '@/components/recipes/RecipeForm';
import PlatingSuggestionModal from '@/components/recipes/PlatingSuggestionModal';
import LabelManager from '@/components/recipes/LabelManager';

const CATEGORIES = ['All', 'Starters', 'Mains', 'Sides', 'Desserts', 'Sauces', 'Salads', 'Other'];

export default function RecipeLibrary() {
  const [recipes, setRecipes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filterLabel, setFilterLabel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [platingSuggestion, setPlatingSuggestion] = useState(null);
  const [platingSuggestionRecipe, setPlatingSuggestionRecipe] = useState(null);
  const [showLabelManager, setShowLabelManager] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [r, l] = await Promise.all([
      db.entities.Recipe.list('-created_date'),
      db.entities.Label.list('name'),
    ]);
    setRecipes(r);
    setLabels(l);
    setLoading(false);
  }

  const filtered = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || r.category === category;
    const matchLabel = filterLabel === 'all' || r.label_id === filterLabel || (filterLabel === 'none' && !r.label_id);
    return matchSearch && matchCat && matchLabel;
  });

  function openEdit(recipe) { setEditRecipe(recipe); setShowForm(true); }
  function openNew() { setEditRecipe(null); setShowForm(true); }

  async function handleDelete(id) {
    await db.entities.Recipe.delete(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  }

  function handleSaved(recipe) {
    setRecipes(prev => {
      const exists = prev.find(r => r.id === recipe.id);
      return exists ? prev.map(r => r.id === recipe.id ? recipe : r) : [recipe, ...prev];
    });
    setShowForm(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipe Library</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{recipes.length} recipes saved</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLabelManager(true)} className="gap-2">Labels</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />New Recipe</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setFilterLabel('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterLabel === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-accent'}`}>
          All Labels
        </button>
        <button onClick={() => setFilterLabel('none')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterLabel === 'none' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-accent'}`}>
          No Label
        </button>
        {labels.map(label => (
          <button key={label.id} onClick={() => setFilterLabel(label.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterLabel === label.id ? 'text-white border-transparent' : 'border-border hover:opacity-80'}`}
            style={filterLabel === label.id ? { backgroundColor: label.color } : { borderColor: label.color, color: label.color }}>
            {label.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ChefHat className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No recipes found</p>
          <Button variant="outline" className="mt-3" onClick={openNew}>Add your first recipe</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} labels={labels}
              onEdit={() => openEdit(recipe)}
              onDelete={() => handleDelete(recipe.id)}
              onPlatingSuggestion={(suggestion) => { setPlatingSuggestionRecipe(recipe); setPlatingSuggestion(suggestion); }}
            />
          ))}
        </div>
      )}

      {showForm && <RecipeForm recipe={editRecipe} labels={labels} onClose={() => setShowForm(false)} onSaved={handleSaved} />}
      {platingSuggestion && <PlatingSuggestionModal suggestion={platingSuggestion} recipeName={platingSuggestionRecipe?.name} onClose={() => { setPlatingSuggestion(null); setPlatingSuggestionRecipe(null); }} />}
      {showLabelManager && <LabelManager labels={labels} onClose={() => setShowLabelManager(false)} onChange={setLabels} />}
    </div>
  );
}
