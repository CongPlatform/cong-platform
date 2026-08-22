import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDown, Grip, RotateCcw } from "lucide-react";

import mascote from "../../assets/mascot/cong-happy.webp";
import styles from "./RoleScrollSelector.module.css";

export type RoleOption = {
  id: string;
  label: string;
};

type RoleScrollSelectorProps = {
  roles?: readonly RoleOption[];
  onRoleSelect?: (role: RoleOption) => void;
};

const DEFAULT_ROLES: readonly RoleOption[] = [
  { id: "ong", label: "ONG" },
  { id: "desenvolvedor", label: "Desenvolvedor" },
  { id: "designer", label: "Designer" },
  { id: "tradutor", label: "Tradutor" },
  { id: "voluntario", label: "Voluntário" },
  { id: "empresa", label: "Empresa" },
];

const INTRO_TEXT = "Agora queremos conhecer você.";
const SCROLL_DISTANCE = 430;
const REVEAL_POINT = 0.46;
const DRAG_DATA_TYPE = "application/x-cong-role";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getReducedMotionPreference() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RoleScrollSelector({
  roles = DEFAULT_ROLES,
  onRoleSelect,
}: RoleScrollSelectorProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const [prefersReducedMotion] = useState(getReducedMotionPreference);
  const [hasEnteredView, setHasEnteredView] = useState(prefersReducedMotion);
  const [typedText, setTypedText] = useState(() =>
    prefersReducedMotion ? INTRO_TEXT : "",
  );
  const [introFinished, setIntroFinished] = useState(prefersReducedMotion);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [draggedRoleId, setDraggedRoleId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isBankActive, setIsBankActive] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const draggedRole = useMemo(
    () => roles.find((role) => role.id === draggedRoleId) ?? null,
    [roles, draggedRoleId],
  );

  const availableRoles = useMemo(
    () => roles.filter((role) => role.id !== selectedRoleId),
    [roles, selectedRoleId],
  );

  const selectorVisible =
    prefersReducedMotion || (introFinished && scrollProgress >= REVEAL_POINT);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const section = sectionRef.current;

    if (!section || typeof IntersectionObserver === "undefined") {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setHasEnteredView(true);
        observer.disconnect();
      },
      {
        threshold: 0.22,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !hasEnteredView || introFinished) return;

    const timeoutIds: number[] = [];
    let cancelled = false;

    const typeNextCharacter = (index: number) => {
      if (cancelled) return;

      if (index >= INTRO_TEXT.length) {
        const finishTimeout = window.setTimeout(() => {
          if (!cancelled) setIntroFinished(true);
        }, 260);

        timeoutIds.push(finishTimeout);
        return;
      }

      setTypedText(INTRO_TEXT.slice(0, index + 1));

      const currentCharacter = INTRO_TEXT[index];
      const delay = currentCharacter === " " ? 115 : 58;
      const characterTimeout = window.setTimeout(
        () => typeNextCharacter(index + 1),
        delay,
      );

      timeoutIds.push(characterTimeout);
    };

    const startTimeout = window.setTimeout(() => typeNextCharacter(0), 160);
    timeoutIds.push(startTimeout);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [hasEnteredView, introFinished, prefersReducedMotion]);

  useEffect(() => {
    if (!introFinished) return;

    const updateProgress = () => {
      const section = sectionRef.current;

      if (!section) return;

      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const localScroll = window.scrollY - sectionTop;
      const nextProgress = clamp(localScroll / SCROLL_DISTANCE, 0, 1);

      setScrollProgress((currentProgress) =>
        Math.abs(currentProgress - nextProgress) > 0.002
          ? nextProgress
          : currentProgress,
      );
    };

    const handleScroll = () => {
      if (frameRef.current !== null) return;

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [introFinished]);

  const selectRole = useCallback(
    (roleId: string) => {
      const role = roles.find((item) => item.id === roleId);

      if (!role) return;

      setSelectedRoleId(role.id);
      setDraggedRoleId(null);
      setIsDropActive(false);
      setIsBankActive(false);
      onRoleSelect?.(role);
    },
    [onRoleSelect, roles],
  );

  const beginDrag = (
    event: DragEvent<HTMLButtonElement>,
    roleId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_TYPE, roleId);
    event.dataTransfer.setData("text/plain", roleId);
    setDraggedRoleId(roleId);
  };

  const finishDrag = () => {
    setDraggedRoleId(null);
    setIsDropActive(false);
    setIsBankActive(false);
  };

  const readDraggedRoleId = (event: DragEvent<HTMLElement>) =>
    event.dataTransfer.getData(DRAG_DATA_TYPE) ||
    event.dataTransfer.getData("text/plain") ||
    draggedRoleId ||
    "";

  const handleDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDropActive(true);
  };

  const handleDropZoneDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    selectRole(readDraggedRoleId(event));
  };

  const handleBankDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!selectedRoleId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsBankActive(true);
  };

  const handleBankDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const roleId = readDraggedRoleId(event);

    if (roleId === selectedRoleId) {
      setSelectedRoleId(null);
    }

    finishDrag();
  };

  const handleRoleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    roleId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    selectRole(roleId);
  };

  const componentStyle = {
    "--role-scroll-progress": scrollProgress,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      style={componentStyle}
      aria-label="Escolha interativa de perfil na CONG"
    >
      <div className={styles.stickyStage}>
        <div className={styles.gridBackground} aria-hidden="true" />

        <div className={styles.introBlock} aria-hidden={selectorVisible}>
          <p className={styles.typewriter}>
            {typedText}
            {!introFinished && (
              <span className={styles.cursor} aria-hidden="true" />
            )}
          </p>

          <h2 className={styles.brandTitle}>Seu lugar na CONG</h2>
        </div>

        <img
          src={mascote}
          alt="Mascote da CONG acenando"
          className={styles.mascot}
        />

        <div
          className={`${styles.selectorContent} ${
            selectorVisible ? styles.selectorContentVisible : ""
          }`}
          aria-hidden={!selectorVisible}
        >
          <div className={styles.promptRow}>
            <p className={styles.prompt}>Quero participar como</p>

            <div
              className={`${styles.dropZone} ${
                isDropActive ? styles.dropZoneActive : ""
              } ${selectedRole ? styles.dropZoneFilled : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDropActive(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDropActive(false);
                }
              }}
              onDragOver={handleDropZoneDragOver}
              onDrop={handleDropZoneDrop}
              aria-label="Área para soltar uma função"
              aria-live="polite"
            >
              {selectedRole ? (
                <button
                  type="button"
                  className={styles.selectedRole}
                  draggable
                  onDragStart={(event) => beginDrag(event, selectedRole.id)}
                  onDragEnd={finishDrag}
                  onClick={() => setSelectedRoleId(null)}
                  title="Arraste de volta ou clique para remover"
                >
                  <Grip aria-hidden="true" />
                  {selectedRole.label}
                  <RotateCcw aria-hidden="true" />
                </button>
              ) : (
                <span className={styles.placeholder}>
                  {draggedRole ? `[${draggedRole.label}]` : "[Solte aqui]"}
                </span>
              )}
            </div>
          </div>

          <div
            className={`${styles.roleBank} ${
              isBankActive ? styles.roleBankActive : ""
            }`}
            onDragEnter={(event) => {
              if (!selectedRoleId) return;

              event.preventDefault();
              setIsBankActive(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsBankActive(false);
              }
            }}
            onDragOver={handleBankDragOver}
            onDrop={handleBankDrop}
            aria-label="Funções disponíveis"
          >
            {availableRoles.map((role, index) => (
              <button
                key={role.id}
                type="button"
                className={styles.roleOption}
                style={{ "--role-index": index } as CSSProperties}
                draggable
                tabIndex={selectorVisible ? 0 : -1}
                aria-pressed={selectedRoleId === role.id}
                onDragStart={(event) => beginDrag(event, role.id)}
                onDragEnd={finishDrag}
                onClick={() => selectRole(role.id)}
                onKeyDown={(event) => handleRoleKeyDown(event, role.id)}
              >
                <span aria-hidden="true">[</span>
                {role.label}
                <span aria-hidden="true">]</span>
              </button>
            ))}

            {selectedRole && (
              <span className={styles.returnHint}>
                Arraste a função para cá para devolver
              </span>
            )}
          </div>

          <p className={styles.interactionHint}>
            Arraste uma função para o espaço acima. No celular, toque para
            escolher.
          </p>
        </div>

        <div
          className={`${styles.scrollHint} ${
            introFinished && !selectorVisible ? styles.scrollHintVisible : ""
          }`}
          aria-hidden="true"
        >
          <ArrowDown />
          <span>Role para descobrir</span>
        </div>
      </div>
    </section>
  );
}
