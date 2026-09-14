import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  searchCommunityMentions,
  type CommunityMention,
} from "../../services/communityService";
import { communityTagOptions } from "./communitySelectionOptions";
import styles from "./CommunityMedia.module.css";

interface Props {
  value: string;
  mentions?: CommunityMention[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onMention: (mention: CommunityMention) => void;
}

type Suggestion =
  | { kind: "mention"; mention: CommunityMention }
  | { kind: "tag"; label: string; token: string };

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "CO";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words.at(-1)![0]}`.toUpperCase();
}

function tagToken(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return `#${slug}`;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function CommunityMentionInput({
  value,
  mentions = [],
  disabled,
  onChange,
  onMention,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(value.length);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const [response, setResponse] = useState<{
    query: string;
    items: CommunityMention[];
  }>({ query: "", items: [] });
  const [error, setError] = useState("");

  const beforeCaret = value.slice(0, caret);
  const mentionToken = beforeCaret.match(/(?:^|\s)@([^\s@#]{1,80})$/u);
  const tagMatch = beforeCaret.match(/(?:^|\s)#([^\s#@]{0,80})$/u);
  const mode: "mention" | "tag" | null = mentionToken
    ? "mention"
    : tagMatch
      ? "tag"
      : null;
  const query = mentionToken?.[1] ?? tagMatch?.[1] ?? "";

  useEffect(() => {
    if (mode !== "mention" || !query || dismissed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchCommunityMentions(query)
        .then((items) => {
          if (!cancelled) {
            setResponse({ query, items });
            setError("");
          }
        })
        .catch(() => {
          if (!cancelled)
            setError(
              "Sugestões indisponíveis. Você pode continuar escrevendo.",
            );
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, dismissed, mode]);

  const tagSuggestions = useMemo(() => {
    if (mode !== "tag" || dismissed) return [];
    const normalized = normalizeSearch(query);
    return communityTagOptions
      .filter(
        (option) =>
          !normalized ||
          normalizeSearch(`${option.label} ${option.value}`).includes(
            normalized,
          ),
      )
      .slice(0, 8)
      .map((option) => ({
        kind: "tag" as const,
        label: option.label ?? option.value,
        token: tagToken(option.label ?? option.value),
      }));
  }, [dismissed, mode, query]);

  const suggestions: Suggestion[] =
    mode === "mention" && !dismissed && query && response.query === query
      ? response.items.map((mention) => ({ kind: "mention", mention }))
      : tagSuggestions;

  const visibleMentions = useMemo(
    () =>
      mentions.filter((mention) =>
        value
          .toLocaleLowerCase("pt-BR")
          .includes(mention.token.toLocaleLowerCase("pt-BR")),
      ),
    [mentions, value],
  );
  const visibleTags = useMemo(
    () =>
      Array.from(new Set(value.match(/#[\p{L}\p{N}_-]+/gu) ?? [])).slice(0, 12),
    [value],
  );

  function choose(suggestion: Suggestion) {
    if (!mode) return;
    const start = caret - query.length - 1;
    const token =
      suggestion.kind === "mention"
        ? suggestion.mention.token
        : suggestion.token;
    const next = value.slice(0, start) + token + " " + value.slice(caret);
    if (next.length > 5000) return;
    onChange(next);
    if (suggestion.kind === "mention") onMention(suggestion.mention);
    setDismissed(true);
    setActive(0);
    requestAnimationFrame(() => {
      input.current?.focus();
      const nextCaret = start + token.length + 1;
      input.current?.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  }

  return (
    <div className={styles.mentionInput}>
      <div className={styles.mentionEditorSurface}>
        {visibleMentions.length || visibleTags.length ? (
          <div
            className={styles.mentionEditorTokens}
            aria-label="Marcações usadas no conteúdo"
          >
            {visibleMentions.map((mention) => (
              <span
                className={styles.liveMention}
                key={`${mention.entityType}:${mention.entityId}`}
              >
                <span className={styles.liveTokenAvatar} aria-hidden="true">
                  {mention.avatarUrl ? (
                    <img src={mention.avatarUrl} alt="" />
                  ) : (
                    initials(mention.displayName)
                  )}
                </span>
                <strong>{mention.displayName}</strong>
              </span>
            ))}
            {visibleTags.map((tag) => (
              <span className={styles.liveTag} key={tag}>
                {tag.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          ref={input}
          rows={4}
          maxLength={5000}
          value={value}
          disabled={disabled}
          aria-label="Conteúdo da publicação"
          aria-autocomplete="list"
          aria-controls={suggestions.length ? listId : undefined}
          aria-expanded={Boolean(suggestions.length)}
          aria-activedescendant={
            suggestions.length
              ? `${listId}-${Math.min(active, suggestions.length - 1)}`
              : undefined
          }
          onChange={(event) => {
            onChange(event.target.value);
            setCaret(event.target.selectionStart);
            setDismissed(false);
            setActive(0);
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDismissed(true);
              return;
            }
            if (!suggestions.length) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    suggestions.length) %
                  suggestions.length,
              );
            }
            if (
              (event.key === "Enter" || event.key === "Tab") &&
              !event.shiftKey
            ) {
              event.preventDefault();
              choose(suggestions[Math.min(active, suggestions.length - 1)]!);
            }
          }}
          placeholder="Conte o contexto. Use @ para mencionar e # para marcar um assunto."
        />
      </div>

      {suggestions.length ? (
        <div
          id={listId}
          className={styles.suggestions}
          role="listbox"
          aria-label={
            mode === "mention" ? "Pessoas e organizações" : "Assuntos"
          }
        >
          {suggestions.map((suggestion, index) => {
            const key =
              suggestion.kind === "mention"
                ? `${suggestion.mention.entityType}:${suggestion.mention.entityId}`
                : suggestion.token;
            return (
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                id={`${listId}-${index}`}
                key={key}
                data-suggestion-kind={suggestion.kind}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
              >
                {suggestion.kind === "mention" ? (
                  <>
                    <span className={styles.suggestionAvatar}>
                      {suggestion.mention.avatarUrl ? (
                        <img src={suggestion.mention.avatarUrl} alt="" />
                      ) : (
                        initials(suggestion.mention.displayName)
                      )}
                    </span>
                    <span className={styles.suggestionCopy}>
                      <strong>{suggestion.mention.displayName}</strong>
                      <small>
                        {suggestion.mention.token} ·{" "}
                        {suggestion.mention.entityType === "organization"
                          ? "Organização"
                          : "Pessoa"}
                      </small>
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.tagSuggestionMark}>#</span>
                    <span className={styles.suggestionCopy}>
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.token}</small>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {mode === "mention" && query && error ? (
        <small role="status">{error}</small>
      ) : null}
    </div>
  );
}
