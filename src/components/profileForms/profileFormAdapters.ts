import type { DesignerProfileFormData } from "./DesignerProfileForm";
import type { DeveloperProfileFormData } from "./DeveloperProfileForm";
import type { TranslatorProfileFormData } from "./TranslatorProfileForm";
import type { VolunteerProfileFormData } from "./VolunteerProfileForm";

import type {
  CollaborationProfile,
  CollaborationProfileData,
  CollaborationRole,
  DesignerProfileData,
  DeveloperProfileData,
  TranslatorProfileData,
  VolunteerProfileData,
} from "../../services/collaborationProfileService";

export type PersonalDraftMap = {
  developer: DeveloperProfileFormData;
  designer: DesignerProfileFormData;
  translator: TranslatorProfileFormData;
  volunteer: VolunteerProfileFormData;
};

type AnyPersonalDraft = PersonalDraftMap[CollaborationRole];

function asRoleDraft<R extends CollaborationRole>(
  draft: AnyPersonalDraft,
): PersonalDraftMap[R] {
  return draft as unknown as PersonalDraftMap[R];
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();

  return normalized || undefined;
}

export function emptyProfileDraft<R extends CollaborationRole>(
  role: R,
): PersonalDraftMap[R] {
  if (role === "developer") {
    return asRoleDraft<R>({
      technologies: [],
      experienceLevel: "",
      portfolioUrl: "",
    });
  }

  if (role === "designer") {
    return asRoleDraft<R>({
      specialties: [],
      tools: [],
      portfolioUrl: "",
    });
  }

  if (role === "translator") {
    return asRoleDraft<R>({
      languages: [],
      accessibilitySkills: [],
      notes: "",
    });
  }

  return asRoleDraft<R>({
    causes: [],
    interestAreas: [],
    availability: "",
    opportunityPreference: "both",
  });
}

export function profileDraftFromData<R extends CollaborationRole>(
  role: R,
  profileData: CollaborationProfileData | undefined,
): PersonalDraftMap[R] {
  if (!profileData) {
    return emptyProfileDraft(role);
  }

  if (role === "developer") {
    const data = profileData as DeveloperProfileData;

    return asRoleDraft<R>({
      technologies: data.technologies ?? [],
      experienceLevel: data.experienceLevel ?? "",
      portfolioUrl: data.portfolioUrl ?? "",
    });
  }

  if (role === "designer") {
    const data = profileData as DesignerProfileData;

    return asRoleDraft<R>({
      specialties: data.specialties ?? [],
      tools: data.tools ?? [],
      portfolioUrl: data.portfolioUrl ?? "",
    });
  }

  if (role === "translator") {
    const data = profileData as TranslatorProfileData;

    return asRoleDraft<R>({
      languages: data.languages ?? [],
      accessibilitySkills: data.accessibilitySkills ?? [],
      notes: data.notes ?? "",
    });
  }

  const data = profileData as VolunteerProfileData;

  return asRoleDraft<R>({
    causes: data.causes ?? [],
    interestAreas: data.interestAreas ?? [],
    availability: data.availability ?? "",
    location: data.location,
    availabilityDetails: data.availabilityDetails,
    opportunityPreference: data.opportunityPreference ?? "both",
  });
}

export function profileDraftFromProfile<R extends CollaborationRole>(
  role: R,
  profile: CollaborationProfile | undefined,
): PersonalDraftMap[R] {
  return profileDraftFromData(role, profile?.profileData);
}

export function toPersistedProfileData<R extends CollaborationRole>(
  role: R,
  draft: PersonalDraftMap[R],
): CollaborationProfileData {
  if (role === "developer") {
    const data = draft as DeveloperProfileFormData;

    return {
      technologies: data.technologies,
      experienceLevel: data.experienceLevel || undefined,
      portfolioUrl: optionalText(data.portfolioUrl),
    };
  }

  if (role === "designer") {
    const data = draft as DesignerProfileFormData;

    return {
      specialties: data.specialties,
      tools: data.tools,
      portfolioUrl: optionalText(data.portfolioUrl),
    };
  }

  if (role === "translator") {
    const data = draft as TranslatorProfileFormData;

    return {
      languages: data.languages,
      accessibilitySkills: data.accessibilitySkills,
      notes: optionalText(data.notes),
    };
  }

  const data = draft as VolunteerProfileFormData;

  return {
    causes: data.causes,
    interestAreas: data.interestAreas,
    availability: optionalText(data.availability),
    location: data.location,
    availabilityDetails: data.availabilityDetails,
    opportunityPreference: data.opportunityPreference,
  };
}

export function isProfileComplete(profile: CollaborationProfile): boolean {
  if (profile.role === "developer") {
    const data = profile.profileData as DeveloperProfileData;

    return (
      (data.technologies?.length ?? 0) > 0 && Boolean(data.experienceLevel)
    );
  }

  if (profile.role === "designer") {
    const data = profile.profileData as DesignerProfileData;

    return (data.specialties?.length ?? 0) > 0 && (data.tools?.length ?? 0) > 0;
  }

  if (profile.role === "translator") {
    const data = profile.profileData as TranslatorProfileData;

    return (
      (data.languages?.length ?? 0) + (data.accessibilitySkills?.length ?? 0) >
      0
    );
  }

  const data = profile.profileData as VolunteerProfileData;

  const availability = data.availabilityDetails;

  const availabilityComplete =
    availability?.frequency === "flexible" ||
    Boolean(
      availability &&
      availability.days.length > 0 &&
      availability.periods.length > 0 &&
      availability.frequency,
    );

  return (
    (data.interestAreas?.length ?? 0) > 0 &&
    (data.causes?.length ?? 0) > 0 &&
    Boolean(data.location?.state && data.location?.city) &&
    availabilityComplete
  );
}
