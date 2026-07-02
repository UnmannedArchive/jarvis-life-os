import { parseICalFile } from '../icalParser';

function wrap(vevent: string): string {
  return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n${vevent}\nEND:VEVENT\nEND:VCALENDAR`;
}

describe('icalParser', () => {
  it('parses a basic timed event (existing behavior)', () => {
    const [ev] = parseICalFile(
      wrap('UID:a1\nSUMMARY:CS Lecture\nDTSTART:20260615T100000\nDTEND:20260615T110000')
    );
    expect(ev.summary).toBe('CS Lecture');
    expect(ev.start).toBe('2026-06-15T10:00:00');
    expect(ev.end).toBe('2026-06-15T11:00:00');
    expect(ev.allDay).toBe(false);
  });

  it('captures a single EXDATE as an ISO string', () => {
    const [ev] = parseICalFile(
      wrap(
        'UID:a2\nSUMMARY:Gym\nDTSTART:20260601T180000\nDTEND:20260601T190000\n' +
          'RRULE:FREQ=WEEKLY;BYDAY=MO\nEXDATE:20260608T180000'
      )
    );
    expect(ev.exdates).toEqual(['2026-06-08T18:00:00']);
  });

  it('captures multiple EXDATE lines and comma-separated values', () => {
    const [ev] = parseICalFile(
      wrap(
        'UID:a3\nSUMMARY:Standup\nDTSTART:20260601T090000\n' +
          'RRULE:FREQ=DAILY\n' +
          'EXDATE:20260603T090000,20260604T090000\n' +
          'EXDATE;TZID=America/Los_Angeles:20260610T090000'
      )
    );
    expect(ev.exdates).toEqual([
      '2026-06-03T09:00:00',
      '2026-06-04T09:00:00',
      '2026-06-10T09:00:00',
    ]);
  });

  it('returns an empty exdates array when none present', () => {
    const [ev] = parseICalFile(wrap('UID:a4\nSUMMARY:One-off\nDTSTART:20260620'));
    expect(ev.exdates).toEqual([]);
    expect(ev.allDay).toBe(true);
  });
});
