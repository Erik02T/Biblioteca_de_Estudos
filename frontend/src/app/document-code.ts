import CodeBlock from '@tiptap/extension-code-block';
import { Selection, TextSelection } from '@tiptap/pm/state';
import { commitBlockTransaction } from './block-commands';

export const codeLanguages = [
  ['', 'Texto simples'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['python', 'Python'],
  ['java', 'Java'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['html', 'HTML'], ['css', 'CSS'],
  ['json', 'JSON'], ['sql', 'SQL'], ['bash', 'Bash'],
] as const;

export const DocumentCodeBlock = CodeBlock.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Escape is a predictable way to leave code without triggering page navigation.
      Escape: ({ editor }) => {
        if (!editor.isActive(this.name) || editor.view.composing) return false;
        const $head = editor.state.selection.$head;
        const end = $head.after();
        const tr = editor.state.tr;
        const $end = tr.doc.resolve(end);
        if ($end.index() === $end.parent.childCount) tr.insert(end, editor.schema.nodes.paragraph.create());
        tr.setSelection(Selection.near(tr.doc.resolve(end), 1));
        if (tr.docChanged) commitBlockTransaction(editor, tr);
        else editor.view.dispatch(tr);
        return true;
      },
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node, disposed = false;
      const dom = document.createElement('div'); dom.className = 'document-code';
      const controls = document.createElement('div'); controls.className = 'document-code-controls'; controls.contentEditable = 'false';
      const language = document.createElement('select'); language.setAttribute('aria-label', 'Linguagem do código');
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copiar código';
      const notice = document.createElement('span'); notice.setAttribute('role', 'status');
      const pre = document.createElement('pre'), code = document.createElement('code'); pre.append(code);
      controls.append(language, copy, notice); dom.append(controls, pre);
      const updateLanguage = () => {
        language.replaceChildren(...codeLanguages.map(([value, name]) => new Option(name, value)));
        const value = String(current.attrs.language ?? '');
        if (!codeLanguages.some(([id]) => id === value)) language.add(new Option(`Texto simples (${value})`, value));
        language.value = value; language.disabled = !editor.isEditable;
      };
      updateLanguage();
      language.addEventListener('change', () => {
        const pos = getPos();
        if (typeof pos !== 'number' || !editor.isEditable || editor.view.composing) { updateLanguage(); return; }
        commitBlockTransaction(editor, editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, language: language.value || null }));
      });
      copy.addEventListener('click', async () => {
        try {
          if (!navigator.clipboard?.writeText) throw Error('Clipboard indisponível');
          await navigator.clipboard.writeText(current.textContent);
          if (!disposed) notice.textContent = 'Código copiado.';
        } catch {
          if (disposed) return;
          const pos = getPos();
          if (typeof pos === 'number') {
            editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos + 1, pos + current.nodeSize - 1)));
            editor.view.focus();
          }
          notice.textContent = 'Não foi possível copiar. Código selecionado para cópia manual.';
        }
      });
      return {
        dom, contentDOM: code,
        update(updated) {
          if (updated.type !== current.type) return false;
          current = updated; updateLanguage(); return true;
        },
        stopEvent: event => controls.contains(event.target as globalThis.Node),
        ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target),
        destroy() { disposed = true; },
      };
    };
  },
}).configure({ enableTabIndentation: true, tabSize: 4 });
