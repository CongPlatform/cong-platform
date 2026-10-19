/**
 * Site Builder 2.0 — Experience blocks.
 * Pure presentation: editors and visitors see identical cards and content.
 * The data inspector is intentionally external to the site canvas.
 */
import { useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiGlobe,
  FiHeart,
  FiHome,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import type {
  InstitutionalActionGridValue,
  InstitutionalDonationChoicesValue,
  InstitutionalTestimonialsValue,
  InstitutionalTimelineValue,
} from "../../../services/institutionalService";
import { safeInstitutionalHref } from "../../../utils/institutionalLinks";
import styles from "./ExperienceBlocks.module.css";

function hrefFor(raw: string): string | null {
  const safe = safeInstitutionalHref(raw);
  return safe && safe !== "#" ? safe : null;
}

export function CommunityTimeline({
  value,
}: {
  value: InstitutionalTimelineValue;
}) {
  return (
    <section
      className={styles.timeline}
      aria-label={value.title || "História da organização"}
    >
      <header className={styles.timelineHead}>
        <span className={styles.eyebrow}>{value.eyebrow}</span>
        <h3>{value.title}</h3>
      </header>
      <ol className={styles.timelineTrack}>
        {value.items.map((item, index) => (
          <li key={item.id} className={styles.timelineStop}>
            <div className={styles.timelineMarker}>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.timelineDetail}>
              <span className={styles.timelineYear}>{item.year}</span>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TestimonialSlider({
  value,
}: {
  value: InstitutionalTestimonialsValue;
}) {
  const [active, setActive] = useState(0);
  const selected = Math.min(active, value.items.length - 1);
  const entry = value.items[selected];
  const move = (direction: number) =>
    setActive((selected + direction + value.items.length) % value.items.length);
  return (
    <section
      className={styles.testimonials}
      aria-label={value.title || "Depoimentos"}
    >
      <header className={styles.testimonialHeading}>
        <span className={styles.eyebrow}>HISTÓRIAS E VOZES</span>
        <h3>{value.title}</h3>
        <p>{value.subtitle}</p>
      </header>
      {entry && (
        <figure className={styles.testimonialCard} key={entry.id}>
          <span className={styles.quotationMark} aria-hidden="true">
            “
          </span>
          <blockquote>{entry.quote}</blockquote>
          <figcaption>
            <span className={styles.avatar} aria-hidden="true">
              {entry.author.trim().charAt(0).toUpperCase() || "•"}
            </span>
            <span>
              <strong>{entry.author}</strong>
              <small>{entry.role}</small>
            </span>
          </figcaption>
        </figure>
      )}
      {value.items.length > 1 && (
        <div className={styles.testimonialNav}>
          <div className={styles.dots} aria-label="Selecionar depoimento">
            {value.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Depoimento ${index + 1}`}
                aria-current={index === selected ? "true" : undefined}
                data-active={index === selected}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <div className={styles.arrows}>
            <button
              type="button"
              aria-label="Depoimento anterior"
              onClick={() => move(-1)}
            >
              <FiArrowLeft />
            </button>
            <button
              type="button"
              aria-label="Próximo depoimento"
              onClick={() => move(1)}
            >
              <FiArrowRight />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const iconMap = {
  heart: FiHeart,
  hand: FiShield,
  book: FiBookOpen,
  home: FiHome,
  globe: FiGlobe,
  users: FiUsers,
} as const;
export function ActionGrid({ value }: { value: InstitutionalActionGridValue }) {
  return (
    <section
      className={styles.actionArea}
      aria-label={value.title || "Formas de participar"}
    >
      <div className={styles.actionIntro}>
        <span className={styles.eyebrow}>ENVOLVA-SE</span>
        <h3>{value.title}</h3>
        <p>{value.subtitle}</p>
      </div>
      <div className={styles.actionGrid}>
        {value.items.map((item, index) => {
          const Icon = iconMap[item.icon] ?? FiHeart;
          const href = hrefFor(item.action.href);
          return (
            <article
              className={styles.actionCard}
              key={item.id}
              data-tone={index % 3}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <span className={styles.eyebrow}>{item.eyebrow}</span>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              {href ? (
                <a href={href} className={styles.cardCta}>
                  {item.action.label}
                  <FiArrowRight aria-hidden="true" />
                </a>
              ) : (
                <span className={styles.cardDisabled}>
                  Configure o destino desta ação
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DonationChoices({
  value,
}: {
  value: InstitutionalDonationChoicesValue;
}) {
  const [active, setActive] = useState(0);
  const selected = Math.min(active, value.items.length - 1);
  const href = hrefFor(value.action.href);
  return (
    <section
      className={styles.donation}
      aria-label={value.title || "Opções de contribuição"}
    >
      <div className={styles.donationIntro}>
        <span className={styles.eyebrow}>FAÇA PARTE</span>
        <h3>{value.title}</h3>
        <p>{value.subtitle}</p>
      </div>
      <div
        className={styles.amounts}
        role="group"
        aria-label="Escolha um valor ilustrativo"
      >
        {value.items.map((item, index) => (
          <button
            type="button"
            className={styles.amount}
            data-active={index === selected}
            aria-pressed={index === selected}
            key={item.id}
            onClick={() => setActive(index)}
          >
            <strong>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 2,
              }).format(item.amount)}
            </strong>
            <span>{item.description}</span>
            <FiCheck aria-hidden="true" />
          </button>
        ))}
      </div>
      <footer className={styles.donationFooter}>
        <div className={styles.donationTrust}>
          <FiShield aria-hidden="true" />
          <span>{value.trustNote}</span>
        </div>
        {href ? (
          <a className={styles.donateButton} href={href}>
            {value.action.label}
            <FiArrowRight />
          </a>
        ) : (
          <span className={styles.cardDisabled}>
            Configure o destino de doação no editor.
          </span>
        )}
      </footer>
    </section>
  );
}
