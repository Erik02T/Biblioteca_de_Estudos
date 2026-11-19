import type { Node } from '@tiptap/pm/model';

export type OutlineHeading = {
  key: string;
  position: number;
  text: string;
  level: 1 | 2 | 3;
};

export function documentHeadings(doc: Node): OutlineHeading[] {
  const ids = new Set<string>();
  const duplicates = new Set<string>();
  const headings: (Omit<OutlineHeading, 'key'> & { id: string | null })[] = [];

  doc.descendants((node, position, parent) => {
    const id = typeof node.attrs.id === 'string' && node.attrs.id.trim() ? node.attrs.id : null;
    if (id) {
      if (ids.has(id)) duplicates.add(id);
      ids.add(id);
    }

    const { level } = node.attrs;
    if (parent !== doc || node.type.name !== 'heading' || (level !== 1 && level !== 2 && level !== 3)) return;
    const text = node.textContent.trim();
    if (text) headings.push({ id, position, text, level });
  });

  return headings.map(({ id, ...heading }) => ({
    ...heading,
    key: id && !duplicates.has(id) ? `id:${id}` : `position:${heading.position}`,
  }));
}
