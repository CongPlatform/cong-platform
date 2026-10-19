import { useEffect, useState } from "react";
import { FiExternalLink, FiPlay, FiSearch } from "react-icons/fi";
import { searchPixabay, type StockMediaItem } from "../../../services/stockMediaService";
import styles from "./StockVideoBrowser.module.css";

export default function StockVideoBrowser({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (item: StockMediaItem) => void;
}) {
  const [query, setQuery] = useState("community");
  const [submitted, setSubmitted] = useState("community");
  const [items, setItems] = useState<StockMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<StockMediaItem | null>(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    void searchPixabay("video", submitted, page)
      .then((result) => {
        if (!active) return;
        setMessage(result.configured ? "" : "Para explorar vídeos gratuitos, configure PIXABAY_API_KEY no backend.");
        setItems((previous) => page === 1 ? result.items : [...previous, ...result.items]);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        if (active) setMessage("Não foi possível carregar os vídeos agora.");
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [submitted, page]);

  return <div className={styles.browser}>
    <form className={styles.search} onSubmit={(event) => { event.preventDefault(); setPage(1); setSubmitted(query.trim() || "community"); }}>
      <FiSearch />
      <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar vídeos" placeholder="Buscar vídeos por tema" />
      <button type="submit">Buscar</button>
    </form>
    <div className={styles.source}>Vídeos do Pixabay · SafeSearch ativo</div>
    {message ? <p className={styles.notice} role="status">{message}</p> : null}
    <div className={styles.grid}>
      {items.map((item) => <button key={item.id} className={styles.card} type="button" onClick={() => setSelected(item)}>
        {item.thumbnail ? <img src={item.thumbnail} loading="lazy" alt="" /> : <span className={styles.blank}><FiPlay /></span>}
        <span className={styles.play}><FiPlay /></span>
        <strong>{item.title || "Vídeo"}</strong>
      </button>)}
    </div>
    {busy ? <p className={styles.notice}>Carregando vídeos...</p> : null}
    {hasMore && !busy ? <button type="button" className={styles.more} onClick={() => setPage((value) => value + 1)}>Mostrar mais vídeos</button> : null}
    {selected ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Prévia do vídeo">
        <div className={styles.dialogTop}><strong>Prévia do vídeo</strong><button type="button" onClick={() => setSelected(null)}>Fechar</button></div>
        <video controls preload="metadata" playsInline src={selected.url} />
        <h3>{selected.title}</h3>
        <p>Fonte: {selected.author} · Licença de Conteúdo Pixabay</p>
        <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer"><FiExternalLink /> Consultar fonte e licença</a>
        <button type="button" disabled={disabled} className={styles.choose} onClick={() => { onChoose(selected); setSelected(null); }}>Inserir vídeo na página</button>
        {disabled ? <small>Selecione primeiro uma seção da página.</small> : null}
      </section>
    </div> : null}
  </div>;
}
