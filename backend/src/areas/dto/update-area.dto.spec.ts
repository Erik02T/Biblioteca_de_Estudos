import { validate } from 'class-validator';
import { UpdateAreaDto } from './update-area.dto';

describe('UpdateAreaDto', () => {
  it('accepts a valid ISO date string for updatedAt', async () => {
    const dto = Object.assign(new UpdateAreaDto(), {
      updatedAt: '2026-11-05T12:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid updatedAt string', async () => {
    const dto = Object.assign(new UpdateAreaDto(), {
      updatedAt: 'not-a-date',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'updatedAt')).toBe(true);
  });
});
