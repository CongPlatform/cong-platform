import { FiExternalLink, FiFileText } from "react-icons/fi";
import type { CommunityPost } from "../../services/communityService";
import styles from "./CommunityMedia.module.css";
export default function CommunityPostMedia({ post }: { post: CommunityPost }) {
  if (!post.media?.length && !post.linkPreview) return null;
  return (
    <div className={styles.postMedia}>
      {post.media?.length ? (
        <div className={styles.mediaGrid}>
          {post.media.map((media) =>
            media.url ? (
              <a
                key={media.id}
                className={
                  media.mimeType.startsWith("image/")
                    ? styles.image
                    : styles.document
                }
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {media.mimeType.startsWith("image/") ? (
                  <img
                    src={media.url}
                    alt={media.name}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <>
                    <FiFileText />
                    <span>
                      <strong>{media.name}</strong>
                      <small>
                        PDF · {(media.sizeBytes / 1024 / 1024).toFixed(1)} MB
                      </small>
                    </span>
                    <FiExternalLink />
                  </>
                )}
              </a>
            ) : (
              <p key={media.id}>
                {media.name}: anexo temporariamente indisponível.
              </p>
            ),
          )}
        </div>
      ) : null}
      {post.linkPreview ? (
        <a
          className={styles.linkPreview}
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <small>
            {post.linkPreview.hostname} <FiExternalLink />
          </small>
          <strong>{post.linkPreview.title}</strong>
          {post.linkPreview.description ? (
            <p>{post.linkPreview.description}</p>
          ) : null}
        </a>
      ) : null}
    </div>
  );
}
