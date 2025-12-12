# Nzeru AI - AI-Powered Literature Review Generator

A modern web application that helps students and researchers generate comprehensive literature reviews by automatically retrieving and synthesizing relevant academic literature based on a research topic and optional objectives.

## 🚀 Features

- **AI-Powered Literature Search**: Multi-source search (arXiv, OpenAlex, Crossref, Semantic Scholar)
- **Smart Synthesis**: Uses Groq + LangChain to generate structured literature reviews
- **Objectives-Aware**: Optionally pass research objectives to shape the review
- **Library Sidebar**: Chat-like history panel to search, open, delete and clear past reviews
- **Save & Export**: Save reviews to local library and download as text
- **Pricing & Payments**: Pro/Enterprise plans with Intasend integration
- **Authentication Gate**: Generator dashboard available to signed-in/premium users only
- **Responsive UI**: Modern, accessible design with smooth animations

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python, FastAPI
- **AI**: Groq Cloud (Llama 3 via `langchain-groq`), LangChain
- **Search**: arXiv, OpenAlex, Crossref, Semantic Scholar
- **Payments**: Intasend (test mode fallback if keys not present)

## 📁 Project Structure

```
Vibe_Hackhon/
├── index.html              # Landing page
├── generator.html          # Generator dashboard (auth gated)
├── pricing.html            # Pricing and subscription
├── contact.html            # Contact page
├── styles.css              # Global styles
├── generator.css           # Generator styles (app shell + library)
├── pricing.css             # Pricing page styles
├── contact.css             # Contact page styles
├── script.js               # Landing interactions
├── generator.js            # Generator logic + library + auth gate
├── pricing.js              # Billing toggle + Intasend payment flow
├── contact.js              # Contact form validation
├── app.py                  # FastAPI server + AI endpoints + payment endpoint
├── ai_agent.py             # AI agent (search + synthesis)
├── requirements.txt        # Python dependencies
├── start_server.py         # Convenience server launcher
├── env.example             # Environment variables template
└── README.md               # This file
```

## 🔐 Authentication (client-side gate)

- The generator page checks local storage keys to decide access:
  - `nzeru_is_authenticated` or `nzeru_is_premium` set to `true` allows access
  - A “Sign out” button clears session keys and returns to the landing page
- You can plug this into a real auth provider later and set these flags after login

## 💳 Payments (Intasend)

- `pricing.html` includes a modal checkout; the backend endpoint `/api/process-payment` handles payment
- If `INTASEND_API_KEY` is missing, the backend simulates a successful payment (test mode)
- On success, the app sets `nzeru_is_premium=true` in local storage and redirects to the generator

## 📚 Library Sidebar

- Chat-like sidebar on the generator page that lists past reviews stored in `localStorage`
- Functions:
  - **New chat**: resets the form and starts a fresh conversation
  - **Search**: filters stored reviews by topic or content
  - **Open**: loads a stored review back into the main viewer
  - **Delete/Clear All**: manage stored items

## ✍️ Usage

1. Copy env file and add keys
   ```bash
   cp env.example .env
   # Edit .env and add:
   # GROQ_API_KEY, optional INTASEND_API_KEY (for live payments)
   ```
2. Install dependencies and run
   ```bash
   pip install -r requirements.txt
   python start_server.py
   # or
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```
3. Open the app
   - Visit `http://127.0.0.1:8000`
   - Use “Get Started” to open the generator
4. Generator
   - Enter a research topic and (optionally) objectives
   - Click Generate → review appears with sources
   - Save to Library, Download, or Share
5. Pricing & upgrade
   - Visit Pricing → choose a plan → complete payment (or simulated if no keys)
   - Premium access is enabled for the browser session

## 🔧 Configuration

Set these variables in `.env` (see `env.example`):

```
GROQ_API_KEY="..."
INTASEND_API_KEY="..."                 # optional for live payments
INTASEND_PUBLISHABLE_KEY="..."        # optional for live payments
HOST=0.0.0.0
PORT=8000
```

## 🧪 Notes & Extensibility

- Replace the client-side auth flags with a real auth system (e.g., Supabase/Auth0)
- Persist library items server-side to sync across devices
- Add PDF/Word exports and citation style options (APA/MLA/Chicago)
- Swap or add models by updating `ai_agent.py`

## 🐛 Troubleshooting

- If Python 3.13 wheels fail for older versions, use the pinned versions in `requirements.txt`
- If payments fail in dev, ensure keys are set; otherwise the app uses test mode
- Cross-origin: FastAPI has CORS enabled for common localhost ports

## 📄 License

MIT
