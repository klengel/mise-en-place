# Mise en Place — AI Kitchen (Standalone)

A fully standalone kitchen planning app. No backend, no login needed.
Data is stored in your browser's localStorage.

## Setup

1. Install dependencies:
   npm install

2. Create a `.env.local` file:
   VITE_GEMINI_API_KEY=your_key_here

   Get a free key at: https://aistudio.google.com

3. Run the app:
   npm run dev

4. Open http://localhost:5173

## Deploy for free

   npm run build

Upload the `dist/` folder to:
- https://netlify.com (drag & drop)
- https://vercel.com
- https://pages.github.com

Set VITE_GEMINI_API_KEY in your hosting platform's environment variables.

## Features
- Recipe Library with AI plating suggestions
- Daily mise en place schedule generator
- Weekly planning board
- Cleaning task tracker
- Kitchen settings
