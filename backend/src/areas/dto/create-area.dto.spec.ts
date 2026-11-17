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

  it('accepts optional parentId, targetPageId and F5 personalization metadata', async () => {
    const dto = new CreateAreaDto();
    dto.section = SectionType.PROJETOS;
    dto.subSection = SubSectionType.ESTUDANDO;
    dto.nome = 'Subpágina';
    dto.categoria = 'Estratégia';
    dto.parentId = 'parent-area-id';
    dto.targetPageId = 'target-area-id';
    dto.coverAttachmentId = 'cover-att-id';
    dto.coverPosition = 75;
    dto.fullWidth = true;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('validates coverPosition range (0-100)', async () => {
    const validDto = new CreateAreaDto();
    validDto.section = SectionType.LINGUAGENS;
    validDto.subSection = SubSectionType.ESTUDANDO;
    validDto.nome = 'Valid';
    validDto.categoria = 'Valid';
    validDto.coverPosition = 0;
    await expect(validate(validDto)).resolves.toHaveLength(0);

    validDto.coverPosition = 100;
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const negativeDto = new CreateAreaDto();
    negativeDto.section = SectionType.LINGUAGENS;
    negativeDto.subSection = SubSectionType.ESTUDANDO;
    negativeDto.nome = 'Valid';
    negativeDto.categoria = 'Valid';
    negativeDto.coverPosition = -1;
    const errorsNegative = await validate(negativeDto);
    expect(errorsNegative.some((err) => err.property === 'coverPosition')).toBe(
      true,
    );

    const excessDto = new CreateAreaDto();
    excessDto.section = SectionType.LINGUAGENS;
    excessDto.subSection = SubSectionType.ESTUDANDO;
    excessDto.nome = 'Valid';
    excessDto.categoria = 'Valid';
    excessDto.coverPosition = 101;
    const errorsExcess = await validate(excessDto);
    expect(errorsExcess.some((err) => err.property === 'coverPosition')).toBe(
      true,
    );
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
    // Create a large JSON object > 50 MB (52,428,800 bytes)
    dto.conteudo = {
      type: 'doc',
      largeText: 'x'.repeat(50 * 1024 * 1024 + 100),
    };

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'conteudo')).toBe(true);
  });
});
