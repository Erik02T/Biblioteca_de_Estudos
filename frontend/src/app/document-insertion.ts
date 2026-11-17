import type { Editor, JSONContent } from '@tiptap/core';
import { Selection, type Transaction } from '@tiptap/pm/state';
import { commitBlockTransaction, slashQuery } from './block-commands';

/** Maps a picker/upload's original selection through edits, and never writes into another editor. */
export class DocumentInsertion {
  private bookmark;
  private slash: ReturnType<typeof slashQuery>;
  private active = true;
  private changed = ({ transaction }: { transaction: Transaction }) => {
    this.bookmark = this.bookmark.map(transaction.mapping);
    if (this.slash) {
      const from = transaction.mapping.mapResult(this.slash.from, -1);
      const to = transaction.mapping.mapResult(this.slash.to, 1);
      if (from.deletedAcross || to.deletedAcross) this.active = false;
      this.slash = { ...this.slash, from: from.pos, to: to.pos };
    }
  };
  constructor(private editor: Editor, slash = false) {
    this.bookmark = editor.state.selection.getBookmark();
    this.slash = slash ? slashQuery(editor.state) : null;
    editor.on('transaction', this.changed);
  }
  dispose() { this.active = false; this.editor.off('transaction', this.changed); }
  focus() { if (!this.editor.isDestroyed) this.editor.view.focus(); }
  insert(content: JSONContent, inline = false) {
    const editor = this.editor;
    if (!this.active || editor.isDestroyed || !editor.isEditable || editor.view.composing) return false;
    const tr = editor.state.tr;
    try {
      tr.setSelection(this.bookmark.resolve(tr.doc));
      if (this.slash) {
        if (tr.doc.textBetween(this.slash.from, this.slash.to) !== '/' + this.slash.query) return false;
        tr.delete(this.slash.from, this.slash.to);
      }
      const node = editor.schema.nodeFromJSON(content);
      node.check();
      if (inline) {
        const { $from, to } = tr.selection;
        if (!$from.parent.inlineContent) return false;
        // Choosing a reference never discards selected explanatory text.
        tr.insert(to, node);
        tr.setSelection(Selection.near(tr.doc.resolve(to + node.nodeSize)));
      } else {
        const { $from } = tr.selection;
        let pos: number, replaceTo: number;
        if ($from.depth && $from.parent.isTextblock) {
          const paragraphPos = $from.before();
          const $pos = tr.doc.resolve(paragraphPos);
          const replace = $from.parent.content.size === 0 && $pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, node.type);
          pos = replace ? paragraphPos : $from.after(); replaceTo = replace ? $from.after() : pos;
        } else { pos = tr.selection.to; replaceTo = pos; }
        const $pos = tr.doc.resolve(pos);
        if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + (replaceTo > pos ? 1 : 0), node.type)) return false;
        tr.replaceWith(pos, replaceTo, node);
        tr.setSelection(Selection.near(tr.doc.resolve(pos)));
      }
      this.dispose();
      return commitBlockTransaction(editor, tr);
    } catch { return false; }
  }
}
