export interface CommunityRecommendationContext {
  roles: string[];
  skills: string[];
  affinityAreas: string[];
  affinityTags: string[];
  now?: Date;
}

export interface CommunityRecommendationCandidate {
  id: string;
  authorUserId: string;
  authorCollaborationRole: string | null;
  area: string;
  kind: string;
  title: string;
  summary: string;
  tags: string[];
  targetRoles: string[];
  details: unknown;
  likeCount: number;
  commentCount: number;
  followingAuthor: boolean;
  likedByMe: boolean;
  savedByMe: boolean;
  canEdit: boolean;
  boostCount: number;
  publishedAt: Date | string;
  boostedAt: Date | string | null;
}

export interface CommunityRecommendationScore {
  score: number;
  reasons: string[];
}

const REQUEST_ROLE_MAP: Record<string, string> = {
  development: "developer",
  design: "designer",
  translation: "translator",
  volunteering: "volunteer",
  module: "developer",
  documentation: "volunteer",
  marketing: "volunteer",
  research_support: "volunteer",
  other: "volunteer",
};

export function normalizeRecommendationValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizedSet(values: unknown): Set<string> {
  if (!Array.isArray(values)) return new Set<string>();

  return new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map(normalizeRecommendationValue)
      .filter(Boolean),
  );
}

function finiteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dateMilliseconds(
  value: Date | string | null | undefined,
): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === "string" && value.trim()) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  return null;
}

function extractRequestType(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = (details as Record<string, unknown>).requestType;
  return typeof value === "string" ? value : null;
}

function extractDetailSkills(details: unknown): string[] {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }
  const value = (details as Record<string, unknown>).skills;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function addReason(reasons: string[], label: string): void {
  if (!reasons.includes(label)) reasons.push(label);
}

export function scoreCommunityRecommendation(
  candidate: CommunityRecommendationCandidate,
  context: CommunityRecommendationContext,
): CommunityRecommendationScore {
  const roles = normalizedSet(context.roles);
  const skills = [...normalizedSet(context.skills)].slice(0, 28);
  const affinityAreas = normalizedSet(context.affinityAreas);
  const affinityTags = normalizedSet(context.affinityTags);
  const candidateTags = normalizedSet(candidate.tags ?? []);
  const detailSkills = normalizedSet(extractDetailSkills(candidate.details));
  const targetRoles = normalizedSet(candidate.targetRoles ?? []);
  const searchableText = normalizeRecommendationValue(
    `${typeof candidate.title === "string" ? candidate.title : ""} ${
      typeof candidate.summary === "string" ? candidate.summary : ""
    }`,
  );

  const reasons: string[] = [];
  let score = 0;

  if (candidate.followingAuthor) {
    score += 18;
    addReason(reasons, "autor seguido");
  }

  if (
    [...roles].some((role) => targetRoles.has(role)) &&
    !targetRoles.has("all")
  ) {
    score += 9;
    addReason(reasons, "perfil compatível");
  } else if (targetRoles.has("all")) {
    score += 1;
  }

  const authorRole = candidate.authorCollaborationRole
    ? normalizeRecommendationValue(candidate.authorCollaborationRole)
    : "";
  if (authorRole && roles.has(authorRole)) {
    score += 3;
    addReason(reasons, "área em comum");
  }

  const requestType = extractRequestType(candidate.details);
  const requestRole = requestType ? REQUEST_ROLE_MAP[requestType] : undefined;
  if (requestRole && roles.has(normalizeRecommendationValue(requestRole))) {
    score += 5;
    addReason(reasons, "oportunidade compatível");
  }

  let skillMatches = 0;
  for (const skill of skills) {
    if (skill.length < 2) continue;
    const matched =
      candidateTags.has(skill) ||
      detailSkills.has(skill) ||
      [...candidateTags].some(
        (tag) => tag.includes(skill) || skill.includes(tag),
      ) ||
      [...detailSkills].some(
        (detailSkill) =>
          detailSkill.includes(skill) || skill.includes(detailSkill),
      ) ||
      (skill.length >= 4 && searchableText.includes(skill));

    if (matched) skillMatches += 1;
    if (skillMatches >= 3) break;
  }
  if (skillMatches > 0) {
    score += skillMatches * 5;
    addReason(reasons, "interesses do perfil");
  }

  if (
    typeof candidate.area === "string" &&
    affinityAreas.has(normalizeRecommendationValue(candidate.area))
  ) {
    score += 5;
    addReason(reasons, "atividade recente");
  }

  let tagAffinity = 0;
  for (const tag of candidateTags) {
    if (affinityTags.has(tag)) tagAffinity += 1;
    if (tagAffinity >= 3) break;
  }
  if (tagAffinity > 0) {
    score += tagAffinity * 4;
    addReason(reasons, "tópicos que você acompanha");
  }

  const engagementScore = Math.min(
    6,
    Math.log2(1 + Math.max(0, finiteNumber(candidate.likeCount))) * 1.35 +
      Math.log2(1 + Math.max(0, finiteNumber(candidate.commentCount))) * 1.8,
  );
  score += engagementScore;

  const now = context.now ?? new Date();
  const nowMs = Number.isFinite(now.getTime()) ? now.getTime() : Date.now();
  const rankingMs =
    dateMilliseconds(candidate.boostedAt) ??
    dateMilliseconds(candidate.publishedAt) ??
    nowMs;
  const ageDays = Math.max(0, (nowMs - rankingMs) / 86_400_000);
  const recencyScore = 12 / (1 + ageDays / 7);
  score += recencyScore;

  const boostCount = finiteNumber(candidate.boostCount);
  if (boostCount > 0) {
    score += Math.min(3, boostCount * 0.5);
  }

  // O feed não deve virar uma lista das próprias publicações do usuário.
  if (candidate.canEdit) score -= 4;

  // Interações anteriores contam pouco: elas servem como sinal de interesse,
  // sem prender o usuário em um ciclo de conteúdo já visto.
  if (candidate.likedByMe) score += 0.5;
  if (candidate.savedByMe) score += 1;

  return {
    score: Number(score.toFixed(4)),
    reasons: reasons.slice(0, 3),
  };
}

export function rankCommunityRecommendations<
  T extends CommunityRecommendationCandidate,
>(
  candidates: T[],
  context: CommunityRecommendationContext,
): Array<{ candidate: T; score: number; reasons: string[] }> {
  return candidates
    .map((candidate) => ({
      candidate,
      ...scoreCommunityRecommendation(candidate, context),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      const leftDate =
        dateMilliseconds(left.candidate.boostedAt) ??
        dateMilliseconds(left.candidate.publishedAt) ??
        0;
      const rightDate =
        dateMilliseconds(right.candidate.boostedAt) ??
        dateMilliseconds(right.candidate.publishedAt) ??
        0;
      if (leftDate !== rightDate) return rightDate - leftDate;
      return left.candidate.id.localeCompare(right.candidate.id);
    });
}
