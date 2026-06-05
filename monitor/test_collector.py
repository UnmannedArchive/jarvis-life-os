import unittest
from collector import SessionAccumulator


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


if __name__ == "__main__":
    unittest.main()
