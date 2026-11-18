'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { Button } from './ui';
import { activeDocumentBlock, blockTypes, blockMoveDestinations, canConvertBlock, convertDocumentBlock, insertDocumentBlock, matchingBlockTypes, moveDocumentBlock, operateDocumentBlock, selectParentBlock, slashQuery, type BlockOperation } from './block-commands';
import { registerDocumentDrag } from './document-drag';
import styles from './BlockControls.module.css';

type Menu = 'insert' | 'convert' | 'actions' | 'slash' | 'move' | null;
export type ResourceInsertKind = 'image' | 'attachment' | 'link' | 'pageInline' | 'pageBlock';
const resourceTypes: { id: ResourceInsertKind; label: string; search: string }[] = [
  { id: 'image', label: 'Imagem', search: 'imagem image foto' },
  { id: 'attachment', label: 'Arquivo', search: 'arquivo anexo attachment file' },
  { id: 'link', label: 'Link de material', search: 'link material fonte' },
  { id: 'pageInline', label: 'Referência no texto', search: 'referencia pagina page inline' },
  { id: 'pageBlock', label: 'Referência em bloco', search: 'referencia pagina page bloco' },
];

/** Commands use the existing editor and transactions; the document is never recreated. */
export function BlockControls({ editor, children, onInsertResource }: { editor: Editor; children: React.ReactNode; onInsertResource?: (kind: ResourceInsertKind, slash: boolean) => void }) {
  const [state, setState] = useState(editor.state);
  const [menu, setMenu] = useState<Menu>(null);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState<{ id: string | null; pos: number } | null>(null);
  const [blockPosition, setBlockPosition] = useState<{ top: number; left: number } | null>(null);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const composing = useRef(false);
  const dismissed = useRef<string | null>(null);
  let targetPos: number | undefined;
  if (target) {
    if (target.id) state.doc.descendants((node, pos) => { if (node.attrs.id === target.id) targetPos = pos; });
    else if (state.doc.nodeAt(target.pos)?.isBlock) targetPos = target.pos;
  }
  const block = activeDocumentBlock(state, targetPos);
  const slash = slashQuery(state);
  const types = matchingBlockTypes(menu === 'slash' ? slash?.query ?? '' : '');
  const resourceQuery = (menu === 'slash' ? slash?.query ?? '' : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const resources = onInsertResource && menu !== 'convert' ? resourceTypes.filter(type => type.search.includes(resourceQuery)) : [];
  const destinations = menu === 'move' ? blockMoveDestinations(editor, targetPos) : [];
  const close = () => {
    dismissed.current = slashQuery(editor.state)?.query ?? null;
    setMenu(null);
  };
  const restoreFocus = () => {
    if (menu === 'slash') editor.view.focus();
    else trigger.current?.focus();
  };

  useEffect(() => registerDocumentDrag(editor), [editor]);
  useEffect(() => {
    // Chromium may collapse a details NodeSelection when focus returns from a
    // menu. Keep the explicit group target until the user interacts with text.
    const clear = () => setTarget(null);
    const dom = editor.view.dom;
    dom.addEventListener('pointerdown', clear, true); dom.addEventListener('keydown', clear, true);
    document.addEventListener('dragstart', clear);
    return () => { dom.removeEventListener('pointerdown', clear, true); dom.removeEventListener('keydown', clear, true); document.removeEventListener('dragstart', clear); };
  }, [editor]);
  useEffect(() => {
    const element = targetPos === undefined ? null : editor.view.nodeDOM(targetPos);
    if (!(element instanceof HTMLElement)) return;
    element.classList.add('document-block-target');
    return () => element.classList.remove('document-block-target');
  }, [editor, targetPos, state]);
  useEffect(() => {
    const position = () => {
      const selected = activeDocumentBlock(editor.state);
      const element = selected ? editor.view.nodeDOM(selected.pos) : null;
      if (!(element instanceof HTMLElement)) { setBlockPosition(null); return; }
      const rect = element.getBoundingClientRect();
      setBlockPosition(rect.bottom > 0 && rect.top < innerHeight ? { top: Math.max(4, rect.top - 32), left: Math.max(4, Math.min(rect.right - 96, innerWidth - 100)) } : null);
    };
    editor.on('transaction', position); window.addEventListener('resize', position); document.addEventListener('scroll', position, true);
    return () => { editor.off('transaction', position); window.removeEventListener('resize', position); document.removeEventListener('scroll', position, true); };
  }, [editor]);

  useEffect(() => {
    const update = () => {
      setState(editor.state);
      const query = slashQuery(editor.state);
      if (!query) dismissed.current = null;
      if (query && !composing.current && !editor.view.composing && dismissed.current !== query.query) {
        setMenu('slash'); setActive(0);
      } else setMenu(current => current === 'slash' ? null : current);
    };
    const start = () => { composing.current = true; setMenu(null); };
    const end = () => {
      composing.current = false;
      dismissed.current = slashQuery(editor.state)?.query ?? null;
    };
    editor.on('transaction', update);
    const dom = editor.view.dom;
    dom.addEventListener('compositionstart', start);
    dom.addEventListener('compositionend', end);
    return () => {
      editor.off('transaction', update);
      dom.removeEventListener('compositionstart', start);
      dom.removeEventListener('compositionend', end);
    };
  }, [editor]);

  useEffect(() => {
    const element = popup.current;
    if (!menu || !element) return;
    const position = () => {
      const anchor = menu === 'slash' ? editor.view.coordsAtPos(editor.state.selection.from) : trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      element.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - element.offsetWidth - 12))}px`;
      element.style.top = `${Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - element.offsetHeight - 12))}px`;
    };
    element.showPopover(); position();
    if (menu !== 'slash') element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) {
        dismissed.current = slashQuery(editor.state)?.query ?? null;
        setMenu(null);
      }
    };
    const scroll = (event: Event) => { if (!element.contains(event.target as Node)) position(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', position);
    return () => {
      element.hidePopover();
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', position);
    };
  }, [menu, editor]);

  const activeType = [...types, ...resources][active]?.id;
  useEffect(() => {
    const dom = editor.view.dom;
    if (menu === 'slash') {
      dom.setAttribute('aria-controls', menuId);
      dom.setAttribute('aria-expanded', 'true');
      if (activeType) dom.setAttribute('aria-activedescendant', `${menuId}-${activeType}`);
    }
    return () => {
      dom.removeAttribute('aria-controls'); dom.removeAttribute('aria-expanded'); dom.removeAttribute('aria-activedescendant');
    };
  }, [editor, menu, menuId, activeType]);

  const open = (next: Menu, button: HTMLButtonElement) => {
    trigger.current = button; setActive(0);
    if (next === menu) close(); else setMenu(next);
  };
  const run = (command: () => boolean, message: string) => {
    const originalId = targetPos === undefined ? null : editor.state.doc.nodeAt(targetPos)?.attrs.id;
    if (targetPos !== undefined) editor.commands.setNodeSelection(targetPos);
    const success = command();
    const selection = editor.state.selection;
    let preserved: { id: string; pos: number } | null = null;
    if (originalId) editor.state.doc.descendants((node, pos) => { if (node.attrs.id === originalId) preserved = { id: originalId, pos }; });
    setTarget(selection instanceof NodeSelection && selection.node.isBlock ? { id: selection.node.attrs.id ?? null, pos: selection.from } : preserved);
    close();
    setNotice(success ? `${message} Use Desfazer para reverter.` : 'O bloco foi preservado. Posicione o cursor em um único bloco para executar esta ação.');
    editor.view.focus();
  };
  const operations: { id: BlockOperation; label: string; disabled?: boolean }[] = [
    { id: 'duplicate', label: 'Duplicar bloco' },
    { id: 'up', label: 'Mover bloco para cima', disabled: !block || block.index === 0 },
    { id: 'down', label: 'Mover bloco para baixo', disabled: !block || block.index === block.parent.childCount - 1 },
    { id: 'delete', label: 'Excluir bloco' },
  ];
  const handleOperation = (event: React.MouseEvent<HTMLButtonElement>) => {
    const operation = event.currentTarget.dataset.operation as BlockOperation;
    const original = block;
    let success = false;
    run(() => { success = operateDocumentBlock(editor, operation); return success; }, `${event.currentTarget.textContent}: concluído.`);
    if (success && original && operation === 'duplicate') {
      const copied = editor.state.doc.nodeAt(original.end);
      if (copied?.isBlock) setTarget({ id: copied.attrs.id ?? null, pos: original.end });
    }
  };
  const label = block?.node.type.name === 'heading' ? `Título ${block.node.attrs.level}` : blockTypes.find(type => type.id === block?.node.type.name)?.label ?? (block ? ({ listItem: 'Item de lista', taskItem: 'Tarefa', image: 'Imagem', attachment: 'Material' }[block.node.type.name] ?? block.node.type.name) : 'Seleção de vários blocos');

  return <div ref={root} className={styles.root} data-block-menu-open={Boolean(menu)} onKeyDownCapture={event => {
    if (!menu || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || editor.view.composing || composing.current) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); close(); restoreFocus(); return;
    }
    if (event.key === 'Tab') { close(); return; }
    const buttons = Array.from(popup.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && buttons.length) {
      event.preventDefault(); event.stopPropagation();
      const current = menu === 'slash' ? active : buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      setActive(next);
      if (menu !== 'slash') buttons[next]?.focus(); else buttons[next]?.scrollIntoView({ block: 'nearest' });
    } else if (menu === 'slash' && event.key === 'Enter') {
      event.preventDefault(); event.stopPropagation(); buttons[active]?.click();
    }
  }}>
    <div className={styles.toolbar} role="group" aria-label="Comandos do documento">
      <Button disabled={!editor.isEditable || !block} aria-haspopup="menu" aria-expanded={menu === 'insert'} onMouseDown={event => event.preventDefault()} onClick={event => open('insert', event.currentTarget)}>+ Inserir bloco</Button>
      <Button disabled={!editor.isEditable || !block} aria-haspopup="menu" aria-expanded={menu === 'convert'} onMouseDown={event => event.preventDefault()} onClick={event => open('convert', event.currentTarget)}>Transformar bloco</Button>
      <Button disabled={!editor.isEditable || !block} aria-haspopup="menu" aria-expanded={menu === 'actions'} onMouseDown={event => event.preventDefault()} onClick={event => open('actions', event.currentTarget)}>Ações do bloco</Button>
      <Button disabled={!editor.isEditable || !editor.can().undo()} onMouseDown={event => event.preventDefault()} onClick={() => { setTarget(null); close(); editor.chain().focus().undo().run(); setNotice('Última alteração desfeita.'); }}>Desfazer</Button>
      <Button disabled={!editor.isEditable || !editor.can().redo()} onMouseDown={event => event.preventDefault()} onClick={() => { setTarget(null); close(); editor.chain().focus().redo().run(); setNotice('Alteração refeita.'); }}>Refazer</Button>
    </div>
    <p className={styles.hint}>Bloco atual: {label}. Digite / em um parágrafo vazio. Alt+Shift+↑/↓ move o bloco.</p>
    <span role="status" className="sr-only">{notice}</span>
    {blockPosition && editor.isEditable && <div className={styles.blockTools} style={blockPosition} role="group" aria-label="Ferramentas do bloco atual">
      <button type="button" aria-label="Inserir junto ao bloco" aria-haspopup="menu" onMouseDown={event => event.preventDefault()} onClick={event => open('insert', event.currentTarget)}>+</button>
      <button type="button" aria-label="Menu do bloco atual" aria-haspopup="menu" onMouseDown={event => event.preventDefault()} onClick={event => open('actions', event.currentTarget)}>⋯</button>
    </div>}
    {menu && <div id={menuId} ref={popup} popover="manual" className={styles.menu} role="menu" aria-label={menu === 'actions' ? 'Ações do bloco' : menu === 'convert' ? 'Transformar bloco' : 'Inserir bloco'}>
      <p className={styles.menuTitle}>{menu === 'actions' ? 'Ações do bloco' : menu === 'convert' ? 'Transformar bloco' : 'Inserir bloco'}</p>
      {menu === 'convert' && <p className={styles.hint}>Converta texto ou títulos. Estruturas e formatações incompatíveis são preservadas e ficam indisponíveis.</p>}
      {menu === 'slash' && <p className={styles.hint}>/{slash?.query} · ↑↓ escolher · Enter inserir · Esc fechar</p>}
      {menu === 'actions' ? <>{operations.map(operation => <button key={operation.id} data-operation={operation.id} type="button" role="menuitem" disabled={operation.disabled || !block} className={operation.id === 'delete' ? styles.danger : undefined} onMouseDown={event => event.preventDefault()} onClick={handleOperation}>{operation.label}</button>)}<button type="button" role="menuitem" onClick={() => setMenu('move')}>Mover para…</button><button type="button" role="menuitem" disabled={!block || block.depth <= 1} onClick={() => { if (targetPos !== undefined) editor.commands.setNodeSelection(targetPos); if (selectParentBlock(editor)) { const selected = activeDocumentBlock(editor.state); if (selected) setTarget({ id: selected.node.attrs.id ?? null, pos: selected.pos }); } close(); editor.view.focus(); }}>Selecionar grupo pai</button></> : menu === 'move' ? <>{destinations.length === 0 && <p>Nenhum destino compatível.</p>}{destinations.map(item => <button key={item.pos} type="button" role="menuitem" onClick={() => run(() => Boolean(block && moveDocumentBlock(editor, block.pos, item.pos)), 'Bloco movido.')}>{item.label}</button>)}</> : <>
        {types.length + resources.length === 0 && <p className={styles.hint}>Nenhum comando encontrado. Escape mantém o texto digitado.</p>}
        {types.map((type, index) => <button key={type.id} id={`${menuId}-${type.id}`} type="button" role="menuitem" disabled={menu === 'convert' ? !canConvertBlock(state, type.id) : !insertDocumentBlock(editor, type.id, menu === 'slash', true)} data-active={menu === 'slash' && active === index} onMouseDown={event => event.preventDefault()} onClick={() => run(() => menu === 'convert' ? convertDocumentBlock(editor, type.id) : insertDocumentBlock(editor, type.id, menu === 'slash'), `${type.label}: ${menu === 'convert' ? 'bloco transformado' : 'bloco inserido'}.`)}>{type.label}</button>)}
        {resources.map((type, index) => <button key={type.id} id={`${menuId}-${type.id}`} type="button" role="menuitem" data-active={menu === 'slash' && active === types.length + index} onMouseDown={event => event.preventDefault()} onClick={() => { const isSlash = menu === 'slash'; close(); onInsertResource?.(type.id, isSlash); }}>{type.label}</button>)}
      </>}
    </div>}
    {children}
  </div>;
}
