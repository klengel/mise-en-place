function getGeminiUrl() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
}

async function callGemini(prompt) {
  const res = await fetch(getGeminiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

export async function estimateStepTime(stepDescription, dishName) {
  const prompt = `You are a professional chef. Estimate the preparation time in minutes for this kitchen task: '${stepDescription}' for the dish '${dishName}'. Return only JSON: { "estimated_minutes": <number>, "reasoning": "<string>" }`;
  return callGemini(prompt);
}

export async function generatePlatingSuggestion(dishName, ingredients, category) {
  const ingredientList = ingredients.map(i => `${i.quantity || ''} ${i.unit || ''} ${i.name}`.trim()).join(', ');
  const prompt = `You are a Michelin-trained chef. Suggest a professional plating for this dish:\n- Name: ${dishName}\n- Ingredients: ${ingredientList}\n- Cuisine style: ${category || 'Contemporary'}\n\nReturn only JSON:\n{\n  "plate_type": "<string>",\n  "layout": "<string>",\n  "sauce_placement": "<string>",\n  "garnish": "<string>",\n  "finishing_touches": "<string>",\n  "visual_description": "<string>"\n}`;
  return callGemini(prompt);
}

export async function generateDailySchedule(dishes, staffCount, prepStart, serviceStart) {
  const dishList = dishes.map(d => {
    const steps = (d.steps || []).map(s => `${s.description} (${s.duration_minutes || 'TBD'} min)`).join('; ');
    return `${d.recipe_name} x${d.portions} portions — Steps: ${steps}`;
  }).join('\n');

  const prompt = `You are a professional kitchen planner. Generate a mise en place schedule:\n- Dishes:\n${dishList}\n- Staff: ${staffCount}\n- Prep start: ${prepStart}\n- Service start: ${serviceStart}\n\nReturn only a JSON array:\n[\n  {\n    "task": "<string>",\n    "dish": "<string>",\n    "start_time": "<HH:MM>",\n    "end_time": "<HH:MM>",\n    "staff_needed": <number>,\n    "during_service": <boolean>,\n    "notes": "<string>",\n    "is_cleaning": false\n  }\n]\nEnsure no task overlaps exceed staff capacity. Prioritize longest tasks first.`;
  return callGemini(prompt);
}

export async function generateCleaningSchedule(tasks, serviceEnd, closingTime, staffCount) {
  const taskList = tasks.map(t => `- ${t.title} (${t.duration_minutes || 10} min)${t.during_mep ? ' [DURING MEP ONLY]' : ''}`).join('\n');
  const totalMinutes = tasks.reduce((acc, t) => acc + (parseInt(t.duration_minutes) || 10), 0);
  const availableMinutes = (() => {
    const [sh, sm] = serviceEnd.split(':').map(Number);
    const [ch, cm] = closingTime.split(':').map(Number);
    return (ch * 60 + cm) - (sh * 60 + sm);
  })();

  const prompt = `You are a professional kitchen manager planning the post-service cleaning schedule.

Tasks to schedule:
${taskList}

- End of service: ${serviceEnd}
- Desired closing time: ${closingTime}
- Staff available for cleaning: ${staffCount}
- Total task time: ${totalMinutes} minutes
- Available time window: ${availableMinutes} minutes

Important rules:
- Tasks marked [DURING MEP ONLY] should NOT be included in this cleaning schedule
- Schedule tasks AFTER service ends (${serviceEnd}) and BEFORE closing time (${closingTime})
- If total task time exceeds available time, warn about it in a "feasibility_warning" field
- Assign multiple staff to tasks where it makes sense to save time
- Return only JSON:
{
  "feasibility_warning": "<string or null if feasible>",
  "schedule": [
    {
      "task": "<string>",
      "start_time": "<HH:MM>",
      "end_time": "<HH:MM>",
      "staff_needed": <number>,
      "notes": "<string>"
    }
  ]
}`;
  return callGemini(prompt);
}

export async function reviseDailySchedule(dishes, completedTaskIds, currentSchedule, staffCount, prepStart, serviceStart) {
  const remaining = currentSchedule.filter(t => !completedTaskIds.includes(t.id) && !t.is_cleaning);
  const completed = currentSchedule.filter(t => completedTaskIds.includes(t.id));

  const prompt = `You are a professional kitchen planner revising a mise en place schedule.

Already completed tasks:
${completed.map(t => `- ${t.task} (${t.dish})`).join('\n') || 'None'}

Remaining tasks to reschedule:
${remaining.map(t => `- ${t.task} (${t.dish}), originally ${t.start_time}-${t.end_time}, needs ${t.staff_needed} staff`).join('\n')}

- Staff available: ${staffCount}
- Current time reference: ${prepStart}
- Service start: ${serviceStart}

Revise and optimize the schedule for the remaining tasks. Return only a JSON array:
[
  {
    "task": "<string>",
    "dish": "<string>",
    "start_time": "<HH:MM>",
    "end_time": "<HH:MM>",
    "staff_needed": <number>,
    "during_service": <boolean>,
    "notes": "<string>",
    "is_cleaning": false
  }
]`;
  return callGemini(prompt);
}

export async function generateWeeklySchedule(days, settings) {
  const dayList = Object.entries(days)
    .filter(([, dishes]) => dishes && dishes.length > 0)
    .map(([day, dishes]) => {
      const dishList = dishes.map(d => {
        const deadline = d.deadline_time ? ` [ready by ${d.deadline_time}]` : '';
        return `  - ${d.recipe_name} x${d.portions} portions${deadline}`;
      }).join('\n');
      return `${day.toUpperCase()}:\n${dishList}`;
    }).join('\n\n');

  const prompt = `You are a professional kitchen planner. Generate a full weekly mise en place schedule.
Kitchen settings:
- Staff: ${settings.staff_count}
- Prep start each day: ${settings.prep_start_time}
- Service start each day: ${settings.service_start_time}

Weekly dishes:
${dayList}

Return only a JSON object where keys are day names (mon, tue, etc.) and values are arrays of schedule tasks:
{
  "mon": [{ "task": "<string>", "dish": "<string>", "start_time": "<HH:MM>", "end_time": "<HH:MM>", "staff_needed": <number>, "during_service": <boolean>, "notes": "<string>" }],
  "tue": [...],
  ...
}
Only include days that have dishes. Respect any deadline times marked [ready by HH:MM].`;
  return callGemini(prompt);
}

export async function parseOrderList(rawText, suppliers = [], knownIngredients = []) {
  const supplierNames = suppliers.map(s => s.name).join(', ') || 'unknown';
  const knownNames = knownIngredients.map(i => i.name).join(', ') || 'none';

  const prompt = `You are a professional kitchen manager parsing an order list or invoice.

Raw order text:
"""
${rawText}
"""

Known suppliers in the system: ${supplierNames}
Known ingredients in the system: ${knownNames}

Extract all ordered items and return ONLY a JSON array. For each item:
- Match ingredient names to known ingredients where possible (use exact name if match found)
- Guess the supplier from context if identifiable
- Parse amounts and units carefully (e.g. "5 kg", "2x1L", "10 stuks")
- Estimate cost_per_unit if total and amount are both visible

Return only JSON array:
[
  {
    "ingredient_name": "<string>",
    "matched_ingredient_name": "<string or null if no match>",
    "amount": <number>,
    "unit": "<kg|g|l|ml|units|stuks|box|crate>",
    "cost_per_unit": <number or null>,
    "total_cost": <number or null>,
    "supplier_name": "<string or null>",
    "category": "<dairy|meat|fish|produce|dry goods|beverages|cleaning|other>"
  }
]`;
  return callGemini(prompt);
}

export async function linkIngredientsToDishes(ingredients, recipes) {
  const recipeList = recipes.map(r => ({
    name: r.name,
    ingredients: (r.ingredients || []).map(i => i.name)
  }));

  const prompt = `You are a chef's assistant. For each ingredient below, identify which dishes (recipes) use it based on the recipe ingredient lists provided.

Ingredients to link:
${ingredients.map(i => `- ${i.ingredient_name}`).join('\n')}

Recipes and their ingredients:
${recipeList.map(r => `${r.name}: ${r.ingredients.join(', ')}`).join('\n')}

Return ONLY a JSON object where each key is an ingredient name and the value is an array of recipe names that use it:
{
  "ingredient_name": ["Recipe A", "Recipe B"],
  ...
}`;
  return callGemini(prompt);
}

export async function calculateAiMinStock(ingredient, salesHistory, recipes) {
  // Find recipes that use this ingredient
  const relevantRecipes = recipes.filter(r =>
    (r.ingredients || []).some(i => i.name?.toLowerCase().includes(ingredient.name?.toLowerCase()))
  );

  if (relevantRecipes.length === 0 || salesHistory.length === 0) return null;

  const recipeDetails = relevantRecipes.map(r => {
    const ing = (r.ingredients || []).find(i => i.name?.toLowerCase().includes(ingredient.name?.toLowerCase()));
    return `${r.name}: uses ${ing?.quantity || '?'} ${ing?.unit || ''} per ${r.base_portions || 1} portions`;
  }).join('\n');

  const salesSummary = salesHistory.slice(-30).map(s =>
    s.entries?.map(e => `${e.recipe_name}: ${e.portions_sold} portions`).join(', ')
  ).filter(Boolean).join('\n');

  const prompt = `You are a kitchen inventory manager. Calculate the recommended minimum stock level for this ingredient.

Ingredient: ${ingredient.name} (unit: ${ingredient.unit})
Current min stock set by user: ${ingredient.min_stock} ${ingredient.unit}

How it's used in recipes:
${recipeDetails}

Recent sales history (last 30 days):
${salesSummary || 'No sales data yet'}

Based on the sales patterns and recipe usage, what is the recommended minimum stock to always keep on hand (to cover ~1 week of average sales)?

Return ONLY JSON:
{
  "suggested_min": <number>,
  "reasoning": "<brief explanation>",
  "avg_weekly_usage": <number>
}`;
  return callGemini(prompt);
}