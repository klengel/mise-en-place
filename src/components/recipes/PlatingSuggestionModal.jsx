import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlatingSuggestionModal({ suggestion, recipeName, onClose }) {
  const fields = [
    { label: 'Plate Type', key: 'plate_type' },
    { label: 'Layout', key: 'layout' },
    { label: 'Sauce Placement', key: 'sauce_placement' },
    { label: 'Garnish', key: 'garnish' },
    { label: 'Finishing Touches', key: 'finishing_touches' },
    { label: 'Visual Description', key: 'visual_description' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Plating Suggestion</h2>
              <p className="text-xs text-muted-foreground">{recipeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {fields.map(({ label, key }) => suggestion[key] && (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-foreground">{suggestion[key]}</p>
            </div>
          ))}
        </div>

        <div className="p-5 pt-0">
          <Button className="w-full" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}