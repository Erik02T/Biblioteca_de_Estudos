import { validate } from 'class-validator';
import { SectionType, SubSectionType } from '@prisma/client';
import { CreateAreaDto } from './create-area.dto';

describe('CreateAreaDto', () => {
  it('rejects invalid enum values and empty required strings', async () => {
    const dto = new CreateAreaDto();
    dto.section = 'INVALID' as SectionType;
    dto.subSection = 'INVALID' as SubSectionType;
    dto.nome = '';
    dto.categoria = '';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'section')).toBe(true);
    expect(errors.some((error) => error.property === 'subSection')).toBe(true);
    expect(errors.some((error) => error.property === 'nome')).toBe(true);
    expect(errors.some((error) => error.property === 'categoria')).toBe(true);
  });

  it('accepts a valid area payload', async () => {
    const dto = new CreateAreaDto();
    dto.section = SectionType.LINGUAGENS;
    dto.subSection = SubSectionType.ESTUDANDO;
    dto.nome = 'TypeScript';
    dto.categoria = 'Frontend';
    dto.nivelEntendimento = 4;
    dto.conteudo = { type: 'doc', content: [] };

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
