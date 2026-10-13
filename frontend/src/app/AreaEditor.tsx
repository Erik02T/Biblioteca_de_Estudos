"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useEffect } from "react";
import { editorExtensions } from "./extensions";
import styles from "./page.module.css";

type AreaEditorProps = {
  content?: JSONContent;
  onChange: (content: JSONContent) => void;
  onAutosaveStateChange?: (isSaving: boolean) => void;
  onBlur?: () => void;
};

const highlightColors = ["#f8d66d", "#f5a3a3", "#a9d8c2", "#a9c9cf", "#d5b4e8"];

const headingLabels: Record<number, string> = {
  1: "Título 1",
  2: "Título 2",
  3: "Título 3",
  4: "Título 4",
  5: "Título 5",
  6: "Título 6",
};

export default function AreaEditor({ content, onChange, onAutosaveStateChange, onBlur }: AreaEditorProps) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onAutosaveStateChange?.(true);
      onChange(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor || !content) return;
    const currentContent = JSON.stringify(editor.getJSON());
    if (currentContent !== JSON.stringify(content)) editor.commands.setContent(content);
  }, [content, editor]);

  if (!editor) return <div className={styles.editorLoading} role="status" aria-live="polite">Carregando editor...</div>;

  return <div className={styles.editorShell}>
    <div className={styles.editorToolbar} role="toolbar" aria-label="Barra de ferramentas de formatação de texto">
      <div className={styles.toolbarGroup} role="group" aria-label="Estilos de cabeçalho e parágrafo">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <button
            key={level}
            type="button"
            className={editor.isActive("heading", { level }) ? styles.toolbarButtonActive : styles.toolbarButton}
            onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()}
            aria-label={headingLabels[level]}
            aria-pressed={editor.isActive("heading", { level })}
            title={headingLabels[level]}
          >
            H{level}
          </button>
        ))}
        <button
          type="button"
          className={editor.isActive("paragraph") ? styles.toolbarButtonActive : styles.toolbarButton}
          onClick={() => editor.chain().focus().setParagraph().run()}
          aria-label="Parágrafo"
          aria-pressed={editor.isActive("paragraph")}
          title="Parágrafo"
        >
          P
        </button>
      </div>
      <div className={styles.toolbarGroup} role="group" aria-label="Cores de destaque">
        {highlightColors.map((color) => (
          <button
            key={color}
            type="button"
            className={styles.colorButton}
            style={{ backgroundColor: color }}
            aria-label={`Destacar texto com cor ${color}`}
            aria-pressed={editor.isActive("highlight", { color })}
            title={`Cor de destaque ${color}`}
            onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
          />
        ))}
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          aria-label="Remover destaque"
          title="Remover destaque"
        >
          Limpar
        </button>
      </div>
    </div>
    <EditorContent editor={editor} className={styles.editorContent} onBlur={onBlur} />
  </div>;
}
