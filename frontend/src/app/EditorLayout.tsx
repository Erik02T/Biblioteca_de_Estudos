"use client";

import { Button, Input, containModalTab } from './ui';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { OutlineHeading } from './document-outline';
import type { SavePresentation } from './save-status';
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
  check: "M5 12.5l4.2 4.2L19 2.5",
  back: "M19 12H5M12 19l-7-7 7-7",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M18 6L6 18M6 6l12 12",
  book: "M12 5.5C9.8 4 6 3.5 3 4.5v14c3-1 6.8-.5 9 1 2.2-1.5 6-2 9-1v-14c-3-1-6.8-.5-9 1zM12 5.5v14",
  home: "m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  logout: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  chevron: "m9 6 6 6-6 6",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18-3-3-3-15 0-18",
  filters: "M4 6h16M7 12h10M10 18h4",
  template: "M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/* Documento e ferramentas compartilham o layout sem remontar o editor. */
export function EditorLayout(props: {
  outline?: ReactNode;
  topbar: ReactNode; // <EditorTopBar />
  cover?: ReactNode;
  editor: ReactNode; // <EditorContent editor={editor} />
  wordCount: number;
  attachments: ReactNode; // <AttachmentsPanel />
  format: ReactNode; // <FormatPanel />
  rail: ReactNode; // <ActionRail />
  error?: string; // Optional error message
  fullWidth?: boolean;
  properties: ReactNode;
  attachmentCount: number;
}) {
  const [tool, setTool] = useState<'properties' | 'materials' | 'format' | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [wide, setWide] = useState(false);
  const panel = useRef<HTMLDialogElement>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const documentRef = useRef<HTMLElement>(null);
  const closeTool = (restore = true) => {
    panel.current?.close();
    setTool(null);
    if (restore) trigger.current?.focus();
  };
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1400px)');
    const update = () => setWide(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const dialog = panel.current;
    if (!dialog || !tool) return;
    dialog.close();
    if (wide) dialog.show(); else dialog.showModal();
    panelTitle.current?.focus({ preventScroll: true });
    return () => dialog.close();
  }, [tool, wide]);
  const labels = { properties: 'Propriedades', materials: `Materiais (${props.attachmentCount})`, format: 'Formatar' };
  return (
    <section aria-label="Editor da página" className={cx(styles.root, props.fullWidth && styles.fullWidth, Boolean(tool) && styles.withTool)} data-testid="editor-root" data-full-width={props.fullWidth ? "true" : "false"} data-focus-mode={focusMode} onKeyDownCapture={event => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      // O editor consome Escape; sair do foco tem precedência apenas nessa camada.
      if (focusMode && !tool && event.key === 'Escape' && !(event.target as HTMLElement).closest('[data-block-menu-open="true"]') && (event.target as HTMLElement).closest('.tiptap')) {
        event.preventDefault(); event.stopPropagation(); setFocusMode(false);
      }
    }} onKeyDown={event => {
      if (event.key !== 'Escape' || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.defaultPrevented) return;
      if (tool) { event.preventDefault(); event.stopPropagation(); closeTool(); }
      else if (focusMode) { event.preventDefault(); event.stopPropagation(); setFocusMode(false); }
    }}>
      <div className={styles.documentActions}>
        {props.rail}
        <div className={styles.toolTriggers} role="group" aria-label="Ferramentas da página">
          {(['properties', 'materials', 'format'] as const).map(name => <Button key={name} aria-controls="editor-tool" aria-expanded={tool === name} onMouseDown={event => event.preventDefault()} onClick={event => { trigger.current = event.currentTarget; if (tool === name) closeTool(); else setTool(name); }}>{labels[name]}</Button>)}
          <Button aria-pressed={focusMode} onClick={() => { closeTool(false); setFocusMode(!focusMode); if (!focusMode) documentRef.current?.querySelector<HTMLElement>('.tiptap, [role="textbox"]')?.focus({ preventScroll: true }); }}>{focusMode ? 'Sair do foco' : 'Modo foco'}</Button>
        </div>
      </div>
      <section className={styles.center} ref={documentRef}>
        {props.error && <p role={tool ? undefined : 'alert'} className={styles.formError}>{props.error}</p>}
        <div className={cx(styles.card, styles.editorCard)} data-testid="editor-card">
          {props.cover}
          {props.topbar}
          <div className={styles.editorScroll}>{props.editor}</div>
          <span className={styles.wc} data-testid="word-count">
            {props.wordCount} {props.wordCount === 1 ? "palavra" : "palavras"}
          </span>
        </div>
      </section>
      {!focusMode && !tool && props.outline}
      <dialog id="editor-tool" ref={panel} className={styles.toolDialog} aria-labelledby="editor-tool-title" onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); event.stopPropagation(); closeTool(); }}>
        <div className={styles.toolHeading}><h2 id="editor-tool-title" ref={panelTitle} tabIndex={-1}>{tool ? labels[tool] : 'Ferramentas'}</h2><Button aria-label="Fechar ferramenta" onClick={() => closeTool()}><Icon name="x" /></Button></div>
        {tool && props.error && <p role="alert" className={styles.formError}>{props.error}</p>}
        <div hidden={tool !== 'properties'}>{props.properties}</div>
        <div hidden={tool !== 'materials'}>{props.attachments}</div>
        <div hidden={tool !== 'format'} onClickCapture={event => {
          // Fecha o modal antes de o comando devolver o foco ao Tiptap.
          if ((event.target as HTMLElement).closest('button:not(:disabled)')) closeTool(false);
        }}>{props.format}</div>
      </dialog>
    </section>
  );
}

export function PageCover(props: {
  imageUrl?: string | null;
  position: number;
  onPosition: (value: number) => void;
  onPick: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.position);
  const reposition = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (!editing && wasEditing.current) reposition.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const finish = (apply: boolean) => {
    if (apply) props.onPosition(draft);
    setEditing(false);
  };
  return (
    <div className={cx(styles.cover, !props.imageUrl && styles.noCover)} data-testid="page-cover" onKeyDown={event => {
      if (editing && event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); finish(false); }
    }}>
      {props.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.imageUrl} alt="" className={styles.coverImage} style={{ objectPosition: `center ${editing ? draft : props.position}%` }} />
          <div className={styles.coverActions}>
            {editing ? <><label className={styles.coverLabel}>
              Recorte
              <Input autoFocus type="range" min={0} max={100} value={draft} onChange={(event) => setDraft(Number(event.target.value))} disabled={props.disabled} aria-label="Posição de recorte da capa" />
            </label><Button onClick={() => finish(true)}>Concluir recorte</Button><Button onClick={() => finish(false)}>Cancelar recorte</Button></> : <><Button ref={reposition} onClick={() => { setDraft(props.position); setEditing(true); }} disabled={props.disabled}>Reposicionar capa</Button><Button onClick={props.onPick} disabled={props.disabled}>Trocar capa</Button>
            <Button type="button" className={styles.btn} onClick={props.onRemove} disabled={props.disabled}>
              Remover capa
            </Button></>}
          </div>
        </>
      ) : (
        <Button type="button" className={styles.coverEmpty} onClick={props.onPick} disabled={props.disabled}>
          Adicionar capa
        </Button>
      )}
    </div>
  );
}

export function EditorOutline({ headings, onSelect }: { headings: OutlineHeading[]; onSelect: (key: string) => void }) {
  const [mode, setMode] = useState<'mouse' | 'explicit' | null>(null);
  const [query, setQuery] = useState('');
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pointerInside = useRef(false);
  const open = mode !== null;
  const filter = query.trim().toLowerCase();
  const items = headings.filter(item => item.text.toLowerCase().includes(filter));

  const closeAndFocus = useCallback(() => {
    setMode(null);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (document.querySelector('dialog[open], [data-block-menu-open="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      closeAndFocus();
    };
    const outside = (event: PointerEvent) => {
      if (mode === 'explicit' && !root.current?.contains(event.target as Node)) setMode(null);
    };
    window.addEventListener('keydown', escape, true);
    window.addEventListener('pointerdown', outside, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('pointerdown', outside, true);
    };
  }, [closeAndFocus, mode, open]);

  return (
    <div ref={root} className={styles.outline} onPointerEnter={event => {
      if (event.pointerType !== 'mouse') return;
      pointerInside.current = true;
      setMode(current => current ?? 'mouse');
    }} onPointerLeave={event => {
      if (event.pointerType !== 'mouse') return;
      pointerInside.current = false;
      if (mode === 'mouse' && !panel.current?.contains(document.activeElement)) setMode(null);
    }} onBlur={event => {
      if (mode === 'explicit' && !event.currentTarget.contains(event.relatedTarget)) setMode(null);
      if (mode === 'mouse' && !pointerInside.current && !panel.current?.contains(event.relatedTarget)) setMode(null);
    }}>
      <Button ref={trigger} className={styles.outlineTrigger} aria-label="Índice da página" title="Índice da página" aria-expanded={open} aria-controls={panelId} onMouseDown={event => event.preventDefault()} onClick={event => {
        const pointer = (event.nativeEvent as PointerEvent).pointerType;
        const mouse = event.detail > 0 && (pointer ? pointer === 'mouse' : window.matchMedia('(hover: hover)').matches);
        if (mouse) setMode(current => current ?? 'mouse');
        else setMode(current => current === 'explicit' ? null : 'explicit');
      }}>
        <Icon name="ul" />
      </Button>
      <div id={panelId} ref={panel} hidden={!open} className={styles.outlinePanel}>
        <nav aria-label="Índice da página" className={styles.outlineNavigation}>
          <label className={styles.search}>
            <Icon name="search" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar títulos…" aria-label="Filtrar índice" />
          </label>
          {items.length ? <ul className={styles.outlineList}>
            {items.map(item => <li key={item.key} data-level={item.level}>
              <Button className={styles.outlineItem} onMouseDown={event => event.preventDefault()} onClick={event => {
                onSelect(item.key);
                if (event.detail === 0 || mode === 'explicit') closeAndFocus();
              }}>{item.text}</Button>
            </li>)}
          </ul> : <p className={styles.saveHint} role="status">Nenhum título encontrado.</p>}
        </nav>
      </div>
    </div>
  );
}

/* ---------- 3. Barra superior (ícone, nome, categoria, nível, status) ---------- */
const LEVELS = ["Iniciante", "Básico", "Intermediário", "Bom", "Domino"];

export function EditorTopBar(props: {
  iconSlot: ReactNode; // botão/popover do emoji (preenche 48x48)
  name: string;
  onName: (v: string) => void;
  saveStatus: SavePresentation;
  saveHint: string;
  selectName?: boolean;
  onStartWriting?: () => void;
}) {
  const title = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = title.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth !== undefined && width !== nextWidth) { width = nextWidth; resize(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [props.name]);
  return (
    <header className={cx(styles.card, styles.topbar)} data-testid="topbar">
      <div className={styles.row1}>
        <div className={styles.ico} data-testid="icon-button">
          {props.iconSlot}
        </div>
        <textarea
          ref={title}
          className={styles.nameInput}
          rows={1}
          autoFocus={props.selectName}
          onFocus={event => { if (props.selectName) event.currentTarget.select(); }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
              event.preventDefault(); props.onStartWriting?.();
            }
          }}
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          placeholder="Nome da página"
          aria-label="Nome da página"
          data-testid="name-input"
        />
      </div>
      <div className={styles.row2}>
        <span className={cx(styles.status, props.saveStatus.pending && styles.statusDirty)} data-testid="save-status" role="status" aria-live="polite" aria-atomic="true">
          {props.saveStatus.text}
        </span>
      </div>
      <p className={styles.saveHint}>{props.saveHint}</p>
    </header>
  );
}

export function EditorProperties(props: { children: ReactNode; level: number; onLevel: (value: number) => void; onApply?: () => void; saving?: boolean }) {
  return <section className={styles.properties} aria-label="Propriedades da página">
    {props.children}
    <div className={styles.dots} data-testid="level-dots" role="group" aria-label="Nível de entendimento">
          Nível
          {LEVELS.map((label, i) => (
            <Button
              key={label}
              type="button"
              className={cx(styles.dotBtn, i < props.level && styles.dotFull)}
              onClick={() => props.onLevel(i + 1)}
              title={label}
              aria-label={`${i + 1} — ${label}, nível de entendimento`}
              aria-pressed={i < props.level}
            >{i + 1}</Button>
          ))}
    </div>
    <p className={styles.saveHint}>{props.onApply ? 'Conteúdo e propriedades são salvos automaticamente. Aplicar confirma as alterações agora.' : 'O conteúdo e as propriedades serão gravados ao criar a página.'}</p>
    {props.onApply && <Button disabled={props.saving} onClick={props.onApply}>Aplicar alterações</Button>}
  </section>;
}

/* ---------- 4. Painel de anexos (grade 2x2) ---------- */
export type AttachmentItem = { id: string; kind: "image" | "link" | "file"; label: string; href?: string; previewUrl?: string };

export function AttachmentsPanel(props: {
  items: AttachmentItem[];
  onAdd: (kind: AttachmentItem["kind"]) => void;
  onRemove: (id: string) => void;
  onInsert?: (id: string) => void;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
}) {
  return (
    <section className={cx(styles.card, styles.att)} data-testid="attachments-panel">
      <h3 className={styles.panelTitle}>Anexos da página</h3>
      <div className={styles.adds}>
        <Button type="button" className={styles.btn} onClick={() => props.onAdd("image")} data-testid="attach-add-image">
          <Icon name="img" />
          Imagem
        </Button>
        <Button type="button" className={styles.btn} onClick={() => props.onAdd("link")} data-testid="attach-add-link">
          <Icon name="link" />
          Link
        </Button>
        <Button type="button" className={styles.btn} onClick={() => props.onAdd("file")} data-testid="attach-add-file">
          <Icon name="file" />
          Arquivo
        </Button>
      </div>
      <div className={styles.grid} data-testid="attach-grid">
        {props.items.map((it) => (
          <div key={it.id} className={cx(styles.slot, styles.slotFull)} data-testid="attach-slot">
            {it.previewUrl ? (
              <a
                href={it.href ?? it.previewUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.thumbLink}
                title={`Abrir ${it.label} em nova aba`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.previewUrl} alt={it.label} className={styles.thumb} />
              </a>
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
            {props.onInsert && <Button type="button" onClick={() => props.onInsert?.(it.id)} aria-label={`Inserir ${it.label} no texto`}>Inserir no texto</Button>}
            <Button type="button" className={styles.slotRemove} onClick={() => props.onRemove(it.id)} aria-label={`Remover ${it.label}`}>
              <Icon name="x" />
            </Button>
          </div>
        ))}
      </div>
      {props.loading && <p role="status" className={styles.empty}>Carregando materiais…</p>}
      {props.loadError && <><p role="alert" className={styles.formError}>{props.loadError}</p><Button onClick={props.onRetry}>Tentar carregar materiais novamente</Button></>}
      {!props.loading && !props.loadError && props.items.length === 0 && <p className={styles.empty}>Nenhum anexo ainda. Use Imagem, Link ou Arquivo para adicionar.</p>}
    </section>
  );
}

/* ---------- 5. Painel Formatar (H1–H6 e cores EMPILHADOS) ---------- */
export type BlockKind = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
export type MarkKind = "bold" | "italic" | "underline" | "strike" | "bulletList" | "orderedList" | "taskList" | "blockquote" | "codeBlock" | "link" | "toggleBlock" | "callout";

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
  { kind: "taskList", label: "Checklist", node: <Icon name="check" /> },
  { kind: "blockquote", label: "Citação", node: <Icon name="quote" /> },
  { kind: "codeBlock", label: "Bloco de código", node: <Icon name="code" /> },
  { kind: "toggleBlock", label: "Alternante", node: <span>▾</span> },
  { kind: "callout", label: "Destaque", node: <span>!</span> },
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
  fullWidth?: boolean;
  onFullWidth?: (value: boolean) => void;
}) {
  const keep = (e: React.MouseEvent) => e.preventDefault(); // não perde a seleção do editor
  const blocks: BlockKind[] = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
  return (
    <section className={cx(styles.card, styles.fmt)} data-testid="format-panel">
      <h3 className={styles.panelTitle}>Formatar</h3>
      <div className={styles.icons}>
        {MARKS.map((m) => (
          <Button
            key={m.kind}
            type="button"
            className={cx(styles.btn, props.activeMarks?.[m.kind] && styles.btnOn)}
            disabled={props.disabledMarks?.includes(m.kind)}
            onMouseDown={keep}
            onClick={() => props.onMark(m.kind)}
            aria-label={m.label}
            aria-pressed={Boolean(props.activeMarks?.[m.kind])}
            title={m.label}
          >
            {m.node}
          </Button>
        ))}
      </div>
      <div className={styles.cols}>
        <div className={styles.col}>
          {blocks.map((b) => (
            <Button
              key={b}
              type="button"
              className={cx(styles.btn, props.activeBlock === b && styles.btnOn)}
              onMouseDown={keep}
              onClick={() => props.onBlock(b)}
              data-testid={`heading-btn-${b}`}
              aria-pressed={props.activeBlock === b}
            >
              {b === "p" ? "P · Parágrafo" : b.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className={cx(styles.col, styles.colors)}>
          {COLORS.map((c) => (
            <Button
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
            </Button>
          ))}
          <Button type="button" className={cx(styles.dot, styles.dotNone)} onMouseDown={keep} onClick={() => props.onColor(null)} aria-label="Sem cor" data-testid="color-none">
            Sem cor
          </Button>
          <Button type="button" className={cx(styles.btn, styles.clear)} onMouseDown={keep} onClick={props.onClear} data-testid="clear-format">
            Remover formatação
          </Button>
          {props.onFullWidth && (
            <Button
              type="button"
              className={cx(styles.btn, props.fullWidth && styles.btnOn)}
              onMouseDown={keep}
              onClick={() => props.onFullWidth?.(!props.fullWidth)}
              data-testid="full-width-toggle"
              aria-pressed={Boolean(props.fullWidth)}
            >
              {props.fullWidth ? "Largura padrão" : "Largura ampla"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Ações da página, incorporadas ao cabeçalho ---------- */
export function ActionRail(props: {
  onBack: () => void;
  menuItems: { label: string; onClick: () => void; danger?: boolean }[];
  onSave: () => void;
  saveLabel: string;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      } else if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <nav className={cx(styles.card, styles.rail)} data-testid="action-rail" aria-label="Ações da página">
      <div className={styles.railGroup} ref={ref}>
        <Button type="button" className={styles.btn} onClick={props.onBack} aria-label="Voltar" data-testid="rail-back">
          <Icon name="back" /> Voltar
        </Button>
        <Button ref={trigger} type="button" className={styles.btn} onClick={() => setOpen((o) => !o)} aria-label="Mais opções da página" aria-expanded={open} data-testid="rail-menu">
          <Icon name="menu" />
        </Button>
        {open && (
          <div className={styles.menu} role="menu" onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'Escape') {
              event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return;
            }
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
              buttons[next]?.focus();
            }
          }} onBlur={(event) => { if (!ref.current?.contains(event.relatedTarget)) setOpen(false); }}>
            {props.menuItems.map((m) => (
              <Button
                key={m.label}
                type="button"
                role="menuitem"
                className={cx(styles.menuItem, m.danger && styles.menuDanger)}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                  m.onClick();
                }}
              >
                {m.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.railGroup}>
        <Button type="button" className={cx(styles.btn, styles.save)} onClick={props.onSave} disabled={props.saving} data-testid="rail-save">
          {props.saving ? "Salvando…" : props.saveLabel}
        </Button>

      </div>
    </nav>
  );
}
