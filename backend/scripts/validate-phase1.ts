import 'dotenv/config';
import {
  AttachmentType,
  PrismaClient,
  SectionType,
  SubSectionType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

type EnumTest = {
  label: string;
  run: () => Promise<unknown>;
};

function assertLocalTestDatabase() {
  if (process.env.PHASE1_VALIDATION_ALLOW_LOCAL_DB !== 'true') {
    throw new Error(
      'Set PHASE1_VALIDATION_ALLOW_LOCAL_DB=true to explicitly allow this validation script.',
    );
  }

  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error('DATABASE_URL is required for Phase 1 validation.');
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(rawDatabaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const isLoopback =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  const isTestDatabase =
    /(^|[_-])(test|testing|local|dev|development|audit)([_-]|$)/i.test(
      databaseName,
    );

  if (
    !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    !isLoopback ||
    !isTestDatabase
  ) {
    throw new Error(
      'Phase 1 validation only runs against a loopback PostgreSQL database whose name identifies it as test, local, dev, or audit.',
    );
  }
}

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
  assertLocalTestDatabase();
  const runId = randomUUID();
  let cleanupUserId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        email: `phase-1-validation-${runId}@example.invalid`,
        passwordHash: 'phase-1-validation-no-login',
      },
    });
    const userId = user.id;
    cleanupUserId = userId;

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
    try {
      if (cleanupUserId) {
        await prisma.user.deleteMany({ where: { id: cleanupUserId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error('\nPhase 1 validation failed:');
  console.error(error);
  process.exitCode = 1;
});
