"""Life OS workflow collector.

Samples the frontmost macOS app + window title and appends coalesced sessions
to ~/.life-os-monitor/events.jsonl. No screenshots, no network. The pure
SessionAccumulator is unit-tested; the capture functions are thin I/O.
"""

import json
import os
import time
from datetime import datetime, timezone

POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "20"))
IDLE_THRESHOLD = int(os.environ.get("IDLE_THRESHOLD", "120"))


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).astimezone().isoformat()


class SessionAccumulator:
    """Turns a stream of (app, title, ts, idle_seconds) samples into sessions.

    A session closes when the app/title changes, when idle exceeds the
    threshold (the idle gap is NOT counted), or on flush().
    """

    def __init__(self, idle_threshold: int = IDLE_THRESHOLD):
        self.idle_threshold = idle_threshold
        self.current = None  # dict: app, title, start, last_active

    def _close(self, end_epoch: float):
        c = self.current
        self.current = None
        seconds = max(0, round(end_epoch - c["start"]))
        return {
            "app": c["app"],
            "title": c["title"],
            "start": _iso(c["start"]),
            "end": _iso(end_epoch),
            "seconds": seconds,
        }

    def sample(self, app: str, title: str, ts: float, idle_seconds: float):
        closed = []
        if idle_seconds is not None and idle_seconds >= self.idle_threshold:
            if self.current is not None:
                closed.append(self._close(self.current["last_active"]))
            return closed

        if self.current is None:
            self.current = {"app": app, "title": title, "start": ts, "last_active": ts}
        elif app != self.current["app"] or title != self.current["title"]:
            closed.append(self._close(ts))
            self.current = {"app": app, "title": title, "start": ts, "last_active": ts}
        else:
            self.current["last_active"] = ts
        return closed

    def flush(self, ts: float):
        if self.current is None:
            return []
        return [self._close(ts)]


# ---- macOS capture (thin I/O; smoke-tested manually) ----

def monitor_dir() -> str:
    return os.environ.get("LIFE_OS_MONITOR_DIR") or os.path.join(
        os.path.expanduser("~"), ".life-os-monitor"
    )


def frontmost_app() -> str:
    try:
        from AppKit import NSWorkspace
        app = NSWorkspace.sharedWorkspace().frontmostApplication()
        return str(app.localizedName()) if app else "Unknown"
    except Exception:
        return "Unknown"


def frontmost_title() -> str:
    try:
        from Quartz import (
            CGWindowListCopyWindowInfo,
            kCGWindowListOptionOnScreenOnly,
            kCGNullWindowID,
        )
        from AppKit import NSWorkspace
        front = NSWorkspace.sharedWorkspace().frontmostApplication()
        pid = front.processIdentifier() if front else None
        windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
        for w in windows or []:
            if w.get("kCGWindowOwnerPID") == pid:
                name = w.get("kCGWindowName")
                if name:
                    return str(name)
        return ""
    except Exception:
        return ""


def idle_seconds() -> float:
    try:
        from Quartz import (
            CGEventSourceSecondsSinceLastEventType,
            kCGEventSourceStateHIDSystemState,
            kCGAnyInputEventType,
        )
        return float(CGEventSourceSecondsSinceLastEventType(
            kCGEventSourceStateHIDSystemState, kCGAnyInputEventType))
    except Exception:
        return 0.0


def append_session(session: dict) -> None:
    d = monitor_dir()
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "events.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(session) + "\n")


def run() -> None:
    acc = SessionAccumulator()
    print(f"Life OS collector running. Writing to {monitor_dir()}/events.jsonl")
    print(f"Polling every {POLL_SECONDS}s. Ctrl+C to stop.")
    try:
        while True:
            ts = time.time()
            for s in acc.sample(frontmost_app(), frontmost_title(), ts, idle_seconds()):
                append_session(s)
            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        for s in acc.flush(time.time()):
            append_session(s)
        print("\nStopped. Final session flushed.")


if __name__ == "__main__":
    run()
