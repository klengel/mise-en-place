import { X, Clock, Users, Tag, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecipeDetailModal({ recipe, labels = [], onClose, onEdit }) {
  if (!recipe) return null;

  const label = labels.find(l => l.id === recipe.label_id);
  const totalTime = (recipe.steps || []).reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-xl">

        {/* Photo */}
        {recipe.photo_url ? (
          <div className="relative h-56 rounded-t-2xl overflow-hidden">
            <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative h-32 rounded-t-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-primary/30" />
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Title + meta */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold text-foreground">{recipe.name}</h2>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(recipe); }}>Edit</Button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-2">
              {recipe.category && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium">
                  {recipe.category}
                </span>
              )}
              {label && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ backgroundColor: label.color }}>
                  <Tag className="w-3 h-3 inline mr-1" />{label.name}
                </span>
              )}
              {recipe.base_portions && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" />{recipe.base_portions} portions
                </span>
              )}
              {totalTime > 0 && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />{totalTime} min
                </span>
              )}
            </div>

            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{recipe.description}</p>
            )}
          </div>

          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Ingredients</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-foreground min-w-[60px]">{ing.quantity} {ing.unit}</span>
                    <span className="text-muted-foreground">{ing.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {recipe.steps?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Preparation Steps</h3>
              <div className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{step.description}</p>
                      {step.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{step.duration_minutes} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plating */}
          {recipe.plating_instructions && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Plating</h3>
              <p className="text-sm text-muted-foreground">{recipe.plating_instructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
