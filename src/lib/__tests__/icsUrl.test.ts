import { normalizeIcsUrl } from '../icsUrl';

describe('normalizeIcsUrl', () => {
  it('accepts a Google secret iCal address', () => {
    const url =
      'https://calendar.google.com/calendar/ical/jas62030%40usc.edu/private-abc123/basic.ics';
    expect(normalizeIcsUrl(url)).toBe(url);
  });

  it('converts webcal:// to https://', () => {
    expect(normalizeIcsUrl('webcal://example.com/feed.ics')).toBe('https://example.com/feed.ics');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeIcsUrl('  https://example.com/a.ics \n')).toBe('https://example.com/a.ics');
  });

  it.each([
    ['plain http', 'http://example.com/a.ics'],
    ['not a url', 'definitely not a url'],
    ['empty', ''],
    ['file scheme', 'file:///etc/passwd'],
    ['localhost', 'https://localhost/a.ics'],
    ['loopback ip', 'https://127.0.0.1/a.ics'],
    ['private 10.x', 'https://10.0.0.5/a.ics'],
    ['private 192.168.x', 'https://192.168.1.1/a.ics'],
    ['private 172.16-31.x', 'https://172.20.0.1/a.ics'],
    ['link-local', 'https://169.254.169.254/latest/meta-data'],
    ['.local mdns', 'https://printer.local/a.ics'],
    ['ipv6 loopback', 'https://[::1]/a.ics'],
  ])('rejects %s', (_label, url) => {
    expect(normalizeIcsUrl(url)).toBeNull();
  });
});
