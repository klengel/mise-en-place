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
