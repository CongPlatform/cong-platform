import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiEdit3,
  FiLayout,
  FiMessageCircle,
  FiStar,
} from "react-icons/fi";

import type { InstitutionalTemplate } from "../../../services/institutionalService";
import ModalMensagem from "../../modalMensagem/ModalMensagem";

import styles from "./SiteCreationModal.module.css";

export type GuidedSitePriority = "present" | "donations" | "volunteers" | "transparency";
export type GuidedSiteStyle = "human" | "impact" | "institutional";

export interface GuidedSiteAnswers {
  mission: string;
  audience: string;
  location: string;
  priority: GuidedSitePriority;
  style: GuidedSiteStyle;
}

export interface SiteCreationRequest {
  name: string;
  template: InstitutionalTemplate | null;
  guided: GuidedSiteAnswers | null;
}

type Step = "choose" | "guided" | "name";

const priorities: Array<{ id: GuidedSitePriority; label: string }> = [
  { id: "present", label: "Apresentar a organização" },
  { id: "donations", label: "Receber apoio e doações" },
  { id: "volunteers", label: "Atrair voluntários" },
  { id: "transparency", label: "Dar visibilidade aos resultados" },
];

const stylesList: Array<{ id: GuidedSiteStyle; label: string; description: string }> = [
  { id: "human", label: "Humano", description: "Fotos, histórias e proximidade." },
  { id: "impact", label: "Impacto", description: "Resultados, números e ações." },
  { id: "institutional", label: "Institucional", description: "Clareza, confiança e transparência." },
];

export default function SiteCreationModal({
  open,
  organizationName,
  templates,
  initialTemplate,
  busy,
  onClose,
  onBrowseTemplates,
  onCreate,
}: {
  open: boolean;
  organizationName: string;
  templates: InstitutionalTemplate[];
  initialTemplate: InstitutionalTemplate | null;
  busy: boolean;
  onClose: () => void;
  onBrowseTemplates: () => void;
  onCreate: (request: SiteCreationRequest) => void;
}) {
  const [step, setStep] = useState<Step>(initialTemplate ? "name" : "choose");
  const [template, setTemplate] = useState<InstitutionalTemplate | null>(initialTemplate);
  const [guided, setGuided] = useState<GuidedSiteAnswers | null>(null);
  const [name, setName] = useState(organizationName ? `Site de ${organizationName}` : "Novo site");
  const [mission, setMission] = useState("");
  const [audience, setAudience] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<GuidedSitePriority>("present");
  const [visualStyle, setVisualStyle] = useState<GuidedSiteStyle>("human");

  const recommendedTemplate = useMemo(() => {
    const preferredNames = visualStyle === "human"
      ? ["Presença social completa", "Humano e acolhedor"]
      : visualStyle === "impact"
        ? ["Impacto em evidência", "Presença social completa"]
        : ["Institucional editorial", "Presença social completa"];

    for (const preferredName of preferredNames) {
      const match = templates.find((item) => item.name === preferredName);
      if (match) return match;
    }

    return templates.find((item) => !item.isExample) ?? templates[0] ?? null;
  }, [templates, visualStyle]);

  function finishGuided(): void {
    if (!mission.trim()) return;
    const answers: GuidedSiteAnswers = {
      mission: mission.trim(),
      audience: audience.trim(),
      location: location.trim(),
      priority,
      style: visualStyle,
    };
    setGuided(answers);
    setTemplate(recommendedTemplate);
    setStep("name");
  }

  const title = step === "choose"
    ? "Como você quer começar?"
    : step === "guided"
      ? "Conte sobre a organização"
      : template
        ? "Antes de abrir o palco"
        : "Criar site livre";

  return (
    <ModalMensagem
      aberto={open}
      titulo={title}
      tamanho={step === "choose" || step === "guided" ? "medio" : "pequeno"}
      mostrarBotaoOk={false}
      fecharAoClicarFora={!busy}
      onFechar={onClose}
      mensagem={
        <div className={styles.modal}>
          {step === "choose" ? (
            <>
              <p className={styles.intro}>A CONG pode montar uma boa primeira versão para você. Se preferir, pule essa ajuda e desenhe no palco.</p>
              <div className={styles.startGrid}>
                <button type="button" className={styles.startCard} data-featured="true" onClick={() => setStep("guided")}> 
                  <span className={styles.startIcon}><FiStar /></span>
                  <strong>Me guie</strong>
                  <small>Responda sobre a ONG. A CONG organiza estrutura, hierarquia e design inicial.</small>
                  <em>Recomendado</em>
                </button>
                <button type="button" className={styles.startCard} onClick={onBrowseTemplates}>
                  <span className={styles.startIcon}><FiLayout /></span>
                  <strong>Escolher modelo</strong>
                  <small>Compare modelos reais e comece de uma composição pronta.</small>
                </button>
                <button type="button" className={styles.startCard} onClick={() => { setTemplate(null); setGuided(null); setStep("name"); }}>
                  <span className={styles.startIcon}><FiEdit3 /></span>
                  <strong>Criar livremente</strong>
                  <small>Abra o palco em branco. A CONG cuida da responsividade e dos padrões técnicos.</small>
                </button>
              </div>
            </>
          ) : null}

          {step === "guided" ? (
            <>
              <div className={styles.guideNote}><FiMessageCircle /><span>Não precisa pensar em layout. Responda como explicaria a organização para uma pessoa.</span></div>
              <label className={styles.field}>
                <span>O que a organização faz?</span>
                <textarea value={mission} onChange={(event) => setMission(event.target.value)} placeholder="Ex.: oferecemos aulas gratuitas e apoio para jovens da comunidade..." autoFocus />
                <small>{mission.length} caracteres · use suas próprias palavras</small>
              </label>
              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>Quem vocês atendem?</span>
                  <input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Ex.: crianças, famílias, moradores..." />
                </label>
                <label className={styles.field}>
                  <span>Onde vocês atuam?</span>
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Cidade, região ou território" />
                </label>
              </div>
              <fieldset className={styles.choiceGroup}>
                <legend>O que deve ficar mais evidente?</legend>
                <div className={styles.chips}>
                  {priorities.map((item) => (
                    <button key={item.id} type="button" data-active={priority === item.id} onClick={() => setPriority(item.id)}>{item.label}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.choiceGroup}>
                <legend>Qual direção combina melhor com vocês?</legend>
                <div className={styles.styleChoices}>
                  {stylesList.map((item) => (
                    <button key={item.id} type="button" data-active={visualStyle === item.id} onClick={() => setVisualStyle(item.id)}>
                      <strong>{item.label}</strong><small>{item.description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setStep("choose")}><FiArrowLeft /> Voltar</button>
                <button type="button" className={styles.primary} onClick={finishGuided} disabled={!mission.trim()}>Montar primeira versão <FiArrowRight /></button>
              </div>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <div className={styles.summary}>
                <span className={styles.startIcon}>{guided ? <FiStar /> : template ? <FiLayout /> : <FiEdit3 />}</span>
                <div>
                  <strong>{guided ? "Primeira versão guiada" : template?.name ?? "Palco livre"}</strong>
                  <small>{guided ? "Você poderá alterar tudo depois no canvas." : template?.description ?? "Sem modelo obrigatório. A CONG mantém os comportamentos técnicos seguros."}</small>
                </div>
              </div>
              <label className={styles.field}>
                <span>Como quer chamar este site dentro da CONG?</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus />
                <small>Isso serve para organizar seus projetos. O nome público continua sendo o da organização.</small>
              </label>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} disabled={busy} onClick={() => initialTemplate ? onClose() : setStep(guided ? "guided" : "choose")}><FiArrowLeft /> Voltar</button>
                <button type="button" className={styles.primary} disabled={busy || name.trim().length < 2} onClick={() => onCreate({ name: name.trim(), template, guided })}>
                  {busy ? "Preparando..." : "Abrir no palco"} <FiArrowRight />
                </button>
              </div>
            </>
          ) : null}
        </div>
      }
    />
  );
}
