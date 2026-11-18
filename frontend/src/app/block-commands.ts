import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
import { NodeSelection, Selection, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

export const blockTypes = [
  { id: 'paragraph', label: 'Texto', search: 'paragrafo texto' },
  { id: 'h1', label: 'Título 1', search: 'titulo h1' },
  { id: 'h2', label: 'Título 2', search: 'titulo h2' },
  { id: 'h3', label: 'Título 3', search: 'titulo h3' },
  { id: 'bulletList', label: 'Lista com marcadores', search: 'lista marcadores' },
  { id: 'orderedList', label: 'Lista numerada', search: 'lista numerada' },
  { id: 'taskList', label: 'Lista de tarefas', search: 'lista tarefas checklist' },
  { id: 'codeBlock', label: 'Código', search: 'codigo code' },
  { id: 'blockquote', label: 'Citação', search: 'citacao quote' },
  { id: 'callout', label: 'Destaque', search: 'destaque callout' },
  { id: 'toggleBlock', label: 'Alternante', search: 'alternante toggle' },
  { id: 'horizontalRule', label: 'Divisor', search: 'divisor linha' },
  { id: 'h4', label: 'Título 4', search: 'titulo h4' },
  { id: 'h5', label: 'Título 5', search: 'titulo h5' },
  { id: 'h6', label: 'Título 6', search: 'titulo h6' },
] as const;
export type BlockType = typeof blockTypes[number]['id'];
export type BlockOperation = 'duplicate' | 'up' | 'down' | 'delete';

export function activeDocumentBlock(state: EditorState, targetPos?: number) {
  const selection = targetPos === undefined ? state.selection : NodeSelection.create(state.doc, targetPos);
  const { $from } = selection;
  let depth = $from.depth;
  const selectedBlock = selection instanceof NodeSelection && selection.node.isBlock;
  if (selectedBlock) depth += 1;
  else if (depth > 1 && ['listItem', 'taskItem'].includes($from.node(depth - 1).type.name) && $from.index(depth - 1) === 0) depth -= 1;
  if (depth < 1) return null;
  const pos = selectedBlock ? selection.from : $from.before(depth);
  const node = state.doc.nodeAt(pos);
  if (!node || node.isInline) return null;
  const parent = state.doc.resolve(pos).parent;
  const index = state.doc.resolve(pos).index();
  // A selection spanning multiple blocks has no single target.
  if (selection.to > pos + node.nodeSize) return null;
  return { index, pos, node, end: pos + node.nodeSize, parent, depth };
}

export function selectParentBlock(editor: Editor) {
  const block = activeDocumentBlock(editor.state);
  if (!block || block.depth <= 1) return false;
  const position = editor.state.doc.resolve(block.pos).before(block.depth - 1);
  return editor.commands.setNodeSelection(position);
}

export function slashQuery(state: EditorState) {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type.name !== 'paragraph' || $from.parentOffset !== $from.parent.content.size) return null;
  const match = /^\/([^/\n]{0,40})$/.exec($from.parent.textContent);
  return match ? { query: match[1], from: $from.start(), to: $from.pos } : null;
}

export function matchingBlockTypes(query: string) {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return blockTypes.filter(type => `${type.search} ${type.id.toLowerCase()}`.includes(normalized));
}

function makeBlock(schema: Schema, type: BlockType, source?: ProseMirrorNode): ProseMirrorNode | null {
  const paragraph = schema.nodes.paragraph.create(null, source?.content);
  let node: ProseMirrorNode;
  if (/^h[1-6]$/.test(type)) node = schema.nodes.heading.create({ level: Number(type[1]) }, source?.content);
  else if (type === 'bulletList' || type === 'orderedList') node = schema.nodes[type].create(null, schema.nodes.listItem.create(null, paragraph));
  else if (type === 'taskList') node = schema.nodes.taskList.create(null, schema.nodes.taskItem.create({ checked: false }, paragraph));
  else if (type === 'blockquote' || type === 'callout' || type === 'toggleBlock') node = schema.nodes[type].create(null, paragraph);
  else node = schema.nodes[type].create(null, source?.content);
  if (source?.attrs.id) node = node.type.create({ ...node.attrs, id: source.attrs.id }, node.content, node.marks);
  try { node.check(); return node; } catch { return null; }
}

export function canConvertBlock(state: EditorState, type: BlockType) {
  const block = activeDocumentBlock(state);
  // Preserve structured content, checked tasks, code language and media. No flattening.
  if (!block || !(state.selection instanceof TextSelection) || !['paragraph', 'heading'].includes(block.node.type.name) || type === 'horizontalRule') return false;
  const replacement = makeBlock(state.schema, type, block.node);
  return Boolean(replacement && block.parent.canReplaceWith(block.index, block.index + 1, replacement.type));
}

export function commitBlockTransaction(editor: Editor, tr: Transaction) {
  if (!tr.docChanged) return false;
  try { tr.doc.check(); } catch { return false; }
  editor.view.dispatch(closeHistory(tr).scrollIntoView());
  // Each action is one undo step, separate from the next typed character.
  editor.view.dispatch(closeHistory(editor.state.tr).setMeta('addToHistory', false));
  editor.view.focus();
  return true;
}

export function insertDocumentBlock(editor: Editor, type: BlockType, slash = false, dryRun = false) {
  if (!editor.isEditable || editor.view.composing) return false;
  const block = activeDocumentBlock(editor.state);
  const node = makeBlock(editor.schema, type);
  if (!block || !node || (slash && !slashQuery(editor.state))) return false;
  // Insertion works inside an item; operations still target the whole item.
  const { $from } = editor.state.selection;
  const paragraphContext = slash || (['listItem', 'taskItem'].includes(block.node.type.name) && $from.parent.isTextblock);
  const sourcePos = paragraphContext ? $from.before() : block.pos;
  const source = editor.state.doc.nodeAt(sourcePos)!;
  const $source = editor.state.doc.resolve(sourcePos);
  const replace = (slash || (source.type.name === 'paragraph' && !source.content.size)) && $source.parent.canReplaceWith($source.index(), $source.index() + 1, node.type);
  const tr = editor.state.tr;
  let pos = replace ? sourcePos : sourcePos + source.nodeSize;
  if (!replace) {
    const $pos = tr.doc.resolve(pos);
    if (!$pos.parent.canReplaceWith($pos.index(), $pos.index(), node.type)) return false;
    if (slash) { const query = slashQuery(editor.state)!; tr.delete(query.from, query.to); pos = tr.mapping.map(pos); }
  }
  tr.replaceWith(pos, replace ? pos + source.nodeSize : pos, node);
  tr.setSelection(Selection.near(tr.doc.resolve(pos + (node.isLeaf ? 0 : 1))));
  return dryRun || commitBlockTransaction(editor, tr);
}

export function convertDocumentBlock(editor: Editor, type: BlockType) {
  if (!editor.isEditable || editor.view.composing || !canConvertBlock(editor.state, type)) return false;
  const block = activeDocumentBlock(editor.state)!;
  const replacement = makeBlock(editor.schema, type, block.node)!;
  if (replacement.eq(block.node)) return false;
  const tr = editor.state.tr.replaceWith(block.pos, block.end, replacement);
  // Keep the text range, including a backwards selection, inside its new wrapper.
  const offset = replacement.isTextblock ? 0 : ['bulletList', 'orderedList', 'taskList'].includes(type) ? 2 : 1;
  tr.setSelection(TextSelection.create(tr.doc, editor.state.selection.anchor + offset, editor.state.selection.head + offset));
  return commitBlockTransaction(editor, tr);
}

function copyBlock(node: ProseMirrorNode, schema: Schema): ProseMirrorNode {
  // ProseMirror's toJSON shares attrs objects with the immutable source node.
  const json = structuredClone(node.toJSON());
  const renew = (value: typeof json) => {
    if (value.attrs?.id) value.attrs.id = crypto.randomUUID();
    value.content?.forEach(renew);
  };
  renew(json);
  return schema.nodeFromJSON(json);
}

/** Remove empty wrappers, rather than letting replace fitting silently create content. */
function removalRange(state: EditorState, pos: number) {
  const $pos = state.doc.resolve(pos);
  let from = pos, to = pos + state.doc.nodeAt(pos)!.nodeSize;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const parent = $pos.node(depth);
    if (parent.childCount !== 1 || parent.type.validContent(parent.content.cut(0, 0))) break;
    from = $pos.before(depth); to = $pos.after(depth);
  }
  return { from, to };
}

export function moveDocumentBlock(editor: Editor, from: number, to: number, dryRun = false) {
  if (!editor.isEditable || editor.view.composing || from === to) return false;
  const { state } = editor;
  const node = state.doc.nodeAt(from);
  if (!node || !node.isBlock || to < 0 || to > state.doc.content.size) return false;
  const range = removalRange(state, from);
  if (to >= range.from && to <= range.to) return false;
  const $to = state.doc.resolve(to);
  if ($to.textOffset || !$to.parent.canReplaceWith($to.index(), $to.index(), node.type)) return false;
  const tr = state.tr.delete(range.from, range.to);
  const target = tr.mapping.map(to);
  tr.insert(target, node);
  try { tr.doc.check(); } catch { return false; }
  const selection = state.selection;
  if (selection instanceof TextSelection && selection.from >= from && selection.to <= from + node.nodeSize) {
    tr.setSelection(TextSelection.create(tr.doc, target + selection.anchor - from, target + selection.head - from));
  } else tr.setSelection(NodeSelection.create(tr.doc, target));
  return dryRun || commitBlockTransaction(editor, tr);
}

export function blockMoveDestinations(editor: Editor, targetPos?: number) {
  const block = activeDocumentBlock(editor.state, targetPos);
  if (!block) return [];
  const result: { pos: number; label: string }[] = [];
  const seen = new Set<number>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isBlock) return;
    for (const [destination, prefix] of [[pos, 'Antes de'], [pos + node.nodeSize, 'Após']] as const) {
      if (seen.has(destination) || !moveDocumentBlock(editor, block.pos, destination, true)) continue;
      seen.add(destination);
      result.push({ pos: destination, label: `${prefix} ${node.textContent.slice(0, 50) || node.type.name} · nível ${editor.state.doc.resolve(pos).depth + 1}` });
    }
  });
  if (!seen.has(editor.state.doc.content.size) && moveDocumentBlock(editor, block.pos, editor.state.doc.content.size, true)) result.push({ pos: editor.state.doc.content.size, label: 'Fim do documento' });
  return result;
}

export function operateDocumentBlock(editor: Editor, operation: BlockOperation) {
  if (!editor.isEditable || editor.view.composing) return false;
  const block = activeDocumentBlock(editor.state);
  if (!block) return false;
  const { index, pos, node, end, parent } = block;
  const { selection } = editor.state;
  const tr = editor.state.tr;
  let target = pos;
  if (operation === 'duplicate') { tr.insert(end, copyBlock(node, editor.schema)); target = end; }
  else if (operation === 'up') {
    if (index === 0) return false;
    return moveDocumentBlock(editor, pos, pos - parent.child(index - 1).nodeSize);
  } else if (operation === 'down') {
    if (index === parent.childCount - 1) return false;
    return moveDocumentBlock(editor, pos, end + parent.child(index + 1).nodeSize);
  } else {
    const range = removalRange(editor.state, pos);
    tr.delete(range.from, range.to);
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size))));
    return commitBlockTransaction(editor, tr);
  }
  if (selection instanceof TextSelection) {
    tr.setSelection(TextSelection.create(tr.doc, target + selection.anchor - pos, target + selection.head - pos));
  } else tr.setSelection(NodeSelection.create(tr.doc, target));
  return commitBlockTransaction(editor, tr);
}
