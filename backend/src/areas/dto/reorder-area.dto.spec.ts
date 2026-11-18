import { validate } from 'class-validator';
import { ReorderAreaDto } from './reorder-area.dto';

describe('ReorderAreaDto', () => {
  it('accepts an empty payload', async () => {
    const dto = new ReorderAreaDto();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts beforeId and parentId', async () => {
    const dto = new ReorderAreaDto();
    dto.beforeId = 'target-id';
    dto.parentId = 'parent-id';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts afterId and null parentId', async () => {
    const dto = new ReorderAreaDto();
    dto.afterId = 'target-id';
    dto.parentId = null;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-string values', async () => {
    const dto = new ReorderAreaDto();
    const raw = dto as unknown as Record<string, unknown>;
    raw.beforeId = 123;

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'beforeId')).toBe(true);
  });
});
