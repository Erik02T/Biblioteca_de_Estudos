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

  it('rejects fields exceeding maximum allowed length', async () => {
    const dto = new CreateAreaDto();
    dto.section = SectionType.LINGUAGENS;
    dto.subSection = SubSectionType.ESTUDANDO;
    dto.nome = 'a'.repeat(256);
    dto.categoria = 'b'.repeat(256);
    dto.icone = 'c'.repeat(256);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'nome')).toBe(true);
    expect(errors.some((error) => error.property === 'categoria')).toBe(true);
    expect(errors.some((error) => error.property === 'icone')).toBe(true);
  });

  it('rejects editor JSON content exceeding maximum allowed size', async () => {
    const dto = new CreateAreaDto();
    dto.section = SectionType.LINGUAGENS;
    dto.subSection = SubSectionType.ESTUDANDO;
    dto.nome = 'Valid Name';
    dto.categoria = 'Valid Category';
    // Create a large JSON object > 1MB (1,048,576 bytes)
    dto.conteudo = { type: 'doc', largeText: 'x'.repeat(1024 * 1024 + 100) };

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'conteudo')).toBe(true);
  });
});
