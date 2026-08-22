import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  PackageCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import styles from "./SocialDeliveryFlow.module.css";

const initialControl = [
  "Definir público da ação",
  "Registrar itens disponíveis",
  "Confirmar responsáveis",
  "Escolher data e local",
] as const;

const requestRows = [
  { label: "Solicitação recebida", status: "Concluído", tone: styles.statusGreen },
  { label: "Beneficiário validado", status: "Concluído", tone: styles.statusGreen },
  { label: "Itens separados", status: "Em andamento", tone: styles.statusYellow },
  { label: "Entrega agendada", status: "Próxima etapa", tone: styles.statusBlue },
] as const;

const operationalResults = [
  { label: "Entrega registrada", icon: CheckCircle2 },
  { label: "Estoque atualizado", icon: PackageCheck },
  { label: "Beneficiário atendido", icon: UserCheck },
  { label: "Histórico preservado", icon: History },
] as const;

export default function SocialDeliveryFlow() {
  return (
    <section
      className={`${styles.detailsSection} ${styles.deliverySection}`}
      aria-labelledby="delivery-flow-title"
    >
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>Exemplo de uso</span>
          <h2 id="delivery-flow-title">
            Na prática: organização de uma entrega social
          </h2>
          <p>
            Uma ação que antes dependia de mensagens, planilhas e anotações passa
            a ter começo, acompanhamento e resultado registrados no mesmo fluxo.
          </p>
        </header>

        <div className={styles.deliveryFlow}>
          <article className={`${styles.deliveryCard} ${styles.controlCard}`}>
            <span className={styles.paperTape} aria-hidden="true" />

            <header className={styles.deliveryCardHeader}>
              <span className={`${styles.deliveryIcon} ${styles.iconYellow}`}>
                <ClipboardList size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <span>Etapa 1</span>
                <h3>Controle inicial</h3>
              </div>
            </header>

            <ul className={styles.controlList}>
              {initialControl.map((item) => (
                <li key={item}>
                  <Check size={15} strokeWidth={2.1} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className={styles.miniSchedule}>
              <CalendarCheck2 size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>Entrega comunitária · 14h</span>
            </div>
          </article>

          <span className={styles.deliveryArrow} aria-hidden="true">
            <ArrowRight size={27} strokeWidth={1.55} />
          </span>

          <article className={`${styles.deliveryCard} ${styles.requestCard}`}>
            <header className={styles.deliveryCardHeader}>
              <span className={`${styles.deliveryIcon} ${styles.iconBlue}`}>
                <Users size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <span>Etapa 2</span>
                <h3>Painel da solicitação</h3>
              </div>
            </header>

            <div className={styles.requestSummary}>
              <div>
                <span>Família atendida</span>
                <strong>Cadastro #0238</strong>
              </div>
              <div>
                <span>Responsável</span>
                <strong>Equipe de campo</strong>
              </div>
            </div>

            <div className={styles.requestRows}>
              {requestRows.map((row) => (
                <div key={row.label}>
                  <span className={`${styles.statusDot} ${row.tone}`} />
                  <span>{row.label}</span>
                  <strong>{row.status}</strong>
                </div>
              ))}
            </div>

            <div className={styles.requestFooter}>
              <Clock3 size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>Última atualização: agora</span>
            </div>
          </article>

          <span className={styles.deliveryArrow} aria-hidden="true">
            <ArrowRight size={27} strokeWidth={1.55} />
          </span>

          <article className={`${styles.deliveryCard} ${styles.resultCard}`}>
            <span className={styles.resultStar} aria-hidden="true">
              <Sparkles size={21} strokeWidth={1.6} />
            </span>

            <header className={styles.deliveryCardHeader}>
              <span className={`${styles.deliveryIcon} ${styles.iconGreen}`}>
                <CheckCircle2 size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <span>Etapa 3</span>
                <h3>Resultado operacional</h3>
              </div>
            </header>

            <div className={styles.resultList}>
              {operationalResults.map((result) => {
                const Icon = result.icon;

                return (
                  <div key={result.label}>
                    <span>
                      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <strong>{result.label}</strong>
                  </div>
                );
              })}
            </div>

            <p className={styles.resultMessage}>
              A equipe sabe o que aconteceu, o que mudou e qual é o próximo
              passo.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
