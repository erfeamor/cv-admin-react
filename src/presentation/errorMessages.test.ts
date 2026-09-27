import { describeWriteFailure } from './errorMessages';

const withStatus = (status: number, body: unknown = null) =>
  Object.assign(new Error(`Request failed with status ${status}`), { status, body });

describe('describeWriteFailure', () => {
  it('explains a 400 as a rejected entry, with the server detail when there is one', () => {
    expect(describeWriteFailure(withStatus(400), 'experience')).toBe(
      'The server rejected this experience as invalid (400). Check the required fields and dates.',
    );
    expect(describeWriteFailure(withStatus(400, { detail: 'startDate: must not be null' }), 'experience')).toBe(
      'The server rejected this experience as invalid (400): startDate: must not be null. Check the required fields and dates.',
    );
  });

  it('explains a 404 as an entry deleted elsewhere', () => {
    expect(describeWriteFailure(withStatus(404, 'Not found'), 'project')).toBe(
      'This project no longer exists — it was probably deleted elsewhere, so it has been removed from the list.',
    );
  });

  it('falls back to the error message for anything else', () => {
    expect(describeWriteFailure(new Error('Failed to fetch'), 'education entry')).toBe(
      'Could not save the education entry: Failed to fetch',
    );
    expect(describeWriteFailure(new Error('Failed to fetch'), 'project', 'delete')).toBe(
      'Could not delete the project: Failed to fetch',
    );
  });
});

describe('describeWriteFailure on create (review round 1, item 2)', () => {
  it('a 404 on create means the person is gone, not the row', () => {
    expect(describeWriteFailure(withStatus(404, 'Not found'), 'experience', 'create')).toBe(
      'This person no longer exists — it was probably deleted elsewhere, so the experience could not be saved.',
    );
  });

  it('a 404 on update keeps the edit-race message', () => {
    expect(describeWriteFailure(withStatus(404), 'experience', 'update')).toMatch(/^This experience no longer exists/);
  });
});
