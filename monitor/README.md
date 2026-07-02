# Life OS — workflow collector

A small background script that records which Mac app + window you're using, so
the Life OS **Workflow** tab can show your most-productive hours. **No
screenshots. No network.** Data is written only to `~/.life-os-monitor/events.jsonl`.

## Setup (once)

```bash
cd monitor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
source .venv/bin/activate   # if not already active
python collector.py
```

Leave it running while you work. First launch will prompt for **Screen
Recording** permission (System Settings → Privacy & Security → Screen Recording)
— required to read window titles. Quit with Ctrl+C.

## Privacy / kill switch

- Only the frontmost app name + window title are recorded — never images.
- Stop the script and delete `~/.life-os-monitor/` to erase all data.
- You can also turn the whole feature off in Life OS → Settings.

## Config (env vars)

- `POLL_SECONDS` (default 20) — how often to sample.
- `IDLE_THRESHOLD` (default 120) — seconds of no input before time stops counting.
- `LIFE_OS_MONITOR_DIR` — override the data directory (used by tests).
