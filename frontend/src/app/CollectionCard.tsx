import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './EditorLayout';
import { librarySections } from './LibraryNavigation';
import { libraryUrl } from './library-route';
import type { Area } from './page';
import type { UpdateStudy } from './StudyProperties';
import { Button, Select, containModalTab } from './ui';
import styles from './page.module.css';

type CollectionCardProps = {
  area: Area;
  onEdit: () => void;
  onDelete: () => void;
  onPurge: () => void;
  onFavoriteToggle: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDeleting: boolean;
  isAnyDeleting: boolean;
  isFavoriteLoading: boolean;
  showTrash: boolean;
  manualOrder: boolean;
  isDropTarget: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (sourceId: string) => void;
};

export function CollectionCard({
  area, onEdit, onDelete, onPurge, onFavoriteToggle, onDuplicate, onMove, onMoveUp, onMoveDown,
  canMoveUp, canMoveDown, isDeleting, isAnyDeleting, isFavoriteLoading, showTrash,
  manualOrder, isDropTarget, onDragOver, onDragLeave, onDrop,
}: CollectionCardProps) {
  const actions = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const level = Math.max(0, Math.min(5, area.nivelEntendimento ?? 0));
  const reorderable = manualOrder && !showTrash;
  const closeActions = (restoreFocus: boolean) => {
    if (actions.current) actions.current.open = false;
    if (restoreFocus) trigger.current?.focus();
  };
  const run = (action: () => void) => {
    closeActions(true);
    action();
  };

  return <article className={styles.collectionCard} data-page-id={area.id} data-drop-target={isDropTarget}
    draggable={reorderable}
    onDragStart={event => {
      if (!reorderable) return;
      event.dataTransfer.setData('text/area-id', area.id);
      event.dataTransfer.effectAllowed = 'move';
    }}
    onDragOver={event => {
      if (!reorderable) return;
      event.preventDefault();
      onDragOver();
    }}
    onDragLeave={onDragLeave}
    onDrop={event => {
      if (!reorderable) return;
      event.preventDefault();
      const sourceId = event.dataTransfer.getData('text/area-id');
      if (sourceId) onDrop(sourceId);
    }}>
    <div className={styles.cardHeading}>
      <span className={styles.cardPageIcon} aria-hidden="true">{area.icone || <Icon name="file" />}</span>
      <div className={styles.cardName}>
        <h2>{showTrash ? area.nome : <a href={libraryUrl({ pageId: area.id })} draggable={false}
          onClick={event => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onEdit();
          }}>{area.nome}</a>}</h2>
        {area.categoria?.trim() && <p>{area.categoria}</p>}
      </div>
    </div>
    <div className={styles.cardControls}>
      {!showTrash && <Button className={styles.cardIconButton} aria-label={`Favoritar ${area.nome}`}
        aria-pressed={Boolean(area.isFavorite)} aria-busy={isFavoriteLoading}
        disabled={isAnyDeleting || isFavoriteLoading} onClick={onFavoriteToggle}><Icon name="star" /></Button>}
      <details ref={actions} className={styles.cardActionsMenu} onToggle={event => setActionsOpen(event.currentTarget.open)} onBlur={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) closeActions(false);
      }} onKeyDown={event => {
        if (event.key === 'Escape' && event.currentTarget.open && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          closeActions(true);
        }
      }}>
        <summary ref={trigger} className={styles.cardIconButton} role="button" aria-expanded={actionsOpen}
          aria-label={`Ações da página: ${area.nome}`}><Icon name="more" /></summary>
        <div className={styles.cardMenuPanel}>
          {showTrash ? <>
            <Button onClick={() => run(onDelete)} disabled={isAnyDeleting} aria-busy={isDeleting}>Restaurar</Button>
            <Button onClick={() => run(onPurge)} disabled={isAnyDeleting} className={styles.cardDanger}>Excluir definitivamente</Button>
          </> : <>
            <Button onClick={() => run(onEdit)} disabled={isAnyDeleting}>Abrir página</Button>
            <Button onClick={() => run(onDuplicate)} disabled={isAnyDeleting}>Duplicar</Button>
            <Button onClick={() => run(onMove)} disabled={isAnyDeleting}>Mover para outra área</Button>
            {canMoveUp && <Button onClick={() => run(onMoveUp)} disabled={isAnyDeleting}>Mover para cima</Button>}
            {canMoveDown && <Button onClick={() => run(onMoveDown)} disabled={isAnyDeleting}>Mover para baixo</Button>}
            <Button onClick={() => run(onDelete)} disabled={isAnyDeleting} aria-busy={isDeleting} className={styles.cardDanger}>Mover para a lixeira</Button>
          </>}
        </div>
      </details>
    </div>
    <div className={styles.cardMetadata}>
      <span className={styles.cardStatus} data-status={area.subSection}>{area.subSection === 'ESTUDADO' ? 'Estudado' : 'Estudando'}</span>
      <div className={styles.cardLevel}>
        <span>Entendimento <strong>{level}/5</strong></span>
        <span className={styles.cardLevelMeter} aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => <span key={index} data-filled={index < level} />)}
        </span>
      </div>
    </div>
  </article>;
}

export function MovePageDialog({ area, onMove, onClose }: { area: Area; onMove: UpdateStudy; onClose: (moved: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const infoId = useId();
  const [section, setSection] = useState<Area['section'] | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const close = (moved = false) => {
    dialog.current?.close();
    onClose(moved);
  };
  return <dialog ref={dialog} className={styles.savedViewsDialog} aria-labelledby={titleId} aria-describedby={infoId}
    onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className={styles.savedViewsHeader}><h2 id={titleId}>Mover para outra área</h2></div>
    <form className={styles.savedViewsBody} onSubmit={async event => {
      event.preventDefault();
      if (!section || busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await onMove(area, { section, ...(area.parentId ? { parentId: null } : {}) });
        close(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível mover a página.');
        setBusy(false);
      }
    }}>
      <p id={infoId}>“{area.nome}” e suas subpáginas serão movidas. {area.parentId && 'A página ficará na raiz da nova área.'}</p>
      <label className="ui-field">Área de destino
        <Select value={section} required disabled={busy} onChange={event => setSection(event.target.value as Area['section'] | '')}>
          <option value="">Selecione uma área</option>
          {librarySections.filter(item => item.value !== area.section).map(item =>
            <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </label>
      {error && <p role="alert" className={styles.filterError}>{error}</p>}
      <div className={styles.savedViewsActions}>
        <Button onClick={() => close()} disabled={busy}>Cancelar</Button>
        <Button type="submit" className={styles.collectionPrimary} disabled={!section || busy}>{busy ? 'Movendo…' : 'Mover página'}</Button>
      </div>
    </form>
  </dialog>;
}
