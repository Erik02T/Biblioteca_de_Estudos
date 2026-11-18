import { getSchema, type JSONContent } from '@tiptap/core';
import { editorExtensions } from './extensions';
import { normalizeEditorDocument } from './document-normalize';

const schema = getSchema(editorExtensions);

export function getEditorContent(content?: JSONContent | { texto?: string }): JSONContent {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    if ('type' in content && content.type === 'doc') return normalizeEditorDocument(content);
    const keys = Object.keys(content);
    if (keys.length && !(keys.length === 1 && typeof content.texto === 'string')) return content;
  } else if (content !== undefined && content !== null) {
    return { type: 'unsupportedDocument', attrs: { original: content } };
  }
  const legacyText = content && 'texto' in content ? content.texto : '';
  return { type: 'doc', content: [{ type: 'paragraph', content: legacyText ? [{ type: 'text', text: legacyText }] : undefined }] };
}

/** ProseMirror omits the envelope version from getJSON; retain a known version on edits. */
export function editedDocumentContent(document: JSONContent, original: JSONContent): JSONContent {
  return original.schemaVersion === 1 ? { ...document, schemaVersion: 1 } : document;
}

/** Fail closed instead of letting ProseMirror silently discard unsupported media/IDs. */
export function unsupportedEditorFeatures(document: JSONContent): string[] {
  document = normalizeEditorDocument(document);
  const unsupported = new Set<string>();
  const visit = (node: JSONContent, mark = false, depth = 0) => {
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 100) { unsupported.add('structure'); return; }
    const type = (mark ? schema.marks : schema.nodes)[node.type ?? ''];
    if (!type) unsupported.add(node.type ?? 'unknown');
    else for (const attr of Object.keys(node.attrs ?? {})) {
      if (!(attr in (type.spec.attrs ?? {}))) unsupported.add(`${node.type}.${attr}`);
    }
    for (const key of Object.keys(node)) {
      if (depth === 0 && key === 'schemaVersion' && node.schemaVersion === 1) continue;
      if (!['type', 'attrs', 'content', 'marks', 'text'].includes(key)) unsupported.add(key);
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) unsupported.add('structure');
      else node.content.forEach(child => visit(child, false, depth + 1));
    }
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) unsupported.add('structure');
      else node.marks.forEach(child => visit(child, true, depth + 1));
    }
  };
  visit(document);
  if (!unsupported.size) {
    try { schema.nodeFromJSON(document).check(); } catch { unsupported.add('structure'); }
  }
  return [...unsupported];
}

export function originalDocumentText(document: JSONContent): string {
  if (!document || typeof document !== 'object') return '';
  if (typeof document.text === 'string') return document.text;
  if (typeof document.texto === 'string') return document.texto;
  if (!Array.isArray(document.content)) return JSON.stringify(document, null, 2);
  return document.content.map(originalDocumentText).join(document.type === 'doc' ? '\n\n' : '');
}
