import { errorStatus } from './errors';

describe('errorStatus', () => {
  it('reads a numeric status from any error that carries one', () => {
    expect(errorStatus(Object.assign(new Error('x'), { status: 404 }))).toBe(404);
  });

  it('returns undefined for errors without a status', () => {
    expect(errorStatus(new Error('network down'))).toBeUndefined();
    expect(errorStatus('nope')).toBeUndefined();
    expect(errorStatus(null)).toBeUndefined();
  });
});
