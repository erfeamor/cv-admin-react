import { errorDetail, errorStatus } from './errors';

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

describe('errorDetail', () => {
  it('reads a text body or a detail/message field, ignoring bare status boilerplate', () => {
    expect(errorDetail(Object.assign(new Error(), { body: 'Not found' }))).toBe('Not found');
    expect(errorDetail(Object.assign(new Error(), { body: { detail: 'startDate must not be null' } }))).toBe(
      'startDate must not be null',
    );
    expect(errorDetail(Object.assign(new Error(), { body: { message: 'bad date' } }))).toBe('bad date');
    expect(errorDetail(Object.assign(new Error(), { body: { status: 400, error: 'Bad Request' } }))).toBeUndefined();
    expect(errorDetail(new Error('x'))).toBeUndefined();
  });
});
