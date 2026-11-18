import { validate } from 'class-validator';
import { DuplicateAreaDto } from './duplicate-area.dto';

describe('DuplicateAreaDto', () => {
  it('accepts an empty payload', async () => {
    const dto = new DuplicateAreaDto();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts includeChildren and parentId', async () => {
    const dto = new DuplicateAreaDto();
    dto.includeChildren = true;
    dto.parentId = 'parent-id';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-boolean includeChildren and non-string parentId', async () => {
    const dto = new DuplicateAreaDto();
    const raw = dto as unknown as Record<string, unknown>;
    raw.includeChildren = 'yes';
    raw.parentId = 123;

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'includeChildren')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'parentId')).toBe(true);
  });
});
