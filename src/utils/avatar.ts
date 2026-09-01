interface AvatarSource {
  id: string;
  username: string | null;
  name: string;
  avatarPath: string | null;
}

const DICEBEAR_API_VERSION = "10.x";
const DEFAULT_AVATAR_STYLE = "personas";

export function buildDefaultAvatarUrl(account: AvatarSource): string {
  const seed = account.username?.trim() || account.name.trim() || account.id;

  const parameters = new URLSearchParams({
    seed,
    radius: "50",
    backgroundType: "gradientLinear",
  });

  return (
    `https://api.dicebear.com/${DICEBEAR_API_VERSION}/` +
    `${DEFAULT_AVATAR_STYLE}/svg?${parameters.toString()}`
  );
}
