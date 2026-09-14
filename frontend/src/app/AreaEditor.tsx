"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { useEffect } from "react";
import { editorExtensions } from "./extensions";
import styles from "./page.module.css";

type AreaEditorProps = {
  content?: JSONContent;
  onChange: (content: JSONContent) => void;
  onAutosaveStateChange?: (isSaving: boolean) => void;
};

const highlightColors = ["#f8d66d", "#f5a3a3", "#a9d8c2", "#a9c9cf", "#d5b4e8"];

export default function AreaEditor({ content, onChange, onAutosaveStateChange }: AreaEditorProps) {
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

  if (!editor) return <div className={styles.editorLoading}>Carregando editor...</div>;

  return <div className={styles.editorShell}>
    <div className={styles.editorToolbar} aria-label="Ferramentas de formatação">
      <div className={styles.toolbarGroup}>
        {[1, 2, 3, 4, 5, 6].map((level) => <button key={level} type="button" className={editor.isActive("heading", { level }) ? styles.toolbarButtonActive : styles.toolbarButton} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()}>H{level}</button>)}
        <button type="button" className={editor.isActive("paragraph") ? styles.toolbarButtonActive : styles.toolbarButton} onClick={() => editor.chain().focus().setParagraph().run()}>P</button>
      </div>
      <div className={styles.toolbarGroup}>
        {highlightColors.map((color) => <button key={color} type="button" className={styles.colorButton} style={{ backgroundColor: color }} aria-label={`Destacar com a cor ${color}`} onClick={() => editor.chain().focus().toggleHighlight({ color }).run()} />)}
        <button type="button" className={styles.toolbarButton} onClick={() => editor.chain().focus().unsetHighlight().run()}>Limpar</button>
      </div>
    </div>
    <EditorContent editor={editor} className={styles.editorContent} />
  </div>;
}
