import {
  AttachmentType,
  PrismaClient,
  SectionType,
  SubSectionType,
} from '@prisma/client';

const prisma = new PrismaClient();

type EnumTest = {
  label: string;
  run: () => Promise<unknown>;
};

async function mustReject({ label, run }: EnumTest) {
  try {
    await run();
    throw new Error(`${label}: invalid value was accepted.`);
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('invalid value was accepted.')) {
      throw error;
    }

    console.log(`OK  ${label}: Prisma rejected the invalid value.`);
  }
}

async function main() {
  const runId = crypto.randomUUID();
  const userId = `phase-1-validation-${runId}`;
  let areaId: string | undefined;

  try {
    // 1. Creates an Area and an Attachment related to it.
    const area = await prisma.area.create({
      data: {
        userId,
        section: SectionType.PROJETOS,
        subSection: SubSectionType.ESTUDANDO,
        nome: `Phase 1 test area ${runId}`,
        categoria: 'Phase 1 validation',
        conteudo: {},
      },
    });
    areaId = area.id;

    const attachment = await prisma.attachment.create({
      data: {
        areaId: area.id,
        tipo: AttachmentType.LINK,
        url: 'https://example.com/phase-1-validation',
        nome: 'Validation link',
      },
    });

    console.log(`OK  creation: Area ${area.id} and Attachment ${attachment.id} created.`);

    // 2. The casts deliberately bypass TypeScript to validate the runtime guard.
    await mustReject({
      label: 'SectionType',
      run: () =>
        prisma.area.create({
          data: {
            userId,
            section: 'INVALID_SECTION' as never,
            subSection: SubSectionType.ESTUDANDO,
            nome: 'Must not be created',
            categoria: 'Teste',
          },
        }),
    });
    await mustReject({
      label: 'SubSectionType',
      run: () =>
        prisma.area.create({
          data: {
            userId,
            section: SectionType.PROJETOS,
            subSection: 'INVALID_SUBSECTION' as never,
            nome: 'Must not be created',
            categoria: 'Teste',
          },
        }),
    });
    await mustReject({
      label: 'AttachmentType',
      run: () =>
        prisma.attachment.create({
          data: {
            areaId: area.id,
            tipo: 'INVALID_ATTACHMENT' as never,
            url: 'https://example.com/invalid',
          },
        }),
    });
    await mustReject({
      label: 'nivelEntendimento range constraint',
      run: () =>
        prisma.area.create({
          data: {
            userId,
            section: SectionType.PROJETOS,
            subSection: SubSectionType.ESTUDANDO,
            nome: 'Must not be created',
            categoria: 'Test',
            nivelEntendimento: 6,
          },
        }),
    });

    // 3. Deleting the Area must remove its Attachment through onDelete: Cascade.
    await prisma.area.delete({ where: { id: area.id } });
    areaId = undefined;

    const attachmentsRemaining = await prisma.attachment.count({
      where: { id: attachment.id },
    });
    if (attachmentsRemaining !== 0) {
      throw new Error(
        `Cascade failed: ${attachmentsRemaining} related Attachment(s) still exist.`,
      );
    }

    console.log('OK  cascade: Area was deleted and no related Attachment remains.');
    console.log('\nPhase 1 validated successfully.');
  } finally {
    // Avoids leaving test data if any check fails before the delete.
    if (areaId) {
      await prisma.area.delete({ where: { id: areaId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\nPhase 1 validation failed:');
  console.error(error);
  process.exitCode = 1;
});
