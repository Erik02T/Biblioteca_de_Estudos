"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import AreaEditor from "./AreaEditor";
import styles from "./page.module.css";

type Section = "LINGUAGENS" | "FACULDADE" | "PROJETOS" | "OUTROS";
type SubSection = "ESTUDANDO" | "ESTUDADO";
type AreaContent = JSONContent | { texto?: string };
type Area = { id: string; section: Section; subSection: SubSection; nome: string; categoria: string; nivelEntendimento: number; icone: string | null; conteudo?: AreaContent };
type Attachment = { id: string; tipo: "LINK" | "IMAGEM" | "ARQUIVO"; url: string; nome: string | null; createdAt: string };
type AreaFormValues = { nome: string; categoria: string; nivelEntendimento: number; icone: string; conteudo: JSONContent };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const sections: Array<{ value: Section; label: string; icon: string; tone: string }> = [
  { value: "LINGUAGENS", label: "Linguagens", icon: "</>", tone: "coral" },
  { value: "FACULDADE", label: "Faculdade", icon: "✦", tone: "blue" },
  { value: "PROJETOS", label: "Projetos", icon: "⌁", tone: "green" },
  { value: "OUTROS", label: "Outros", icon: "＋", tone: "gold" },
];
const subsections: Array<{ value: SubSection; label: string; description: string }> = [
  { value: "ESTUDANDO", label: "Estudando", description: "O que está em movimento agora" },
  { value: "ESTUDADO", label: "Estudado", description: "Conhecimentos que já passaram por você" },
];

function getUserId() {
  const storedUserId = window.localStorage.getItem("biblioteca-user-id");
  if (storedUserId) return storedUserId;
  const userId = crypto.randomUUID();
  window.localStorage.setItem("biblioteca-user-id", userId);
  return userId;
}

function getEditorContent(content?: AreaContent): JSONContent {
  if (content && "type" in content && content.type === "doc") return content;
  const legacyText = content && "texto" in content ? content.texto : "";
  return { type: "doc", content: [{ type: "paragraph", content: legacyText ? [{ type: "text", text: legacyText }] : undefined }] };
}

export default function Home() {
  const [userId] = useState<string | undefined>(() => (typeof window === "undefined" ? undefined : getUserId()));
  const [selectedSection, setSelectedSection] = useState<Section>();
  const [selectedSubSection, setSelectedSubSection] = useState<SubSection>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!userId || !selectedSection || !selectedSubSection) return;
    const controller = new AbortController();
    const loadAreas = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const params = new URLSearchParams({ section: selectedSection, subSection: selectedSubSection });
        const response = await fetch(`${apiUrl}/areas?${params}`, { headers: { "X-User-Id": userId }, signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar esta estante.");
        setAreas(await response.json());
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Ocorreu um erro inesperado.");
        setAreas([]);
      } finally { setIsLoading(false); }
    };
    loadAreas();
    return () => controller.abort();
  }, [selectedSection, selectedSubSection, userId]);

  const currentSection = sections.find((section) => section.value === selectedSection);
  const currentSubSection = subsections.find((subSection) => subSection.value === selectedSubSection);
  const goHome = () => { setSelectedSection(undefined); setSelectedSubSection(undefined); setAreas([]); };
  const closeForm = () => { setEditingArea(null); setIsCreating(false); };
  const openCreate = () => { setEditingArea(null); setIsCreating(true); };
  const openEdit = (area: Area) => { setIsCreating(false); setEditingArea(area); };
  return <div className={styles.page}>
    <header className={styles.header}><button className={styles.brand} onClick={goHome} aria-label="Voltar para a biblioteca"><span className={styles.brandMark}>B</span><span>Biblioteca<span className={styles.brandAccent}>.</span></span></button><span className={styles.headerNote}>seu espaço de conhecimento</span></header>
    <main className={styles.main}><div className={styles.eyebrow}><span /> ORGANIZE PARA LEMBRAR</div>
      {selectedSubSection && currentSection && currentSubSection ? editingArea || isCreating ? <AreaForm section={currentSection.value} subSection={currentSubSection.value} area={editingArea} userId={userId} onCancel={closeForm} onSaved={(savedArea) => { setAreas((currentAreas) => editingArea ? currentAreas.map((area) => area.id === savedArea.id ? savedArea : area) : [savedArea, ...currentAreas]); closeForm(); }} /> : <SubSectionView section={currentSection} subSection={currentSubSection} areas={areas} isLoading={isLoading} error={error} onBack={() => setSelectedSubSection(undefined)} onCreate={openCreate} onEdit={openEdit} onDelete={(areaId) => setAreas((currentAreas) => currentAreas.filter((area) => area.id !== areaId))} /> : selectedSection && currentSection ? <SectionView section={currentSection} onBack={goHome} onSelect={setSelectedSubSection} /> : <LibraryView onSelect={setSelectedSection} />}
    </main><footer className={styles.footer}>Uma ideia clara encontra um lugar para ficar.</footer>
  </div>;
}

function LibraryView({ onSelect }: { onSelect: (section: Section) => void }) { return <>
  <div className={styles.hero}><p className={styles.kicker}>Bem-vindo de volta</p><h1>Biblioteca do <em>conhecimento</em></h1><p className={styles.subtitle}>Tudo o que você aprende, em um só lugar. Escolha uma estante para começar.</p></div>
  <div className={styles.sectionGrid}>{sections.map((section, index) => <button key={section.value} className={`${styles.sectionCard} ${styles[section.tone]}`} onClick={() => onSelect(section.value)}><span className={styles.cardIndex}>0{index + 1}</span><span className={styles.sectionIcon}>{section.icon}</span><span className={styles.cardText}><strong>{section.label}</strong><small>explorar assuntos</small></span><span className={styles.arrow}>↗</span></button>)}</div>
</>; }

function SectionView({ section, onBack, onSelect }: { section: (typeof sections)[number]; onBack: () => void; onSelect: (subSection: SubSection) => void }) { return <>
  <button className={styles.backButton} onClick={onBack}>← Biblioteca</button><div className={`${styles.hero} ${styles.compactHero}`}><p className={styles.kicker}>{section.icon} {section.label}</p><h1>O que você quer <em>revisitar?</em></h1><p className={styles.subtitle}>Separe o caminho percorrido do próximo passo.</p></div>
  <div className={styles.subsectionGrid}>{subsections.map((subSection, index) => <button key={subSection.value} className={styles.subsectionCard} onClick={() => onSelect(subSection.value)}><span className={styles.subsectionNumber}>0{index + 1}</span><span><strong>{subSection.label}</strong><small>{subSection.description}</small></span><span className={styles.arrow}>→</span></button>)}</div>
</>; }

function SubSectionView({ section, subSection, areas, isLoading, error, onBack, onCreate, onEdit, onDelete }: { section: (typeof sections)[number]; subSection: (typeof subsections)[number]; areas: Area[]; isLoading: boolean; error?: string; onBack: () => void; onCreate: () => void; onEdit: (area: Area) => void; onDelete: (areaId: string) => void }) { return <>
  <button className={styles.backButton} onClick={onBack}>← {section.label}</button><div className={styles.listHeader}><div><p className={styles.kicker}>{section.icon} {section.label}</p><h1>{subSection.label}</h1></div><div className={styles.listActions}><span className={styles.count}>{areas.length} {areas.length === 1 ? "bloco" : "blocos"}</span><button className={styles.primaryButton} onClick={onCreate}>+ Novo bloco</button></div></div>
  {isLoading ? <div className={styles.status}>Abrindo esta estante<span className={styles.loadingDots}>...</span></div> : error ? <div className={`${styles.status} ${styles.error}`}>{error}<button onClick={() => window.location.reload()}>Tentar novamente</button></div> : areas.length === 0 ? <div className={styles.empty}><span>✦</span><h2>Nenhum bloco por aqui ainda.</h2><p>Quando novos conhecimentos chegarem, eles vão aparecer nesta estante.</p><button className={styles.primaryButton} onClick={onCreate}>Criar primeiro bloco</button></div> : <div className={styles.areaGrid}>{areas.map((area) => <AreaCard key={area.id} area={area} onEdit={() => onEdit(area)} onDelete={async () => { if (!window.confirm(`Excluir o bloco “${area.nome}”?`)) return; const response = await fetch(`${apiUrl}/areas/${area.id}`, { method: "DELETE", headers: { "X-User-Id": getUserId() } }); if (!response.ok) throw new Error("Não foi possível excluir este bloco."); onDelete(area.id); }} />)}</div>}
</>; }

function AreaCard({ area, onEdit, onDelete }: { area: Area; onEdit: () => void; onDelete: () => void }) { const level = Math.min(5, Math.max(0, area.nivelEntendimento)); const percentage = level * 20; return <article className={styles.areaCard}><div className={styles.areaTop}><span className={styles.areaIcon}>{area.icone || "✦"}</span><span className={styles.level}>{level}/5</span></div><h2>{area.nome}</h2><p>{area.categoria}</p><div className={styles.progress}><span style={{ width: `${percentage}%` }} /></div><small>nível de entendimento</small><div className={styles.cardActions}><button onClick={onEdit}>Editar</button><button onClick={onDelete}>Excluir</button></div></article>; }

function AreaForm({ section, subSection, area, userId, onCancel, onSaved }: { section: Section; subSection: SubSection; area: Area | null; userId?: string; onCancel: () => void; onSaved: (area: Area) => void }) {
  const [values, setValues] = useState<AreaFormValues>({ nome: area?.nome ?? "", categoria: area?.categoria ?? "", nivelEntendimento: area?.nivelEntendimento ?? 0, icone: area?.icone ?? "", conteudo: getEditorContent(area?.conteudo) });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const contentRef = useRef(values.conteudo);
  const isContentDirtyRef = useRef(false);
  const contentSaveTimeoutRef = useRef<number | undefined>(undefined);
  const updateValue = (field: keyof AreaFormValues, value: string | number | JSONContent) => setValues((current) => ({ ...current, [field]: value }));

  const saveContent = useCallback(async (content: JSONContent) => {
    if (!area || !userId || !isContentDirtyRef.current) return;
    setIsAutosaving(true);
    try {
      const response = await fetch(`${apiUrl}/areas/${area.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ conteudo: content }) });
      if (!response.ok) throw new Error("Não foi possível salvar o conteúdo.");
      if (JSON.stringify(contentRef.current) === JSON.stringify(content)) {
        isContentDirtyRef.current = false;
        setIsContentDirty(false);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o conteúdo.");
    } finally { setIsAutosaving(false); }
  }, [area, userId]);

  useEffect(() => {
    if (!area || !userId || !isContentDirty) return;
    contentSaveTimeoutRef.current = window.setTimeout(() => {
      contentSaveTimeoutRef.current = undefined;
      void saveContent(values.conteudo);
    }, 700);
    return () => {
      if (contentSaveTimeoutRef.current !== undefined) window.clearTimeout(contentSaveTimeoutRef.current);
    };
  }, [area, isContentDirty, saveContent, userId, values.conteudo]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.nome.trim() || !values.categoria.trim()) { setError("Nome e categoria são obrigatórios."); return; }
    if (!userId) { setError("Não foi possível identificar este usuário."); return; }
    setIsSaving(true); setError(undefined);
    try {
      const payload = { section, subSection, nome: values.nome.trim(), categoria: values.categoria.trim(), nivelEntendimento: values.nivelEntendimento, ...(values.icone.trim() ? { icone: values.icone.trim() } : {}), conteudo: values.conteudo };
      const response = await fetch(`${apiUrl}/areas${area ? `/${area.id}` : ""}`, { method: area ? "PATCH" : "POST", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(area ? "Não foi possível salvar as alterações." : "Não foi possível criar este bloco.");
      onSaved(await response.json());
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Ocorreu um erro inesperado."); } finally { setIsSaving(false); }
  };
  return <form className={styles.areaForm} onSubmit={handleSubmit}><button type="button" className={styles.backButton} onClick={onCancel}>← Voltar para {subSection === "ESTUDANDO" ? "Estudando" : "Estudado"}</button><div className={styles.formHeader}><div><p className={styles.kicker}>{area ? "Editar bloco" : "Novo bloco"}</p><h1>{area ? "Ajuste este conhecimento" : "Dê um lugar ao que você aprende"}</h1></div>{area && userId && <AttachmentPanel areaId={area.id} userId={userId} />}</div><div className={styles.formGrid}><label>Nome<input value={values.nome} onChange={(event) => updateValue("nome", event.target.value)} autoFocus /></label><label>Categoria<input value={values.categoria} onChange={(event) => updateValue("categoria", event.target.value)} /></label><label>Nível de entendimento<select value={values.nivelEntendimento} onChange={(event) => updateValue("nivelEntendimento", Number(event.target.value))}>{[0, 1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} de 5</option>)}</select></label><label>Ícone<input value={values.icone} onChange={(event) => updateValue("icone", event.target.value)} placeholder="Ex.: JS, ✦, #" maxLength={4} /></label><div className={styles.fullField}><label htmlFor="area-content-editor">Conteúdo</label><AreaEditor content={values.conteudo} onChange={(content) => { contentRef.current = content; isContentDirtyRef.current = true; updateValue("conteudo", content); setIsContentDirty(true); }} onBlur={() => { if (contentSaveTimeoutRef.current !== undefined) { window.clearTimeout(contentSaveTimeoutRef.current); contentSaveTimeoutRef.current = undefined; } void saveContent(contentRef.current); }} onAutosaveStateChange={setIsAutosaving} /></div></div>{error && <p className={styles.formError}>{error}</p>}{area && <p className={styles.autosaveStatus}>{isAutosaving ? "Salvando conteúdo..." : "Conteúdo salvo"}</p>}<div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={isSaving}>{isSaving ? "Salvando..." : area ? "Salvar alterações" : "Criar bloco"}</button></div></form>;
}

function AttachmentPanel({ areaId, userId }: { areaId: string; userId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch(`${apiUrl}/attachments?areaId=${encodeURIComponent(areaId)}`, { headers: { "X-User-Id": userId } })
      .then(async (response) => { if (!response.ok) throw new Error("Não foi possível carregar os anexos."); setAttachments(await response.json()); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os anexos."));
  }, [areaId, userId]);

  const addLink = async () => {
    if (!link.trim()) return;
    setIsUploading(true); setError(undefined);
    try {
      const response = await fetch(`${apiUrl}/attachments`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ areaId, tipo: "LINK", url: link.trim(), nome: link.trim() }) });
      if (!response.ok) throw new Error("Não foi possível adicionar o link.");
      const attachment = await response.json();
      setAttachments((current) => [attachment, ...current]); setLink(""); setShowLink(false);
    } catch (linkError) { setError(linkError instanceof Error ? linkError.message : "Não foi possível adicionar o link."); } finally { setIsUploading(false); }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true); setError(undefined);
    try {
      const formData = new FormData(); formData.append("file", file); formData.append("areaId", areaId);
      const response = await fetch(`${apiUrl}/attachments/upload`, { method: "POST", headers: { "X-User-Id": userId }, body: formData });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "Não foi possível enviar o arquivo.");
      const uploaded = await response.json();
      const attachmentResponse = await fetch(`${apiUrl}/attachments`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ areaId, ...uploaded }) });
      if (!attachmentResponse.ok) throw new Error("O upload terminou, mas não foi possível registrar o anexo.");
      const attachment = await attachmentResponse.json();
      setAttachments((current) => [attachment, ...current]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo."); } finally { setIsUploading(false); }
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!window.confirm(`Remover “${attachment.nome ?? attachment.url}”?`)) return;
    const response = await fetch(`${apiUrl}/attachments/${attachment.id}`, { method: "DELETE", headers: { "X-User-Id": userId } });
    if (!response.ok) { setError("Não foi possível remover o anexo."); return; }
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
  };

  return <section className={styles.attachmentPanel}><div className={styles.attachmentToolbar}><strong>Anexos</strong><div className={styles.attachmentButtons}><button type="button" onClick={() => setShowLink((current) => !current)}>＋ Link</button><label>＋ Imagem<input type="file" accept="image/*" onChange={uploadFile} disabled={isUploading} /></label><label>＋ Arquivo<input type="file" onChange={uploadFile} disabled={isUploading} /></label></div></div>{showLink && <div className={styles.linkForm}><input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." required /><button type="button" className={styles.primaryButton} onClick={addLink} disabled={isUploading}>Adicionar</button></div>}{error && <p className={styles.formError}>{error}</p>}{attachments.length > 0 && <div className={styles.attachmentList}>{attachments.map((attachment) => <div className={styles.attachmentItem} key={attachment.id}>{attachment.tipo === "IMAGEM" ? <img src={attachment.url} alt={attachment.nome ?? "Imagem anexada"} /> : <span className={styles.attachmentType}>{attachment.tipo === "LINK" ? "↗" : "↓"}</span>}<a href={attachment.url} target="_blank" rel="noreferrer">{attachment.nome ?? attachment.url}</a><button type="button" onClick={() => removeAttachment(attachment)} aria-label="Remover anexo">×</button></div>)}</div>}</section>;
}
