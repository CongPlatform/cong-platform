import { searchPixabay } from "../../../services/stockMediaService";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  FiArrowUpRight,
  FiCheck,
  FiChevronRight,
  FiImage,
  FiSearch,
  FiX,
} from "react-icons/fi";
import styles from "./FreeImageBrowser.module.css";

type ImageSource = "pixabay";

interface StockImage {
  id: string;
  title: string;
  thumbnail: string;
  image: string;
  sourceUrl: string;
  creator: string;
  license: string;
}

interface SearchResponse {
  items: StockImage[];
  hasMore: boolean;
}

interface FreeImageBrowserProps {
  onChosen: (file: File, label: string) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

const topics = [
  { name: "Comunidade", search: "community" },
  { name: "Natureza", search: "nature" },
  { name: "Educação", search: "education" },
  { name: "Voluntariado", search: "volunteers" },
  { name: "Alimentos", search: "food" },
  { name: "Saúde", search: "health" },
  { name: "Cultura", search: "culture" },
];

async function searchImages(
  source: ImageSource,
  query: string,
  page: number,
  _signal: AbortSignal,
): Promise<SearchResponse> {
  void _signal;
  if (source === "pixabay") {
    const result = await searchPixabay("image", query, page);
    if (!result.configured) throw new Error("O Pixabay ainda não foi conectado. Configure PIXABAY_API_KEY no backend.");
    return {
      items: result.items.map((item) => ({
        id: item.id, title: item.title, thumbnail: item.thumbnail,
        image: item.url, sourceUrl: item.sourceUrl,
        creator: item.author, license: item.license,
      })),
      hasMore: result.hasMore,
    };
  }


  return { items: [], hasMore: false };
}

export default function FreeImageBrowser({
  onChosen,
  disabled = false,
  compact = false,
}: FreeImageBrowserProps) {
  const [source] = useState<ImageSource>("pixabay");
  const [query, setQuery] = useState("community");
  const [term, setTerm] = useState("community");
  const [items, setItems] = useState<StockImage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<StockImage | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const requestId = ++latestRequestRef.current;

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setBusy(true);
      setNotice("");
      if (page === 1) setItems([]);
    });

    void searchImages(source, term, page, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || requestId !== latestRequestRef.current) return;
        setItems((current) => page === 1
          ? result.items
          : [...current, ...result.items.filter((item) => !current.some((old) => old.id === item.id))]);
        setHasMore(result.hasMore);
        if (result.items.length === 0 && page === 1) {
          setNotice("Nenhuma foto encontrada. Tente outro tema.");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && requestId === latestRequestRef.current) {
          setNotice(error instanceof Error ? error.message : "Não foi possível buscar as imagens.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === latestRequestRef.current) setBusy(false);
      });

    return () => controller.abort();
  }, [page, source, term]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  function updateSearch(value: string) {
    const next = value.trim();
    if (next.length < 2) return;
    setPage(1);
    setTerm(next.slice(0, 90));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSearch(query);
  }

  async function importImage(image: StockImage) {
    if (disabled || importing) return;
    setImporting(image.id);
    setNotice("");
    try {
      const response = await fetch(image.image, { mode: "cors" });
      if (!response.ok) throw new Error("O servidor de origem bloqueou o download.");
      const fileBlob = await response.blob();
      const kind = fileBlob.type.toLowerCase();
      if (!["image/png", "image/jpeg", "image/webp"].includes(kind)) {
        throw new Error("Esta imagem não está disponível em JPG, PNG ou WebP.");
      }
      if (fileBlob.size > 12 * 1024 * 1024) {
        throw new Error("Esta imagem ultrapassa o limite de 12 MB.");
      }
      const extension = kind === "image/jpeg" ? "jpg" : kind.split("/")[1];
      const file = new File([fileBlob], `acervo-${image.id.slice(0, 48)}.${extension}`, { type: kind });
      await onChosen(file, image.title);
      setPreview(null);
      setNotice("Fotografia adicionada à sua página.");
    } catch (error) {
      setNotice(`${error instanceof Error ? error.message : "Não foi possível importar."} Você pode abrir a fonte e enviar o arquivo manualmente.`);
    } finally {
      setImporting("");
    }
  }

  return (
    <div className={styles.browser} data-compact={compact}>
      <div className={styles.sources} role="group" aria-label="Fonte das fotografias">
        <span>Fotografias Pixabay · SafeSearch ativo</span>
      </div>

      <form className={styles.search} onSubmit={submit}>
        <FiSearch aria-hidden="true" />
        <input
          aria-label="Pesquisar fotografias"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar fotografias..."
        />
        <button type="submit">Buscar</button>
      </form>

      <div className={styles.topics} aria-label="Temas de fotografias">
        {topics.map((topic) => (
          <button
            type="button"
            key={topic.name}
            data-active={term === topic.search}
            onClick={() => { setQuery(topic.name); updateSearch(topic.search); }}
          >
            {topic.name}
          </button>
        ))}
      </div>

      <div className={styles.summary}>
        <strong>{busy && page === 1 ? "Buscando fotografias..." : `${items.length} fotografias`}</strong>
        <small>{source === "pixabay" ? "Licença Pixabay · busca segura" : "CC0 e domínio público"}</small>
      </div>
      {busy && page === 1 ? (
        <div className={styles.skeletons} aria-label="Carregando fotografias">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
      ) : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      <div className={styles.grid}>
        {items.map((image) => (
          <button
            type="button"
            key={image.id}
            className={styles.photo}
            onClick={() => setPreview(image)}
            aria-label={`Pré-visualizar ${image.title}`}
          >
            <img src={image.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <span><FiImage aria-hidden="true" /> {image.license}</span>
          </button>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          className={styles.more}
          onClick={() => setPage((value) => value + 1)}
          disabled={busy}
        >
          {busy ? "Carregando..." : <>Ver mais fotografias <FiChevronRight aria-hidden="true" /></>}
        </button>
      ) : null}
      <p className={styles.licenseNote}>
        Verifique a licença e eventuais direitos de pessoas e marcas antes de publicar. O acervo aplica filtros de pesquisa, mas não garante ausência total de conteúdo inadequado.
      </p>

      {preview ? createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => {
          if (event.currentTarget === event.target) setPreview(null);
        }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Prévia da fotografia">
            <header>
              <strong>Fotografia selecionada</strong>
              <button type="button" onClick={() => setPreview(null)} aria-label="Fechar prévia">
                <FiX aria-hidden="true" />
              </button>
            </header>
            <div className={styles.largeImage}>
              <img src={preview.thumbnail} alt={preview.title} referrerPolicy="no-referrer" />
            </div>
            <div className={styles.details}>
              <strong>{preview.title}</strong>
              <small>{preview.creator} · {preview.license}</small>
              <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer">
                Consultar fonte e licença <FiArrowUpRight aria-hidden="true" />
              </a>
              <div className={styles.previewActions}>
                <button type="button" onClick={() => setPreview(null)}>Voltar</button>
                <button
                  type="button"
                  className={styles.useButton}
                  disabled={disabled || Boolean(importing)}
                  onClick={() => void importImage(preview)}
                >
                  {importing === preview.id ? "Importando..." : <><FiCheck aria-hidden="true" /> Usar fotografia</>}
                </button>
              </div>
              {disabled ? <small>Selecione uma seção para inserir a fotografia.</small> : null}
              {notice ? <small role="status">{notice}</small> : null}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
