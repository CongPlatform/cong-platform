import {
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  GitBranch,
  Heart,
  History,
  LayoutList,
  Package,
  Settings2,
  ShieldCheck,
  Tags,
  Users,
  Workflow,
} from "lucide-react";

import styles from "./SystemLayers.module.css";

const layers = [
  {
    label: "Camada 1",
    title: "Módulos",
    tone: styles.layerGreen,
    items: [
      { label: "Beneficiários", icon: Users },
      { label: "Doações", icon: Heart },
      { label: "Estoque", icon: Package },
      { label: "Agenda", icon: CalendarDays },
      { label: "Relatórios", icon: Eye },
    ],
  },
  {
    label: "Camada 2",
    title: "Estrutura",
    tone: styles.layerBlue,
    items: [
      { label: "Campos", icon: Tags },
      { label: "Formulários", icon: FileText },
      { label: "Permissões", icon: ShieldCheck },
      { label: "Visualizações", icon: LayoutList },
    ],
  },
  {
    label: "Camada 3",
    title: "Processos",
    tone: styles.layerYellow,
    items: [
      { label: "Atendimento", icon: ClipboardCheck },
      { label: "Cadastro", icon: Settings2 },
      { label: "Validação", icon: CheckCircle2 },
      { label: "Acompanhamento", icon: History },
    ],
  },
  {
    label: "Camada 4",
    title: "Fluxos",
    tone: styles.layerPurple,
    items: [
      { label: "Entrada", icon: GitBranch },
      { label: "Triagem", icon: Workflow },
      { label: "Execução", icon: Boxes },
      { label: "Entrega", icon: CheckCircle2 },
      { label: "Histórico", icon: History },
    ],
  },
] as const;

const layerNotes = [
  {
    title: "Escolha só o necessário",
    text: "A ONG ativa apenas os módulos e recursos que fazem sentido para sua rotina.",
    tone: styles.noteBlue,
  },
  {
    title: "Configure sem programar",
    text: "Campos, permissões, etapas e visualizações são ajustados de forma visual.",
    tone: styles.noteYellow,
  },
  {
    title: "Cresça sem perder controle",
    text: "Novas camadas podem ser adicionadas sem desmontar aquilo que já funciona.",
    tone: styles.noteGreen,
  },
] as const;

export default function SystemLayers() {
  return (
    <section
      className={`${styles.detailsSection} ${styles.layersSection}`}
      aria-labelledby="system-layers-title"
    >
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>Estrutura modular</span>
          <h2 id="system-layers-title">O sistema nasce em camadas</h2>
          <p>
            A CONG não entrega um sistema fechado. Ela combina módulos,
            estruturas, processos e fluxos para formar uma solução que acompanha
            a realidade da organização.
          </p>
        </header>

        <div className={styles.layersLayout}>
          <article className={styles.layersBoard}>
            <span className={styles.boardTapeLeft} aria-hidden="true" />
            <span className={styles.boardTapeRight} aria-hidden="true" />

            <div className={styles.layersStack}>
              {layers.map((layer) => (
                <div
                  key={layer.title}
                  className={`${styles.layerRow} ${layer.tone}`}
                >
                  <header className={styles.layerLabel}>
                    <span>{layer.label}</span>
                    <strong>{layer.title}</strong>
                  </header>

                  <div className={styles.layerItems}>
                    {layer.items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className={styles.layerItem}>
                          <Icon
                            size={18}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <aside
            className={styles.layerNotes}
            aria-label="Princípios das camadas"
          >
            <span className={styles.notesClip} aria-hidden="true" />

            {layerNotes.map((note) => (
              <article
                key={note.title}
                className={`${styles.layerNote} ${note.tone}`}
              >
                <strong>{note.title}</strong>
                <p>{note.text}</p>
              </article>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
