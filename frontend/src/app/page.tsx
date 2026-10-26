"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { ActionRail, AttachmentsPanel, EditorLayout, EditorSidebar, EditorTopBar, FormatPanel, type AttachmentItem, type BlockKind, type MarkKind } from "./EditorLayout";
import { contentHeadings, wordCount } from "./AreaEditor";
import { editorExtensions } from "./extensions";
import styles from "./page.module.css";

type Section = "LINGUAGENS" | "FACULDADE" | "PROJETOS" | "OUTROS";
type SubSection = "ESTUDANDO" | "ESTUDADO";
type AreaContent = JSONContent | { texto?: string };
type Area = { id: string; section: Section; subSection: SubSection; nome: string; categoria: string; nivelEntendimento: number; icone: string | null; conteudo?: AreaContent; updatedAt: string };
type AreaPage = { items: Area[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
type Attachment = { id: string; tipo: "LINK" | "IMAGEM" | "ARQUIVO"; url: string; nome: string | null; createdAt: string };
type AreaFormValues = { nome: string; categoria: string; nivelEntendimento: number; icone: string; conteudo: JSONContent; updatedAt?: string };

const apiUrl = (process.env.NEXT_PUBLIC_API_URL?.trim() || "https://biblioteca-de-estudos.onrender.com").replace(/\/+$/, "");
type AuthTokens = { accessToken: string; refreshToken: string };
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
  return window.localStorage.getItem("biblioteca-access-token");
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function saveTokens(tokens: AuthTokens) {
  window.localStorage.setItem("biblioteca-access-token", tokens.accessToken);
  window.localStorage.setItem("biblioteca-refresh-token", tokens.refreshToken);
}

async function apiFetch(url: string, init: RequestInit, fallbackToken: string) {
  const currentToken = getAccessToken() ?? fallbackToken;
  const response = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), ...authHeaders(currentToken) } });
  if (response.status !== 401) return response;
  const refreshToken = window.localStorage.getItem("biblioteca-refresh-token");
  if (!refreshToken) return response;
  const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
  if (!refreshResponse.ok) return response;
  const tokens = await refreshResponse.json() as AuthTokens;
  saveTokens(tokens);
  return fetch(url, { ...init, headers: { ...(init.headers ?? {}), ...authHeaders(tokens.accessToken) } });
}

function getEditorContent(content?: AreaContent): JSONContent {
  if (content && "type" in content && content.type === "doc") return content;
  const legacyText = content && "texto" in content ? content.texto : "";
  return { type: "doc", content: [{ type: "paragraph", content: legacyText ? [{ type: "text", text: legacyText }] : undefined }] };
}

export default function Home() {
  const [userId, setUserId] = useState<string | undefined>(() => (typeof window === "undefined" ? undefined : getAccessToken() ?? undefined));
  const [selectedSection, setSelectedSection] = useState<Section>();
  const [selectedSubSection, setSelectedSubSection] = useState<SubSection>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaPage, setAreaPage] = useState(1);
  const [pagination, setPagination] = useState<AreaPage["pagination"]>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") setIsSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!userId || !selectedSection || !selectedSubSection) return;
    const controller = new AbortController();
    const loadAreas = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const params = new URLSearchParams({ section: selectedSection, subSection: selectedSubSection, page: String(areaPage), limit: "20" });
        const response = await apiFetch(`${apiUrl}/areas?${params}`, { headers: authHeaders(userId), signal: controller.signal }, userId);
        if (!response.ok) throw new Error("Não foi possível carregar esta estante.");
        const result = await response.json() as AreaPage;
        setAreas(result.items);
        setPagination(result.pagination);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Ocorreu um erro inesperado.");
        setAreas([]);
      } finally { setIsLoading(false); }
    };
    loadAreas();
    return () => controller.abort();
  }, [areaPage, selectedSection, selectedSubSection, userId, retryKey]);

  const currentSection = sections.find((section) => section.value === selectedSection);
  const currentSubSection = subsections.find((subSection) => subSection.value === selectedSubSection);
  const visibleAreas = searchQuery.trim() ? areas.filter((area) => `${area.nome} ${area.categoria}`.toLowerCase().includes(searchQuery.trim().toLowerCase())) : areas;
  const goHome = () => { setSelectedSection(undefined); setSelectedSubSection(undefined); setAreaPage(1); setAreas([]); };
  const closeForm = () => { setEditingArea(null); setIsCreating(false); };
  const openCreate = () => { setEditingArea(null); setIsCreating(true); };
  const openEdit = (area: Area) => { setIsCreating(false); setEditingArea({ ...area }); };
  if (!userId) return <AuthView onAuthenticated={(tokens) => { saveTokens(tokens); setUserId(tokens.accessToken); }} />;
  const logout = async () => {
    const refreshToken = window.localStorage.getItem("biblioteca-refresh-token");
    if (refreshToken) {
      try {
        await fetch(`${apiUrl}/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
      } catch {
        // A limpeza local continua mesmo quando a API está indisponível.
      }
    }
    window.localStorage.removeItem("biblioteca-access-token");
    window.localStorage.removeItem("biblioteca-refresh-token");
    setUserId(undefined);
    goHome();
  };
  return <div className={styles.page}>
    <header className={styles.header}><button className={styles.brand} onClick={goHome} aria-label="Voltar para a biblioteca"><span className={styles.brandMark}>B</span><span>Biblioteca<span className={styles.brandAccent}>.</span></span></button><div className={styles.headerTools}>{isSearchOpen ? <label className={styles.searchField}><span className="sr-only">Buscar nos blocos carregados</span><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar blocos..." onKeyDown={(event) => { if (event.key === "Escape") setIsSearchOpen(false); }} /></label> : <button className={styles.searchButton} type="button" aria-label="Buscar na biblioteca" onClick={() => setIsSearchOpen(true)}>Buscar <kbd>/</kbd></button>}<span className={styles.headerNote}>seu espaço de conhecimento</span><button className={styles.logoutButton} type="button" onClick={logout}>Sair</button></div></header>
    <main className={styles.main}>
      {selectedSubSection && currentSection && currentSubSection ? editingArea || isCreating ? <AreaForm section={currentSection.value} subSection={currentSubSection.value} area={editingArea} userId={userId} onCancel={closeForm} onSaved={(savedArea) => { setAreas((currentAreas) => editingArea ? currentAreas.map((area) => area.id === savedArea.id ? savedArea : area) : areaPage === 1 ? [savedArea, ...currentAreas].slice(0, pagination.limit) : currentAreas); setPagination((current) => ({ ...current, total: current.total + (editingArea ? 0 : 1), totalPages: Math.ceil((current.total + (editingArea ? 0 : 1)) / current.limit) })); if (editingArea) closeForm(); else { setIsCreating(false); setEditingArea({ ...savedArea }); } }} /> : <SubSectionView section={currentSection} subSection={currentSubSection} areas={visibleAreas} pagination={pagination} userId={userId} isLoading={isLoading} error={error} onBack={() => { setSelectedSubSection(undefined); setAreaPage(1); }} onCreate={openCreate} onEdit={openEdit} onPageChange={setAreaPage} onRetry={() => setRetryKey((key) => key + 1)} onDelete={(areaId) => { setAreas((currentAreas) => currentAreas.filter((area) => area.id !== areaId)); const nextTotal = Math.max(0, pagination.total - 1); setPagination((current) => ({ ...current, total: nextTotal, totalPages: Math.ceil(nextTotal / current.limit) })); if (areas.length === 1 && areaPage > 1) setAreaPage(areaPage - 1); }} /> : selectedSection && currentSection ? <SectionView section={currentSection} onBack={goHome} onSelect={(subSection) => { setSelectedSubSection(subSection); setAreaPage(1); }} /> : <LibraryView onSelect={setSelectedSection} />}
    </main><footer className={styles.footer}>Uma ideia clara encontra um lugar para ficar.</footer>
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
    setError(undefined);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/auth/${isRegistering ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setError(Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message ?? "Não foi possível autenticar."); return; }
      onAuthenticated(payload as AuthTokens);
    } catch {
      setError("Não foi possível conectar à API. Verifique se o backend está disponível.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className={styles.page}><main className={styles.main}><form className={styles.areaForm} onSubmit={submit}><p className={styles.kicker}>Biblioteca privada</p><h1>{isRegistering ? "Crie sua conta" : "Entre na sua biblioteca"}</h1><div className={styles.formGrid}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Senha<input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label></div>{error && <p className={styles.formError}>{error}</p>}<button className={styles.primaryButton} type="submit" disabled={isSubmitting}>{isSubmitting ? "Aguarde..." : isRegistering ? "Cadastrar" : "Entrar"}</button><button className={styles.secondaryButton} type="button" onClick={() => setIsRegistering((value) => !value)}>{isRegistering ? "Já tenho uma conta" : "Criar uma conta"}</button></form></main></div>;
}

function LibraryView({ onSelect }: { onSelect: (section: Section) => void }) { return <>
  <div className={styles.hero}><p className={styles.kicker}>Bem-vindo de volta</p><h1>Biblioteca do <em>conhecimento</em></h1><p className={styles.subtitle}>Tudo o que você aprende, em um só lugar. Escolha uma estante para começar.</p></div>
  <div className={styles.sectionGrid}>{sections.map((section, index) => <button key={section.value} className={`${styles.sectionCard} ${styles[section.tone]}`} onClick={() => onSelect(section.value)}><span className={styles.cardIndex}>0{index + 1}</span><span className={styles.sectionIcon}>{section.icon}</span><span className={styles.cardText}><strong>{section.label}</strong><small>explorar assuntos</small></span><span className={styles.arrow}>↗</span></button>)}</div>
</>; }

function SectionView({ section, onBack, onSelect }: { section: (typeof sections)[number]; onBack: () => void; onSelect: (subSection: SubSection) => void }) { return <>
  <button className={styles.backButton} onClick={onBack}>← Biblioteca</button><div className={`${styles.hero} ${styles.compactHero}`}><p className={styles.breadcrumb}>Biblioteca / {section.label}</p><p className={styles.kicker}>{section.icon} {section.label}</p><h1>O que você quer <em>revisitar?</em></h1><p className={styles.subtitle}>Separe o caminho percorrido do próximo passo.</p></div>
  <div className={styles.subsectionGrid}>{subsections.map((subSection, index) => <button key={subSection.value} className={styles.subsectionCard} onClick={() => onSelect(subSection.value)}><span className={styles.subsectionNumber}>0{index + 1}</span><span><strong>{subSection.label}</strong><small>{subSection.description}</small></span><span className={styles.arrow}>→</span></button>)}</div>
</>; }

function SubSectionView({ section, subSection, areas, pagination, userId, isLoading, error, onBack, onCreate, onEdit, onPageChange, onRetry, onDelete }: { section: (typeof sections)[number]; subSection: (typeof subsections)[number]; areas: Area[]; pagination: AreaPage["pagination"]; userId: string; isLoading: boolean; error?: string; onBack: () => void; onCreate: () => void; onEdit: (area: Area) => void; onPageChange: (page: number) => void; onRetry: () => void; onDelete: (areaId: string) => void }) {
  const [deleteError, setDeleteError] = useState<string>();
  const [deletingAreaId, setDeletingAreaId] = useState<string>();
  const removeArea = async (area: Area) => {
    if (!window.confirm(`Excluir o bloco “${area.nome}”?`)) return;
    setDeleteError(undefined);
    setDeletingAreaId(area.id);
    try {
      const response = await apiFetch(`${apiUrl}/areas/${area.id}`, { method: "DELETE", headers: authHeaders(userId) }, userId);
      if (!response.ok) throw new Error("Não foi possível excluir este bloco.");
      onDelete(area.id);
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError instanceof Error ? deleteRequestError.message : "Não foi possível excluir este bloco.");
    } finally {
      setDeletingAreaId(undefined);
    }
  };
  return <>
  <button className={styles.backButton} onClick={onBack}>← {section.label}</button><div className={styles.listHeader}><div><p className={styles.kicker}>{section.icon} {section.label}</p><h1>{subSection.label}</h1></div><div className={styles.listActions}><span className={styles.count}>{pagination.total} {pagination.total === 1 ? "bloco" : "blocos"}</span><button className={styles.primaryButton} onClick={onCreate}>+ Novo bloco</button></div></div>
  {deleteError && <div className={`${styles.status} ${styles.error}`} role="alert">{deleteError}</div>}
  {isLoading ? <div className={styles.status}>Abrindo esta estante<span className={styles.loadingDots}>...</span></div> : error ? <div className={`${styles.status} ${styles.error}`}>{error}<button onClick={onRetry}>Tentar novamente</button></div> : areas.length === 0 ? <div className={styles.empty}><span>✦</span><h2>Nenhum bloco por aqui ainda.</h2><p>Quando novos conhecimentos chegarem, eles vão aparecer nesta estante.</p><button className={styles.primaryButton} onClick={onCreate}>Criar primeiro bloco</button></div> : <><div className={styles.areaGrid}>{areas.map((area) => <AreaCard key={area.id} area={area} onEdit={() => onEdit(area)} onDelete={() => removeArea(area)} isDeleting={deletingAreaId === area.id} isAnyDeleting={deletingAreaId !== undefined} />)}</div>{pagination.totalPages > 1 && <nav className={styles.pagination} aria-label="Paginação de blocos"><button className={styles.secondaryButton} disabled={pagination.page === 1} onClick={() => onPageChange(pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {pagination.totalPages}</span><button className={styles.secondaryButton} disabled={pagination.page === pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Próxima</button></nav>}</>}
</>; }

function AreaCard({ area, onEdit, onDelete, isDeleting, isAnyDeleting }: { area: Area; onEdit: () => void; onDelete: () => void; isDeleting?: boolean; isAnyDeleting?: boolean }) { const level = Math.min(5, Math.max(0, area.nivelEntendimento)); const percentage = level * 20; return <article className={styles.areaCard}><div className={styles.areaTop}><span className={styles.areaIcon}>{area.icone || "✦"}</span><span className={styles.level}>{level}/5</span></div><h2>{area.nome}</h2><p>{area.categoria}</p><div className={styles.progress}><span style={{ width: `${percentage}%` }} /></div><small>nível de entendimento</small><div className={styles.cardActions}><button onClick={onEdit} disabled={isAnyDeleting}>Editar</button><button onClick={onDelete} disabled={isAnyDeleting} aria-busy={isDeleting}>{isDeleting ? "Removendo..." : "Excluir"}</button></div></article>; }

function AreaForm({ section, subSection, area, userId, onCancel, onSaved }: { section: Section; subSection: SubSection; area: Area | null; userId?: string; onCancel: () => void; onSaved: (area: Area) => void }) {
  const [values, setValues] = useState<AreaFormValues>({ nome: area?.nome ?? "", categoria: area?.categoria ?? "", nivelEntendimento: area?.nivelEntendimento ?? 0, icone: area?.icone ?? "✦", conteudo: getEditorContent(area?.conteudo), updatedAt: area?.updatedAt });
  const [isSaving, setIsSaving] = useState(false); const [error, setError] = useState<string>(); const [isContentDirty, setIsContentDirty] = useState(false); const [isAutosaving, setIsAutosaving] = useState(false); const [tab, setTab] = useState<"blocos" | "indice">("blocos"); const [query, setQuery] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]); const [attachmentError, setAttachmentError] = useState<string>(); const fileInputRef = useRef<HTMLInputElement>(null); const [selectedFileKind, setSelectedFileKind] = useState<"image" | "file">("file");
  const editor = useEditor({ extensions: editorExtensions, content: values.conteudo, immediatelyRender: false, onUpdate: ({ editor: current }) => { updateValue("conteudo", current.getJSON()); setIsContentDirty(true); } });
  const updateValue = (field: keyof AreaFormValues, value: string | number | JSONContent) => setValues((current) => ({ ...current, [field]: value }));
  const saveContent = useCallback(async (content: JSONContent) => { if (!area || !userId) return; setIsAutosaving(true); try { const response = await apiFetch(`${apiUrl}/areas/${area.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders(userId) }, body: JSON.stringify({ conteudo: content, updatedAt: values.updatedAt }) }, userId); if (!response.ok) throw new Error("Não foi possível salvar o conteúdo."); const saved = await response.json(); setValues((current) => ({ ...current, updatedAt: saved.updatedAt })); setIsContentDirty(false); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o conteúdo."); } finally { setIsAutosaving(false); } }, [area, userId, values.updatedAt]);
  useEffect(() => { if (!isContentDirty) return; const timer = window.setTimeout(() => void saveContent(values.conteudo), 700); return () => window.clearTimeout(timer); }, [isContentDirty, saveContent, values.conteudo]);
  const handleSubmit = async () => { if (!values.nome.trim() || !values.categoria.trim()) { setError("Nome e categoria são obrigatórios."); return; } if (!userId) return; setIsSaving(true); setError(undefined); try { const response = await apiFetch(`${apiUrl}/areas${area ? `/${area.id}` : ""}`, { method: area ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...authHeaders(userId) }, body: JSON.stringify({ section, subSection, nome: values.nome.trim(), categoria: values.categoria.trim(), nivelEntendimento: values.nivelEntendimento, icone: values.icone.trim(), conteudo: values.conteudo, ...(area && values.updatedAt ? { updatedAt: values.updatedAt } : {}) }) }, userId); if (!response.ok) throw new Error(area ? "Não foi possível salvar as alterações." : "Não foi possível criar este bloco."); onSaved(await response.json()); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Ocorreu um erro inesperado."); } finally { setIsSaving(false); } };
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void handleSubmit(); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); });
  useEffect(() => {
    if (!area?.id || !userId) return;
    apiFetch(`${apiUrl}/attachments?areaId=${encodeURIComponent(area.id)}`, { headers: authHeaders(userId) }, userId).then(async (response) => { if (!response.ok) throw new Error("Não foi possível carregar os anexos."); setAttachments(await response.json()); }).catch((loadError) => setAttachmentError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os anexos."));
  }, [area?.id, userId]);
  const uploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !area?.id || !userId) return; try { const formData = new FormData(); formData.append("file", file); formData.append("areaId", area.id); const response = await apiFetch(`${apiUrl}/attachments/upload`, { method: "POST", headers: authHeaders(userId), body: formData }, userId); if (!response.ok) throw new Error("Não foi possível enviar o arquivo."); const attachment = await response.json(); setAttachments((current) => [attachment, ...current]); } catch (uploadError) { setAttachmentError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo."); } };
  const addAttachment = async (kind: AttachmentItem["kind"]) => { if (kind === "link") { const url = window.prompt("URL do link", "https://"); if (!url?.trim() || !area?.id || !userId) return; try { const response = await apiFetch(`${apiUrl}/attachments`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(userId) }, body: JSON.stringify({ areaId: area.id, tipo: "LINK", url: url.trim(), nome: url.trim().slice(0, 255) }) }, userId); if (!response.ok) throw new Error("Não foi possível adicionar o link."); const attachment = await response.json(); setAttachments((current) => [attachment, ...current]); } catch (linkError) { setAttachmentError(linkError instanceof Error ? linkError.message : "Não foi possível adicionar o link."); } return; } setSelectedFileKind(kind); fileInputRef.current?.click(); };
  const removeAttachment = async (id: string) => { if (!userId) return; try { const response = await apiFetch(`${apiUrl}/attachments/${id}`, { method: "DELETE", headers: authHeaders(userId) }, userId); if (!response.ok) throw new Error("Não foi possível remover o anexo."); setAttachments((current) => current.filter((item) => item.id !== id)); } catch (removeError) { setAttachmentError(removeError instanceof Error ? removeError.message : "Não foi possível remover o anexo."); } };
  const attachmentItems: AttachmentItem[] = attachments.map((attachment) => ({ id: attachment.id, kind: attachment.tipo === "LINK" ? "link" : attachment.tipo === "IMAGEM" ? "image" : "file", label: attachment.nome ?? attachment.url, href: attachment.url, previewUrl: attachment.tipo === "IMAGEM" ? attachment.url : undefined }));
  const items = useMemo(() => { const source = tab === "indice" ? contentHeadings(values.conteudo).map((name, index) => ({ id: `heading-${index}`, icon: "#", name, level: 1 })) : [{ id: area?.id ?? "new", icon: values.icone, name: values.nome || "Novo bloco", level: values.nivelEntendimento }]; return source.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())); }, [area?.id, query, tab, values]);
  const activeBlock: BlockKind | null = editor?.isActive("heading", { level: 1 }) ? "h1" : editor?.isActive("heading", { level: 2 }) ? "h2" : editor?.isActive("heading", { level: 3 }) ? "h3" : editor?.isActive("heading", { level: 4 }) ? "h4" : editor?.isActive("heading", { level: 5 }) ? "h5" : editor?.isActive("heading", { level: 6 }) ? "h6" : editor?.isActive("paragraph") ? "p" : null;
  const marks: Partial<Record<MarkKind, boolean>> = { bold: editor?.isActive("bold"), italic: editor?.isActive("italic"), strike: editor?.isActive("strike"), bulletList: editor?.isActive("bulletList"), orderedList: editor?.isActive("orderedList"), blockquote: editor?.isActive("blockquote"), codeBlock: editor?.isActive("codeBlock") };
  const iconSlot = <button type="button" className="icon-picker" aria-label="Escolher ícone" onClick={() => updateValue("icone", window.prompt("Ícone do bloco", values.icone) ?? values.icone)}>{values.icone}</button>;
  const fileAccept = selectedFileKind === "image" ? "image/*" : undefined;
  return <EditorLayout sidebar={<EditorSidebar title={section === "LINGUAGENS" ? "Idiomas" : sections.find((item) => item.value === section)?.label ?? "Blocos"} query={query} onQuery={setQuery} tab={tab} onTab={setTab} items={items} onSelect={() => undefined} onNew={onCancel} />} topbar={<EditorTopBar iconSlot={iconSlot} name={values.nome} onName={(value) => updateValue("nome", value)} categorySlot={<input value={values.categoria} onChange={(event) => updateValue("categoria", event.target.value)} aria-label="Categoria" list="cats" />} level={values.nivelEntendimento} onLevel={(level) => updateValue("nivelEntendimento", level)} dirty={isAutosaving || isContentDirty} />} editor={editor ? <EditorContent editor={editor} /> : <p>Carregando editor...</p>} wordCount={wordCount(values.conteudo)} attachments={<><input ref={fileInputRef} type="file" accept={fileAccept} onChange={uploadAttachment} hidden /><AttachmentsPanel items={attachmentItems} onAdd={addAttachment} onRemove={removeAttachment} />{attachmentError && <p className={styles.formError}>{attachmentError}</p>}</>} format={<FormatPanel activeBlock={activeBlock} activeMarks={marks} disabledMarks={["underline", "link"]} onBlock={(block) => { if (!editor) return; block === "p" ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: Number(block.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run(); }} onMark={(mark) => { if (!editor) return; const chain = editor.chain().focus(); if (mark === "bold" || mark === "italic" || mark === "strike") chain.toggleMark(mark).run(); else if (mark === "bulletList") chain.toggleBulletList().run(); else if (mark === "orderedList") chain.toggleOrderedList().run(); else if (mark === "blockquote") chain.toggleBlockquote().run(); else if (mark === "codeBlock") chain.toggleCodeBlock().run(); }} onColor={(color) => { if (editor) { const chain = editor.chain().focus(); color ? chain.toggleHighlight({ color }).run() : chain.unsetHighlight().run(); } }} onClear={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} />} error={error} rail={<ActionRail onBack={onCancel} onSave={() => void handleSubmit()} onCancel={onCancel} saving={isSaving} menuItems={[{ label: "Mover para Estudado/Estudando", onClick: () => undefined }, { label: "Excluir bloco", danger: true, onClick: () => { if (area && window.confirm(`Excluir o bloco “${area.nome}”?`)) void apiFetch(`${apiUrl}/areas/${area.id}`, { method: "DELETE", headers: authHeaders(userId ?? "") }, userId ?? "").then(() => onCancel()); } }, { label: "Atalhos de teclado", onClick: () => window.alert("Ctrl+S salva e Esc cancela.") }]} />} />;
}




