export interface ICalEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  recurrence: string | null;
  status: string | null;
  organizer: string | null;
  created: string | null;
}

function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

function parseICalDate(value: string): { iso: string; allDay: boolean } {
  const cleaned = value.replace(/^.*:/, '');

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.slice(6, 8);
    return { iso: `${y}-${m}-${d}`, allDay: true };
  }

  // DateTime: YYYYMMDDTHHmmSSZ or YYYYMMDDTHHmmSS
  if (/^\d{8}T\d{6}/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.slice(6, 8);
    const hh = cleaned.slice(9, 11);
    const mm = cleaned.slice(11, 13);
    const ss = cleaned.slice(13, 15);
    const isUtc = cleaned.endsWith('Z');
    return {
      iso: `${y}-${m}-${d}T${hh}:${mm}:${ss}${isUtc ? 'Z' : ''}`,
      allDay: false,
    };
  }

  return { iso: cleaned, allDay: false };
}

function unescapeValue(val: string): string {
  return val
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function getPropertyValue(lines: string[], propName: string): string | null {
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith(propName.toUpperCase() + ':') || upper.startsWith(propName.toUpperCase() + ';')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return null;
      return unescapeValue(line.slice(colonIdx + 1).trim());
    }
  }
  return null;
}

function getDateProperty(lines: string[], propName: string): { iso: string; allDay: boolean } | null {
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith(propName.toUpperCase() + ':') || upper.startsWith(propName.toUpperCase() + ';')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return null;
      return parseICalDate(line.slice(colonIdx + 1).trim());
    }
  }
  return null;
}

function extractVEvents(lines: string[]): string[][] {
  const events: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === 'BEGIN:VEVENT') {
      current = [];
    } else if (line.toUpperCase() === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      current.push(line);
    }
  }

  return events;
}

export function parseICalFile(content: string): ICalEvent[] {
  const lines = unfoldLines(content);
  const eventBlocks = extractVEvents(lines);

  return eventBlocks
    .map((block) => {
      const uid = getPropertyValue(block, 'UID') || crypto.randomUUID();
      const summary = getPropertyValue(block, 'SUMMARY') || '(No title)';
      const description = getPropertyValue(block, 'DESCRIPTION');
      const location = getPropertyValue(block, 'LOCATION');
      const status = getPropertyValue(block, 'STATUS');
      const organizer = getPropertyValue(block, 'ORGANIZER');
      const created = getPropertyValue(block, 'CREATED');
      const rrule = getPropertyValue(block, 'RRULE');

      const startParsed = getDateProperty(block, 'DTSTART');
      const endParsed = getDateProperty(block, 'DTEND');

      if (!startParsed) return null;

      const allDay = startParsed.allDay;
      const start = startParsed.iso;
      const end = endParsed?.iso || start;

      return {
        uid,
        summary,
        description,
        location,
        start,
        end,
        allDay,
        recurrence: rrule,
        status,
        organizer,
        created,
      };
    })
    .filter((e): e is ICalEvent => e !== null);
}

export function getCalendarName(content: string): string | null {
  const lines = unfoldLines(content);
  return getPropertyValue(lines, 'X-WR-CALNAME');
}
