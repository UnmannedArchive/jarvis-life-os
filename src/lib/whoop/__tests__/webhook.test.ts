import crypto from 'crypto';
import { computeWhoopSignature, verifyWhoopSignature, parseWhoopEvent } from '../webhook';

const SECRET = 'test_client_secret';
const TIMESTAMP = '1718745600000';
const BODY = JSON.stringify({ user_id: 10129, id: 'abc', type: 'recovery.updated', trace_id: 't1' });

// Independently computed expectation (this is the formula WHOOP documents:
// base64(HMAC-SHA256(secret, timestamp + rawBody))).
const VALID_SIG = crypto.createHmac('sha256', SECRET).update(TIMESTAMP + BODY).digest('base64');

describe('computeWhoopSignature', () => {
  it('matches base64(HMAC-SHA256(secret, timestamp + body))', () => {
    expect(computeWhoopSignature(SECRET, TIMESTAMP, BODY)).toBe(VALID_SIG);
  });
});

describe('verifyWhoopSignature', () => {
  it('accepts a correctly signed payload', () => {
    expect(verifyWhoopSignature(SECRET, TIMESTAMP, BODY, VALID_SIG)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const tampered = BODY.replace('10129', '99999');
    expect(verifyWhoopSignature(SECRET, TIMESTAMP, tampered, VALID_SIG)).toBe(false);
  });

  it('rejects a wrong/garbage signature without throwing', () => {
    expect(verifyWhoopSignature(SECRET, TIMESTAMP, BODY, 'not-a-real-signature')).toBe(false);
  });

  it('rejects when signed with a different secret', () => {
    expect(verifyWhoopSignature('other_secret', TIMESTAMP, BODY, VALID_SIG)).toBe(false);
  });
});

describe('parseWhoopEvent', () => {
  it('extracts user_id and type from the payload', () => {
    expect(parseWhoopEvent(BODY)).toEqual({ userId: 10129, type: 'recovery.updated', id: 'abc' });
  });

  it('returns null for non-JSON', () => {
    expect(parseWhoopEvent('}{not json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseWhoopEvent(JSON.stringify({ type: 'recovery.updated' }))).toBeNull();
  });
});
