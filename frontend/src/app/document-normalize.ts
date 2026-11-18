import type { JSONContent } from '@tiptap/core';

/** Only recognized legacy references are normalized; unknown data stays visible to the guard. */
export function normalizeEditorDocument(value: JSONContent): JSONContent {
  const visit = (node: JSONContent, depth = 0): JSONContent => {
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 100) return node;
    const next = { ...node, ...(node.attrs ? { attrs: { ...node.attrs } } : {}) };
    if (next.type === 'pageReference' && next.attrs?.pageId && !next.attrs.targetPageId) {
      next.attrs.targetPageId = next.attrs.pageId;
      delete next.attrs.pageId;
    }
    if (Array.isArray(node.content)) next.content = node.content.map(child => {
      const normalized = visit(child, depth + 1);
      // Earlier portable documents allowed pageReference at block boundaries.
      return normalized?.type === 'pageReference' && ['doc', 'blockquote', 'callout', 'toggleBlock'].includes(node.type ?? '')
        ? { type: 'paragraph', content: [normalized] } : normalized;
    });
    return next;
  };
  return visit(value);
}
