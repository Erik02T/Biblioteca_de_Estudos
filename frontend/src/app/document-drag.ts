import type { Editor } from '@tiptap/core';
import { DragHandlePlugin, normalizeNestedOptions } from '@tiptap/extension-drag-handle';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { moveDocumentBlock } from './block-commands';

/** All document moves, including drop, use the same schema-checked transaction. */
export function registerDocumentDrag(editor: Editor) {
  const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'document-drag-handle';
  handle.textContent = '⠿'; handle.setAttribute('aria-label', 'Arrastar bloco'); handle.title = 'Arrastar bloco. Pelo teclado: Alt+Shift+↑/↓ ou Mover para…';
  const indicator = document.createElement('div'); indicator.className = 'document-drop-indicator'; indicator.hidden = true;
  document.body.append(indicator);
  let hovered = -1, source = -1, sourceDoc = editor.state.doc, destination: number | null = null;
  const clear = () => { source = -1; destination = null; indicator.hidden = true; };
  const mapSource = ({ transaction }: { transaction: Transaction }) => {
    if (source < 0 || !transaction.docChanged) return;
    const mapped = transaction.mapping.mapResult(source, 1);
    if (mapped.deletedAcross) { clear(); return; }
    source = mapped.pos; sourceDoc = editor.state.doc; destination = null; indicator.hidden = true;
  };
  editor.on('transaction', mapSource);
  const key = new PluginKey('documentDragMove');
  const dragKey = new PluginKey('documentDragHandle');
  const dropTarget = (event: DragEvent) => {
    if (source < 0 || sourceDoc !== editor.state.doc || editor.view.composing) return null;
    const candidates: { pos: number; rect: DOMRect; bottom: boolean; score: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isBlock) return;
      const element = editor.view.nodeDOM(pos);
      if (!(element instanceof HTMLElement) || !element.getClientRects().length) return;
      const rect = element.getBoundingClientRect();
      for (const bottom of [false, true]) candidates.push({ pos: bottom ? pos + node.nodeSize : pos, rect, bottom, score: Math.abs(event.clientY - (bottom ? rect.bottom : rect.top)) + Math.abs(event.clientX - rect.left) * 0.15 });
    });
    return candidates.sort((a, b) => a.score - b.score).slice(0, 16).find(item => moveDocumentBlock(editor, source, item.pos, true)) ?? null;
  };
  editor.registerPlugin(new Plugin({
    key,
    props: { handleDOMEvents: {
      dragover(_view, event) {
        if (source < 0) return false;
        event.preventDefault();
        const target = dropTarget(event); destination = target?.pos ?? null; indicator.hidden = !target;
        if (target) Object.assign(indicator.style, { top: `${target.bottom ? target.rect.bottom : target.rect.top}px`, left: `${target.rect.left}px`, width: `${target.rect.width}px` });
        if (event.dataTransfer) event.dataTransfer.dropEffect = target ? 'move' : 'none';
        return true;
      },
      drop(view, event) {
        if (source < 0) return false;
        event.preventDefault();
        const target = dropTarget(event)?.pos ?? destination;
        if (sourceDoc === editor.state.doc && target !== null) moveDocumentBlock(editor, source, target);
        view.dragging = null; clear(); return true;
      },
      dragend() { clear(); return false; },
    } },
  }), (plugin, existing) => [plugin, ...existing]);
  const dragPlugin = DragHandlePlugin({
    pluginKey: dragKey, editor, element: handle, nestedOptions: normalizeNestedOptions(true),
    computePositionConfig: { placement: 'left-start', strategy: 'fixed' },
    onNodeChange: ({ pos }) => { hovered = pos; },
    onElementDragStart: event => {
      if (editor.view.composing || !editor.isEditable || hovered < 0) { event.preventDefault(); return; }
      source = hovered; sourceDoc = editor.state.doc;
    },
    onElementDragEnd: clear,
  });
  editor.registerPlugin(dragPlugin.plugin);
  return () => { editor.off('transaction', mapSource); editor.unregisterPlugin(key); editor.unregisterPlugin(dragKey); dragPlugin.unbind(); indicator.remove(); handle.remove(); };
}
