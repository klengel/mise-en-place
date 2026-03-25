import { Clock, Users, CheckCircle2, Circle } from 'lucide-react';

// Build a color map from dishes: { recipe_name -> label color }
function buildDishColorMap(dishes = []) {
  const map = {};
  for (const d of dishes) {
    if (d.recipe_name && d.label_color) {
      map[d.recipe_name] = d.label_color;
    }
  }
  return map;
}

function DishDot({ color }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ backgroundColor: color }}
    />
  );
}

function TaskRow({ task, isService, toggled, onToggle, completed, onToggleComplete, dishColor }) {
  const bgClass = completed
    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800 opacity-60'
    : task.is_cleaning
    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
    : isService
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    : 'bg-card border-border';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgClass} print:break-inside-avoid transition-colors`}>
      {onToggleComplete && !task.is_cleaning && (
        <button onClick={() => onToggleComplete(task.id)} className="mt-0.5 shrink-0">
          {completed
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Circle className="w-5 h-5 text-muted-foreground" />}
        </button>
      )}
      <div className="text-xs font-mono font-semibold text-muted-foreground w-24 shrink-0 pt-0.5">
        {task.start_time} – {task.end_time}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-foreground ${completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.task}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <DishDot color={dishColor} />
          <span className="text-xs text-muted-foreground">{task.dish}</span>
          {task.staff_needed > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Users className="w-3 h-3" />{task.staff_needed}
            </span>
          )}
          {task.is_cleaning && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full dark:bg-blue-900/50 dark:text-blue-300">
              Cleaning
            </span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
      </div>
      {isService && (
        <button
          onClick={() => onToggle()}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            toggled
              ? 'bg-primary text-primary-foreground'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
          }`}
        >
          {toggled ? 'On' : 'Off'}
        </button>
      )}
    </div>
  );
}

export default function ScheduleTimeline({
  prepTasks,
  serviceTasks,
  serviceToggles,
  onToggleService,
  completedTaskIds = [],
  onToggleComplete,
  dishes = [], // pass selectedDishes here so we can get label colors
}) {
  const sorted = [...prepTasks].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const dishColorMap = buildDishColorMap(dishes);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Mise en Place Tasks
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{sorted.length}</span>
          {onToggleComplete && (
            <span className="text-xs text-muted-foreground ml-auto">Click circle to mark done</span>
          )}
        </h3>
        <div className="space-y-2">
          {sorted.map((task, i) => (
            <TaskRow
              key={task.id || i}
              task={task}
              isService={false}
              completed={completedTaskIds.includes(task.id)}
              onToggleComplete={onToggleComplete}
              dishColor={dishColorMap[task.dish]}
            />
          ))}
        </div>
      </div>

      {serviceTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            During-Service Add-ons
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full dark:bg-amber-900/50 dark:text-amber-300">
              {serviceTasks.length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Toggle on/off as needed.</p>
          <div className="space-y-2">
            {serviceTasks.map((task, i) => (
              <TaskRow
                key={task.id || i}
                task={task}
                isService
                toggled={serviceToggles[i]}
                onToggle={() => onToggleService(i)}
                completed={completedTaskIds.includes(task.id)}
                onToggleComplete={onToggleComplete}
                dishColor={dishColorMap[task.dish]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
