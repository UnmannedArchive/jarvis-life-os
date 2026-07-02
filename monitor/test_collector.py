import os
import tempfile
import unittest
from collector import SessionAccumulator, ensure_events_file


class TestSessionAccumulator(unittest.TestCase):
    def test_emits_session_when_app_changes(self):
        acc = SessionAccumulator(idle_threshold=120)
        self.assertEqual(acc.sample("Cursor", "a.ts", 1000, 0), [])
        self.assertEqual(acc.sample("Cursor", "a.ts", 1020, 0), [])
        closed = acc.sample("Chrome", "Gmail", 1040, 0)
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["app"], "Cursor")
        self.assertEqual(closed[0]["seconds"], 40)

    def test_idle_closes_session_without_counting_the_gap(self):
        acc = SessionAccumulator(idle_threshold=120)
        acc.sample("Cursor", "a.ts", 1000, 0)
        acc.sample("Cursor", "a.ts", 1020, 0)          # last active at 1020
        closed = acc.sample("Cursor", "a.ts", 1200, 300)  # idle 300s -> close
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["seconds"], 20)       # 1000..1020, gap excluded

    def test_flush_closes_the_open_session(self):
        acc = SessionAccumulator()
        acc.sample("Cursor", "a.ts", 1000, 0)
        acc.sample("Cursor", "a.ts", 1030, 0)
        closed = acc.flush(1030)
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["seconds"], 30)

    def test_session_dict_has_iso_timestamps(self):
        acc = SessionAccumulator()
        acc.sample("Cursor", "a.ts", 1000, 0)
        closed = acc.flush(1060)
        s = closed[0]
        self.assertIn("start", s)
        self.assertIn("end", s)
        self.assertTrue("T" in s["start"])  # ISO 8601


class TestEnsureEventsFile(unittest.TestCase):
    def test_creates_dir_and_empty_file_so_ui_sees_monitor_running(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = os.path.join(tmp, "monitor-data")
            os.environ["LIFE_OS_MONITOR_DIR"] = data_dir
            try:
                ensure_events_file()
                path = os.path.join(data_dir, "events.jsonl")
                self.assertTrue(os.path.exists(path))
                with open(path, "r", encoding="utf-8") as f:
                    self.assertEqual(f.read(), "")
            finally:
                del os.environ["LIFE_OS_MONITOR_DIR"]

    def test_does_not_truncate_existing_events(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ["LIFE_OS_MONITOR_DIR"] = tmp
            try:
                path = os.path.join(tmp, "events.jsonl")
                with open(path, "w", encoding="utf-8") as f:
                    f.write('{"app":"Cursor"}\n')
                ensure_events_file()
                with open(path, "r", encoding="utf-8") as f:
                    self.assertEqual(f.read(), '{"app":"Cursor"}\n')
            finally:
                del os.environ["LIFE_OS_MONITOR_DIR"]


if __name__ == "__main__":
    unittest.main()
