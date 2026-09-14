import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBriefcase,
  FiFlag,
  FiHeart,
  FiSlash,
  FiUsers,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import CommunityPostCard from "../../../components/community/CommunityPostCard";
import CommunityReportModal from "../../../components/community/CommunityReportModal";
import {
  blockCommunityUser,
  followCommunityUser,
  getCommunityOrganizationProfile,
  getCommunityUserProfile,
  unblockCommunityUser,
  unfollowCommunityUser,
  type CommunityOrganizationProfile,
  type CommunityPost,
  type CommunityProfile,
  type CommunityUserProfile,
} from "../../../services/communityService";
import styles from "./CommunityProfile.module.css";

const roleLabels: Record<string, string> = {
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradutor",
  volunteer: "Voluntário",
  supporter: "Apoiador",
};

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function CommunityProfilePage() {
  const navigate = useNavigate();
  const { entityType, entityId } = useParams<{
    entityType: "user" | "organization";
    entityId: string;
  }>();
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loadedProfileKey, setLoadedProfileKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const routeIsValid =
    Boolean(entityId) &&
    (entityType === "user" || entityType === "organization");
  const profileKey = routeIsValid ? `${entityType}:${entityId}` : null;

  useEffect(() => {
    if (!routeIsValid || !entityId || !entityType || !profileKey) return;

    let cancelled = false;
    const load = async () => {
      try {
        const next =
          entityType === "organization"
            ? await getCommunityOrganizationProfile(entityId)
            : await getCommunityUserProfile(entityId);

        if (!cancelled) {
          setProfile(next);
          setError(null);
          setLoadedProfileKey(profileKey);
        }
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível abrir este perfil.",
          );
          setLoadedProfileKey(profileKey);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, profileKey, routeIsValid]);

  const loading = routeIsValid && loadedProfileKey !== profileKey;
  const activeError = routeIsValid
    ? loadedProfileKey === profileKey
      ? error
      : null
    : "Perfil inválido.";

  const skills = useMemo(() => {
    if (!profile || profile.entityType !== "user") return [];
    return [...new Set(profile.roles.flatMap((role) => role.skills))].slice(
      0,
      18,
    );
  }, [profile]);

  const updatePost = (post: CommunityPost) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            recentPosts: current.recentPosts.map((item) =>
              item.id === post.id ? post : item,
            ),
          }
        : current,
    );
  };

  const deletePost = (postId: string) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            recentPosts: current.recentPosts.filter(
              (post) => post.id !== postId,
            ),
          }
        : current,
    );
  };

  const toggleFollow = async () => {
    if (
      !profile ||
      profile.entityType !== "user" ||
      profile.isSelf ||
      profile.blockedByMe ||
      profile.blocksMe ||
      followBusy
    )
      return;
    setFollowBusy(true);
    try {
      if (profile.followedByMe) await unfollowCommunityUser(profile.id);
      else await followCommunityUser(profile.id);
      setProfile((current) => {
        if (!current || current.entityType !== "user") return current;
        const followedByMe = !current.followedByMe;
        return {
          ...current,
          followedByMe,
          stats: {
            ...current.stats,
            followers: Math.max(
              0,
              current.stats.followers + (followedByMe ? 1 : -1),
            ),
          },
          recentPosts: current.recentPosts.map((post) =>
            post.author.userId === current.id
              ? { ...post, author: { ...post.author, followedByMe } }
              : post,
          ),
        };
      });
    } finally {
      setFollowBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (
      !profile ||
      profile.entityType !== "user" ||
      profile.isSelf ||
      blockBusy
    )
      return;
    setBlockBusy(true);
    setError(null);
    try {
      if (profile.blockedByMe) {
        await unblockCommunityUser(profile.id);
        const refreshed = await getCommunityUserProfile(profile.id);
        setProfile(refreshed);
      } else {
        const confirmed = window.confirm(
          `Bloquear ${profile.displayName}? Vocês deixarão de ver as publicações e interações um do outro.`,
        );
        if (!confirmed) return;
        await blockCommunityUser(profile.id);
        setProfile((current) =>
          current && current.entityType === "user"
            ? {
                ...current,
                blockedByMe: true,
                followedByMe: false,
                recentPosts: [],
                stats: {
                  ...current.stats,
                  followers: Math.max(
                    0,
                    current.stats.followers - (current.followedByMe ? 1 : 0),
                  ),
                },
              }
            : current,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o bloqueio.",
      );
    } finally {
      setBlockBusy(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Carregando perfil da comunidade...</div>
      </main>
    );
  }

  if (!profile || activeError) {
    return (
      <main className={styles.page}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/app/comunidade")}
        >
          <FiArrowLeft /> Comunidade
        </button>
        <div className={styles.empty}>
          <strong>Não foi possível abrir o perfil.</strong>
          <span>{activeError ?? "Perfil não encontrado."}</span>
        </div>
      </main>
    );
  }

  const userProfile =
    profile.entityType === "user" ? (profile as CommunityUserProfile) : null;
  const organizationProfile =
    profile.entityType === "organization"
      ? (profile as CommunityOrganizationProfile)
      : null;

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate("/app/comunidade")}
      >
        <FiArrowLeft /> Voltar para a comunidade
      </button>

      <section className={styles.profileCard}>
        <div className={styles.avatarWrap}>
          {userProfile?.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span>{initials(profile.displayName)}</span>
          )}
        </div>
        <div className={styles.identity}>
          <div className={styles.identityTop}>
            <div>
              <h1>{profile.displayName}</h1>
              {userProfile?.username ? (
                <p>@{userProfile.username}</p>
              ) : organizationProfile ? (
                <p>
                  {organizationProfile.organizationType === "ngo"
                    ? "ONG"
                    : "Empresa"}
                </p>
              ) : null}
            </div>
            {userProfile && !userProfile.isSelf ? (
              <div className={styles.profileActions}>
                {!userProfile.blockedByMe && !userProfile.blocksMe ? (
                  <button
                    type="button"
                    className={
                      userProfile.followedByMe
                        ? styles.followingButton
                        : styles.followButton
                    }
                    onClick={() => void toggleFollow()}
                    disabled={followBusy}
                  >
                    {followBusy
                      ? "Aguarde..."
                      : userProfile.followedByMe
                        ? "Seguindo"
                        : "Seguir"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setReportOpen(true)}
                >
                  <FiFlag /> Denunciar
                </button>
                <button
                  type="button"
                  className={
                    userProfile.blockedByMe
                      ? styles.unblockAction
                      : styles.blockAction
                  }
                  onClick={() => void toggleBlock()}
                  disabled={blockBusy || userProfile.blocksMe}
                  title={
                    userProfile.blocksMe
                      ? "Este perfil bloqueou você."
                      : undefined
                  }
                >
                  <FiSlash />
                  {blockBusy
                    ? "Aguarde..."
                    : userProfile.blockedByMe
                      ? "Desbloquear"
                      : userProfile.blocksMe
                        ? "Indisponível"
                        : "Bloquear"}
                </button>
              </div>
            ) : null}
          </div>

          <p className={styles.bio}>
            {userProfile?.bio ||
              organizationProfile?.description ||
              "Este perfil ainda não adicionou uma descrição."}
          </p>

          {userProfile ? (
            <div className={styles.roleList}>
              {userProfile.roles.map((role) => (
                <span key={role.role}>
                  {roleLabels[role.role] ?? role.role}
                </span>
              ))}
            </div>
          ) : null}

          {skills.length ? (
            <div className={styles.skillList}>
              {skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          ) : null}

          <div className={styles.stats}>
            <span>
              <strong>{profile.stats.posts}</strong> publicações
            </span>
            {userProfile ? (
              <>
                <span>
                  <strong>{userProfile.stats.followers}</strong> seguidores
                </span>
                <span>
                  <strong>{userProfile.stats.following}</strong> seguindo
                </span>
              </>
            ) : (
              <span>
                <strong>{organizationProfile?.memberCount ?? 0}</strong>{" "}
                integrantes
              </span>
            )}
          </div>
        </div>
      </section>

      {userProfile?.organizations.length ? (
        <section className={styles.organizations}>
          <header>
            <FiBriefcase />
            <div>
              <strong>Organizações</strong>
              <span>Representações ativas desta pessoa</span>
            </div>
          </header>
          <div>
            {userProfile.organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/app/comunidade/perfil/organization/${organization.id}`,
                  )
                }
              >
                <span>{initials(organization.name)}</span>
                <div>
                  <strong>{organization.name}</strong>
                  <small>
                    {organization.organizationType === "ngo"
                      ? "ONG"
                      : "Empresa"}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.postsSection}>
        <header>
          <FiUsers />
          <div>
            <strong>Publicações</strong>
            <span>Atividade recente na comunidade</span>
          </div>
        </header>
        {profile.recentPosts.length ? (
          <div className={styles.postList}>
            {profile.recentPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onUpdated={updatePost}
                onDeleted={deletePost}
                onAuthorBlocked={(userId) => {
                  if (userProfile && userId === userProfile.id) {
                    navigate("/app/comunidade");
                  }
                }}
                onAuthorFollowChanged={(userId, followed) => {
                  if (userProfile && userId === userProfile.id) {
                    setProfile((current) =>
                      current && current.entityType === "user"
                        ? {
                            ...current,
                            followedByMe: followed,
                            recentPosts: current.recentPosts.map((item) =>
                              item.author.userId === userId
                                ? {
                                    ...item,
                                    author: {
                                      ...item.author,
                                      followedByMe: followed,
                                    },
                                  }
                                : item,
                            ),
                          }
                        : current,
                    );
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyPosts}>
            <FiHeart />
            <strong>Nenhuma publicação por aqui ainda.</strong>
            <span>
              Quando este perfil publicar na comunidade, o conteúdo aparecerá
              aqui.
            </span>
          </div>
        )}
      </section>

      {reportOpen && userProfile ? (
        <CommunityReportModal
          targetType="user"
          targetId={userProfile.id}
          targetLabel={userProfile.displayName}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </main>
  );
}
