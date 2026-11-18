import { BadRequestException } from '@nestjs/common';

export const collectionOrders = [
  'updatedAt',
  'nome',
  'nivelEntendimento',
  'sortOrder',
  'lastOpenedAt',
] as const;
export type CollectionFilters = {
  search?: string;
  categoria?: string;
  minLevel?: number;
  maxLevel?: number;
  isFavorite?: boolean;
  recent?: boolean;
};

export function validateCollectionFilters(value: unknown): CollectionFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Filtros inválidos.');
  const filters = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(filters)) {
    if (['search', 'categoria'].includes(key)) {
      if (typeof entry !== 'string' || entry.length > 255)
        throw new BadRequestException(`Filtro ${key} inválido.`);
    } else if (['minLevel', 'maxLevel'].includes(key)) {
      if (
        !Number.isInteger(entry) ||
        (entry as number) < 0 ||
        (entry as number) > 5
      )
        throw new BadRequestException(`Filtro ${key} deve estar entre 0 e 5.`);
    } else if (['isFavorite', 'recent'].includes(key)) {
      if (typeof entry !== 'boolean')
        throw new BadRequestException(`Filtro ${key} inválido.`);
    } else throw new BadRequestException(`Filtro desconhecido: ${key}.`);
  }
  if (
    filters.minLevel !== undefined &&
    filters.maxLevel !== undefined &&
    Number(filters.minLevel) > Number(filters.maxLevel)
  )
    throw new BadRequestException(
      'Nível mínimo deve ser menor ou igual ao máximo.',
    );
  return filters;
}

export function validateCollectionOrder(
  orderBy = 'updatedAt',
  direction = 'desc',
) {
  if (
    !(collectionOrders as readonly string[]).includes(orderBy) ||
    !['asc', 'desc'].includes(direction)
  )
    throw new BadRequestException('Ordenação inválida.');
}
