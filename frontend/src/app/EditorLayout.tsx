"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./EditorLayout.module.css";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- ícones (SVG inline, sem dependências) ---------- */
const PATHS = {
  lang: "M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6",
  search: "M21 21l-4.3-4.3M11 4a7 7 0 100 14 7 7 0 000-14z",
  plus: "M12 5v14M5 12h14",
  img: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM21 15l-5-5L5 21M9 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z",
  link: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  ul: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  ol: "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-2-2-1",
  quote: "M3 21c3 0 7-1 7-8V5H4v6h4M14 21c3 0 7-1 7-8V5h-6v6h4",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  back: "M19 12H5M12 19l-7-7 7-7",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M18 6L6 18M6 6l12 12",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ---------- 1. Layout raiz: 240px | 1fr | 320px | 104px ---------- */
export function EditorLayout(props: {
  sidebar: ReactNode; // <EditorSidebar />
  topbar: ReactNode; // <EditorTopBar />
  editor: ReactNode; // <EditorContent editor={editor} />
  wordCount: number;
  attachments: ReactNode; // <AttachmentsPanel />
  format: ReactNode; // <FormatPanel />
  rail: ReactNode; // <ActionRail />
  error?: string; // Optional error message
}) {
  return (
    <main className={styles.root} data-testid="editor-root">
      {props.sidebar}
      <section className={styles.center}>
        {props.topbar}
        <div className={cx(styles.card, styles.editorCard)} data-testid="editor-card">
          <div className={styles.editorScroll}>{props.editor}</div>
          <span className={styles.wc} data-testid="word-count">
            {props.wordCount} {props.wordCount === 1 ? "palavra" : "palavras"}
          </span>
        </div>
        {props.error && <p className={styles.formError}>{props.error}</p>}
      </section>
      <aside className={styles.tools} data-testid="tools-column">
        {props.attachments}
        {props.format}
      </aside>
      {props.rail}
    </main>
  );
}

/* ---------- 2. Lateral esquerda ---------- */
export type SidebarItem = { id: string; icon: string; name: string; level?: number; active?: boolean };

export function EditorSidebar(props: {
  title: string; // ex.: "Idiomas"
  query: string;
  onQuery: (v: string) => void;
  tab: "blocos" | "indice";
  onTab: (t: "blocos" | "indice") => void;
  items: SidebarItem[];
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className={cx(styles.card, styles.sidebar)} data-testid="sidebar">
      <h2 className={styles.sideTitle} data-testid="sidebar-title">
        <Icon name="lang" />
        <b className={styles.hideCompact}>{props.title}</b>
      </h2>
      <label className={cx(styles.search, styles.hideCompact)} data-testid="sidebar-search">
        <Icon name="search" />
        <input
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          placeholder="Buscar blocos…"
          aria-label="Buscar blocos"
        />
      </label>
      <div className={cx(styles.tabs, styles.hideCompact)}>
        <button type="button" className={cx(styles.btn, props.tab === "blocos" && styles.btnOn)} onClick={() => props.onTab("blocos")}>
          Blocos
        </button>
        <button type="button" className={cx(styles.btn, props.tab === "indice" && styles.btnOn)} onClick={() => props.onTab("indice")}>
          Índice
        </button>
      </div>
      <ul className={styles.list} data-testid="block-list">
        {props.items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              className={cx(styles.listItem, it.active && styles.listActive)}
              onClick={() => props.onSelect(it.id)}
              title={it.name}
            >
              <b>{it.icon}</b>
              <span className={cx(styles.listName, styles.hideCompact)}>{it.name}</span>
              {it.level != null && <small className={styles.hideCompact}>{it.level}/5</small>}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.btn} onClick={props.onNew} data-testid="sidebar-new">
        <Icon name="plus" />
        <b className={styles.hideCompact}>Novo bloco</b>
      </button>
    </aside>
  );
}

/* ---------- 3. Barra superior (ícone, nome, categoria, nível, status) ---------- */
const LEVELS = ["Iniciante", "Básico", "Intermediário", "Bom", "Domino"];

export function EditorTopBar(props: {
  iconSlot: ReactNode; // botão/popover do emoji (preenche 48x48)
  name: string;
  onName: (v: string) => void;
  categorySlot: ReactNode; // combobox de categoria já existente
  level: number; // 0 a 5
  onLevel: (n: number) => void;
  dirty: boolean;
}) {
  return (
    <header className={cx(styles.card, styles.topbar)} data-testid="topbar">
      <div className={styles.row1}>
        <div className={styles.ico} data-testid="icon-button">
          {props.iconSlot}
        </div>
        <input
          className={styles.nameInput}
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          placeholder="Nome do bloco"
          aria-label="Nome do bloco"
          data-testid="name-input"
        />
      </div>
      <div className={styles.row2}>
        <div className={styles.catWrap} data-testid="category-combobox">
          {props.categorySlot}
        </div>
        <span className={styles.dots} data-testid="level-dots" role="group" aria-label="Nível de entendimento">
          Nível
          {LEVELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={cx(styles.dotBtn, i < props.level && styles.dotFull)}
              onClick={() => props.onLevel(i + 1)}
              title={label}
              aria-label={`${label} (${i + 1} de 5)`}
              aria-pressed={i < props.level}
            />
          ))}
        </span>
        <span className={cx(styles.status, props.dirty && styles.statusDirty)} data-testid="save-status" role="status">
          {props.dirty ? "Alterações não salvas" : "Salvo"}
        </span>
      </div>
    </header>
  );
}

/* ---------- 4. Painel de anexos (grade 2x2) ---------- */
export type AttachmentItem = { id: string; kind: "image" | "link" | "file"; label: string; href?: string; previewUrl?: string };

export function AttachmentsPanel(props: {
  items: AttachmentItem[];
  onAdd: (kind: AttachmentItem["kind"]) => void;
  onRemove: (id: string) => void;
}) {
  const filler = Math.max(0, 4 - props.items.length);
  return (
    <section className={cx(styles.card, styles.att)} data-testid="attachments-panel">
      <h3 className={styles.panelTitle}>Anexos</h3>
      <div className={styles.adds}>
        <button type="button" className={styles.btn} onClick={() => props.onAdd("image")} data-testid="attach-add-image">
          <Icon name="img" />
          Imagem
        </button>
        <button type="button" className={styles.btn} onClick={() => props.onAdd("link")} data-testid="attach-add-link">
          <Icon name="link" />
          Link
        </button>
        <button type="button" className={styles.btn} onClick={() => props.onAdd("file")} data-testid="attach-add-file">
          <Icon name="file" />
          Arquivo
        </button>
      </div>
      <div className={styles.grid} data-testid="attach-grid">
        {props.items.map((it) => (
          <div key={it.id} className={cx(styles.slot, styles.slotFull)} data-testid="attach-slot">
            {it.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.previewUrl} alt={it.label} className={styles.thumb} />
            ) : (
              <>
                <Icon name={it.kind === "link" ? "link" : it.kind === "image" ? "img" : "file"} />
                {it.href ? (
                  <a href={it.href} target="_blank" rel="noreferrer">
                    {it.label}
                  </a>
                ) : (
                  <span>{it.label}</span>
                )}
              </>
            )}
            <button type="button" className={styles.slotRemove} onClick={() => props.onRemove(it.id)} aria-label={`Remover ${it.label}`}>
              <Icon name="x" />
            </button>
          </div>
        ))}
        {Array.from({ length: filler }).map((_, i) => (
          <div key={`f${i}`} className={styles.slot} data-testid="attach-slot" />
        ))}
      </div>
      {props.items.length === 0 && <p className={styles.empty}>Nenhum anexo ainda. Arraste arquivos para cá.</p>}
    </section>
  );
}

/* ---------- 5. Painel Formatar (H1–H6 e cores EMPILHADOS) ---------- */
export type BlockKind = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
export type MarkKind = "bold" | "italic" | "underline" | "strike" | "bulletList" | "orderedList" | "blockquote" | "codeBlock" | "link";

const COLORS = [
  { id: "red", hex: "#F43F5E", name: "Vermelho" },
  { id: "yellow", hex: "#FACC15", name: "Amarelo" },
  { id: "green", hex: "#22C55E", name: "Verde" },
  { id: "blue", hex: "#4F8CFF", name: "Azul" },
  { id: "purple", hex: "#A78BFA", name: "Roxo" },
];

const MARKS: { kind: MarkKind; label: string; node: ReactNode }[] = [
  { kind: "bold", label: "Negrito", node: <b>B</b> },
  { kind: "italic", label: "Itálico", node: <i>I</i> },
  { kind: "underline", label: "Sublinhado", node: <u>U</u> },
  { kind: "strike", label: "Tachado", node: <s>S</s> },
  { kind: "bulletList", label: "Lista", node: <Icon name="ul" /> },
  { kind: "orderedList", label: "Lista numerada", node: <Icon name="ol" /> },
  { kind: "blockquote", label: "Citação", node: <Icon name="quote" /> },
  { kind: "codeBlock", label: "Bloco de código", node: <Icon name="code" /> },
  { kind: "link", label: "Link", node: <Icon name="link" /> },
];

export function FormatPanel(props: {
  activeBlock: BlockKind | null;
  onBlock: (b: BlockKind) => void;
  activeMarks?: Partial<Record<MarkKind, boolean>>;
  disabledMarks?: MarkKind[];
  onMark: (m: MarkKind) => void;
  onColor: (hex: string | null) => void; // null = sem cor
  onClear: () => void;
}) {
  const keep = (e: React.MouseEvent) => e.preventDefault(); // não perde a seleção do editor
  const blocks: BlockKind[] = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
  return (
    <section className={cx(styles.card, styles.fmt)} data-testid="format-panel">
      <h3 className={styles.panelTitle}>Formatar</h3>
      <div className={styles.icons}>
        {MARKS.map((m) => (
          <button
            key={m.kind}
            type="button"
            className={cx(styles.btn, props.activeMarks?.[m.kind] && styles.btnOn)}
            disabled={props.disabledMarks?.includes(m.kind)}
            onMouseDown={keep}
            onClick={() => props.onMark(m.kind)}
            aria-label={m.label}
            title={m.label}
          >
            {m.node}
          </button>
        ))}
      </div>
      <div className={styles.cols}>
        <div className={styles.col}>
          {blocks.map((b) => (
            <button
              key={b}
              type="button"
              className={cx(styles.btn, props.activeBlock === b && styles.btnOn)}
              onMouseDown={keep}
              onClick={() => props.onBlock(b)}
              data-testid={`heading-btn-${b}`}
            >
              {b === "p" ? "P · Parágrafo" : b.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={cx(styles.col, styles.colors)}>
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.dot}
              style={{ ["--c" as string]: c.hex }}
              onMouseDown={keep}
              onClick={() => props.onColor(c.hex)}
              aria-label={c.name}
              data-testid={`color-${c.id}`}
            >
              {c.name}
            </button>
          ))}
          <button type="button" className={cx(styles.dot, styles.dotNone)} onMouseDown={keep} onClick={() => props.onColor(null)} aria-label="Sem cor" data-testid="color-none">
            Sem cor
          </button>
          <button type="button" className={cx(styles.btn, styles.clear)} onMouseDown={keep} onClick={props.onClear} data-testid="clear-format">
            Remover formatação
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Trilho de ações (voltar, menu | Salvar, Cancelar) ---------- */
export function ActionRail(props: {
  onBack: () => void;
  menuItems: { label: string; onClick: () => void; danger?: boolean }[];
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <nav className={cx(styles.card, styles.rail)} data-testid="action-rail" aria-label="Ações do bloco">
      <div className={styles.railGroup} ref={ref}>
        <button type="button" className={styles.btn} onClick={props.onBack} aria-label="Voltar" data-testid="rail-back">
          <Icon name="back" />
        </button>
        <button type="button" className={styles.btn} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} data-testid="rail-menu">
          <Icon name="menu" />
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            {props.menuItems.map((m) => (
              <button
                key={m.label}
                type="button"
                role="menuitem"
                className={cx(styles.menuItem, m.danger && styles.menuDanger)}
                onClick={() => {
                  setOpen(false);
                  m.onClick();
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.railGroup}>
        <button type="button" className={cx(styles.btn, styles.save)} onClick={props.onSave} disabled={props.saving} data-testid="rail-save">
          {props.saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className={styles.btn} onClick={props.onCancel} data-testid="rail-cancel">
          Cancelar
        </button>
      </div>
    </nav>
  );
}
