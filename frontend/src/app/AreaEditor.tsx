"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import type { JSONContent } from "@tiptap/core";
import { editorExtensions } from "./extensions";
import styles from "./page.module.css";

type Props = { content?: JSONContent; onChange: (content: JSONContent) => void; onAutosaveStateChange?: (saving: boolean) => void; onBlur?: () => void };
const colors = ["#F43F5E", "#FACC15", "#22C55E", "#4F8CFF", "#A78BFA"];
const blocks = ["h1", "h2", "h3", "h4", "h5", "h6", "p"] as const;

export default function AreaEditor({ content, onChange, onAutosaveStateChange, onBlur }: Props) {
  const editor = useEditor({ extensions: editorExtensions, content: content ?? { type: "doc", content: [{ type: "paragraph" }] }, immediatelyRender: false, onUpdate: ({ editor: current }) => { onAutosaveStateChange?.(true); onChange(current.getJSON()); } });
  useEffect(() => { if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) editor.commands.setContent(content); }, [content, editor]);
  if (!editor) return <div className={styles.editorLoading}>Carregando editor...</div>;
  const run = (command: () => boolean) => { editor.chain().focus(); command(); };
  return <div className={styles.editorShell}>
    <EditorContent editor={editor} className={styles.editorContent} onBlur={onBlur} />
    <div className={styles.editorToolbar} role="toolbar" aria-label="Formatar">
      <div className={styles.formatIcons}>{[["bold", "B"], ["italic", "I"], ["underline", "U"], ["strike", "S"]].map(([mark, label]) => <button key={mark} type="button" className={editor.isActive(mark) ? styles.toolbarButtonActive : styles.toolbarButton} aria-label={mark} onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor.chain().toggleMark(mark).run())}>{label}</button>)}
        <button type="button" className={styles.toolbarButton} aria-label="Lista" onClick={() => run(() => editor.chain().toggleBulletList().run())}>☷</button><button type="button" className={styles.toolbarButton} aria-label="Lista numerada" onClick={() => run(() => editor.chain().toggleOrderedList().run())}>1.</button><button type="button" className={styles.toolbarButton} aria-label="Citação" onClick={() => run(() => editor.chain().toggleBlockquote().run())}>“</button><button type="button" className={styles.toolbarButton} aria-label="Código" onClick={() => run(() => editor.chain().toggleCodeBlock().run())}>&lt;/&gt;</button>
      </div>
      <div className={styles.headingButtons}>{blocks.map((block) => <button key={block} type="button" className={(block === "p" ? editor.isActive("paragraph") : editor.isActive("heading", { level: Number(block.slice(1)) })) ? styles.toolbarButtonActive : styles.toolbarButton} onClick={() => run(() => block === "p" ? editor.chain().setParagraph().run() : editor.chain().toggleHeading({ level: Number(block.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run())}>{block.toUpperCase()}</button>)}</div>
      <div className={styles.colorButtons}>{colors.map((color) => <button key={color} type="button" className={styles.colorButton} style={{ "--c": color } as React.CSSProperties} aria-label={`Amarelo ${color}`} onClick={() => run(() => editor.chain().toggleHighlight({ color }).run())} />)}<button type="button" className={styles.clearButton} onClick={() => run(() => editor.chain().unsetAllMarks().setParagraph().run())}>Remover formatação</button></div>
    </div>
  </div>;
}

export function wordCount(content: JSONContent) { return (JSON.stringify(content).match(/"text":"([^"\\]|\\.)*"/g) ?? []).join(" ").replace(/"text":"|"/g, " ").trim().split(/\s+/).filter(Boolean).length; }
export function contentHeadings(content: JSONContent) { return (content.content ?? []).filter((node) => node.type === "heading" && Number(node.attrs?.level) <= 3).map((node) => (node.content ?? []).map((item) => item.text ?? "").join("")); }
export function highlightStyle(color: string) { return { "--hl": color } as React.CSSProperties; }
