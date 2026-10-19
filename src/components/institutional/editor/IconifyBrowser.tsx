import { useEffect, useMemo, useState } from "react";
import {
  filterInstitutionalIcons,
  institutionalIconCategories,
  type InstitutionalIconCategory,
} from "../../../data/institutional/iconLibrary";
import styles from "./IconifyBrowser.module.css";

const collections = [
  { id: "all", label: "Todas" },
  { id: "lucide", label: "Lucide" },
  { id: "tabler", label: "Tabler" },
  { id: "ph", label: "Phosphor" },
] as const;

export default function IconifyBrowser({ disabled, onChoose }: {
  disabled: boolean;
  onChoose: (id: string) => void;
}) {
  const [collection, setCollection] = useState<(typeof collections)[number]["id"]>("all");
  const [category, setCategory] = useState<InstitutionalIconCategory>("all");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [icons, setIcons] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const localIcons = useMemo(
    () => collection === "all" || collection === "lucide"
      ? filterInstitutionalIcons(term, category)
      : [],
    [category, collection, term],
  );

  const externalIcons = useMemo(() => {
    const localLucide = new Set(localIcons.map((item) => item.id));
    return Array.from(new Set(icons)).filter((id) => {
      const [prefix, name] = id.split(":");
      return prefix !== "lucide" || !localLucide.has(name);
    });
  }, [icons, localIcons]);

  useEffect(() => {
    if (!term || category !== "all") {
      setIcons([]);
      setLoading(false);
      setMessage("");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ query: term, limit: "64" });
    if (collection !== "all") params.set("prefix", collection);
    setLoading(true);
    void fetch(`https://api.iconify.design/search?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Falha na busca");
        return response.json();
      })
      .then((data: { icons?: string[] }) => {
        if (controller.signal.aborted) return;
        setIcons((data.icons ?? []).filter((id) => /^(lucide|tabler|ph):[a-z0-9-]{1,90}$/.test(id)));
        setMessage("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIcons([]);
          setMessage("Os ícones externos estão temporariamente indisponíveis.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [category, collection, term]);

  return (
    <section className={styles.browser} aria-label="Biblioteca de ícones">
      <form className={styles.search} onSubmit={(event) => { event.preventDefault(); setTerm(query.trim()); }}>
        <input
          aria-label="Pesquisar ícones"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pessoas, coração, educação, heart..."
        />
        <button type="submit">Buscar</button>
      </form>
      <div className={styles.collections} role="group" aria-label="Coleção de ícones">
        {collections.map((item) => (
          <button type="button" key={item.id} data-active={collection === item.id}
            onClick={() => setCollection(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className={styles.collections} role="group" aria-label="Temas de ícones">
        {institutionalIconCategories.map((item) => (
          <button type="button" key={item.id} data-active={category === item.id}
            onClick={() => setCategory(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className={styles.meta}>{localIcons.length + externalIcons.length} ícones disponíveis</div>
      <div className={styles.icons}>
        {localIcons.map((item) => {
          const Icon = item.icon;
          return (
            <button type="button" key={`local-${item.id}`} disabled={disabled} title={item.label}
              onClick={() => onChoose(item.id)}>
              <Icon aria-hidden="true" />
              <small>{item.label}</small>
            </button>
          );
        })}
        {externalIcons.map((id) => {
          const [prefix, name] = id.split(":");
          return (
            <button type="button" disabled={disabled} key={id} title={name.replaceAll("-", " ")}
              onClick={() => onChoose(`iconify:${id}`)}>
              <img loading="lazy" src={`https://api.iconify.design/${prefix}/${name}.svg`} alt="" />
              <small>{name.replaceAll("-", " ")}</small>
            </button>
          );
        })}
      </div>
      {loading && <p className={styles.meta} role="status">Procurando mais ícones...</p>}
      {message && <p className={styles.meta} role="status">{message} Os ícones da CONG continuam disponíveis.</p>}
      {localIcons.length + externalIcons.length === 0 && !loading && !message && (
        <p className={styles.meta}>Nenhum ícone neste filtro. Experimente outra busca.</p>
      )}
    </section>
  );
}
