# Psyop: Local LLM YouTube Agent

A background service that leverages a local Llama instance to autonomously generate search queries based on your interests and auto-play a selected video in Chromium.

It uses a systemd timer to do this every 30 minutes.

## Prerequisites

* **Node.js**: To run the agent logic.
* **Chromium Browser**: To watch the videos on a full YouTube interface.
* **Local LLM**: An OpenAI-compatible API endpoint running locally.

---

1. git clone

2. npm install

---

Fill `data.json`:

```json
{
    "interests": "90s FPS level design, esoteric philosophy, and stoner metal"
}
```

---

Run the local llama:

`llama-server -m /path/to/llama.gguf -c 32000 -ngl 99 --host 0.0.0.0 --port 8080`

---

Create the service file at `~/.config/systemd/user/psyop.service`.

Edit this to use the correct paths:

```ini
[Unit]
Description=Llama YouTube Scanner

[Service]
Type=oneshot
WorkingDirectory=/home/yo/code/psyop

# Tell systemd NOT to kill left-over child processes (Chromium) when Node exits
KillMode=process

# Run as your user so it has rights to the display session
User=yo

# Pass both the Display and the Authority file
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/yo/.Xauthority

ExecStart=/usr/bin/node /home/yo/code/psyop/scanner.js
```

Create the timer file at `~/.config/systemd/user/psyop.timer`:

```ini
[Unit]
Description=Run Llama YouTube Scanner every 30 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=30min

[Install]
WantedBy=timers.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now psyop.timer
```

(Note: If you want to trigger a run manually, use `systemctl --user start psyop.service`)