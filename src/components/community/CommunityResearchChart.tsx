import type { CommunitySurveyResultsQuestion } from "../../services/communityService";
import styles from "./CommunityResearchChart.module.css";

interface Props {
  question: CommunitySurveyResultsQuestion;
}

export default function CommunityResearchChart({ question }: Props) {
  if (question.options.length > 0) {
    const max = Math.max(1, ...question.options.map((option) => option.count));
    return (
      <div
        className={styles.optionChart}
        role="img"
        aria-label={`Resultados de ${question.prompt}`}
      >
        {question.options.map((option) => (
          <div key={option.id} className={styles.optionRow}>
            <div className={styles.optionLabel}>
              <span>{option.label}</span>
              <strong>{option.percentage}%</strong>
            </div>
            <div className={styles.track}>
              <span
                style={{ width: `${Math.max(3, (option.count / max) * 100)}%` }}
              />
            </div>
            <small>
              {option.count} {option.count === 1 ? "resposta" : "respostas"}
            </small>
          </div>
        ))}
      </div>
    );
  }

  if (question.average !== null) {
    const score = Math.max(0, Math.min(5, question.average));
    const percentage = (score / 5) * 100;
    return (
      <div
        className={styles.scoreChart}
        role="img"
        aria-label={`Média ${score.toFixed(1)} de 5`}
      >
        <div
          className={styles.scoreRing}
          style={{
            background: `conic-gradient(#4967e8 ${percentage}%, #e9edf8 ${percentage}% 100%)`,
          }}
        >
          <span>
            <strong>{score.toFixed(1)}</strong>
            <small>/ 5</small>
          </span>
        </div>
        <div>
          <strong>Média das respostas</strong>
          <span>{question.answeredCount} respostas nesta pergunta</span>
        </div>
      </div>
    );
  }

  return null;
}
