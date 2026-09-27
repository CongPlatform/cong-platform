export const MIN_PASSWORD_LENGTH = 10;
export const MIN_PASSWORD_TIER = 2;

const COMMON_PASSWORDS = [
  "password",
  "passwd",
  "senha",
  "qwerty",
  "123456",
  "123456789",
  "abc123",
  "admin",
  "welcome",
  "bemvindo",
  "letmein",
  "iloveyou",
  "secret",
  "cong123",
];

const PREDICTABLE_RUNS =
  /0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|asdf|sdfg|zxcv/i;

const DISALLOWED_PASSWORDS = new Set(["cachorro-verde-na-praia-2026"]);

export type PasswordAnalysis = {
  bits: number;
  tier: 0 | 1 | 2 | 3 | 4;
  label: string;
  narrative: string;
};

export type BreachStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "safe" }
  | { state: "compromised"; count: number }
  | { state: "unavailable" };

const passwordNarrative = [
  {
    label: "Porta aberta",
    narrative: "Ainda não há proteção suficiente.",
  },
  {
    label: "Um clipe torto",
    narrative: "Segura alguma coisa, mas ainda é muito fácil de vencer.",
  },
  {
    label: "Um cadeado",
    narrative: "Agora existe uma proteção aceitável para a conta.",
  },
  {
    label: "Um ferrolho",
    narrative: "Boa. A proteção já está bem mais resistente.",
  },
  {
    label: "Um cofre bancário",
    narrative: "Excelente. A senha tem características de uma senha forte.",
  },
] as const;

export function normalizePasswordForBlocklist(password: string) {
  return password.trim().toLowerCase();
}

export function isDisallowedPassword(password: string) {
  return DISALLOWED_PASSWORDS.has(normalizePasswordForBlocklist(password));
}

export function analysePassword(password: string): PasswordAnalysis {
  if (!password) {
    return {
      bits: 0,
      tier: 0,
      ...passwordNarrative[0],
    };
  }

  let pool = 0;

  if (/[a-zà-ÿ]/.test(password)) pool += 26;
  if (/[A-ZÀ-Ý]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^A-Za-zÀ-ÿ0-9]/.test(password)) pool += 33;

  let bits = password.length * Math.log2(pool || 1);
  const normalized = password.toLowerCase();

  if (COMMON_PASSWORDS.some((word) => normalized.includes(word))) {
    bits *= 0.34;
  }

  if (/^\d+$/.test(password)) bits *= 0.5;
  if (PREDICTABLE_RUNS.test(normalized)) bits *= 0.6;
  if (/(.)\1{2,}/.test(password)) bits *= 0.78;

  if (/^[A-ZÀ-Ý][a-zà-ÿ]+\d{0,4}[!@#$%&*?]?$/u.test(password)) {
    bits *= 0.72;
  }

  const rawTier =
    bits < 1 ? 0 : bits < 38 ? 1 : bits < 62 ? 2 : bits < 84 ? 3 : 4;

  const tier = rawTier as PasswordAnalysis["tier"];

  return {
    bits,
    tier,
    ...passwordNarrative[tier],
  };
}

async function sha1(value: string) {
  const data = new TextEncoder().encode(value);

  const buffer = await crypto.subtle.digest("SHA-1", data);

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function getBreachCount(password: string): Promise<number> {
  const hash = await sha1(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    {
      headers: {
        "Add-Padding": "true",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Pwned Passwords returned ${response.status}`);
  }

  const text = await response.text();

  for (const line of text.split(/\r?\n/)) {
    const [candidateSuffix, countText] = line.split(":");

    if (candidateSuffix === suffix) {
      const count = Number(countText);

      return Number.isFinite(count) ? count : 0;
    }
  }

  return 0;
}

export async function checkPasswordBreach(
  password: string,
  passwordLocallyAllowed: boolean,
): Promise<BreachStatus> {
  if (!passwordLocallyAllowed) {
    return { state: "idle" };
  }

  try {
    const count = await getBreachCount(password);

    return count > 0 ? { state: "compromised", count } : { state: "safe" };
  } catch (error) {
    console.error("Password breach check failed:", error);

    return { state: "unavailable" };
  }
}
