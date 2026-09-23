import { validate } from 'class-validator';
import { AttachmentType } from '@prisma/client';
import { CreateAttachmentDto } from './create-attachment.dto';

describe('CreateAttachmentDto', () => {
  it('rejects invalid URLs and non-UUID area ids', async () => {
    const dto = new CreateAttachmentDto();
    dto.tipo = AttachmentType.LINK;
    dto.url = 'javascript:alert(1)';
    dto.areaId = 'not-a-uuid';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'url')).toBe(true);
    expect(errors.some((error) => error.property === 'areaId')).toBe(true);
  });

  it('accepts a valid link payload', async () => {
    const dto = new CreateAttachmentDto();
    dto.tipo = AttachmentType.LINK;
    dto.url = 'https://example.com/notes';
    dto.areaId = '123e4567-e89b-42d3-a456-426614174000';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
