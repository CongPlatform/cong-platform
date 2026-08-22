import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

import {
  FiCheck,
  FiFileText,
  FiX,
} from "react-icons/fi";

import styles from "./ModalMensagem.module.css";

export type TamanhoModalMensagem =
  | "pequeno"
  | "medio"
  | "grande"
  | "automatico";

export interface ModalMensagemProps {
  aberto: boolean;

  titulo?: string;
  mensagem?: ReactNode;
  dados?: Record<string, unknown>;

  tamanho?: TamanhoModalMensagem;

  textoBotaoOk?: string;
  mostrarBotaoOk?: boolean;
  fecharAoClicarFora?: boolean;

  onOk?: () => void;
  onFechar: () => void;
}

interface ListaDadosProps {
  dados: Record<string, unknown>;
  nivel?: number;
  caminho?: string;
}

const TOTAL_FUROS = 6;

function formatarRotulo(
  chave: string,
): string {
  return chave
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase(),
    );
}

function ehObjetoSimples(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    !(valor instanceof Date)
  );
}

function ValorFormatado({
  valor,
}: {
  valor: unknown;
}) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return (
      <span className={styles.emptyValue}>
        Não informado
      </span>
    );
  }

  if (typeof valor === "boolean") {
    return <>{valor ? "Sim" : "Não"}</>;
  }

  if (valor instanceof Date) {
    return (
      <>
        {valor.toLocaleString("pt-BR")}
      </>
    );
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return (
        <span className={styles.emptyValue}>
          Nenhum item
        </span>
      );
    }

    const listaSimples = valor.every(
      (item) => !ehObjetoSimples(item),
    );

    if (listaSimples) {
      return (
        <div className={styles.tagList}>
          {valor.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className={styles.tag}
            >
              {item === null ||
              item === undefined ||
              item === ""
                ? "Não informado"
                : String(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className={styles.arrayList}>
        {valor.map((item, index) => (
          <div
            key={`item-${index}`}
            className={styles.arrayItem}
          >
            {ehObjetoSimples(item) ? (
              <ListaDados
                dados={item}
                nivel={1}
                caminho={`item-${index}`}
              />
            ) : (
              <ValorFormatado valor={item} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return <>{String(valor)}</>;
}

function ListaDados({
  dados,
  nivel = 0,
  caminho = "dados",
}: ListaDadosProps) {
  return (
    <div
      className={styles.dataGrid}
      data-level={nivel}
    >
      {Object.entries(dados).map(
        ([chave, valor]) => {
          const id = `${caminho}-${chave}`;

          if (ehObjetoSimples(valor)) {
            return (
              <section
                key={id}
                className={styles.dataSection}
              >
                <h3>
                  {formatarRotulo(chave)}
                </h3>

                <ListaDados
                  dados={valor}
                  nivel={nivel + 1}
                  caminho={id}
                />
              </section>
            );
          }

          return (
            <div
              key={id}
              className={styles.dataField}
            >
              <span
                className={styles.dataLabel}
              >
                {formatarRotulo(chave)}
              </span>

              <div
                className={styles.dataValue}
              >
                <ValorFormatado
                  valor={valor}
                />
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

export default function ModalMensagem({
  aberto,
  titulo = "Mensagem",
  mensagem,
  dados,
  tamanho = "automatico",
  textoBotaoOk = "OK",
  mostrarBotaoOk = true,
  fecharAoClicarFora = true,
  onOk,
  onFechar,
}: ModalMensagemProps) {
  const titleId = useId();
  const descriptionId = useId();

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const elementoAnterior =
      document.activeElement as
        | HTMLElement
        | null;

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusFrame =
      window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onFechar();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.cancelAnimationFrame(
        focusFrame,
      );

      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      elementoAnterior?.focus();
    };
  }, [aberto, onFechar]);

  if (
    !aberto ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const handleOverlayClick = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    if (
      fecharAoClicarFora &&
      event.target === event.currentTarget
    ) {
      onFechar();
    }
  };

  const handleOk = () => {
    onOk?.();
    onFechar();
  };

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayClick}
    >
      <div
        className={styles.paperFrame}
        data-size={tamanho}
      >
        <div
          className={styles.backSheet}
          aria-hidden="true"
        />

        <div
          className={styles.paperClip}
          aria-hidden="true"
        >
          <span
            className={styles.clipOuter}
          />

          <span
            className={styles.clipInner}
          />

          <span
            className={styles.clipHighlight}
          />
        </div>

        <section
          className={styles.paper}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div
            className={styles.paperTexture}
            aria-hidden="true"
          />

          <div
            className={styles.holeRail}
            aria-hidden="true"
          >
            {Array.from({
              length: TOTAL_FUROS,
            }).map((_, index) => (
              <span
                key={`hole-${index}`}
                className={styles.hole}
              />
            ))}
          </div>

          <header className={styles.header}>
            <div className={styles.titleArea}>
              <span
                className={
                  styles.documentIcon
                }
                aria-hidden="true"
              >
                <FiFileText />
              </span>

              <div
                className={
                  styles.titleContent
                }
              >
                <span
                  className={styles.eyebrow}
                >
                  CONG · MENSAGEM
                </span>

                <h2 id={titleId}>
                  {titulo}
                </h2>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className={styles.closeButton}
              onClick={onFechar}
              aria-label="Fechar mensagem"
            >
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div
            id={descriptionId}
            className={styles.content}
          >
            {mensagem && (
              <div className={styles.message}>
                {mensagem}
              </div>
            )}

            {dados &&
              Object.keys(dados).length >
                0 && (
                <div
                  className={
                    styles.dataWrapper
                  }
                >
                  <ListaDados
                    dados={dados}
                  />
                </div>
              )}
          </div>

          <footer className={styles.footer}>
            <span
              className={styles.footerNote}
            >
              Confira as informações antes de
              continuar.
            </span>

            {mostrarBotaoOk && (
              <button
                type="button"
                className={styles.okButton}
                onClick={handleOk}
              >
                <FiCheck aria-hidden="true" />
                {textoBotaoOk}
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>,
    document.body,
  );
}