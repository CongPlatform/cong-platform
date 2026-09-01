import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

import DesignerProfileForm from "../../../../components/profileForms/DesignerProfileForm";
import DeveloperProfileForm from "../../../../components/profileForms/DeveloperProfileForm";
import TranslatorProfileForm from "../../../../components/profileForms/TranslatorProfileForm";
import VolunteerProfileForm from "../../../../components/profileForms/VolunteerProfileForm";

import {
  emptyProfileDraft,
  profileDraftFromProfile,
  toPersistedProfileData,
} from "../../../../components/profileForms/profileFormAdapters";

import { useAuth } from "../../../../contexts/auth-context";

import type {
  CollaborationProfile,
  CollaborationRole,
} from "../../../../services/collaborationProfileService";

import styles from "./CollaborationProfileEditor.module.css";

type Props = {
  role: CollaborationRole;
  profile?: CollaborationProfile;
  onClose: () => void;
  onSaved: (profile: CollaborationProfile) => void | Promise<void>;
};

type RoleEditorProps = {
  profile?: CollaborationProfile;
  onClose: () => void;
  onSaved: (profile: CollaborationProfile) => void | Promise<void>;
};

type EditorShellProps = {
  title: string;
  children: ReactNode;
  error: string;
  onClose: () => void;
};

const ROLE_LABELS: Record<CollaborationRole, string> = {
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradução e acessibilidade",
  volunteer: "Voluntário",
};

function EditorShell({ title, children, error, onClose }: EditorShellProps) {
  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div>
          <span className={styles.toolbarEyebrow}>Perfil de colaboração</span>

          <strong>{title}</strong>
        </div>

        <button type="button" className={styles.closeButton} onClick={onClose}>
          <X aria-hidden="true" />
          Fechar
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.formContainer}>{children}</div>
    </div>
  );
}

function DeveloperEditor({ profile, onClose, onSaved }: RoleEditorProps) {
  const {
    createCollaborationProfile,
    updateCollaborationProfile,
    collaborationProfilesLoading,
  } = useAuth();

  const [draft, setDraft] = useState(() =>
    profile
      ? profileDraftFromProfile("developer", profile)
      : emptyProfileDraft("developer"),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(data: typeof draft): Promise<void> {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const profileData = toPersistedProfileData("developer", data);

      const savedProfile = profile
        ? await updateCollaborationProfile(profile.id, profileData)
        : await createCollaborationProfile("developer", profileData);

      await onSaved(savedProfile);
    } catch (saveError) {
      console.error("Erro ao salvar perfil de desenvolvedor:", saveError);

      setError("Não foi possível salvar este perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title={
        profile
          ? `Editar ${ROLE_LABELS.developer}`
          : `Adicionar ${ROLE_LABELS.developer}`
      }
      error={error}
      onClose={onClose}
    >
      <DeveloperProfileForm
        technologies={draft.technologies}
        experienceLevel={draft.experienceLevel}
        portfolioUrl={draft.portfolioUrl}
        completed={Boolean(profile)}
        saving={saving || collaborationProfilesLoading}
        submitLabel={profile ? "Salvar alterações" : "Criar perfil"}
        onTechnologiesChange={(technologies) =>
          setDraft((current) => ({
            ...current,
            technologies,
          }))
        }
        onExperienceLevelChange={(experienceLevel) =>
          setDraft((current) => ({
            ...current,
            experienceLevel,
          }))
        }
        onPortfolioUrlChange={(portfolioUrl) =>
          setDraft((current) => ({
            ...current,
            portfolioUrl,
          }))
        }
        onSubmit={save}
      />
    </EditorShell>
  );
}

function DesignerEditor({ profile, onClose, onSaved }: RoleEditorProps) {
  const {
    createCollaborationProfile,
    updateCollaborationProfile,
    collaborationProfilesLoading,
  } = useAuth();

  const [draft, setDraft] = useState(() =>
    profile
      ? profileDraftFromProfile("designer", profile)
      : emptyProfileDraft("designer"),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(data: typeof draft): Promise<void> {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const profileData = toPersistedProfileData("designer", data);

      const savedProfile = profile
        ? await updateCollaborationProfile(profile.id, profileData)
        : await createCollaborationProfile("designer", profileData);

      await onSaved(savedProfile);
    } catch (saveError) {
      console.error("Erro ao salvar perfil de designer:", saveError);

      setError("Não foi possível salvar este perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title={
        profile
          ? `Editar ${ROLE_LABELS.designer}`
          : `Adicionar ${ROLE_LABELS.designer}`
      }
      error={error}
      onClose={onClose}
    >
      <DesignerProfileForm
        {...draft}
        completed={Boolean(profile)}
        saving={saving || collaborationProfilesLoading}
        submitLabel={profile ? "Salvar alterações" : "Criar perfil"}
        onSpecialtiesChange={(specialties) =>
          setDraft((current) => ({
            ...current,
            specialties,
          }))
        }
        onToolsChange={(tools) =>
          setDraft((current) => ({
            ...current,
            tools,
          }))
        }
        onPortfolioUrlChange={(portfolioUrl) =>
          setDraft((current) => ({
            ...current,
            portfolioUrl,
          }))
        }
        onSubmit={save}
      />
    </EditorShell>
  );
}

function TranslatorEditor({ profile, onClose, onSaved }: RoleEditorProps) {
  const {
    createCollaborationProfile,
    updateCollaborationProfile,
    collaborationProfilesLoading,
  } = useAuth();

  const [draft, setDraft] = useState(() =>
    profile
      ? profileDraftFromProfile("translator", profile)
      : emptyProfileDraft("translator"),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(data: typeof draft): Promise<void> {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const profileData = toPersistedProfileData("translator", data);

      const savedProfile = profile
        ? await updateCollaborationProfile(profile.id, profileData)
        : await createCollaborationProfile("translator", profileData);

      await onSaved(savedProfile);
    } catch (saveError) {
      console.error("Erro ao salvar perfil de tradução:", saveError);

      setError("Não foi possível salvar este perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title={
        profile
          ? `Editar ${ROLE_LABELS.translator}`
          : `Adicionar ${ROLE_LABELS.translator}`
      }
      error={error}
      onClose={onClose}
    >
      <TranslatorProfileForm
        {...draft}
        completed={Boolean(profile)}
        saving={saving || collaborationProfilesLoading}
        submitLabel={profile ? "Salvar alterações" : "Criar perfil"}
        onLanguagesChange={(languages) =>
          setDraft((current) => ({
            ...current,
            languages,
          }))
        }
        onAccessibilitySkillsChange={(accessibilitySkills) =>
          setDraft((current) => ({
            ...current,
            accessibilitySkills,
          }))
        }
        onNotesChange={(notes) =>
          setDraft((current) => ({
            ...current,
            notes,
          }))
        }
        onSubmit={save}
      />
    </EditorShell>
  );
}

function VolunteerEditor({ profile, onClose, onSaved }: RoleEditorProps) {
  const {
    createCollaborationProfile,
    updateCollaborationProfile,
    collaborationProfilesLoading,
  } = useAuth();

  const [draft, setDraft] = useState(() =>
    profile
      ? profileDraftFromProfile("volunteer", profile)
      : emptyProfileDraft("volunteer"),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(data: typeof draft): Promise<void> {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const profileData = toPersistedProfileData("volunteer", data);

      const savedProfile = profile
        ? await updateCollaborationProfile(profile.id, profileData)
        : await createCollaborationProfile("volunteer", profileData);

      await onSaved(savedProfile);
    } catch (saveError) {
      console.error("Erro ao salvar perfil de voluntário:", saveError);

      setError("Não foi possível salvar este perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title={
        profile
          ? `Editar ${ROLE_LABELS.volunteer}`
          : `Adicionar ${ROLE_LABELS.volunteer}`
      }
      error={error}
      onClose={onClose}
    >
      <VolunteerProfileForm
        {...draft}
        completed={Boolean(profile)}
        saving={saving || collaborationProfilesLoading}
        submitLabel={profile ? "Salvar alterações" : "Criar perfil"}
        onChange={setDraft}
        onSubmit={save}
      />
    </EditorShell>
  );
}

export default function CollaborationProfileEditor(props: Props) {
  const role = props.profile?.role ?? props.role;

  const editorProps: RoleEditorProps = {
    profile: props.profile,
    onClose: props.onClose,
    onSaved: props.onSaved,
  };

  if (role === "developer") {
    return <DeveloperEditor {...editorProps} />;
  }

  if (role === "designer") {
    return <DesignerEditor {...editorProps} />;
  }

  if (role === "translator") {
    return <TranslatorEditor {...editorProps} />;
  }

  return <VolunteerEditor {...editorProps} />;
}
