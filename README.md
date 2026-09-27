# Project Rehearsal

Mobile-first AI flight simulator for delivery PMs.
One-tap rooms. Paste artefacts. No wizard.

Repo: https://github.com/paulmichaelaxisa/project-rehearsal

## On your phone (Grok Build)

I cannot publish a grok.me app from this chat. You publish it:

1. Open the Grok app → switch mode to **Build**.
2. Paste the prompt in `GROK_BUILD.md`.
3. When the preview works, tap **Publish**. You get a `*.grok.me` link you can open anytime.
4. Turn on SpaceXAI APIs in the app so the room can call Grok with no pasted key.

## Local server (laptop)

```bash
cp .env.example .env   # add XAI_API_KEY
node server.js
# phone on same Wi-Fi: http://LAPTOP_IP:8787
```

Do not commit `.env`.
