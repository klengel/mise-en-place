import { useState } from 'react';
import { Pencil, Trash2, Sparkles, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePlatingSuggestion } from '@/lib/gemini';
import { toast } from 'sonner';

export default function RecipeCard({ recipe, labels = [], onEdit, onDelete, onPlatingSuggestion }) {
  const [loadingPlating, setLoadingPlating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const totalTime = (recipe.steps || []).reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const label = labels.find(l => l.id === recipe.label_id);

  async function handleAIPlating() {
    setLoadingPlating(true);
    try {
      const suggestion = await generatePlatingSuggestion(recipe.name, recipe.ingredients || [], recipe.category);
      onPlatingSuggestion(suggestion);
    } catch (e) {
      toast.error('Could not generate plating suggestion. Check your Gemini API key.');
    } finally {
      setLoadingPlating(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
              {recipe.category || 'Uncategorized'}
            </span>
            {label && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: label.color }}>
                {label.name}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground truncate">{recipe.name}</h3>
          {recipe.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{recipe.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {recipe.base_portions && <span className="font-medium text-foreground">{recipe.base_portions} portions</span>}
        {totalTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{totalTime} min</span>}
        <span>{(recipe.ingredients || []).length} ingredients</span>
        <span>{(recipe.steps || []).length} steps</span>
      </div>

      {expanded && (
        <div className="text-sm space-y-2 border-t border-border pt-3">
          {(recipe.ingredients || []).length > 0 && (
            <div>
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Ingredients</p>
              <ul className="space-y-0.5">
                {recipe.ingredients.slice(0, 5).map((ing, i) => (
                  <li key={i} className="text-foreground">{ing.quantity} {ing.unit} {ing.name}</li>
                ))}
                {recipe.ingredients.length > 5 && <li className="text-muted-foreground">+{recipe.ingredients.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={handleAIPlating} disabled={loadingPlating}>
          {loadingPlating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI Plating
        </Button>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
