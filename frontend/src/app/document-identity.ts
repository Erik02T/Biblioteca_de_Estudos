import UniqueID from '@tiptap/extension-unique-id';
import { Plugin } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { operateDocumentBlock } from './block-commands';

export const DocumentIdentity = UniqueID.extend({
  // Opening a page must not write a new revision just to assign identifiers.
  onCreate() {},
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), new Plugin({
      appendTransaction(transactions, oldState, newState) {
        if (!transactions.some(tr => tr.docChanged) || transactions.some(tr => tr.getMeta('history$')) || oldState.doc.eq(newState.doc)) return;
        const tr = newState.tr;
        newState.doc.descendants((node, pos) => {
          if ('id' in node.attrs && !node.attrs.id) tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: crypto.randomUUID() });
        });
        if (tr.docChanged) return tr;
      },
    })];
  },
}).configure({ types: 'all', generateID: () => crypto.randomUUID(), filterTransaction: tr => !tr.getMeta('history$') });

export const DocumentBlockKeys = Extension.create({
  name: 'documentBlockKeys',
  addKeyboardShortcuts() {
    return {
      'Alt-Shift-ArrowUp': () => operateDocumentBlock(this.editor, 'up'),
      'Alt-Shift-ArrowDown': () => operateDocumentBlock(this.editor, 'down'),
    };
  },
});
