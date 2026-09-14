import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  cancelCommunityEvent,
  createCommunityEvent,
  getCommunityEvent,
  joinCommunityEvent,
  leaveCommunityEvent,
  listCommunityEvents,
  updateCommunityEvent,
  type CommunityEvent,
  type CommunityEventScope,
  type CreateCommunityEventInput,
} from "../../services/communityService";
import styles from "./CommunityEventModal.module.css";

type EventScreen = "list" | "create" | "view" | "edit";

interface Props {
  event: CommunityEvent | null;
  eventId?: string | null;
  mode: "create" | "view" | "list";
  onClose: () => void;
  onChanged?: (event: CommunityEvent) => void;
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CommunityEventModal({
  event,
  eventId,
  mode,
  onClose,
  onChanged,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<EventScreen>(mode);
  const [currentEvent, setCurrentEvent] = useState(event);
  const [scope, setScope] = useState<CommunityEventScope>("upcoming");
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [eventMode, setEventMode] =
    useState<CreateCommunityEventInput["mode"]>("online");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setEventMode("online");
    setLocation("");
    setMeetingUrl("");
    setCapacity("");
  }, []);

  const fillForm = useCallback((value: CommunityEvent) => {
    setTitle(value.title);
    setDescription(value.description);
    setStartsAt(toLocalInput(value.startsAt));
    setEndsAt(toLocalInput(value.endsAt));
    setEventMode(value.mode);
    setLocation(value.location ?? "");
    setMeetingUrl(value.meetingUrl ?? "");
    setCapacity(value.capacity ? String(value.capacity) : "");
  }, []);

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    setError(null);
    try {
      setEvents(await listCommunityEvents(scope));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os eventos.",
      );
    } finally {
      setEventsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setScreen(mode);
      setCurrentEvent(event);
      setConfirmCancel(false);
      setError(null);
      setSuccess(null);
      if (mode === "create") resetForm();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [event, mode, resetForm]);

  useEffect(() => {
    if (screen !== "list") return;

    const timer = window.setTimeout(() => {
      void refreshEvents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshEvents, screen]);

  useEffect(() => {
    if (screen !== "view" || currentEvent || !eventId) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingEvent(true);
      setError(null);
      void getCommunityEvent(eventId)
        .then((loaded) => {
          if (!cancelled) setCurrentEvent(loaded);
        })
        .catch((loadError) => {
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Não foi possível carregar o evento.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingEvent(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentEvent, eventId, screen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const isFull = useMemo(() => {
    if (!currentEvent?.capacity) return false;
    return (
      currentEvent.participantCount >= currentEvent.capacity &&
      !currentEvent.joinedByMe
    );
  }, [currentEvent]);

  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    const initialTimer = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(updateNow, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const eventHasStarted = currentEvent
    ? nowMs > 0 && new Date(currentEvent.startsAt).getTime() <= nowMs
    : false;

  const submitForm = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: CreateCommunityEventInput = {
        title: title.trim(),
        description: description.trim(),
        startsAt: toIso(startsAt),
        endsAt: endsAt ? toIso(endsAt) : null,
        mode: eventMode,
        location: location.trim() || null,
        meetingUrl: meetingUrl.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      };
      const saved =
        screen === "edit" && currentEvent
          ? await updateCommunityEvent(currentEvent.id, payload)
          : await createCommunityEvent(payload);
      setCurrentEvent(saved);
      setScreen("view");
      setSuccess(
        screen === "edit"
          ? "Evento atualizado. Participantes foram avisados."
          : "Evento criado e publicado na comunidade.",
      );
      onChanged?.(saved);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível salvar o evento.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleParticipation = async () => {
    if (
      !currentEvent ||
      busy ||
      currentEvent.canManage ||
      currentEvent.status === "cancelled" ||
      eventHasStarted
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const updated = currentEvent.joinedByMe
        ? await leaveCommunityEvent(currentEvent.id)
        : await joinCommunityEvent(currentEvent.id);
      setCurrentEvent(updated);
      onChanged?.(updated);
      setSuccess(
        updated.joinedByMe
          ? "Participação confirmada."
          : "Participação cancelada.",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Não foi possível atualizar sua participação.",
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelEvent = async () => {
    if (!currentEvent || busy || !currentEvent.canManage) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cancelled = await cancelCommunityEvent(currentEvent.id);
      setCurrentEvent(cancelled);
      setConfirmCancel(false);
      setSuccess("Evento cancelado. Os participantes foram avisados.");
      onChanged?.(cancelled);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Não foi possível cancelar o evento.",
      );
    } finally {
      setBusy(false);
    }
  };

  const openList = () => {
    setScreen("list");
    setCurrentEvent(null);
    setSuccess(null);
    setConfirmCancel(false);
  };

  const openCreate = () => {
    resetForm();
    setCurrentEvent(null);
    setScreen("create");
    setSuccess(null);
    setError(null);
  };

  const openEvent = (selected: CommunityEvent) => {
    setCurrentEvent(selected);
    setScreen("view");
    setSuccess(null);
    setError(null);
  };

  const openEdit = () => {
    if (!currentEvent) return;
    fillForm(currentEvent);
    setScreen("edit");
    setSuccess(null);
    setError(null);
    setConfirmCancel(false);
  };

  const heading =
    screen === "list"
      ? "Eventos"
      : screen === "create"
        ? "Criar evento"
        : screen === "edit"
          ? "Editar evento"
          : (currentEvent?.title ?? "Evento");

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-event-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            {screen !== "list" ? (
              <button
                type="button"
                className={styles.backButton}
                onClick={openList}
                aria-label="Voltar para eventos"
              >
                <FiArrowLeft />
              </button>
            ) : null}
            <div>
              <span>
                <FiCalendar /> Comunidade CONG
              </span>
              <h2 id="community-event-title">{heading}</h2>
              <p>
                {screen === "list"
                  ? "Encontros publicados pela comunidade, em um só lugar."
                  : screen === "create"
                    ? "Só título e início são obrigatórios. Complete o restante se fizer sentido."
                    : screen === "edit"
                      ? "Atualize as informações sem perder os participantes."
                      : "Detalhes e participação do evento."}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </header>

        <div className={styles.content}>
          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className={styles.success} role="status">
              <FiCheck />
              <span>{success}</span>
            </div>
          ) : null}

          {screen === "list" ? (
            <div className={styles.eventBrowser}>
              <div className={styles.browserToolbar}>
                <div className={styles.scopeTabs}>
                  {(
                    [
                      ["upcoming", "Próximos"],
                      ["past", "Passados"],
                      ["mine", "Meus eventos"],
                    ] as Array<[CommunityEventScope, string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={scope === value ? styles.scopeActive : ""}
                      onClick={() => setScope(value)}
                      aria-pressed={scope === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={openCreate}
                >
                  <FiPlus /> Novo evento
                </button>
              </div>

              {eventsLoading ? (
                <div
                  className={styles.listState}
                  role="status"
                  aria-live="polite"
                >
                  Carregando eventos...
                </div>
              ) : events.length ? (
                <div className={styles.eventList}>
                  {events.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.eventRow}
                      onClick={() => openEvent(item)}
                    >
                      <span className={styles.eventRowDate}>
                        <b>
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                          }).format(new Date(item.startsAt))}
                        </b>
                        {new Intl.DateTimeFormat("pt-BR", { month: "short" })
                          .format(new Date(item.startsAt))
                          .replace(".", "")}
                      </span>
                      <span className={styles.eventRowBody}>
                        <span className={styles.eventRowTitle}>
                          {item.title}
                          {item.status === "cancelled" ? (
                            <em>Cancelado</em>
                          ) : item.canManage ? (
                            <em>Organizado por você</em>
                          ) : item.joinedByMe ? (
                            <em>Participando</em>
                          ) : null}
                        </span>
                        <small>
                          {formatCompactDate(item.startsAt)} ·{" "}
                          {item.organizer.displayName}
                        </small>
                      </span>
                      <span className={styles.eventRowMeta}>
                        <FiUsers /> {item.participantCount}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.listState}>
                  <FiCalendar />
                  <strong>Nenhum evento nesta categoria.</strong>
                  <span>
                    {scope === "upcoming"
                      ? "Quando a comunidade publicar novos encontros, eles aparecerão aqui."
                      : scope === "past"
                        ? "Os eventos concluídos aparecerão aqui."
                        : "Eventos que você organiza ou participa aparecem aqui."}
                  </span>
                </div>
              )}
            </div>
          ) : screen === "create" || screen === "edit" ? (
            <form
              className={styles.form}
              onSubmit={(formEvent) => void submitForm(formEvent)}
            >
              <label className={styles.full}>
                <span>Título</span>
                <input
                  value={title}
                  onChange={(inputEvent) => setTitle(inputEvent.target.value)}
                  minLength={3}
                  maxLength={160}
                  required
                  placeholder="Ex.: Oficina de captação de recursos"
                />
              </label>
              <label className={styles.full}>
                <span>Descrição</span>
                <textarea
                  value={description}
                  onChange={(inputEvent) =>
                    setDescription(inputEvent.target.value)
                  }
                  maxLength={3000}
                  rows={4}
                  placeholder="Explique o objetivo, para quem é e o que será abordado."
                />
              </label>
              <label>
                <span>Início</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(inputEvent) =>
                    setStartsAt(inputEvent.target.value)
                  }
                  required
                />
              </label>
              <label>
                <span>
                  Término <small>opcional</small>
                </span>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
                />
              </label>
              <label>
                <span>Modalidade</span>
                <select
                  value={eventMode}
                  onChange={(inputEvent) =>
                    setEventMode(
                      inputEvent.target
                        .value as CreateCommunityEventInput["mode"],
                    )
                  }
                >
                  <option value="online">Online</option>
                  <option value="in_person">Presencial</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </label>
              <label>
                <span>
                  Limite de pessoas <small>opcional</small>
                </span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={capacity}
                  onChange={(inputEvent) =>
                    setCapacity(inputEvent.target.value)
                  }
                  placeholder="Sem limite"
                />
              </label>
              {eventMode === "in_person" || eventMode === "hybrid" ? (
                <label className={styles.full}>
                  <span>
                    Local <small>opcional</small>
                  </span>
                  <input
                    value={location}
                    onChange={(inputEvent) =>
                      setLocation(inputEvent.target.value)
                    }
                    maxLength={300}
                    placeholder="Endereço ou local do encontro"
                  />
                </label>
              ) : null}
              {eventMode === "online" || eventMode === "hybrid" ? (
                <label className={styles.full}>
                  <span>
                    Link do encontro <small>opcional</small>
                  </span>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(inputEvent) =>
                      setMeetingUrl(inputEvent.target.value)
                    }
                    placeholder="https://..."
                  />
                </label>
              ) : null}
              <footer className={styles.formFooter}>
                <button type="button" onClick={openList}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={busy || !startsAt}
                >
                  {busy
                    ? "Salvando..."
                    : screen === "edit"
                      ? "Salvar alterações"
                      : "Criar evento"}
                </button>
              </footer>
            </form>
          ) : loadingEvent ? (
            <div className={styles.listState}>Carregando evento...</div>
          ) : currentEvent ? (
            <div className={styles.eventView}>
              {currentEvent.status === "cancelled" ? (
                <div className={styles.cancelledBanner}>
                  Este evento foi cancelado pelo organizador.
                </div>
              ) : null}
              <div className={styles.heroDate}>
                <FiCalendar />
                <div>
                  <strong>{formatDate(currentEvent.startsAt)}</strong>
                  {currentEvent.endsAt ? (
                    <span>até {formatDate(currentEvent.endsAt)}</span>
                  ) : null}
                </div>
              </div>
              {currentEvent.description ? (
                <p className={styles.description}>{currentEvent.description}</p>
              ) : null}
              <div className={styles.metaGrid}>
                <div>
                  <FiGlobe />
                  <span>Modalidade</span>
                  <strong>
                    {currentEvent.mode === "online"
                      ? "Online"
                      : currentEvent.mode === "in_person"
                        ? "Presencial"
                        : "Híbrido"}
                  </strong>
                </div>
                <div>
                  <FiUsers />
                  <span>Participantes</span>
                  <strong>
                    {currentEvent.participantCount}
                    {currentEvent.capacity ? ` / ${currentEvent.capacity}` : ""}
                  </strong>
                </div>
                {currentEvent.location ? (
                  <div>
                    <FiMapPin />
                    <span>Local</span>
                    <strong>{currentEvent.location}</strong>
                  </div>
                ) : null}
                <div>
                  <FiClock />
                  <span>Organização</span>
                  <strong>{currentEvent.organizer.displayName}</strong>
                </div>
              </div>

              {currentEvent.canManage && currentEvent.status === "published" ? (
                <div className={styles.manageActions}>
                  <button type="button" onClick={openEdit}>
                    <FiEdit3 /> Editar evento
                  </button>
                  <button
                    type="button"
                    className={
                      confirmCancel ? styles.dangerConfirm : styles.danger
                    }
                    onClick={() => void cancelEvent()}
                    disabled={busy}
                  >
                    <FiTrash2 />
                    {busy
                      ? "Cancelando..."
                      : confirmCancel
                        ? "Confirmar cancelamento"
                        : "Cancelar evento"}
                  </button>
                  {confirmCancel ? (
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                    >
                      Manter evento
                    </button>
                  ) : null}
                </div>
              ) : null}

              <footer className={styles.viewFooter}>
                {currentEvent.meetingUrl &&
                currentEvent.status === "published" &&
                (currentEvent.joinedByMe || currentEvent.canManage) ? (
                  <a
                    href={currentEvent.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir link do evento <FiExternalLink />
                  </a>
                ) : (
                  <span />
                )}
                {!currentEvent.canManage &&
                currentEvent.status === "published" &&
                !eventHasStarted ? (
                  <button
                    type="button"
                    className={
                      currentEvent.joinedByMe
                        ? styles.secondary
                        : styles.primary
                    }
                    onClick={() => void toggleParticipation()}
                    disabled={busy || isFull}
                  >
                    {busy
                      ? "Salvando..."
                      : currentEvent.joinedByMe
                        ? "Cancelar participação"
                        : isFull
                          ? "Evento lotado"
                          : "Quero participar"}
                  </button>
                ) : currentEvent.canManage ? (
                  <span className={styles.organizerBadge}>
                    Você organiza este evento
                  </span>
                ) : eventHasStarted ? (
                  <span className={styles.organizerBadge}>
                    Evento encerrado
                  </span>
                ) : null}
              </footer>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
