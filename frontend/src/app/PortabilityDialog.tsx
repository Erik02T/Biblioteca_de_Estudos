"use client";

import { Button, Input, containModalTab } from './ui';
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Area } from "./page";
import styles from "./PortabilityDialog.module.css";

type Revision = { id: string; name: string; createdAt: string };
type Preview = Revision & { document: unknown; metadata: { nome: string }; files: { id: string; tipo: string; nome: string | null; url: string | null }[] };
type Props = {
  mode: "export" | "revisions";
  areaId: string;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  checkpoint: () => Promise<string>;
  onBusy: (busy: boolean) => void;
  onRestored: (area: Area) => void;
  onClose: () => void;
};
const readable = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: string; texto?: string; attrs?: { summary?: string }; content?: unknown[] };
  return node.text ?? node.texto ?? [node.attrs?.summary ?? "", ...(node.content ?? []).map(readable)].filter(Boolean).join("\n");
};

export function PortabilityDialog({ mode, areaId, request, checkpoint, onBusy, onRestored, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(mode === 'revisions');
  const [listError, setListError] = useState('');
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState<Preview>();
  const [name, setName] = useState("");
  const [children, setChildren] = useState(false);
  const [trash, setTrash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const path = `/areas/${areaId}/revisions`;
  const checked = async (response: Response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string | string[] };
      throw new Error(Array.isArray(body.message) ? body.message.join(" ") : body.message ?? "Operação indisponível. Tente novamente.");
    }
    return response;
  };
  useEffect(() => {
    const element = dialog.current;
    const active = document.activeElement as HTMLElement | null;
    const previous = active && active !== document.body ? active : document.querySelector<HTMLElement>('[data-testid="rail-menu"]');
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    if (mode !== "revisions") return;
    let active = true;
    request(path).then(checked).then(response => response.json()).then((items: Revision[]) => { if (active) setRevisions(items); }).catch((failure: Error) => { if (active) setListError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Requests use the current authenticated session; reloading the modal refreshes the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, path, retry]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    const focus = document.activeElement as HTMLElement | null;
    setBusy(true); onBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Operação indisponível."); }
    finally { setBusy(false); onBusy(false); window.setTimeout(() => { if (focus?.isConnected) focus.focus(); }, 0); }
  };
  const create = () => run(async () => {
    const updatedAt = await checkpoint();
    await checked(await request(path, { method: "POST", body: JSON.stringify({ name: name.trim(), updatedAt }) }));
    setRevisions(await (await checked(await request(path))).json());
    setName(""); setNotice("Versão criada. Suas mídias serão preservadas sem expiração.");
  });
  const restore = () => run(async () => {
    if (!preview) return;
    const updatedAt = await checkpoint();
    const response = await checked(await request(`${path}/${preview.id}/restore`, { method: "POST", body: JSON.stringify({ updatedAt }) }));
    onRestored(await response.json() as Area);
  });
  const download = () => run(async () => {
    await checkpoint();
    const response = await checked(await request("/exports", { method: "POST", body: JSON.stringify({ ids: [areaId], includeChildren: children, includeTrash: trash }) }));
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "biblioteca-estudos.zip"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Pacote gerado. Abra o README.md após extrair o ZIP.");
  });
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="portability-title" onKeyDown={containModalTab} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="portability-title">{mode === "export" ? "Exportar página" : "Versões da página"}</h2>
    <p>O conteúdo e as propriedades pendentes serão salvos antes da operação.</p>
    <fieldset disabled={busy} className={styles.controls}>
      {mode === "export" ? <>
        <label><Input type="checkbox" checked={children} onChange={event => setChildren(event.target.checked)} /> Incluir subpáginas</label>
        <label><Input type="checkbox" checked={trash} onChange={event => setTrash(event.target.checked)} /> Incluir páginas da lixeira no ramo</label>
        <p>ZIP com JSON, Markdown, manifesto e arquivos. Até 500 páginas e 100 MiB por pacote. Histórico de versões não incluído.</p>
        <Button onClick={() => void download()}>Baixar ZIP</Button>
      </> : <>
        <label>Nome da versão <Input maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
        <Button disabled={!name.trim()} onClick={() => void create()}>Criar versão</Button>
        <p>Versões e mídias são mantidas sem expiração automática.</p>
        <ul>{revisions.map(revision => <li key={revision.id}><Button onClick={() => void run(async () => { setPreview(await (await checked(await request(`${path}/${revision.id}`))).json()); setConfirmRestore(false); })}>{revision.name} — {new Date(revision.createdAt).toLocaleString("pt-BR")}</Button></li>)}</ul>
        {!loading && !listError && !revisions.length && <p>Nenhuma versão listada.</p>}
        {preview && <section aria-label="Pré-visualização da versão">
          <h3>{preview.metadata.nome}</h3>
          <pre className={styles.preview}>{readable(preview.document)}</pre>
          <details><summary>Documento original em JSON</summary><pre className={styles.preview}>{JSON.stringify(preview.document, null, 2)}</pre></details>
          {preview.files.map(file => <div key={file.id}>{file.tipo === "IMAGEM" && file.url && <Image unoptimized src={file.url} alt={file.nome ?? "Imagem da versão"} width={600} height={360} style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }} />}{file.url ? <p><a href={file.url} target="_blank" rel="noreferrer">{file.nome ?? "Abrir material"}</a></p> : <p>{file.nome ?? "Material indisponível"}</p>}</div>)}
          <label><Input type="checkbox" checked={confirmRestore} onChange={event => setConfirmRestore(event.target.checked)} /> Restaurar esta versão. O estado atual será guardado em outra versão.</label>
          <Button disabled={!confirmRestore} onClick={() => void restore()}>Restaurar versão</Button>
        </section>}
      </>}
    </fieldset>
    {(error || listError) && <p role="alert">{error || listError}</p>}
    {listError && <Button disabled={busy || loading} onClick={() => { setLoading(true); setListError(''); setRetry(value => value + 1); }}>Tentar carregar versões novamente</Button>}
    <p role="status">{busy ? "Processando…" : loading ? 'Carregando versões…' : notice}</p>
    <Button disabled={busy} onClick={onClose}>Fechar</Button>
  </dialog>;
}
