"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect } from "react";
import { Bold, Code, Highlighter, Italic, Link, List, ListOrdered, Quote, Strikethrough, Underline } from "lucide-react";
import { editorExtensions } from "./extensions";
import styles from "./page.module.css";

type Props = { content?: JSONContent; onChange: (content: JSONContent) => void; onAutosaveStateChange?: (saving: boolean) => void; onBlur?: () => void };
const colors = [{ id: "red", value: "#F43F5E", label: "Vermelho" }, { id: "yellow", value: "#FACC15", label: "Amarelo" }, { id: "green", value: "#22C55E", label: "Verde" }, { id: "blue", value: "#4F8CFF", label: "Azul" }, { id: "purple", value: "#A78BFA", label: "Roxo" }];
const marks = [{ name: "bold", label: "Negrito", icon: Bold }, { name: "italic", label: "Itálico", icon: Italic }, { name: "underline", label: "Sublinhado", icon: Underline }, { name: "strike", label: "Tachado", icon: Strikethrough }];

export default function AreaEditor({ content, onChange, onAutosaveStateChange, onBlur }: Props) {
  const editor = useEditor({ extensions: editorExtensions, content: content ?? { type: "doc", content: [{ type: "paragraph" }] }, immediatelyRender: false, onUpdate: ({ editor: current }) => { onAutosaveStateChange?.(true); onChange(current.getJSON()); } });
  useEffect(() => { if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) editor.commands.setContent(content); }, [content, editor]);
  if (!editor) return <div className={styles.editorLoading}>Carregando editor...</div>;
  const toggle = (name: string) => editor.chain().focus().toggleMark(name).run();
  return <div className={styles.editorShell} data-testid="editor-card">
    <BubbleMenu editor={editor} options={{ placement: "top" }} className={styles.bubbleMenu}>{marks.map(({ name, label, icon: Icon }) => <button key={name} type="button" aria-label={label} onClick={() => toggle(name)}><Icon size={16} /></button>)}</BubbleMenu>
    <EditorContent editor={editor} className={styles.editorContent} onBlur={onBlur} />
    <span className={styles.wordCount} data-testid="word-count">{editor.storage.characterCount?.words?.() ?? 0} palavras</span>
  </div>;
}

export function FormatControls({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  return <section className={styles.formatPanel} data-testid="format-panel"><div className={styles.formatIcons}>{marks.map(({ name, label, icon: Icon }) => <button key={name} type="button" aria-label={label} onClick={() => toggleMark(editor, name)}><Icon size={17} /></button>)}<button type="button" aria-label="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></button><button type="button" aria-label="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></button><button type="button" aria-label="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></button><button type="button" aria-label="Código" onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={17} /></button><button type="button" aria-label="Link" onClick={() => editor.chain().focus().toggleLink({ href: "https://" }).run()}><Link size={17} /></button></div><div className={styles.formatColumns}><div className={styles.headingButtons}>{[1, 2, 3, 4, 5, 6].map((level) => <button key={level} data-testid={`heading-btn-h${level}`} type="button" className={editor.isActive("heading", { level }) ? styles.controlActive : ""} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()}>H{level}</button>)}<button data-testid="heading-btn-p" type="button" className={editor.isActive("paragraph") ? styles.controlActive : ""} onClick={() => editor.chain().focus().setParagraph().run()}>P</button></div><div className={styles.colorButtons}>{colors.map((color) => <button key={color.id} data-testid={`color-${color.id}`} type="button" aria-label={color.label} style={{ backgroundColor: color.value }} onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()} />)}<button data-testid="color-none" type="button" aria-label="Sem cor" onClick={() => editor.chain().focus().unsetHighlight().run()} className={styles.colorNone} /><button data-testid="clear-format" type="button" aria-label="Remover formatação" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Highlighter size={16} /></button></div></div></section>;
}
function toggleMark(editor: NonNullable<ReturnType<typeof useEditor>>, name: string) { editor.chain().focus().toggleMark(name).run(); }
export { marks };
