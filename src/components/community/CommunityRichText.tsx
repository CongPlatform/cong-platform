import { Fragment } from "react";
import { Link } from "react-router-dom";
import type { CommunityMention } from "../../services/communityService";
import styles from "./CommunityMedia.module.css";

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CO";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toUpperCase();
}

export default function CommunityRichText({
  text,
  mentions = [],
}: {
  text: string;
  mentions?: CommunityMention[];
}) {
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const names = [...mentions]
    .sort((a, b) => b.token.length - a.token.length)
    .map((m) => escape(m.token));
  const pattern = new RegExp(
    `https?:\\/\\/[^\\s<>]+|(?<![\\p{L}\\p{N}._@])(?:${names.length ? names.join("|") + "|" : ""}#[\\p{L}\\p{N}_-]{1,80})(?![\\p{L}\\p{N}_]|\\.[\\p{L}\\p{N}_])`,
    "giu",
  );
  const nodes = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    const token = match[0];
    nodes.push(
      <Fragment key={`text-${index}`}>{text.slice(cursor, index)}</Fragment>,
    );
    if (/^https?:/i.test(token)) {
      const url = token.replace(/[.,;!?)\]]+$/, "");
      nodes.push(
        <Fragment key={index}>
          <a
            className={styles.inlineLink}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {url}
          </a>
          {token.slice(url.length)}
        </Fragment>,
      );
    } else if (token.startsWith("#"))
      nodes.push(
        <Link
          className={styles.inlineTag}
          key={index}
          to={`/app/comunidade?tag=${encodeURIComponent(token.slice(1).toLowerCase())}`}
          title={`Explorar ${token}`}
        >
          <span aria-hidden="true">#</span>
          {token.slice(1).replaceAll("_", " ")}
        </Link>,
      );
    else {
      const person = mentions.find(
        (m) => m.token.toLowerCase() === token.toLowerCase(),
      );
      nodes.push(
        person ? (
          <Link
            className={styles.inlineMention}
            key={index}
            title={`${person.displayName} (${person.token})`}
            to={`/app/comunidade/perfil/${person.entityType}/${person.entityId}`}
          >
            <span className={styles.inlineMentionAvatar} aria-hidden="true">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt="" />
              ) : (
                initials(person.displayName)
              )}
            </span>
            <span>{person.displayName}</span>
          </Link>
        ) : (
          token
        ),
      );
    }
    cursor = index + token.length;
  }
  nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <>{nodes}</>;
}
