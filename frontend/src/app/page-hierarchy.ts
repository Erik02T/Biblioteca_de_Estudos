import type { Area } from './page';

// IDs remain the identity across moves, renames and browser history.
export function pageAncestors(pages: Area[], parentId?: string | null): Area[] {
  const byId = new Map(pages.map(page => [page.id, page]));
  const seen = new Set<string>();
  const result: Area[] = [];
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    result.unshift(parent);
    parentId = parent.parentId;
  }
  return result;
}

export function parentCandidates(pages: Area[], pageId?: string): Area[] {
  const excluded = new Set(pageId ? [pageId] : []);
  const children = new Map<string, string[]>();
  for (const page of pages) {
    if (page.parentId) children.set(page.parentId, [...(children.get(page.parentId) ?? []), page.id]);
  }
  const queue = [...excluded];
  for (let index = 0; index < queue.length; index++) {
    for (const id of children.get(queue[index]) ?? []) {
      if (!excluded.has(id)) { excluded.add(id); queue.push(id); }
    }
  }
  return pages.filter(page => !page.deletedAt && !excluded.has(page.id));
}
