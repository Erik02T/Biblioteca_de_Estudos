"use client";

import { Button, Input, Select, Field, containModalTab } from './ui';
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { ActionRail, AttachmentsPanel, EditorLayout, EditorOutline, EditorTopBar, EditorProperties, FormatPanel, PageCover, type AttachmentItem, type BlockKind, type MarkKind } from "./EditorLayout";
import { wordCount } from "./AreaEditor";
import { documentHeadings } from './document-outline';
import { editorExtensions } from "./extensions";
import { BlockControls, type ResourceInsertKind } from "./BlockControls";
import { DocumentResourcePicker } from './DocumentResourcePicker';
import { DocumentInsertion } from './document-insertion';
import { configureDocumentResources, createDocumentResources, type ResolvedAttachment } from './document-resources';
import { canConvertBlock, convertDocumentBlock, type BlockType } from './block-commands';
import { editedDocumentContent, getEditorContent, originalDocumentText, unsupportedEditorFeatures } from "./editor-document";
import { DraftRecovery, downloadDraft } from './DraftRecovery';
import { draftStore, type LocalDraft, type PageSnapshot } from './draft-store';
import { PageSaveCoordinator, PageSaveError, type SavedPage } from './page-save-coordinator';
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { ViewConfiguration } from "./ViewConfiguration";
import { TemplateGallery } from "./TemplateGallery";
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { PortabilityDialog } from "./PortabilityDialog";
import { libraryUrl, readLibraryRoute, type LibraryRoute } from "./library-route";
import { createAuthenticatedFetch, fetchApi, resolveApiUrl, type AuthTokens } from "./api-client";
import { getSavePresentation } from './save-status';
import styles from "./page.module.css";
import { LibraryNavigation, librarySections, PageBreadcrumb } from './LibraryNavigation';
import { pageAncestors, parentCandidates } from './page-hierarchy';
import { advancedFilters, collectionOrder, collectionParameters, responseValue, type LibraryRequest } from './collection-query';
import type { UpdateStudy, ReloadStudy } from './StudyProperties';

type Section = "LINGUAGENS" | "FACULDADE" | "PROJETOS" | "OUTROS";
type SubSection = "ESTUDANDO" | "ESTUDADO";
type AreaContent = JSONContent | { texto?: string };
export type Area = { id: string; section: Section; subSection: SubSection; nome: string; categoria: string; nivelEntendimento: number; icone: string | null; parentId?: string | null; targetPageId?: string | null; coverAttachmentId?: string | null; coverPosition?: number | null; fullWidth?: boolean | null; sortOrder?: number | null; conteudo?: AreaContent; updatedAt: string; isFavorite?: boolean | null; lastOpenedAt?: string | null; deletedAt?: string | null };
type AreaPage = { items: Area[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
const emptyCollection: AreaPage = { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
type Attachment = ResolvedAttachment & { createdAt?: string };
type AreaFormValues = { nome: string; categoria: string; nivelEntendimento: number; icone: string; parentId?: string | null; targetPageId?: string | null; coverAttachmentId?: string | null; coverPosition: number; fullWidth: boolean; conteudo: JSONContent; updatedAt?: string };
function formSnapshot(value: AreaFormValues, section: Section, subSection: SubSection): PageSnapshot {
  return { conteudo: value.conteudo, nivelEntendimento: value.nivelEntendimento, coverPosition: value.coverPosition, fullWidth: value.fullWidth, section, subSection, nome: value.nome.trim(), categoria: value.categoria.trim(), icone: value.icone.trim(), parentId: value.parentId ?? null, targetPageId: value.targetPageId ?? null, coverAttachmentId: value.coverAttachmentId ?? null };
}

const apiUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string" && message.trim()) {
      if (message === 'Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente.') {
        return 'Conflito — esta página foi atualizada em outra sessão. Copie suas alterações pendentes antes de recarregar.';
      }
      return message;
    }
  }
  return fallback;
}
const sections: Array<{ value: Section; label: string; icon: string; tone: string }> = [
  { value: "LINGUAGENS", label: "Idiomas", icon: "◉", tone: "purple" },
  { value: "FACULDADE", label: "Faculdade", icon: "✦", tone: "blue" },
  { value: "PROJETOS", label: "Projetos", icon: "⌁", tone: "violet" },
  { value: "OUTROS", label: "Outros", icon: "＋", tone: "slate" },
];
const subsections: Array<{ value: SubSection; label: string; description: string }> = [
  { value: "ESTUDANDO", label: "Estudando", description: "O que está em movimento agora" },
  { value: "ESTUDADO", label: "Estudado", description: "Conhecimentos que já passaram por você" },
];

function getAccessToken() {
  return window.localStorage.getItem("biblioteca-access-token") ?? undefined;
}

const authTokenListeners = new Set<() => void>();
function subscribeToAuthToken(onStoreChange: () => void) {
  authTokenListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    authTokenListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
function notifyAuthTokenListeners() {
  authTokenListeners.forEach((listener) => listener());
}
function getServerAuthToken() {
  return undefined;
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function saveTokens(tokens: AuthTokens) {
  window.localStorage.setItem("biblioteca-access-token", tokens.accessToken);
  window.localStorage.setItem("biblioteca-refresh-token", tokens.refreshToken);
  notifyAuthTokenListeners();
}

const apiFetch = createAuthenticatedFetch({ apiUrl, getAccessToken, getRefreshToken: () => window.localStorage.getItem('biblioteca-refresh-token') ?? undefined, saveTokens });

function tokenSubject(token?: string) {
  try { return token ? (JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }).sub : undefined; } catch { return undefined; }
}
let verifiedAccount: { id: string; token: string } | undefined;
function belongsToCurrentAccount(ownerId: string) {
  const token = getAccessToken();
  return Boolean(token && (verifiedAccount?.token === token && verifiedAccount.id === ownerId || tokenSubject(token) === ownerId && verifiedAccount?.id === ownerId));
}

export default function Home() {
  const token = useSyncExternalStore(subscribeToAuthToken, getAccessToken, getServerAuthToken);
  const [session, setSession] = useState<{ id: string; token: string }>();
  const [failure, setFailure] = useState<{ token: string; message: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void apiFetch(apiUrl + '/auth/me', { signal: controller.signal }, token).then(async response => {
      if (!response.ok) throw new Error('Entre novamente para confirmar sua conta e acessar seus rascunhos.');
      const identity = await response.json() as { id?: string };
      if (!identity.id) throw new Error('Resposta inválida ao confirmar a conta.');
      if (!controller.signal.aborted && getAccessToken() === token) {
        verifiedAccount = { id: identity.id, token };
        setSession(verifiedAccount); setFailure(undefined);
      }
    }).catch(error => {
      if (!controller.signal.aborted && getAccessToken() === token) setFailure({ token, message: error instanceof Error ? error.message : 'Não foi possível confirmar a conta.' });
    });
    return () => controller.abort();
  }, [token, retry]);
  if (!token) return <AuthView onAuthenticated={saveTokens} />;
  if (failure?.token === token) return <section role="alert"><p>{failure.message}</p><Button onClick={() => setRetry(value => value + 1)}>Confirmar conta novamente</Button><Button onClick={() => { window.localStorage.removeItem('biblioteca-access-token'); window.localStorage.removeItem('biblioteca-refresh-token'); notifyAuthTokenListeners(); }}>Entrar novamente</Button></section>;
  const ownerId = session && (session.token === token || tokenSubject(token) === session.id) ? session.id : undefined;
  if (!ownerId) return <p role="status">Confirmando sua conta…</p>;
  return <LibraryHome key={ownerId} ownerId={ownerId} />;
}

function LibraryHome({ ownerId }: { ownerId: string }) {
  const [recoveryDraft, setRecoveryDraft] = useState<LocalDraft>();
  const [collectionRoute, setCollectionRoute] = useState<LibraryRoute>({});
  const returnRoute = useRef<LibraryRoute | null>(null);
  const trashOrigin = useRef<{ url: string; route: LibraryRoute }>(undefined);
  const userId = useSyncExternalStore(subscribeToAuthToken, getAccessToken, getServerAuthToken);
  const [selectedSection, setSelectedSection] = useState<Section>();
  const [selectedSubSection, setSelectedSubSection] = useState<SubSection>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [collectionResult, setCollectionResult] = useState<{ query: string; data?: AreaPage; error?: string }>();
  const [openingError, setOpeningError] = useState<string>();
  const [openingRetry, setOpeningRetry] = useState(0);
  const mutationQueues = useRef(new Map<string, Promise<Area>>());
  const localRevisions = useRef(new Map<string, string>());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationParent, setCreationParent] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const main = useRef<HTMLElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTrigger = useRef<HTMLElement>(null);
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Area[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [searchPage, setSearchPage] = useState(1);
  const [searchPagination, setSearchPagination] = useState<AreaPage['pagination']>();
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState<string>();
  const [trashAreas, setTrashAreas] = useState<Area[]>([]);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string>();
  const [templatesRetry, setTemplatesRetry] = useState(0);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string; type: "NOTE" | "LECTURE" | "PROJECT" }>>([]);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!belongsToCurrentAccount(ownerId)) throw new Error('A conta mudou.');
    const headers = new Headers(init?.headers); headers.set('Content-Type', 'application/json');
    const response = await apiFetch(`${apiUrl}${path}`, { ...init, headers: Object.fromEntries(headers.entries()) }, getAccessToken()!);
    if (!belongsToCurrentAccount(ownerId)) throw new Error('A conta mudou.');
    return response;
  }, [ownerId]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string>();
  const clearNavigationError = useCallback(() => setRouteError(undefined), []);
  const beforeNavigate = useRef<(() => Promise<void>) | null>(null);
  const pendingGuard = useRef<Promise<void> | null>(null);
  const navigationSequence = useRef(0);
  const navigationRequest = useRef<AbortController | null>(null);
  const committedUrl = useRef('/');
  const registerNavigationGuard = useCallback((guard: (() => Promise<void>) | null) => { beforeNavigate.current = guard; }, []);
  const applyRoute = useCallback(async (target: string, history: 'push' | 'replace' | 'pop') => {
    const sequence = ++navigationSequence.current;
    try {
      if (beforeNavigate.current) {
        if (!pendingGuard.current) pendingGuard.current = beforeNavigate.current().finally(() => { pendingGuard.current = null; });
        await pendingGuard.current;
      }
    } catch (failure) {
      if (sequence === navigationSequence.current) {
        if (history === 'pop') window.history.pushState(null, '', committedUrl.current);
        setRouteError(failure instanceof TypeError ? 'Falha de conexão ao salvar. Suas alterações continuam nesta página; tente voltar novamente quando a conexão retornar.' : failure instanceof Error ? failure.message : 'Não foi possível salvar as pendências.');
      }
      return false;
    }
    if (sequence !== navigationSequence.current) return false;
    navigationRequest.current?.abort();
    const controller = new AbortController(); navigationRequest.current = controller;
    if (history === 'push' && target !== window.location.pathname + window.location.search) window.history.pushState(null, '', target);
    if (history === 'replace') window.history.replaceState(null, '', target);
    setRouteLoading(true); setRouteError(undefined);
    try {
      const route = readLibraryRoute(new URL(target, window.location.origin));
      let page: Area | null = null;
      if (route.pageId) {
        if (!userId) return false;
        const response = await apiFetch(`${apiUrl}/areas/${encodeURIComponent(route.pageId)}`, { headers: authHeaders(userId), signal: controller.signal }, userId);
        if (!response.ok) throw new Error(response.status === 404 ? 'Página indisponível ou sem acesso.' : 'Não foi possível abrir a página. Tente novamente.');
        page = await response.json() as Area;
      }
      if (sequence !== navigationSequence.current) return false;
      setSelectedSection(page?.section ?? route.section); setSelectedSubSection(page?.subSection ?? route.subSection);
      setEditingArea(page); setIsCreating(false);
      if (!page) {
        setCollectionRoute(route); returnRoute.current = route;
      }
      setSearchQuery('');
      // Opening one document must not download the complete navigation again.
      // Its authorized GET supplies fresh metadata; structural writes and return
      // to the collection still refresh the canonical tree.
      if (page) {
        const metadata = { ...page }; delete metadata.conteudo;
        setAreas(current => current.some(item => item.id === metadata.id)
          ? current.map(item => item.id === metadata.id ? metadata : item)
          : [...current, metadata]);
      } else if (committedUrl.current.startsWith('/?page=')) setRetryKey(key => key + 1);
      committedUrl.current = libraryUrl(page ? { pageId: page.id } : route);
      window.history.replaceState(null, '', committedUrl.current);
      return true;
    } catch (failure) {
      if (!controller.signal.aborted && sequence === navigationSequence.current) {
        setEditingArea(null); setIsCreating(false);
        setRouteError(failure instanceof Error ? failure.message : 'Página indisponível.');
      }
      return false;
    } finally { if (sequence === navigationSequence.current) setRouteLoading(false); }
  }, [userId]);
  const navigateTo = useCallback((route: LibraryRoute) => { void applyRoute(libraryUrl(route), 'push'); }, [applyRoute]);
  const navigateFromLibrary = (route: LibraryRoute, focusContent: boolean) => {
    void applyRoute(libraryUrl(route), 'push').then(() => {
      if (focusContent) setFocusRequest(value => value + 1);
    });
  };
  useEffect(() => {
    if (focusRequest) main.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (!userId) return;
    const sequence = navigationSequence;
    const request = navigationRequest;
    const load = () => { void applyRoute(window.location.pathname + window.location.search, 'pop'); };
    load(); window.addEventListener('popstate', load);
    return () => { ++sequence.current; request.current?.abort(); window.removeEventListener('popstate', load); };
  }, [applyRoute, userId]);

  const openSearch = useCallback((button?: HTMLButtonElement) => {
    const panel = searchDialog.current;
    if (!panel) return;
    if (!panel.open) {
      const searchButton = document.querySelector<HTMLButtonElement>('[data-library-search]');
      searchTrigger.current = button ?? (searchButton?.getClientRects().length ? searchButton :
        document.querySelector<HTMLButtonElement>('[data-library-menu]') ?? (document.activeElement as HTMLElement));
      panel.showModal();
    }
    searchInput.current?.focus();
  }, []);

  const closeSearch = (restoreFocus: boolean) => {
    searchDialog.current?.close();
    if (!restoreFocus) return;
    searchTrigger.current?.focus();
    if (document.activeElement !== searchTrigger.current) {
      const fallback = document.querySelector<HTMLButtonElement>('[data-library-menu]') ?? main.current;
      fallback?.focus();
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      const target = event.target;
      const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !(target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select')));
      const command = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
      if ((!slash && !command) || document.querySelector('dialog:modal:not([data-library-drawer])')) return;
      event.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const loadAreas = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const all: Area[] = [];
        let totalPages = 1;
        for (let number = 1; number <= totalPages; number++) {
          const params = new URLSearchParams({ page: String(number), limit: '100' });
          // The tree and parent picker need ancestors across collection filters.
          const response = await apiFetch(`${apiUrl}/areas/navigation?${params}`, { headers: authHeaders(userId), signal: controller.signal }, userId);
          if (!response.ok) throw new Error('Não foi possível carregar esta coleção.');
          const result = await response.json() as AreaPage;
          all.push(...result.items); totalPages = result.pagination.totalPages;
        }
        if (!controller.signal.aborted) setAreas(all);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Ocorreu um erro inesperado.");
        setAreas([]);
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    };
    loadAreas();
    return () => controller.abort();
  }, [userId, retryKey]);

  const isCollection = Object.keys(collectionRoute).length > 0;
  const showTrash = collectionRoute.view === 'trash';
  const collectionQuery = collectionParameters(collectionRoute).toString();
  useEffect(() => {
    if (!userId || !isCollection || showTrash) return;
    const controller = new AbortController();
    const currentQuery = () => {
      const current = returnRoute.current;
      if (!controller.signal.aborted && current && current.view !== 'trash' && collectionParameters(current).toString() === collectionQuery) return current;
    };
    const load = async () => {
      setCollectionResult(current => current?.error ? undefined : current);
      try {
        const data = await responseValue<AreaPage>(await request('/areas?' + collectionQuery, { signal: controller.signal }));
        const current = currentQuery();
        if (!current) return;
        // The API may clamp an unavailable page. Keep the most recent display choice.
        if (window.location.pathname + window.location.search === libraryUrl(current) && (current.listPage ?? 1) !== data.pagination.page) {
          const corrected = { ...current, listPage: data.pagination.page > 1 ? data.pagination.page : undefined };
          const url = libraryUrl(corrected);
          window.history.replaceState(null, '', url);
          committedUrl.current = url;
          returnRoute.current = corrected;
          setCollectionRoute(corrected);
          setCollectionResult({ query: collectionParameters(corrected).toString(), data });
        } else setCollectionResult({ query: collectionQuery, data });
      } catch (cause) {
        if (currentQuery()) setCollectionResult({ query: collectionQuery, error: cause instanceof Error ? cause.message : 'Não foi possível carregar a coleção.' });
      }
    };
    void load();
    return () => controller.abort();
  }, [collectionQuery, isCollection, request, retryKey, showTrash, userId]);

  const openedPageId = editingArea?.id;
  useEffect(() => {
    if (!openedPageId) return;
    const controller = new AbortController();
    const mark = async () => { setOpeningError(undefined);
    void request(`/areas/${openedPageId}/opened`, { method: 'POST', signal: controller.signal }).then(responseValue<{ lastOpenedAt: string }>).then(visit => {
      if (!controller.signal.aborted) setAreas(items => items.map(item => item.id === openedPageId ? { ...item, lastOpenedAt: visit.lastOpenedAt } : item));
    }).catch(() => { if (!controller.signal.aborted) setOpeningError('A página foi aberta, mas não foi possível atualizar Recentes.'); });
    }; void mark();
    return () => controller.abort();
  }, [openedPageId, openingRetry, request]);

  useEffect(() => {
    let active = true;
    if (!userId || searchQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const runSearch = async () => {
      setSearchLoading(true); setSearchError(undefined);
      try {
        const response = await apiFetch(`${apiUrl}/areas/search?q=${encodeURIComponent(searchQuery.trim())}&page=${searchPage}&limit=20`, { headers: authHeaders(userId), signal: controller.signal }, userId);
        if (!response.ok) throw new Error("Não foi possível consultar a biblioteca.");
        const result = await response.json() as AreaPage;
        if (active) { setSearchResults(result.items ?? []); setSearchPagination(result.pagination); }
      } catch {
        if (active) { setSearchResults([]); setSearchError('Não foi possível buscar. Tente novamente.'); }
      } finally { if (active) setSearchLoading(false); }
    };

    void runSearch();
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchQuery, searchPage, userId, retryKey]);

  useEffect(() => {
    let active = true;
    if (!userId || !showTrash) {
      return;
    }

    const controller = new AbortController();
    const loadTrash = async () => {
      setTrashLoading(true); setTrashError(undefined);
      try {
        const all: Area[] = [];
        let totalPages = 1;
        for (let number = 1; number <= totalPages; number++) {
          const response = await apiFetch(`${apiUrl}/areas/trash?page=${number}&limit=100`, { headers: authHeaders(userId), signal: controller.signal }, userId);
          if (!response.ok) throw new Error('Não foi possível carregar a lixeira.');
          const result = await response.json() as AreaPage;
          all.push(...result.items); totalPages = result.pagination.totalPages;
        }
        if (active) setTrashAreas(all);
      } catch {
        if (active) { setTrashAreas([]); setTrashError('Não foi possível carregar a lixeira.'); }
      } finally { if (active) setTrashLoading(false); }
    };

    void loadTrash();
    return () => {
      active = false;
      controller.abort();
    };
  }, [showTrash, userId, retryKey]);

  const currentSection = sections.find((section) => section.value === selectedSection);
  const currentSubSection = subsections.find((subSection) => subSection.value === selectedSubSection);
  const result = collectionResult?.query === collectionQuery ? collectionResult : undefined;
  const { items: visibleAreas, pagination } = result?.data ?? emptyCollection;
  const categories = useMemo(() => {
    if (isLoading || error) return undefined;
    const names = new Set(areas.filter(area => !collectionRoute.section || area.section === collectionRoute.section).map(area => area.categoria.trim()).filter(Boolean));
    return [...names].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }, [areas, collectionRoute.section, error, isLoading]);
  const updateCollection = (patch: Partial<LibraryRoute>) => {
    const next = { ...collectionRoute, listPage: 'layout' in patch ? collectionRoute.listPage : undefined, ...patch };
    if (!next.section && !next.view) next.view = 'all';
    navigateTo(next);
  };
  const returnFromTrash = () => {
    const previous = trashOrigin.current;
    navigateTo(previous?.url === libraryUrl(collectionRoute) ? previous.route : { ...collectionRoute, view: collectionRoute.section ? undefined : 'all' });
  };
  const toggleTrash = () => {
    if (showTrash) { returnFromTrash(); return; }
    const route = { ...collectionRoute, view: 'trash' as const, listPage: undefined };
    trashOrigin.current = { url: libraryUrl(route), route: collectionRoute };
    navigateTo(route);
  };
  const integratePage = (saved: Area) => {
    setAreas(items => items.map(item => item.id === saved.id ? { ...item, ...saved } : item));
    setCollectionResult(current => {
      if (!current?.data) return current;
      const items = current.data.items.map(item => item.id === saved.id ? { ...item, ...saved } : item);
      return { ...current, data: { ...current.data, items } };
    });
    setSearchResults(items => items.map(item => item.id === saved.id ? { ...item, ...saved } : item));
  };
  const updateProperties: UpdateStudy = (area, patch) => {
    const preceding = mutationQueues.current.get(area.id);
    const operation = (async () => {
      let base = preceding ? await preceding : area;
      while (localRevisions.current.has(base.id + ':' + base.updatedAt)) base = { ...base, updatedAt: localRevisions.current.get(base.id + ':' + base.updatedAt)! };
      const saved = await responseValue<Area>(await request('/areas/' + area.id, { method: 'PATCH', body: JSON.stringify({ ...patch, updatedAt: base.updatedAt }) }));
      localRevisions.current.set(base.id + ':' + base.updatedAt, saved.updatedAt);
      integratePage(saved); setRetryKey(value => value + 1); return saved;
    })();
    mutationQueues.current.set(area.id, operation);
    void operation.finally(() => { if (mutationQueues.current.get(area.id) === operation) mutationQueues.current.delete(area.id); }).catch(() => {});
    return operation;
  };
  const reloadProperties: ReloadStudy = async id => {
    const saved = await responseValue<Area>(await request('/areas/' + id)); integratePage(saved); setRetryKey(value => value + 1); return saved;
  };
  const goHome = () => navigateTo({});
  const closeForm = () => navigateTo(returnRoute.current ?? { section: selectedSection, subSection: selectedSubSection });
  const openCreate = () => { setCreationParent(null); setEditingArea(null); setIsCreating(true); };
  const createChild = async (parent: Area) => {
    try {
      await beforeNavigate.current?.();
      setCreationParent(parent.id); setEditingArea(null); setIsCreating(true);
    } catch (failure) { setRouteError(failure instanceof Error ? failure.message : 'Salve as alterações antes de criar uma subpágina.'); }
  };
  const openEdit = (area: Area) => navigateTo({ pageId: area.id });
  const handleAreaDeleted = (areaId: string) => {
    beforeNavigate.current = null;
    setRetryKey(key => key + 1);
    setAreas((currentAreas) => currentAreas.filter((area) => area.id !== areaId));
    closeForm();
  };
  const handleAreaSaved = (savedArea: Area) => {
    if (editingArea) {
      setAreas((currentAreas) => currentAreas.map((area) => area.id === savedArea.id ? savedArea : area));
      closeForm();
      return;
    }

    setAreas((currentAreas) => [savedArea, ...currentAreas.filter(item => item.id !== savedArea.id)]);
    setIsCreating(false);
    committedUrl.current = libraryUrl({ pageId: savedArea.id });
    window.history.pushState(null, '', committedUrl.current);
    setEditingArea({ ...savedArea });
  };
  const handleAreaDuplicated = (copiedArea: Area) => {
    setAreas((currentAreas) => [copiedArea, ...currentAreas]);
    navigateTo({ pageId: copiedArea.id });
  };

  const handleTemplateApplied = (created: Area) => {
    setAreas(items => [created, ...items.filter(item => item.id !== created.id)]);
    navigateTo({ pageId: created.id }); setShowTemplateGallery(false);
  };

  useEffect(() => {
    let active = true;
    if (!userId || !showTemplateGallery) {
      return;
    }

    const controller = new AbortController();
    const loadTemplates = async () => {
      try {
        const response = await apiFetch(`${apiUrl}/templates`, { headers: authHeaders(userId), signal: controller.signal }, userId);
        if (!response.ok) throw new Error("Não foi possível carregar os modelos.");
        const result = await response.json();
        if (active) setTemplates(result ?? []);
      } catch (failure) {
        if (active) setTemplatesError(failure instanceof Error ? failure.message : 'Não foi possível carregar os modelos.');
      } finally { if (active) setTemplatesLoading(false); }
    };

    void loadTemplates();
    return () => {
      active = false;
      controller.abort();
    };
  }, [showTemplateGallery, userId, templatesRetry]);

  if (!userId) return <AuthView onAuthenticated={saveTokens} />;
  const logout = () => { void (async () => { try { await beforeNavigate.current?.(); } catch (failure) { setRouteError(failure instanceof Error ? failure.message : 'Salve as pendências antes de sair.'); return; } beforeNavigate.current = null; window.localStorage.removeItem("biblioteca-access-token"); window.localStorage.removeItem("biblioteca-refresh-token"); window.history.replaceState(null, '', '/'); notifyAuthTokenListeners(); })(); };
  const indexedPage = editingArea && areas.find(page => page.id === editingArea.id);
  const currentPage = indexedPage ?? editingArea;
  const navigationPages = editingArea && !indexedPage ? [...areas, editingArea] : areas;
  const activeRoute = currentPage ? { pageId: currentPage.id, section: currentPage.section } :
    isCreating ? { section: selectedSection } : collectionRoute;
  return <div className={`${styles.page} ${styles.workspace}`}>
    <LibraryNavigation current={activeRoute} pages={navigationPages} loading={isLoading} error={error}
      drawerOpen={drawerOpen} searchId={searchId} onDrawerChange={setDrawerOpen} onRetry={() => setRetryKey(key => key + 1)}
      onNavigate={navigateFromLibrary} onSearch={openSearch} onLogout={logout} />
    <main ref={main} className={styles.main} tabIndex={-1} aria-label={currentPage?.nome ?? 'Conteúdo da biblioteca'}>
    {openingError && editingArea && <p role="status">{openingError}<Button onClick={() => setOpeningRetry(value => value + 1)}>Atualizar Recentes novamente</Button></p>}
    <DraftRecovery ownerId={ownerId} refreshKey={String(retryKey) + ':' + (editingArea?.id ?? String(isCreating))} onSelect={draft => {
      void (async () => {
        const target = draft.pageId ? libraryUrl({ pageId: draft.pageId }) : libraryUrl({ section: draft.snapshot.section, subSection: draft.snapshot.subSection });
        if (await applyRoute(target, 'push')) {
          if (!draft.pageId) { setEditingArea(null); setIsCreating(true); }
          setRecoveryDraft(draft);
        }
      })();
    }} />
      {routeLoading ? <p role="status">Abrindo página…</p> : routeError && !editingArea && !isCreating ? <div role="alert">{routeError}<Button onClick={() => void applyRoute(window.location.pathname + window.location.search, 'pop')}>Tentar novamente</Button><Button onClick={goHome}>Voltar à biblioteca</Button></div> : editingArea || isCreating ? (
        <AreaForm
          key={ownerId + ':' + (editingArea?.id ?? 'new')}
          ownerId={ownerId}
          recoveryDraft={recoveryDraft}
          onRecoveryHandled={() => setRecoveryDraft(undefined)}
          section={currentSection?.value ?? 'LINGUAGENS'}
          subSection={currentSubSection?.value ?? 'ESTUDANDO'}
          area={editingArea}
          navigationError={routeError}
          onCheckpointSaved={clearNavigationError}
          parentOptions={areas}
          onNavigate={navigateTo}
          initialParentId={creationParent}
          onCreateChild={createChild}
          onPersisted={(saved, moved) => {
            setAreas(current => current.map(item => item.id === saved.id ? saved : item));
            if (moved) setRetryKey(key => key + 1);
          }}
          userId={userId}
          onCancel={closeForm}
          onSaved={handleAreaSaved}
          onDeleted={handleAreaDeleted}
          onDuplicated={handleAreaDuplicated}
          registerNavigationGuard={registerNavigationGuard}
        />
      ) : isCollection ? (
        <SubSectionView
          route={collectionRoute}
          categories={categories}
          request={request}
          creationHint={`Novas páginas: ${currentSection?.label ?? 'Idiomas'} / ${currentSubSection?.label ?? 'Estudando'}.`}
          areas={visibleAreas}
          pagination={pagination}
          userId={userId}
          isLoading={showTrash ? trashLoading : !result}
          error={showTrash ? trashError : result?.error}
          onCreate={openCreate}
          onEdit={openEdit}
          onUpdate={updateProperties}
          onReload={reloadProperties}
          onRetry={() => setRetryKey((key) => key + 1)}
          onDelete={handleAreaDeleted}
          onToggleTrash={toggleTrash}
          trashItems={trashAreas}
          onRestore={() => { setTrashAreas([]); setRetryKey(key => key + 1); returnFromTrash(); }}
          onFavoriteChange={(updatedArea) => { setAreas((current) => current.map((area) => area.id === updatedArea.id ? { ...area, isFavorite: updatedArea.isFavorite } : area)); setSearchResults((current) => current.map((area) => area.id === updatedArea.id ? { ...area, isFavorite: updatedArea.isFavorite } : area)); }}
          onAreasChange={updated => setAreas(current => current.map(item => updated.find(next => next.id === item.id) ?? item))}
          onDuplicate={handleAreaDuplicated}
          onChange={updateCollection}
          onOpenView={navigateTo}
          onOpenTemplates={() => { setTemplatesLoading(true); setTemplatesError(undefined); setShowTemplateGallery(true); }}
        />
      ) : (
        <><LibraryView onSelect={section => navigateTo({ section })} />
        <section className={styles.recent}><h2>Continuar estudando</h2>
          <Button onClick={() => navigateTo({ view: 'recent' })}>Ver todas as páginas recentes</Button>
          {isLoading ? <p role="status">Carregando páginas…</p> : error ? <p role="alert">{error}<Button onClick={() => setRetryKey(key => key + 1)}>Tentar novamente</Button></p> : areas.some(item => item.lastOpenedAt) ? <ul>{areas.filter(item => item.lastOpenedAt).sort((a,b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '')).slice(0,6).map(item => <li key={item.id}><a href={libraryUrl({pageId:item.id})} onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); openEdit(item); }}>{item.nome}</a></li>)}</ul> : <p>As páginas que você abrir aparecerão aqui. Escolha uma área para começar.</p>}
        </section></>
      )}
    </main>
    <dialog id={searchId} ref={searchDialog} className="library-search" aria-label="Busca na biblioteca"
      onKeyDown={event => {
        containModalTab(event);
        if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          event.stopPropagation();
          closeSearch(true);
        }
      }}
      onCancel={event => { event.preventDefault(); closeSearch(true); }}>
      <label>Buscar em toda a biblioteca
        <Input ref={searchInput} value={searchQuery} onChange={event => { setSearchQuery(event.target.value); setSearchPage(1); }}
          placeholder="Digite pelo menos 2 caracteres" />
      </label>
      <Button onClick={() => closeSearch(true)}>Fechar busca</Button>
      {searchQuery.trim().length >= 2 && (searchLoading ? <p role="status">Buscando…</p> : searchError ? (
        <p role="alert">{searchError}<Button onClick={() => setRetryKey(key => key + 1)}>Tentar busca novamente</Button></p>
      ) : <>
        <p role="status">{searchPagination?.total ?? 0} resultados em toda a biblioteca.</p>
        <ul>{searchResults.map(item => <li key={item.id}>
          <Button onClick={() => {
            closeSearch(false);
            setDrawerOpen(false);
            navigateFromLibrary({ pageId: item.id }, true);
          }}>{item.nome}</Button>
          <small>{librarySections.find(section => section.value === item.section)?.label} / {pageAncestors(areas, item.parentId).map(page => page.nome).join(' / ') || 'Página principal'}</small>
        </li>)}</ul>
        {searchPagination && searchPagination.totalPages > 1 && <nav aria-label="Paginação da busca global">
          <Button disabled={searchPage <= 1} onClick={() => setSearchPage(value => value - 1)}>Resultados anteriores</Button>
          <span>Página {searchPage} de {searchPagination.totalPages}</span>
          <Button disabled={searchPage >= searchPagination.totalPages} onClick={() => setSearchPage(value => value + 1)}>Próximos resultados</Button>
        </nav>}
      </>)}
    </dialog>
    {showTemplateGallery && (
      <TemplateGallery
        templates={templates}
        loading={templatesLoading}
        error={templatesError}
        onRetry={() => { setTemplatesLoading(true); setTemplatesError(undefined); setTemplatesRetry(value => value + 1); }}
        request={request}
        pages={areas}
        defaultSection={selectedSection ?? 'LINGUAGENS'}
        defaultSubSection={selectedSubSection ?? 'ESTUDANDO'}
        onApplied={handleTemplateApplied}
        onClose={() => { setShowTemplateGallery(false); document.querySelector<HTMLButtonElement>('[data-template-trigger]')?.focus(); }}
      />
    )}
  </div>;
}

function AuthView({ onAuthenticated }: { onAuthenticated: (tokens: AuthTokens) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const response = await fetchApi(`${apiUrl}/auth/${isRegistering ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getApiErrorMessage(payload, response.status >= 500 ? "O servidor está indisponível no momento. Tente novamente." : "Não foi possível autenticar."));
        return;
      }
      if (typeof payload !== "object" || payload === null || !("accessToken" in payload) || !("refreshToken" in payload)) {
        setError("A resposta da autenticação está incompleta. Tente novamente.");
        return;
      }
      onAuthenticated(payload as AuthTokens);
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className={styles.page}><main className={styles.main}><form className={styles.authForm} onSubmit={submit} aria-busy={isSubmitting}><p className={styles.kicker}>Biblioteca privada</p><h1>{isRegistering ? "Crie sua conta" : "Entre na sua biblioteca"}</h1><div className={styles.formGrid}><label>E-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} /></label><label>Senha<Input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} /></label></div>{error && <p className={styles.formError} role="alert">{error}</p>}<Button className={styles.primaryButton} type="submit" disabled={isSubmitting}>{isSubmitting ? "Aguarde..." : isRegistering ? "Cadastrar" : "Entrar"}</Button><Button className={styles.secondaryButton} type="button" onClick={() => { setError(undefined); setIsRegistering((value) => !value); }} disabled={isSubmitting}>{isRegistering ? "Já tenho uma conta" : "Criar uma conta"}</Button></form></main></div>;
}

function LibraryView({ onSelect }: { onSelect: (section: Section) => void }) { return <>
  <div className={styles.hero}><h1>Início</h1><p className={styles.subtitle}>Suas áreas de estudo e páginas recentes.</p></div>
  <div className={styles.sectionGrid}>{sections.map(section => <Button key={section.value} className={styles.sectionCard} onClick={() => onSelect(section.value)}><span aria-hidden="true">{section.icon}</span><strong>{section.label}</strong><span aria-hidden="true">→</span></Button>)}</div>
</>; }

type SubSectionViewProps = {
  route: LibraryRoute;
  categories?: string[];
  request: LibraryRequest;
  creationHint: string;
  areas: Area[];
  pagination: AreaPage['pagination'];
  userId: string;
  isLoading: boolean;
  error?: string;
  onCreate: () => void;
  onEdit: (area: Area) => void;
  onUpdate: UpdateStudy;
  onReload: ReloadStudy;
  onRetry: () => void;
  onDelete: (areaId: string) => void;
  onToggleTrash: () => void;
  trashItems: Area[];
  onRestore: (areaId: string) => void;
  onFavoriteChange: (updatedArea: Area) => void;
  onAreasChange: (areas: Area[]) => void;
  onDuplicate: (copied: Area) => void;
  onChange: (patch: Partial<LibraryRoute>) => void;
  onOpenView: (route: LibraryRoute) => void;
  onOpenTemplates: () => void;
};

function SubSectionView({
  route, categories, request, creationHint, areas, pagination, userId, isLoading, error,
  onCreate, onEdit, onUpdate, onReload, onRetry, onDelete, onToggleTrash, trashItems,
  onRestore, onFavoriteChange, onAreasChange, onDuplicate, onChange, onOpenView, onOpenTemplates,
}: SubSectionViewProps) {
  const showTrash = route.view === 'trash';
  const viewLayout = route.layout ?? 'LIST';
  const filters = advancedFilters(route);
  const hasOtherFilters = Boolean(route.q || filters.categoria || filters.minLevel !== undefined || filters.maxLevel !== undefined || filters.favorite);
  const hasFilters = hasOtherFilters || Boolean(route.subSection || filters.scope);
  const { order, direction } = collectionOrder(route);
  const manualOrder = order === 'sortOrder' && direction === 'asc' && viewLayout === 'LIST'
    && Boolean(route.section && route.subSection) && filters.scope === 'ROOTS' && !hasOtherFilters
    && (!route.view || route.view === 'all');
  const [deleteError, setDeleteError] = useState<string>();
  const [restoreNotice, setRestoreNotice] = useState<string>();
  const [deletingAreaId, setDeletingAreaId] = useState<string>();
  const [favoriteAreaId, setFavoriteAreaId] = useState<string>();
  const [dragOverId, setDragOverId] = useState<string>();

  const toggleFavorite = async (area: Area) => {
    if (!userId) return;
    setFavoriteAreaId(area.id);
    try {
      const updated = await onUpdate(area, { isFavorite: !area.isFavorite });
      onFavoriteChange?.(updated);
    } catch (favoriteError) {
      setDeleteError(favoriteError instanceof Error ? favoriteError.message : "Não foi possível atualizar o favorito.");
    } finally {
      setFavoriteAreaId(undefined);
    }
  };

  const reorderArea = async (sourceId: string, targetId: string, position: "before" | "after" = "before") => {
    if (!userId || sourceId === targetId || showTrash || !manualOrder) return;
    setDeleteError(undefined);
    try {
      const response = await apiFetch(`${apiUrl}/areas/${sourceId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(userId) },
        body: JSON.stringify(position === "before" ? { beforeId: targetId } : { afterId: targetId }),
      }, userId);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorPayload, "Não foi possível reordenar esta página."));
      }
      const sourceIndex = areas.findIndex((item) => item.id === sourceId);
      const targetIndex = areas.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        onRetry();
        return;
      }
      // Read canonical order after the server has updated all affected siblings.
      onRetry();
    } catch (reorderError) {
      setDeleteError(reorderError instanceof Error ? reorderError.message : "Não foi possível reordenar esta página.");
    }
  };

  const moveArea = async (area: Area, direction: "up" | "down") => {
    const index = areas.findIndex((item) => item.id === area.id);
    if (index < 0) return;
    const target = direction === "up" ? areas[index - 1] : areas[index + 1];
    if (!target) return;
    await reorderArea(area.id, target.id, direction === "up" ? "before" : "after");
  };

  const duplicateArea = async (area: Area) => {
    if (!userId || showTrash) return;
    const includeChildren = window.confirm(`Duplicar “${area.nome}” incluindo subpáginas?\n\nOK = com subpáginas · Cancelar = só esta página`);
    setDeleteError(undefined);
    try {
      const response = await apiFetch(`${apiUrl}/areas/${area.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(userId) },
        body: JSON.stringify({ includeChildren }),
      }, userId);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorPayload, "Não foi possível duplicar esta página."));
      }
      const copied = await response.json() as Area;
      if (onDuplicate) onDuplicate(copied); else onAreasChange?.([copied, ...areas]);
    } catch (duplicateError) {
      setDeleteError(duplicateError instanceof Error ? duplicateError.message : "Não foi possível duplicar esta página.");
    }
  };

  const removeArea = async (area: Area) => {
    if (!window.confirm(showTrash ? `Restaurar a página “${area.nome}”?` : `Excluir a página “${area.nome}”?`)) return;
    setDeleteError(undefined);
    setDeletingAreaId(area.id);
    try {
      const url = showTrash ? `${apiUrl}/areas/${area.id}/restore` : `${apiUrl}/areas/${area.id}`;
      const method = showTrash ? "PATCH" : "DELETE";
      const response = await apiFetch(url, { method, headers: authHeaders(userId) }, userId);
      if (!response.ok) throw new Error(showTrash ? "Não foi possível restaurar esta página." : "Não foi possível excluir esta página.");
      if (showTrash) {
        const restored = await response.json() as Area & { warning?: string };
        setRestoreNotice(restored.warning);
        onRestore?.(area.id);
      } else {
        onDelete(area.id);
      }
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError instanceof Error ? deleteRequestError.message : (showTrash ? "Não foi possível restaurar esta página." : "Não foi possível excluir esta página."));
    } finally {
      setDeletingAreaId(undefined);
    }
  };

  const purgeArea = async (area: Area) => {
    if (!showTrash || !window.confirm(`Excluir definitivamente “${area.nome}” e todas as suas subpáginas da lixeira?\n\nOs arquivos serão apagados. Esta ação não pode ser desfeita. Ramos com versões retidas não podem ser excluídos.`)) return;
    setDeleteError(undefined); setDeletingAreaId(area.id);
    try {
      const response = await apiFetch(`${apiUrl}/areas/${area.id}/purge`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...authHeaders(userId) }, body: JSON.stringify({ confirmed: true, updatedAt: area.updatedAt }) }, userId);
      if (!response.ok) throw new Error(getApiErrorMessage(await response.json().catch(() => null), 'Não foi possível excluir definitivamente. Recarregue a lixeira e tente novamente.'));
      onRetry();
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Não foi possível concluir a exclusão definitiva.'); }
    finally { setDeletingAreaId(undefined); }
  };

  const listItems = showTrash ? trashItems : areas;
  const collectionTitle = route.view === 'favorites' ? 'Favoritos' : route.view === 'recent' ? 'Recentes' : undefined;
  const sectionTitle = librarySections.find(section => section.value === route.section)?.label ?? 'Todas as páginas';
  const countLabel = showTrash
    ? `${trashItems.length} ${trashItems.length === 1 ? 'item' : 'itens'}`
    : `${pagination.total} ${pagination.total === 1 ? 'página' : 'páginas'}`;
  return <>
    <header className={styles.collectionHeader}>
      <div className={styles.collectionContext}>
        <h1 className={showTrash || collectionTitle ? undefined : 'sr-only'}>{showTrash ? 'Lixeira' : collectionTitle ?? sectionTitle}</h1>
        {!showTrash && <Select className={collectionTitle ? styles.collectionAreaSecondary : styles.collectionArea}
          aria-label="Área da coleção" value={route.section ?? ''} onChange={event => onChange({
            section: (event.target.value || undefined) as LibraryRoute['section'],
          })}>
          <option value="">Todas as áreas</option>
          {librarySections.map(section => <option key={section.value} value={section.value}>{section.label}</option>)}
        </Select>}
      </div>
      <div className={styles.collectionActions}>
        {!showTrash && <>
          <Button className={styles.collectionPrimary} onClick={onCreate} title={creationHint} aria-description={creationHint}>
            <span aria-hidden="true">+ </span>Nova página
          </Button>
          <Button data-template-trigger onClick={onOpenTemplates}>Modelos</Button>
        </>}
        <Button onClick={onToggleTrash}>{showTrash ? 'Voltar à coleção' : 'Lixeira'}</Button>
      </div>
    </header>
    {!showTrash && <ViewConfiguration key={`${route.section ?? ''}:${collectionTitle ?? ''}`}
      route={route} categories={categories} manualOrder={manualOrder}
      request={request} onChange={onChange} onOpenView={onOpenView} />}

    {deleteError && <div className={styles.collectionError} role="alert">{deleteError}</div>}
    {restoreNotice && <p role="status">{restoreNotice}</p>}
    <section className={styles.collectionResults} aria-label="Resultados da coleção">
      <p className={styles.resultCount} role="status" aria-atomic="true">
        {isLoading ? 'Carregando páginas…' : error ? '' : countLabel}
      </p>
      {isLoading ? null : error ? (
        <div className={styles.collectionError} role="alert">
          <p>{error}</p><Button onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : listItems.length === 0 ? (
        <div className={styles.collectionEmpty}>
          <h2>{showTrash ? 'Lixeira vazia' : hasFilters ? 'Nenhuma página corresponde aos filtros' : 'Esta coleção está vazia'}</h2>
          {showTrash ? <p>As páginas excluídas aparecem aqui.</p> : hasFilters ? <p>Ajuste a busca ou limpe os filtros para ver mais páginas.</p> :
            <Button className={styles.collectionPrimary} onClick={onCreate}>Nova página</Button>}
        </div>
      ) : (
        <>
          {!showTrash && viewLayout === "TABLE" ? (
            <TableView areas={listItems} onEdit={onEdit} onUpdate={onUpdate} onReload={onReload} />
          ) : !showTrash && viewLayout === "BOARD" ? (
            <BoardView areas={listItems} onEdit={onEdit} onUpdate={onUpdate} onReload={onReload} />
          ) : (
            <div className={styles.areaGrid}>
              {listItems.map((area, index) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  onEdit={() => onEdit(area)}
                  onDelete={() => removeArea(area)}
                  onPurge={() => void purgeArea(area)}
                  onFavoriteToggle={() => void toggleFavorite(area)}
                  onDuplicate={() => void duplicateArea(area)}
                  onMoveUp={() => void moveArea(area, "up")}
                  onMoveDown={() => void moveArea(area, "down")}
                  canMoveUp={manualOrder && index > 0}
                  canMoveDown={manualOrder && index < listItems.length - 1}
                  isDeleting={deletingAreaId === area.id}
                  isAnyDeleting={deletingAreaId !== undefined}
                  isFavorite={Boolean(area.isFavorite)}
                  isFavoriteLoading={favoriteAreaId === area.id}
                  showTrash={showTrash}
                  manualOrder={manualOrder}
                  isDropTarget={dragOverId === area.id}
                  onDragStart={() => undefined}
                  onDragOver={() => setDragOverId(area.id)}
                  onDragLeave={() => setDragOverId((current) => (current === area.id ? undefined : current))}
                  onDrop={(sourceId) => {
                    setDragOverId(undefined);
                    void reorderArea(sourceId, area.id, "before");
                  }}
                />
              ))}
            </div>
          )}
          {!showTrash && pagination.totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação de páginas">
              <Button
                className={styles.secondaryButton}
                disabled={pagination.page === 1}
                onClick={() => onChange({ listPage: pagination.page > 2 ? pagination.page - 1 : undefined })}
              >
                Anterior
              </Button>
              <span>Página {pagination.page} de {pagination.totalPages}</span>
              <Button
                className={styles.secondaryButton}
                disabled={pagination.page === pagination.totalPages}
                onClick={() => onChange({ listPage: pagination.page + 1 })}
              >
                Próxima
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  </>;
}

function AreaCard({ manualOrder, area, onEdit, onDelete, onPurge, onFavoriteToggle, onDuplicate, onMoveUp, onMoveDown, canMoveUp, canMoveDown, isDeleting, isAnyDeleting, isFavorite, isFavoriteLoading, showTrash, isDropTarget, onDragOver, onDragLeave, onDrop }: { manualOrder?: boolean; area: Area; onEdit: () => void; onDelete: () => void; onPurge?: () => void; onFavoriteToggle: () => void; onDuplicate?: () => void; onMoveUp?: () => void; onMoveDown?: () => void; canMoveUp?: boolean; canMoveDown?: boolean; isDeleting?: boolean; isAnyDeleting?: boolean; isFavorite?: boolean; isFavoriteLoading?: boolean; showTrash?: boolean; isDropTarget?: boolean; onDragStart?: () => void; onDragOver?: () => void; onDragLeave?: () => void; onDrop?: (sourceId: string) => void }) {
  const level = Math.min(5, Math.max(0, area.nivelEntendimento));
  const percentage = level * 20;
  return <article
    className={`${styles.areaCard}${isDropTarget ? ` ${styles.areaCardDrop}` : ""}`}
    draggable={!showTrash && manualOrder}
    onDragStart={(event) => { event.dataTransfer.setData("text/area-id", area.id); event.dataTransfer.effectAllowed = "move"; }}
    onDragOver={(event) => { if (showTrash || !manualOrder) return; event.preventDefault(); onDragOver?.(); }}
    onDragLeave={() => onDragLeave?.()}
    onDrop={(event) => { if (showTrash || !manualOrder) return; event.preventDefault(); const sourceId = event.dataTransfer.getData("text/area-id"); if (sourceId) onDrop?.(sourceId); }}
  >
    <div className={styles.areaTop}><span className={styles.areaIcon}>{area.icone || "✦"}</span><span className={styles.level}>Entendimento {level}/5</span></div>
    <h2><Button className={styles.pageTitle} onClick={onEdit} disabled={isAnyDeleting || showTrash}>{area.nome}</Button></h2><p>{area.categoria} · {area.subSection === "ESTUDADO" ? "Estudado" : "Estudando"}</p>
    <div className={styles.progress}><span style={{ width: `${percentage}%` }} /></div>
    <div className={styles.cardActions}>
      <Button onClick={onFavoriteToggle} disabled={isAnyDeleting || isFavoriteLoading || showTrash} aria-label={isFavorite ? "Desfavoritar" : "Favoritar"}>{isFavoriteLoading ? "..." : isFavorite ? "★" : "☆"}</Button>
      <details className={styles.pageActions} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
      <summary>Ações da página<span className="sr-only">: {area.nome}</span></summary><div>
      {!showTrash && <Button onClick={onEdit} disabled={isAnyDeleting}>Abrir página</Button>}
      {!showTrash && <Button onClick={onDuplicate} disabled={isAnyDeleting}>Duplicar</Button>}
      {!showTrash && manualOrder && <Button onClick={onMoveUp} disabled={isAnyDeleting || !canMoveUp} aria-label="Mover para cima">↑</Button>}
      {!showTrash && manualOrder && <Button onClick={onMoveDown} disabled={isAnyDeleting || !canMoveDown} aria-label="Mover para baixo">↓</Button>}
      {showTrash ? <Button onClick={onDelete} disabled={isAnyDeleting} aria-busy={isDeleting}>{isDeleting ? "Restaurando..." : "Restaurar"}</Button> : <Button onClick={onDelete} disabled={isAnyDeleting} aria-busy={isDeleting}>{isDeleting ? "Enviando..." : "Excluir"}</Button>}
      {showTrash && <Button onClick={onPurge} disabled={isAnyDeleting}>Excluir definitivamente</Button>}
      </div></details>
    </div>
  </article>;
}

function AreaForm({ initialParentId, onCreateChild, onNavigate, onPersisted, ownerId, recoveryDraft, onRecoveryHandled, navigationError, onCheckpointSaved, section, subSection, area, parentOptions, userId, onCancel, onSaved, onDeleted, onDuplicated, registerNavigationGuard }: { initialParentId: string | null; onCreateChild: (area: Area) => Promise<void>; onNavigate: (route: LibraryRoute) => void; onPersisted: (area: Area, moved: boolean) => void; ownerId: string; recoveryDraft?: LocalDraft; onRecoveryHandled?: () => void; navigationError?: string; onCheckpointSaved: () => void; section: Section; subSection: SubSection; area: Area | null; parentOptions?: Area[]; userId?: string; onCancel: () => void; onSaved: (area: Area) => void; onDeleted: (areaId: string) => void; onDuplicated?: (copied: Area) => void; registerNavigationGuard: (guard: (() => Promise<void>) | null) => void }) {
  const [portabilityMode, setPortabilityMode] = useState<"export" | "revisions" | null>(null);
  const [portabilityBusy, setPortabilityBusy] = useState(false);
  const [values, setValues] = useState<AreaFormValues>({ nome: area?.nome ?? "Sem título", categoria: area?.categoria ?? "Geral", nivelEntendimento: area?.nivelEntendimento ?? 0, icone: area?.icone ?? "✦", parentId: area ? area.parentId ?? null : initialParentId, targetPageId: area?.targetPageId ?? null, coverAttachmentId: area?.coverAttachmentId ?? null, coverPosition: area?.coverPosition ?? 50, fullWidth: Boolean(area?.fullWidth), conteudo: getEditorContent(area?.conteudo), updatedAt: area?.updatedAt });
  const [unsupportedContent] = useState(() => unsupportedEditorFeatures(getEditorContent(area?.conteudo)));
  const [isSaving, setIsSaving] = useState(false); const [error, setError] = useState<string>();
  const applyFocus = useRef<HTMLElement | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState(Boolean(area?.id));
  const [materialsLoadError, setMaterialsLoadError] = useState<string>();
  const [materialsRetry, setMaterialsRetry] = useState(0);
  useEffect(() => {
    if (!isSaving && applyFocus.current) { applyFocus.current.focus(); applyFocus.current = null; }
  }, [isSaving]);
  const [attachments, setAttachments] = useState<Attachment[]>([]); const [attachmentError, setAttachmentError] = useState<string>(); const fileInputRef = useRef<HTMLInputElement>(null); const coverInputRef = useRef<HTMLInputElement>(null); const [selectedFileKind, setSelectedFileKind] = useState<"image" | "file">("file");
  const valuesRef = useRef(values);
  const locationRef = useRef({ section, subSection });
  const [, refreshSaveState] = useState(0);
  const payload = (value: AreaFormValues, status = locationRef.current.subSection) => formSnapshot(value, locationRef.current.section, status);
  const [coordinator] = useState(() => {
    let confirmedSnapshot = formSnapshot(values, section, subSection);
    return new PageSaveCoordinator({
    userId: ownerId, pageId: area?.id, updatedAt: area?.updatedAt, initial: confirmedSnapshot, store: draftStore,
    isCurrent: () => belongsToCurrentAccount(ownerId), changed: () => refreshSaveState(value => value + 1), contentWritable: !unsupportedContent.length,
    request: async (pageId, snapshot, revision, key) => {
      if (!belongsToCurrentAccount(ownerId)) throw new PageSaveError('A conta mudou. O rascunho continua na conta original.');
      const token = getAccessToken()!;
      const body: Record<string, unknown> = { ...snapshot };
      if (pageId) {
        // Do not revalidate/resend unchanged references or normalize untouched
        // legacy metadata when only the document or another field changed.
        for (const key of Object.keys(snapshot) as (keyof PageSnapshot)[]) {
          if (JSON.stringify(snapshot[key]) === JSON.stringify(confirmedSnapshot[key])) delete body[key];
        }
      }
      if (pageId) body.updatedAt = revision;
      if (unsupportedContent.length) delete body.conteudo;
      const response = await apiFetch(apiUrl + '/areas' + (pageId ? '/' + pageId : ''), {
        method: pageId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', ...(!pageId ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body),
      }, token);
      if (!response.ok) throw new PageSaveError(getApiErrorMessage(await response.json().catch(() => null), 'Não foi possível salvar a página.'), response.status);
      const saved = await response.json() as SavedPage;
      if (belongsToCurrentAccount(ownerId)) {
        const moved = confirmedSnapshot.parentId !== snapshot.parentId;
        confirmedSnapshot = snapshot;
        onPersisted({ ...area, ...snapshot, ...saved } as Area, moved);
      }
      return saved;
    },
    read: async pageId => {
      if (!belongsToCurrentAccount(ownerId)) throw new PageSaveError('A conta mudou.');
      const response = await apiFetch(apiUrl + '/areas/' + pageId, {}, getAccessToken()!);
      if (!response.ok) throw new PageSaveError('Página indisponível; o rascunho local foi preservado.', response.status);
      const saved = await response.json() as SavedPage;
      if (belongsToCurrentAccount(ownerId)) confirmedSnapshot = { ...confirmedSnapshot, ...saved, icone: (saved.icone as string | null) ?? '✦', conteudo: getEditorContent(saved.conteudo as AreaContent) } as PageSnapshot;
      return saved;
    },
  });
  });
  useEffect(() => {
    coordinator.activate();
    return () => coordinator.deactivate();
  }, [coordinator]);
  const updateValue = (field: keyof AreaFormValues, value: string | number | boolean | JSONContent | null) => {
    const next = { ...valuesRef.current, [field]: value };
    valuesRef.current = next; setValues(next); coordinator.update(payload(next));
  };
  const editor = useEditor({ extensions: editorExtensions, content: unsupportedContent.length ? { type: 'doc', content: [{ type: 'paragraph' }] } : values.conteudo, editable: !unsupportedContent.length, editorProps: { attributes: { role: 'textbox', 'aria-label': 'Conteúdo da página', 'aria-multiline': 'true' } }, immediatelyRender: false, onUpdate: ({ editor: current }) => { if (!unsupportedContent.length) updateValue('conteudo', editedDocumentContent(current.getJSON(), valuesRef.current.conteudo)); } });
  const subscribeToDocument = useCallback((notify: () => void) => {
    if (!editor) return () => {};
    editor.on('transaction', notify);
    return () => { editor.off('transaction', notify); };
  }, [editor]);
  const getDocument = useCallback(() => editor?.state.doc ?? null, [editor]);
  const outlineDocument = useSyncExternalStore(subscribeToDocument, getDocument, () => null);
  const headings = useMemo(() => outlineDocument ? documentHeadings(outlineDocument) : [], [outlineDocument]);
  const [resourcePicker, setResourcePicker] = useState<{ kind: ResourceInsertKind; insertion: DocumentInsertion } | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const navigateResource = useRef(onNavigate);
  useEffect(() => { navigateResource.current = onNavigate; }, [onNavigate]);
  const documentRequest = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!belongsToCurrentAccount(ownerId)) throw new Error('A conta mudou.');
    // The authenticated client supplies Authorization; avoid duplicate differently-cased headers.
    const headers = new Headers(init.headers); headers.delete('authorization');
    const response = await apiFetch(apiUrl + path, { ...init, headers: Object.fromEntries(headers.entries()) }, getAccessToken()!);
    if (!belongsToCurrentAccount(ownerId)) throw new Error('A conta mudou.');
    return response;
  }, [ownerId]);
  useEffect(() => {
    if (!editor || !area?.id) return;
    return configureDocumentResources(editor, createDocumentResources(documentRequest, id => navigateResource.current({ pageId: id }), area.id));
  }, [editor, area?.id, documentRequest]);
  const insertResource = (kind: ResourceInsertKind, slash: boolean) => {
    if (editor && editor.isEditable && !editor.view.composing) setResourcePicker({ kind, insertion: new DocumentInsertion(editor, slash) });
  };
  const transformBlock = (type: BlockType) => {
    if (!editor) return;
    if (!canConvertBlock(editor.state, type)) {
      setError('Transformação indisponível: o bloco foi preservado para não perder conteúdo ou propriedades.');
      return;
    }
    convertDocumentBlock(editor, type);
  };
  const insertExistingAttachment = (id: string) => {
    const attachment = attachments.find(item => item.id === id);
    if (!editor || !attachment || !editor.isEditable) return;
    const insertion = new DocumentInsertion(editor);
    const success = insertion.insert({ type: attachment.tipo === 'IMAGEM' ? 'image' : 'attachment', attrs: { attachmentId: id } });
    insertion.dispose();
    if (!success) setAttachmentError('Escolha uma posição compatível no texto para inserir o material.');
  };
  const checkpoint = useCallback(async () => {
    if (!coordinator.pageId) throw new Error('Salve a página antes de continuar.');
    await coordinator.flush();
    setError(undefined); onCheckpointSaved();
    return coordinator.revision!;
  }, [coordinator, onCheckpointSaved]);
  useEffect(() => {
    registerNavigationGuard(async () => {
      if (!coordinator.dirty) return;
      if (!coordinator.pageId) throw new Error('Salve o rascunho antes de sair para preservar suas alterações.');
      setIsSaving(true); editor?.setEditable(false);
      try { await checkpoint(); } finally { setIsSaving(false); editor?.setEditable(!unsupportedContent.length); }
    });
    const unload = (event: BeforeUnloadEvent) => { if (coordinator.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { registerNavigationGuard(null); window.removeEventListener('beforeunload', unload); };
  }, [checkpoint, coordinator, editor, registerNavigationGuard, unsupportedContent.length]);
  const saveSequence = coordinator.sequence;
  useEffect(() => {
    if (!area || !coordinator.dirty || coordinator.needsReconciliation) return;
    const timer = window.setTimeout(() => { void coordinator.flush().catch(() => {}); }, 700);
    return () => window.clearTimeout(timer);
  }, [area, coordinator, saveSequence]);
  const isContentDirty = coordinator.dirty;
  const isAutosaving = coordinator.saving;
  const handleSubmit = async (targetSubSection = subSection) => {
    if (isSaving || !userId) return;
    setIsSaving(true); setError(undefined);
    try {
      if (coordinator.snapshot.subSection !== targetSubSection) coordinator.update(payload(valuesRef.current, targetSubSection));
      const saved = await coordinator.flush();
      if (belongsToCurrentAccount(ownerId)) onSaved({ ...area, ...coordinator.snapshot, ...saved, id: coordinator.pageId!, updatedAt: coordinator.revision! } as Area);
    } catch (cause) { if (!coordinator.error) setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a página.'); }
    finally { setIsSaving(false); }
  };
  const recoverLocalDraft = async () => {
    if (!recoveryDraft) return;
    try {
      if (unsupportedEditorFeatures(recoveryDraft.snapshot.conteudo).length) throw new Error('O rascunho contém formato incompatível. Baixe o original para preservar seus dados.');
      let remote: SavedPage | undefined;
      if (recoveryDraft.pageId) {
        const response = await apiFetch(apiUrl + '/areas/' + recoveryDraft.pageId, {}, getAccessToken()!);
        if (!response.ok) throw new Error('Página indisponível; o rascunho foi preservado.');
        remote = await response.json() as SavedPage;
      }
      await coordinator.recover(recoveryDraft, remote);
      locationRef.current = { section: recoveryDraft.snapshot.section, subSection: recoveryDraft.snapshot.subSection };
      const next = { ...recoveryDraft.snapshot, updatedAt: remote?.updatedAt };
      valuesRef.current = next; setValues(next); editor?.commands.setContent(next.conteudo, { emitUpdate: false });
      onRecoveryHandled?.(); setError(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível recuperar o rascunho.'); }
  };
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if (portabilityMode || event.defaultPrevented || event.isComposing || event.keyCode === 229) return; if (event.key === "Escape") onCancel(); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void handleSubmit(); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); });
  useEffect(() => {
    if (!area?.id || !userId) return;
    let active = true;
    apiFetch(`${apiUrl}/attachments?areaId=${encodeURIComponent(area.id)}`, { headers: authHeaders(userId) }, userId)
      .then(async response => {
        if (!response.ok) throw new Error("Não foi possível carregar os materiais.");
        const items = await response.json() as Attachment[];
        if (active) setAttachments(items);
      })
      .catch(loadError => { if (active) setMaterialsLoadError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os materiais."); })
      .finally(() => { if (active) setMaterialsLoading(false); });
    return () => { active = false; };
  }, [area?.id, userId, materialsRetry]);
  const uploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!area?.id) {
      setAttachmentError("Salve a página antes de adicionar anexos.");
      return;
    }
    if (!userId) return;
    try {
      setAttachmentError(undefined);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("areaId", area.id);
      const response = await apiFetch(`${apiUrl}/attachments/upload`, { method: "POST", headers: authHeaders(userId), body: formData }, userId);
      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        const errMsg = (errPayload && typeof errPayload === "object" && "message" in errPayload)
          ? String(errPayload.message)
          : "Não foi possível enviar o arquivo.";
        throw new Error(errMsg);
      }
      const attachment = await response.json();
      setAttachments((current) => [attachment, ...current]);
    } catch (uploadError) {
      setAttachmentError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo.");
    }
  };
  const addAttachment = async (kind: AttachmentItem["kind"]) => {
    if (!area?.id) {
      setAttachmentError("Salve a página antes de adicionar anexos.");
      return;
    }
    if (kind === "link") {
      const url = window.prompt("URL do link", "https://");
      if (!url?.trim() || !area?.id || !userId) return;
      try {
        setAttachmentError(undefined);
        const response = await apiFetch(`${apiUrl}/attachments`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(userId) }, body: JSON.stringify({ areaId: area.id, tipo: "LINK", url: url.trim(), nome: url.trim().slice(0, 255) }) }, userId);
        if (!response.ok) {
          const errPayload = await response.json().catch(() => null);
          const errMsg = (errPayload && typeof errPayload === "object" && "message" in errPayload)
            ? String(errPayload.message)
            : "Não foi possível adicionar o link.";
          throw new Error(errMsg);
        }
        const attachment = await response.json();
        setAttachments((current) => [attachment, ...current]);
      } catch (linkError) {
        setAttachmentError(linkError instanceof Error ? linkError.message : "Não foi possível adicionar o link.");
      }
      return;
    }
    setAttachmentError(undefined);
    setSelectedFileKind(kind);
    fileInputRef.current?.click();
  };
  const removeAttachment = async (id: string) => { if (!userId) return; try { const response = await apiFetch(`${apiUrl}/attachments/${id}`, { method: "DELETE", headers: authHeaders(userId) }, userId); if (!response.ok) throw new Error("Não foi possível remover o anexo."); setAttachments((current) => current.filter((item) => item.id !== id)); if (values.coverAttachmentId === id) updateValue("coverAttachmentId", null); } catch (removeError) { setAttachmentError(removeError instanceof Error ? removeError.message : "Não foi possível remover o anexo."); } };
  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !area?.id || !userId) {
      if (!area?.id) setAttachmentError("Salve a página antes de adicionar uma capa.");
      return;
    }
    try {
      setAttachmentError(undefined);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("areaId", area.id);
      const response = await apiFetch(`${apiUrl}/attachments/upload`, { method: "POST", headers: authHeaders(userId), body: formData }, userId);
      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errPayload, "Não foi possível enviar a capa."));
      }
      const attachment = await response.json() as Attachment;
      setAttachments((current) => [attachment, ...current]);
      updateValue("coverAttachmentId", attachment.id);
    } catch (coverError) {
      setAttachmentError(coverError instanceof Error ? coverError.message : "Não foi possível enviar a capa.");
    }
  };
  const duplicateFromEditor = async (includeChildren: boolean) => {
    if (!area || !userId) return;
    setIsSaving(true);
    setError(undefined);
    try {
      await checkpoint();
      const response = await apiFetch(`${apiUrl}/areas/${area.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(userId) },
        body: JSON.stringify({ includeChildren }),
      }, userId);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorPayload, "Não foi possível duplicar esta página."));
      }
      const copied = await response.json() as Area;
      if (onDuplicated) onDuplicated(copied); else onSaved(copied);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Não foi possível duplicar esta página.");
    } finally {
      setIsSaving(false);
    }
  };
  const deleteArea = async () => {
    if (!area || !userId || !window.confirm(`Excluir a página “${area.nome}”?`)) return;
    setError(undefined);
    setIsSaving(true);
    try {
      const response = await apiFetch(`${apiUrl}/areas/${area.id}`, { method: "DELETE", headers: authHeaders(userId) }, userId);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorPayload, "Não foi possível excluir esta página."));
      }
      onDeleted(area.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir esta página.");
    } finally {
      setIsSaving(false);
    }
  };
  const selectOutlineHeading = (key: string) => {
    if (!editor || editor.isDestroyed) return;
    const { doc } = editor.state;
    // Uma posição local só é válida para o documento que gerou a lista.
    const currentHeadings = doc === outlineDocument ? headings : key.startsWith('id:') ? documentHeadings(doc) : [];
    const heading = currentHeadings.find(item => item.key === key);
    if (!heading) return;

    const { view } = editor;
    const target = view.nodeDOM(heading.position);
    if (!(target instanceof HTMLElement) || !target.isConnected || target.parentElement !== view.dom || target.tagName !== `H${heading.level}`) return;
    target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const attachmentItems: AttachmentItem[] = attachments.map((attachment) => ({ id: attachment.id, kind: attachment.tipo === "LINK" ? "link" : attachment.tipo === "IMAGEM" ? "image" : "file", label: attachment.nome ?? attachment.url, href: attachment.url, previewUrl: attachment.tipo === "IMAGEM" ? attachment.url : undefined }));
  const outline = headings.length > 0 && !resourcePicker && !saveTemplateOpen && !portabilityMode && <EditorOutline headings={headings} onSelect={selectOutlineHeading} />;
  const activeBlock: BlockKind | null = editor?.isActive("heading", { level: 1 }) ? "h1" : editor?.isActive("heading", { level: 2 }) ? "h2" : editor?.isActive("heading", { level: 3 }) ? "h3" : editor?.isActive("heading", { level: 4 }) ? "h4" : editor?.isActive("heading", { level: 5 }) ? "h5" : editor?.isActive("heading", { level: 6 }) ? "h6" : editor?.isActive("paragraph") ? "p" : null;
  const marks: Partial<Record<MarkKind, boolean>> = { bold: editor?.isActive("bold"), italic: editor?.isActive("italic"), strike: editor?.isActive("strike"), bulletList: editor?.isActive("bulletList"), orderedList: editor?.isActive("orderedList"), taskList: editor?.isActive("taskList"), blockquote: editor?.isActive("blockquote"), codeBlock: editor?.isActive("codeBlock"), toggleBlock: editor?.isActive("toggleBlock"), callout: editor?.isActive("callout") };
  const iconSlot = <Button type="button" className="icon-picker" aria-label="Escolher ícone" onClick={() => { const next = window.prompt("Ícone da página (vazio remove)", values.icone); if (next === null) return; updateValue("icone", next.trim()); }}>{values.icone || "＋"}</Button>;
  const fileAccept = selectedFileKind === "image" ? "image/*" : undefined;
  const targetSubSection: SubSection = subSection === "ESTUDADO" ? "ESTUDANDO" : "ESTUDADO";
  const parentOptionsList = parentCandidates(parentOptions ?? [], area?.id).filter(item => item.section === section);
  const referenceOptionsList = (parentOptions ?? []).filter((item) => item.id !== area?.id && !item.deletedAt);
  const coverAttachment = attachments.find((item) => item.id === values.coverAttachmentId && item.tipo === "IMAGEM");
  return <>{saveTemplateOpen && area && <SaveTemplateDialog pageId={area.id} name={values.nome} checkpoint={checkpoint} request={documentRequest} onClose={() => setSaveTemplateOpen(false)} />}{resourcePicker && <DocumentResourcePicker kind={resourcePicker.kind} insertion={resourcePicker.insertion} areaId={area?.id} attachments={attachments} request={documentRequest} onAttachment={attachment => setAttachments(current => [attachment, ...current])} onClose={() => setResourcePicker(null)} />}{coordinator.blocked && <section role="alert"><p>A versão remota mudou. Seu rascunho local foi preservado.</p><Button onClick={() => downloadDraft(coordinator.draft)}>Baixar rascunho atual</Button><Button onClick={() => { void coordinator.durable().then(() => window.location.reload()).catch(() => setError('Não foi possível guardar o rascunho antes de recarregar.')); }}>Reabrir versão remota</Button></section>}{recoveryDraft && <section aria-label="Recuperação de rascunho"><p>Rascunho local disponível: {recoveryDraft.snapshot.nome}. Recuperar exige conferir a versão remota.</p><Button onClick={() => void recoverLocalDraft()}>Recuperar para edição</Button><Button onClick={() => downloadDraft(recoveryDraft)}>Baixar rascunho para comparar</Button></section>}<div inert={portabilityBusy || isSaving}> <EditorLayout fullWidth={values.fullWidth} properties={<EditorProperties level={values.nivelEntendimento} onLevel={(level) => updateValue("nivelEntendimento", level)} saving={isSaving} onApply={area ? () => { applyFocus.current = document.activeElement as HTMLElement; setIsSaving(true); setError(undefined); void checkpoint().catch(cause => setError(cause instanceof Error ? cause.message : "Não foi possível aplicar as propriedades.")).finally(() => setIsSaving(false)); } : undefined}><div className="ui-properties"><Field label="Categoria"><Input value={values.categoria} onChange={(event) => updateValue("categoria", event.target.value)} /></Field><Field label="Página mãe"><Select value={values.parentId ?? ""} onChange={(event) => updateValue("parentId", event.target.value || null)}><option value="">Página principal</option>{parentOptionsList.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></Field><Field label="Página referenciada"><Select value={values.targetPageId ?? ""} onChange={(event) => updateValue("targetPageId", event.target.value || null)}><option value="">Sem referência</option>{referenceOptionsList.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></Field></div></EditorProperties>} attachmentCount={attachments.length} outline={outline} topbar={<><PageBreadcrumb pages={parentOptions ?? []} parentId={values.parentId} section={section} name={values.nome} onNavigate={onNavigate} /><EditorTopBar onStartWriting={() => editor?.commands.focus()} selectName={!area} iconSlot={iconSlot} name={values.nome} onName={(value) => updateValue("nome", value)} saveStatus={getSavePresentation({ isNew: !area, saving: isSaving, autosaving: isAutosaving, contentDirty: isContentDirty, metadataDirty: coordinator.dirty, error: error ?? navigationError ?? coordinator.error })} saveHint={area ? "Conteúdo e propriedades são salvos automaticamente. Conflitos preservam o rascunho local." : "Crie a página para confirmar o rascunho e habilitar anexos."} /></>} cover={<><Input ref={coverInputRef} type="file" accept="image/*" onChange={uploadCover} hidden /><PageCover imageUrl={coverAttachment?.url} position={values.coverPosition} onPosition={(value) => updateValue("coverPosition", value)} onPick={() => { if (!area?.id) { setAttachmentError("Salve a página antes de adicionar uma capa."); return; } const existing = attachments.find((item) => item.tipo === "IMAGEM"); if (existing && window.confirm("Usar uma imagem já anexada como capa?")) { updateValue("coverAttachmentId", existing.id); return; } coverInputRef.current?.click(); }} onRemove={() => updateValue("coverAttachmentId", null)} disabled={!area?.id} /></>} editor={unsupportedContent.length ? <section aria-label="Conteúdo original preservado"><p role="alert">Esta página contém conteúdo ainda não compatível com o editor. A edição do corpo está bloqueada para preservar o original. Materiais e exportação continuam disponíveis.</p><p style={{ whiteSpace: "pre-wrap" }}>{originalDocumentText(values.conteudo)}</p></section> : editor ? <BlockControls editor={editor} onInsertResource={insertResource}><EditorContent editor={editor} /></BlockControls> : <p>Carregando editor...</p>} wordCount={wordCount(values.conteudo)} attachments={<><Input ref={fileInputRef} type="file" accept={fileAccept} onChange={uploadAttachment} hidden /><AttachmentsPanel items={attachmentItems} onAdd={addAttachment} onRemove={removeAttachment} onInsert={unsupportedContent.length ? undefined : insertExistingAttachment} loading={materialsLoading} loadError={materialsLoadError} onRetry={() => { setMaterialsLoading(true); setMaterialsLoadError(undefined); setMaterialsRetry(value => value + 1); }} /></>} format={unsupportedContent.length ? <p>A formatação está indisponível para preservar o conteúdo original.</p> : <FormatPanel activeBlock={activeBlock} activeMarks={marks} disabledMarks={["underline", "link"]} fullWidth={values.fullWidth} onFullWidth={(value) => updateValue("fullWidth", value)} onBlock={block => transformBlock(block === "p" ? "paragraph" : block)} onMark={mark => { if (!editor) return; if (mark === "bold" || mark === "italic" || mark === "strike") editor.chain().focus().toggleMark(mark).run(); else if (["bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "toggleBlock", "callout"].includes(mark)) transformBlock(mark as BlockType); }} onColor={(color) => { if (editor) { const chain = editor.chain().focus(); if (color) { chain.toggleHighlight({ color }).run(); } else { chain.unsetHighlight().run(); } } }} onClear={() => editor?.chain().focus().unsetAllMarks().run()} />} error={error ?? navigationError ?? coordinator.error ?? attachmentError} rail={<ActionRail onBack={onCancel} onSave={() => void handleSubmit()} saving={isSaving} saveLabel={area ? "Salvar e voltar" : "Criar página"} menuItems={[...(area ? [{ label: "Nova subpágina", onClick: () => { void onCreateChild(area); } }, { label: "Salvar como modelo", onClick: () => setSaveTemplateOpen(true) }, { label: "Exportar", onClick: () => setPortabilityMode("export") }, { label: "Versões", onClick: () => setPortabilityMode("revisions") }] : []), ...(area ? [{ label: `Mover para ${targetSubSection === "ESTUDADO" ? "Estudado" : "Estudando"}`, onClick: () => void handleSubmit(targetSubSection) }, { label: "Duplicar página", onClick: () => void duplicateFromEditor(false) }, { label: "Duplicar com subpáginas", onClick: () => void duplicateFromEditor(true) }] : []), ...(area ? [{ label: "Excluir página", danger: true, onClick: () => void deleteArea() }] : []), { label: "Atalhos de teclado", onClick: () => window.alert("Ctrl+S salva a página. Esc volta, salvando pendências de páginas existentes; não desfaz alterações.") }]} />} /></div>{area && userId && portabilityMode && <PortabilityDialog mode={portabilityMode} areaId={area.id} request={(path, init) => apiFetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...authHeaders(userId) } }, userId)} checkpoint={checkpoint} onBusy={busy => { setPortabilityBusy(busy); editor?.setEditable(!busy); }} onRestored={saved => { setPortabilityMode(null); onSaved(saved); }} onClose={() => setPortabilityMode(null)} />}</>;
}
