import { useState } from 'react';
import { Pencil, Trash2, Sparkles, Clock, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePlatingSuggestion } from '@/lib/gemini';
import { toast } from 'sonner';

export default function RecipeCard({ recipe, labels = [], onEdit, onDelete, onPlatingSuggestion, onClick }) {
  const [loadingPlating, setLoadingPlating] = useState(false);
  const totalTime = (recipe.steps || []).reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const label = labels.find(l => l.id === recipe.label_id);

  async function handleAIPlating(e) {
    e.stopPropagation();
    setLoadingPlating(true);
    try {
      const suggestion = await generatePlatingSuggestion(recipe.name, recipe.ingredients || [], recipe.category);
      onPlatingSuggestion(suggestion);
    } catch {
      toast.error('Could not generate plating suggestion. Check your Gemini API key.');
    } finally {
      setLoadingPlating(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      {/* Photo */}
      {recipe.photo_url ? (
        <div className="h-36 overflow-hidden bg-muted">
          <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <ChefHat className="w-10 h-10 text-primary/20" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
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
            {recipe.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{recipe.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
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
          {totalTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalTime} min</span>}
          <span>{(recipe.ingredients || []).length} ingr.</span>
          <span>{(recipe.steps || []).length} steps</span>
        </div>

        <div className="pt-1 mt-auto" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={handleAIPlating} disabled={loadingPlating}>
            {loadingPlating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Plating
          </Button>
        </div>
      </div>
    </div>
  );
}
