import {
  FiCalendar,
  FiFileText,
  FiFolder,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import type {
  CommunitySearchPayload,
  CommunitySearchResult,
} from "../../services/communityService";
import styles from "./CommunitySearchPanel.module.css";

interface Props {
  id?: string;
  query: string;
  payload: CommunitySearchPayload | null;
  loading: boolean;
  error: string | null;
  onSelect: (result: CommunitySearchResult) => void;
}

const typeLabel: Record<CommunitySearchResult["type"], string> = {
  post: "Publicações",
  user: "Pessoas",
  organization: "Organizações",
  event: "Eventos",
};

function ResultIcon({ result }: { result: CommunitySearchResult }) {
  if (result.avatarUrl) {
    return (
      <img src={result.avatarUrl} alt="" loading="lazy" decoding="async" />
    );
  }
  if (result.type === "user") return <FiUser />;
  if (result.type === "organization") return <FiUsers />;
  if (result.type === "event") return <FiCalendar />;
  if (result.meta?.toLowerCase().includes("projeto")) return <FiFolder />;
  return <FiFileText />;
}

export default function CommunitySearchPanel({
  id,
  query,
  payload,
  loading,
  error,
  onSelect,
}: Props) {
  const normalized = query.trim();
  const results = payload?.results ?? [];

  return (
    <div
      id={id}
      className={styles.panel}
      role="dialog"
      aria-label="Resultados da busca"
    >
      {normalized.length < 2 ? (
        <div className={styles.hint}>
          <FiSearch />
          <div>
            <strong>Pesquise na Comunidade</strong>
            <span>
              Digite ao menos 2 caracteres para procurar pessoas, organizações,
              projetos, publicações e eventos.
            </span>
          </div>
        </div>
      ) : loading ? (
        <div className={styles.state} role="status" aria-live="polite">
          Buscando...
        </div>
      ) : error ? (
        <div className={`${styles.state} ${styles.error}`} role="alert">
          {error}
        </div>
      ) : results.length === 0 ? (
        <div className={styles.state} role="status" aria-live="polite">
          Nenhum resultado encontrado para “{normalized}”.
        </div>
      ) : (
        <div
          className={styles.results}
          role="list"
          aria-label="Resultados encontrados"
        >
          {results.map((result, index) => {
            const showHeading =
              index === 0 || results[index - 1]?.type !== result.type;
            return (
              <div
                key={`${result.type}:${result.id}`}
                className={styles.resultGroupItem}
              >
                {showHeading ? (
                  <span className={styles.groupLabel}>
                    {typeLabel[result.type]}
                  </span>
                ) : null}
                <button
                  type="button"
                  className={styles.result}
                  data-community-search-result
                  onClick={() => onSelect(result)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowDown", "ArrowUp", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    const panel = event.currentTarget.closest(
                      `.${styles.panel}`,
                    );
                    const items = panel
                      ? Array.from(
                          panel.querySelectorAll<HTMLButtonElement>(
                            "[data-community-search-result]",
                          ),
                        )
                      : [];
                    if (!items.length) return;
                    const currentIndex = items.indexOf(event.currentTarget);
                    let nextIndex = currentIndex;
                    if (event.key === "ArrowDown")
                      nextIndex = Math.min(items.length - 1, currentIndex + 1);
                    if (event.key === "ArrowUp")
                      nextIndex = Math.max(0, currentIndex - 1);
                    if (event.key === "Home") nextIndex = 0;
                    if (event.key === "End") nextIndex = items.length - 1;
                    if (nextIndex !== currentIndex) {
                      event.preventDefault();
                      items[nextIndex]?.focus();
                    }
                  }}
                >
                  <span className={styles.icon}>
                    <ResultIcon result={result} />
                  </span>
                  <span className={styles.copy}>
                    <strong>{result.title}</strong>
                    {result.subtitle ? <small>{result.subtitle}</small> : null}
                  </span>
                  {result.meta ? (
                    <span className={styles.meta}>{result.meta}</span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
