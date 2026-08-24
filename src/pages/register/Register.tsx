import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import gsap from "gsap";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import { ApiError, apiPost } from "../../services/api";
import mascot from "../../assets/mascot/cong-default.webp";
import styles from "./Register.module.css";

const MIN_PASSWORD_LENGTH = 10;
const MIN_PASSWORD_TIER = 2;

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

const DISALLOWED_PASSWORDS = new Set([
  "cachorro-verde-na-praia-2026",
]);

function normalizePasswordForBlocklist(password: string) {
  return password.trim().toLowerCase();
}

function isDisallowedPassword(password: string) {
  return DISALLOWED_PASSWORDS.has(normalizePasswordForBlocklist(password));
}

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  conductAccepted: boolean;
  privacyAccepted: boolean;
};

type FieldName = keyof FormState;
type ErrorMap = Partial<Record<FieldName, string>>;
type TouchedMap = Partial<Record<FieldName, boolean>>;
type ModalKind = "passwordHelp" | "conduct" | "privacy" | null;

type PasswordAnalysis = {
  bits: number;
  tier: 0 | 1 | 2 | 3 | 4;
  label: string;
  narrative: string;
};

type BreachStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "safe" }
  | { state: "compromised"; count: number }
  | { state: "unavailable" };

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    name: string;
  };
};

const initialFormState: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  conductAccepted: false,
  privacyAccepted: false,
};

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

function analysePassword(password: string): PasswordAnalysis {
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

function sha1(value: string) {
  const data = new TextEncoder().encode(value);

  return crypto.subtle.digest("SHA-1", data).then((buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase(),
  );
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

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(100, "O nome deve ter no máximo 100 caracteres."),
    email: z
      .string()
      .trim()
      .email("Digite um e-mail válido.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(128, "A senha ultrapassou o limite permitido."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    conductAccepted: z.boolean(),
    privacyAccepted: z.boolean(),
  })
  .superRefine((data, context) => {
    const analysis = analysePassword(data.password);

    if (isDisallowedPassword(data.password)) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message:
          "Esta senha é usada como exemplo pela CONG. Crie uma combinação própria.",
      });
    }

    if (
      data.password.length >= MIN_PASSWORD_LENGTH &&
      analysis.tier < MIN_PASSWORD_TIER
    ) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Essa senha ainda está fraca. Fortaleça-a antes de continuar.",
      });
    }

    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas precisam ser iguais.",
      });
    }

    if (!data.conductAccepted) {
      context.addIssue({
        code: "custom",
        path: ["conductAccepted"],
        message: "Leia e aceite o Código de Conduta para continuar.",
      });
    }

    if (!data.privacyAccepted) {
      context.addIssue({
        code: "custom",
        path: ["privacyAccepted"],
        message: "Leia e aceite as informações de privacidade para continuar.",
      });
    }
  });

function getZodErrors(error: z.ZodError): ErrorMap {
  const nextErrors: ErrorMap = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0] as FieldName | undefined;

    if (field && !nextErrors[field]) {
      nextErrors[field] = issue.message;
    }
  });

  return nextErrors;
}

function getRegistrationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    console.error("Unknown registration error:", error);
    return "Não foi possível criar sua conta.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  if (error.status === 409 || error.code === "EMAIL_ALREADY_REGISTERED") {
    return "Já existe uma conta usando este e-mail.";
  }

  if (error.status === 400) {
    return "Revise os dados informados e tente novamente.";
  }

  return error.message || "Não foi possível concluir o cadastro.";
}

function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;

  return (
    <p id={id} className={styles.fieldError} role="alert">
      {children}
    </p>
  );
}

function PasswordVault({ tier }: { tier: PasswordAnalysis["tier"] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const idleRef = useRef<gsap.core.Tween | null>(null);
  const currentTierRef = useRef(0);
  const initialTierRef = useRef(tier);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const q = <T extends Element>(selector: string) =>
      root.querySelector<T>(selector);
    const qa = <T extends Element>(selector: string) =>
      Array.from(root.querySelectorAll<T>(selector));

    const door = q<HTMLElement>('[data-vault-part="door"]');
    const ears = qa<SVGGElement>('[data-vault-part="ear"]');
    const clip = q<SVGGElement>('[data-vault-part="clip"]');
    const clipWob = q<SVGGElement>('[data-vault-part="clip-wob"]');
    const wire = q<SVGPathElement>('[data-vault-part="wire"]');
    const pad = q<SVGGElement>('[data-vault-part="pad"]');
    const padSway = q<SVGGElement>('[data-vault-part="pad-sway"]');
    const shackle = q<SVGPathElement>('[data-vault-part="shackle"]');
    const padBody = q<SVGGElement>('[data-vault-part="pad-body"]');
    const bolt = q<SVGGElement>('[data-vault-part="bolt"]');
    const house = q<SVGGElement>('[data-vault-part="house"]');
    const strike = q<SVGGElement>('[data-vault-part="strike"]');
    const slug = q<SVGGElement>('[data-vault-part="slug"]');
    const turn = q<SVGGElement>('[data-vault-part="turn"]');
    const knob = q<SVGGElement>('[data-vault-part="knob"]');
    const rivets = qa<SVGGElement>('[data-vault-part="rivet"]');
    const vault = q<SVGGElement>('[data-vault-part="vault"]');
    const vaultBolts = qa<SVGRectElement>('[data-vault-part="vault-bolt"]');
    const wheel = q<SVGGElement>('[data-vault-part="wheel"]');
    const lamp = q<SVGGElement>('[data-vault-part="lamp"]');
    const shock = q<SVGCircleElement>('[data-vault-part="shock"]');

    if (
      !door ||
      !clip ||
      !clipWob ||
      !wire ||
      !pad ||
      !padSway ||
      !shackle ||
      !padBody ||
      !bolt ||
      !house ||
      !strike ||
      !slug ||
      !turn ||
      !knob ||
      !vault ||
      !wheel ||
      !lamp ||
      !shock
    ) {
      return undefined;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const wireLength = wire.getTotalLength();
    const BOLT_THROW = 60;
    const VAULT_BOLT_THROW = 26;

    gsap.set(pad, { svgOrigin: "280 214" });
    gsap.set(padSway, { svgOrigin: "280 214" });
    gsap.set(shackle, { svgOrigin: "253 300" });
    gsap.set(knob, { svgOrigin: "200 273" });
    gsap.set(wheel, { svgOrigin: "280 280" });
    gsap.set(vault, { svgOrigin: "280 280" });
    gsap.set(shock, { svgOrigin: "280 280" });
    gsap.set(ears, { transformOrigin: "50% 100%" });

    gsap.set(door, { x: 0, y: 0 });
    gsap.set(ears, { scale: 0, y: -12, opacity: 0 });
    gsap.set(clip, { x: -140, y: -40, rotation: -110, scale: 0.7, opacity: 0 });
    gsap.set(clipWob, { rotation: 0 });
    gsap.set(wire, {
      strokeDasharray: wireLength,
      strokeDashoffset: wireLength,
    });
    gsap.set(pad, {
      y: -280,
      x: 0,
      rotation: 0,
      opacity: 0,
    });
    gsap.set(padSway, { rotation: 0 });
    gsap.set(shackle, { y: -34, rotation: -15 });
    gsap.set(padBody, { x: 6, scaleX: 1, scaleY: 1 });
    gsap.set(bolt, { opacity: 1 });
    gsap.set(house, { x: -220, opacity: 0 });
    gsap.set(strike, { x: 220, opacity: 0 });
    gsap.set(turn, { x: -220, opacity: 0 });
    gsap.set(knob, { rotation: 0 });
    gsap.set(slug, { x: 0 });
    gsap.set(rivets, { scale: 0, transformOrigin: "50% 50%" });
    gsap.set(vault, { scale: 0.06, rotation: -55, opacity: 0 });
    gsap.set(vaultBolts, { x: 0 });
    gsap.set(wheel, { rotation: 0 });
    gsap.set(lamp, { opacity: 0 });
    gsap.set(shock, { scale: 1, opacity: 0 });

    const timeline = gsap.timeline({
      paused: true,
      defaults: { ease: "power2.out" },
    });

    timeline
      .addLabel("t0", 0)
      .to(
        ears,
        {
          scale: 1,
          y: 0,
          opacity: 1,
          duration: 0.38,
          stagger: 0.08,
          ease: "back.out(2.6)",
        },
        0.04,
      )
      .to(
        clip,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          duration: 0.52,
          ease: "back.out(1.7)",
        },
        0.34,
      )
      .to(
        wire,
        { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" },
        0.36,
      )
      .to(
        door,
        {
          keyframes: { x: [0, -1.5, 1.5, -1, 1, 0] },
          duration: 0.34,
          ease: "none",
        },
        0.92,
      )
      .addLabel("t1", 1.08)
      // TIER 2 · cadeado
      .to(
        clip,
        {
          x: 150,
          y: -200,
          rotation: 400,
          opacity: 0,
          duration: 0.42,
          ease: "power2.in",
        },
        1.1,
      )
      .to(
        pad,
        {
          x: -8,
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.48,
          ease: "power2.in",
        },
        1.26,
      )
      .to(
        padBody,
        {
          scaleY: 0.9,
          scaleX: 1.08,
          duration: 0.08,
          ease: "power2.out",
        },
        1.74,
      )
      .to(
        padBody,
        {
          scaleY: 1,
          scaleX: 1,
          duration: 0.34,
          ease: "elastic.out(1, .45)",
        },
        1.82,
      )
      .to(
        door,
        {
          keyframes: {
            y: [0, 1.5, 0],
          },
          duration: 0.2,
          ease: "none",
        },
        1.74,
      )
      .to(
        shackle,
        {
          y: 0,
          rotation: 0,
          duration: 0.16,
          ease: "power3.in",
        },
        1.96,
      )
      .addLabel("t2", 2.18)

      // TIER 3 · ferrolho
      .to(
        shackle,
        {
          y: -34,
          rotation: -15,
          duration: 0.18,
          ease: "power2.out",
        },
        2.26,
      )
      .to(
        pad,
        {
          y: 360,
          x: -70,
          rotation: -40,
          opacity: 0,
          duration: 0.55,
          ease: "power2.in",
        },
        2.42,
      )
      .to(
        ears,
        {
          scale: 0,
          y: -10,
          opacity: 0,
          duration: 0.26,
          stagger: 0.06,
          ease: "back.in(2)",
        },
        2.56,
      )
      .to(
        house,
        {
          x: 0,
          opacity: 1,
          duration: 0.46,
          ease: "power3.out",
        },
        2.66,
      )
      .to(
        strike,
        {
          x: 0,
          opacity: 1,
          duration: 0.46,
          ease: "power3.out",
        },
        2.7,
      )
      .to(
        turn,
        {
          x: 0,
          opacity: 1,
          duration: 0.46,
          ease: "power3.out",
        },
        2.74,
      )
      .to(
        rivets,
        {
          scale: 1,
          duration: 0.3,
          stagger: 0.035,
          ease: "back.out(3)",
        },
        3.02,
      )
      .to(
        knob,
        {
          rotation: 90,
          duration: 0.42,
          ease: "power2.inOut",
        },
        3.12,
      )
      .to(
        slug,
        {
          x: BOLT_THROW,
          duration: 0.3,
          ease: "power3.in",
        },
        3.2,
      )
      .to(
        door,
        {
          keyframes: {
            x: [0, -2, 2, -1, 0],
          },
          duration: 0.3,
          ease: "none",
        },
        3.5,
      )
      .addLabel("t3", 3.62)

      .to(
        vault,
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.72,
          ease: "back.out(1.3)",
        },
        3.64,
      )
      .to(bolt, { opacity: 0, duration: 0.22 }, 4.06)
      .to(
        door,
        {
          keyframes: {
            x: [0, -2.5, 2.5, -1.5, 1.5, 0],
            y: [0, 1.5, -1, 0, 0, 0],
          },
          duration: 0.4,
          ease: "none",
        },
        4.3,
      )
      .to(wheel, { rotation: 900, duration: 0.78, ease: "power2.inOut" }, 4.34)
      .to(
        vaultBolts,
        {
          x: VAULT_BOLT_THROW,
          duration: 0.26,
          stagger: 0.035,
          ease: "power3.in",
        },
        4.92,
      )
      .to(
        door,
        {
          keyframes: {
            x: [0, -4, 3.5, -2.5, 1.5, -1, 0],
            y: [0, 2.5, -2, 1.5, -1, 0.5, 0],
          },
          duration: 0.55,
          ease: "none",
        },
        5.24,
      )
      .to(
        shock,
        {
          keyframes: { scale: [1, 1.5], opacity: [0, 0.75, 0] },
          duration: 0.7,
          ease: "power2.out",
        },
        5.24,
      )
      .to(lamp, { opacity: 1, duration: 0.3 }, 5.34)
      .addLabel("t4", 5.7);

    timelineRef.current = timeline;

    const setIdle = (nextTier: number) => {
      idleRef.current?.kill();
      idleRef.current = null;

      // Os grupos internos sempre voltam ao neutro.
      gsap.set([clipWob, padSway], {
        rotation: 0,
      });

      if (reduceMotion) return;

      // O clipe continua com um pequeno movimento.
      if (nextTier === 1) {
        idleRef.current = gsap.fromTo(
          clipWob,
          {
            rotation: -3.5,
          },
          {
            rotation: 3.5,
            duration: 0.45,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            svgOrigin: "280 266",
          },
        );
      }
    };

    root.dataset.vaultReady = "true";

    const applyTier = (nextTier: number, immediate = false) => {
      idleRef.current?.kill();
      idleRef.current = null;

      const target = timeline.labels[`t${nextTier}`];
      if (target === undefined) return;

      if (reduceMotion || immediate) {
        timeline.pause(target);
        setIdle(nextTier);
        currentTierRef.current = nextTier;
        return;
      }

      const gap = Math.abs(target - timeline.time());
      const duration = gap <= 1.5 ? gap : 1.5 + (gap - 1.5) * 0.48;

      timeline.tweenTo(target, {
        duration: Math.max(duration, 0.01),
        ease: "none",
        onComplete: () => setIdle(nextTier),
      });

      currentTierRef.current = nextTier;
    };

    (
      root as HTMLDivElement & {
        applyTier?: (nextTier: number, immediate?: boolean) => void;
      }
    ).applyTier = applyTier;
    applyTier(initialTierRef.current, true);

    return () => {
      idleRef.current?.kill();
      timeline.kill();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current as
      | (HTMLDivElement & {
          applyTier?: (nextTier: number, immediate?: boolean) => void;
        })
      | null;

    root?.applyTier?.(tier);
  }, [tier]);

  return (
    <div ref={rootRef} className={styles.vaultChip} aria-hidden="true">
      <div className={styles.vaultDoor} data-vault-part="door">
        <svg className={styles.vaultSvg} viewBox="150 150 260 260" fill="none">
          <defs>
            <linearGradient id="cong-vault-plate" x1=".1" y1="0" x2=".9" y2="1">
              <stop offset="0" stopColor="#79838f" />
              <stop offset=".3" stopColor="#59636f" />
              <stop offset=".6" stopColor="#454e59" />
              <stop offset="1" stopColor="#333b45" />
            </linearGradient>
            <linearGradient id="cong-vault-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d3dae2" />
              <stop offset=".42" stopColor="#939dab" />
              <stop offset=".55" stopColor="#7a8492" />
              <stop offset="1" stopColor="#525b68" />
            </linearGradient>
            <linearGradient id="cong-vault-chrome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f1f5f9" />
              <stop offset=".3" stopColor="#aab4c0" />
              <stop offset=".52" stopColor="#e8edf2" />
              <stop offset=".7" stopColor="#8d97a4" />
              <stop offset="1" stopColor="#c3ccd6" />
            </linearGradient>
            <linearGradient id="cong-vault-wire" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e8eef4" />
              <stop offset=".5" stopColor="#9aa5b3" />
              <stop offset="1" stopColor="#d4dce4" />
            </linearGradient>
            <radialGradient id="cong-vault-face" cx=".36" cy=".3" r=".78">
              <stop offset="0" stopColor="#9aa5b2" />
              <stop offset=".45" stopColor="#69737f" />
              <stop offset=".8" stopColor="#454e58" />
              <stop offset="1" stopColor="#333a43" />
            </radialGradient>
            <radialGradient id="cong-vault-led" cx=".4" cy=".38" r=".7">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".45" stopColor="currentColor" />
              <stop offset="1" stopColor="currentColor" stopOpacity=".25" />
            </radialGradient>
            <clipPath id="cong-vault-boltclip">
              <rect x="278" y="250" width="60" height="44" />
            </clipPath>
          </defs>

          <g>
            <rect
              x="80"
              y="80"
              width="400"
              height="400"
              rx="16"
              fill="url(#cong-vault-plate)"
            />
            <rect
              className={styles.vaultSeamGlow}
              x="270"
              y="80"
              width="20"
              height="400"
            />
            <rect x="277" y="80" width="6" height="400" fill="#151a20" />
          </g>

          <g data-vault-part="clip">
            <g data-vault-part="clip-wob">
              <path
                data-vault-part="wire"
                className={styles.vaultWire}
                d="M233 288 Q230 268 248 266 L360 266 A17 17 0 0 0 360 232 L330 232 A10 10 0 0 0 330 252 L354 252"
                stroke="url(#cong-vault-wire)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>

          <g>
            <g data-vault-part="ear">
              <path
                fill="url(#cong-vault-steel)"
                fillRule="evenodd"
                d="M247 242 H260 A7 7 0 0 1 267 249 V295 A7 7 0 0 1 260 302 H247 A7 7 0 0 1 240 295 V249 A7 7 0 0 1 247 242 Z M261 266 A7.5 7.5 0 1 1 246 266 A7.5 7.5 0 1 1 261 266 Z"
              />
              <circle
                cx="253.5"
                cy="266"
                r="8.4"
                fill="none"
                stroke="rgba(6,10,14,.6)"
                strokeWidth="2"
              />
            </g>
            <g data-vault-part="ear">
              <path
                fill="url(#cong-vault-steel)"
                fillRule="evenodd"
                d="M300 242 H313 A7 7 0 0 1 320 249 V295 A7 7 0 0 1 313 302 H300 A7 7 0 0 1 293 295 V249 A7 7 0 0 1 300 242 Z M314 266 A7.5 7.5 0 1 1 299 266 A7.5 7.5 0 1 1 314 266 Z"
              />
              <circle
                cx="306.5"
                cy="266"
                r="8.4"
                fill="none"
                stroke="rgba(6,10,14,.6)"
                strokeWidth="2"
              />
            </g>
          </g>

          <g data-vault-part="pad" className={styles.vaultHardware}>
            <g data-vault-part="pad-sway">
              <path
                data-vault-part="shackle"
                d="M253.5 312 L253.5 214 A26.5 26.5 0 0 1 306.5 214 L306.5 312"
                stroke="url(#cong-vault-chrome)"
                strokeWidth="15"
                strokeLinecap="round"
              />
              <g data-vault-part="pad-body">
                <rect
                  x="230"
                  y="286"
                  width="100"
                  height="106"
                  rx="16"
                  fill="url(#cong-vault-steel)"
                />
                <rect
                  x="230.5"
                  y="286.5"
                  width="99"
                  height="105"
                  rx="15.5"
                  stroke="rgba(255,255,255,.3)"
                />
                <circle cx="280" cy="328" r="14" fill="#151a20" />
                <path
                  d="M280 328 L280 358"
                  stroke="#151a20"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>

          <g data-vault-part="bolt" className={styles.vaultHardware}>
            <g data-vault-part="house">
              <rect
                x="168"
                y="230"
                width="110"
                height="86"
                rx="11"
                fill="url(#cong-vault-steel)"
              />
              <rect
                x="168.5"
                y="230.5"
                width="109"
                height="85"
                rx="10.5"
                stroke="rgba(255,255,255,.28)"
              />
              <g data-vault-part="rivet">
                <circle cx="184" cy="246" r="4.5" fill="#6d7784" />
              </g>
              <g data-vault-part="rivet">
                <circle cx="184" cy="300" r="4.5" fill="#6d7784" />
              </g>
              <g data-vault-part="rivet">
                <circle cx="262" cy="246" r="4.5" fill="#6d7784" />
              </g>
              <g data-vault-part="rivet">
                <circle cx="262" cy="300" r="4.5" fill="#6d7784" />
              </g>
            </g>

            <g data-vault-part="strike">
              <rect
                x="284"
                y="230"
                width="96"
                height="86"
                rx="11"
                fill="url(#cong-vault-steel)"
              />
              <rect
                x="284.5"
                y="230.5"
                width="95"
                height="85"
                rx="10.5"
                stroke="rgba(255,255,255,.28)"
              />
              <rect
                x="284"
                y="250"
                width="54"
                height="44"
                rx="5"
                fill="#12171d"
              />
              <g data-vault-part="rivet">
                <circle cx="362" cy="246" r="4.5" fill="#6d7784" />
              </g>
              <g data-vault-part="rivet">
                <circle cx="362" cy="300" r="4.5" fill="#6d7784" />
              </g>
            </g>

            <g clipPath="url(#cong-vault-boltclip)">
              <g data-vault-part="slug">
                <rect
                  x="208"
                  y="256"
                  width="70"
                  height="32"
                  rx="6"
                  fill="url(#cong-vault-chrome)"
                />
                <rect
                  x="208"
                  y="256"
                  width="70"
                  height="7"
                  rx="3.5"
                  fill="rgba(255,255,255,.4)"
                />
              </g>
            </g>

            <g data-vault-part="turn">
              <circle cx="200" cy="273" r="21" fill="url(#cong-vault-steel)" />
              <circle cx="200" cy="273" r="21" stroke="rgba(255,255,255,.26)" />
              <g data-vault-part="knob">
                <rect
                  x="192"
                  y="254"
                  width="16"
                  height="38"
                  rx="6"
                  fill="#2c343d"
                />
                <rect
                  x="195"
                  y="257"
                  width="4"
                  height="32"
                  rx="2"
                  fill="rgba(255,255,255,.24)"
                />
              </g>
            </g>
          </g>

          <g data-vault-part="vault" className={styles.vaultHardware}>
            <circle cx="280" cy="280" r="106" fill="#20262e" />

            <g>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
                <g key={rotation} transform={`rotate(${rotation} 280 280)`}>
                  <rect
                    data-vault-part="vault-bolt"
                    x="320"
                    y="269"
                    width="58"
                    height="22"
                    rx="5"
                    fill="url(#cong-vault-chrome)"
                  />
                </g>
              ))}
            </g>

            <circle cx="280" cy="280" r="100" fill="url(#cong-vault-face)" />
            <circle
              cx="280"
              cy="280"
              r="100"
              stroke="rgba(255,255,255,.2)"
              strokeWidth="2"
            />
            <circle
              cx="280"
              cy="280"
              r="91"
              stroke="rgba(10,14,18,.5)"
              strokeWidth="5"
            />
            <circle
              cx="280"
              cy="280"
              r="80"
              stroke="rgba(255,255,255,.1)"
              strokeWidth="1.5"
            />
            <circle
              cx="280"
              cy="280"
              r="73"
              stroke="rgba(230,240,250,.2)"
              strokeWidth="6"
              strokeDasharray="2 9"
            />

            <g data-vault-part="wheel">
              <g
                stroke="url(#cong-vault-chrome)"
                strokeWidth="9"
                strokeLinecap="round"
              >
                <line x1="280" y1="280" x2="326" y2="280" />
                <line x1="280" y1="280" x2="303" y2="319.8" />
                <line x1="280" y1="280" x2="257" y2="319.8" />
                <line x1="280" y1="280" x2="234" y2="280" />
                <line x1="280" y1="280" x2="257" y2="240.2" />
                <line x1="280" y1="280" x2="303" y2="240.2" />
              </g>
              <circle
                cx="280"
                cy="280"
                r="46"
                stroke="url(#cong-vault-chrome)"
                strokeWidth="9"
              />
              <circle
                cx="280"
                cy="280"
                r="51"
                stroke="rgba(10,14,18,.35)"
                strokeWidth="1.5"
              />
              <circle cx="280" cy="280" r="17" fill="url(#cong-vault-steel)" />
              <circle
                cx="280"
                cy="280"
                r="17"
                stroke="rgba(255,255,255,.32)"
                strokeWidth="1.5"
              />
              <circle cx="280" cy="280" r="6" fill="#1a2028" />
            </g>

            <g data-vault-part="lamp" className={styles.vaultLamp}>
              <circle
                className={styles.vaultLampHalo}
                cx="280"
                cy="344"
                r="13"
              />
              <circle cx="280" cy="344" r="6" fill="url(#cong-vault-led)" />
            </g>
          </g>

          <circle
            data-vault-part="shock"
            className={styles.vaultShock}
            cx="280"
            cy="280"
            r="100"
            strokeWidth="3.5"
          />
        </svg>
      </div>
    </div>
  );
}

function Modal({
  kind,
  onClose,
  onAccept,
}: {
  kind: Exclude<ModalKind, null>;
  onClose: () => void;
  onAccept?: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const title =
    kind === "passwordHelp"
      ? "Como criar uma senha resistente"
      : kind === "conduct"
        ? "Código de Conduta"
        : "Informações de privacidade";

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>CONG</span>
            <h2 id="register-modal-title">{title}</h2>
          </div>

          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {kind === "passwordHelp" && (
            <>
              <p className={styles.modalLead}>
                Prefira uma senha longa, exclusiva e pouco previsível. Você não
                precisa montar uma sequência difícil de decorar só para cumprir
                uma lista de regras.
              </p>

              <div className={styles.passwordExample}>
                <span>Uma ideia de estrutura</span>
                <strong>cachorro-verde-na-praia-2026</strong>
                <small>
                  Não use este exemplo literalmente. Crie uma combinação
                  própria.
                </small>
              </div>

              <div className={styles.passwordTips}>
                <article>
                  <strong>Alongue</strong>
                  <p>
                    Mais comprimento costuma ajudar mais do que substituições
                    previsíveis como “a” por “@”.
                  </p>
                </article>
                <article>
                  <strong>Não reutilize</strong>
                  <p>
                    Uma senha boa perde o valor se já estiver sendo usada em
                    outro serviço.
                  </p>
                </article>
                <article>
                  <strong>Evite o óbvio</strong>
                  <p>
                    Nome, aniversário, sequências e palavras muito comuns são
                    fáceis de testar.
                  </p>
                </article>
              </div>
            </>
          )}

          {kind === "conduct" && (
            <>
              <p className={styles.modalLead}>
                A CONG é um projeto colaborativo voltado a impacto social.
                Esperamos uma participação respeitosa, segura e construtiva.
              </p>

              <div className={styles.documentSection}>
                <h3>Nosso compromisso</h3>
                <p>
                  Manter um ambiente aberto e acolhedor para estudantes,
                  desenvolvedores, designers, voluntários, ONGs e demais
                  participantes.
                </p>

                <h3>Comportamentos esperados</h3>
                <ul>
                  <li>tratar outras pessoas com respeito;</li>
                  <li>ser paciente com iniciantes;</li>
                  <li>fazer críticas de forma construtiva;</li>
                  <li>
                    aceitar opiniões diferentes e reconhecer contribuições.
                  </li>
                </ul>

                <h3>Não aceitamos</h3>
                <ul>
                  <li>ataques pessoais, humilhações ou assédio;</li>
                  <li>comentários discriminatórios;</li>
                  <li>exposição indevida de dados pessoais;</li>
                  <li>
                    uso malicioso do projeto ou desrespeito aos públicos
                    atendidos.
                  </li>
                </ul>
              </div>
            </>
          )}

          {kind === "privacy" && (
            <>
              <p className={styles.modalLead}>
                Neste cadastro inicial, a CONG utiliza somente os dados
                necessários para criar, identificar e proteger sua conta.
              </p>

              <div className={styles.documentSection}>
                <h3>Nome</h3>
                <p>
                  É usado como dado inicial da conta. No primeiro acesso, você
                  poderá definir como prefere ser chamado na plataforma.
                </p>

                <h3>E-mail</h3>
                <p>
                  É usado para autenticação, confirmação da conta e comunicações
                  essenciais relacionadas ao acesso.
                </p>

                <h3>Senha</h3>
                <p>
                  É encaminhada ao serviço de autenticação responsável pela
                  proteção da conta. A aplicação não deve armazenar sua senha em
                  texto simples.
                </p>

                <h3>Verificação de segurança da senha</h3>
                <p>
                  Para verificar se uma senha já apareceu em vazamentos
                  conhecidos, a checagem usa apenas um pequeno prefixo do hash
                  da senha. A senha completa não é enviada ao serviço de
                  consulta.
                </p>
              </div>
            </>
          )}
        </div>

        <footer className={styles.modalFooter}>
          {kind === "passwordHelp" ? (
            <button
              type="button"
              className={styles.modalSecondaryButton}
              onClick={onClose}
            >
              Entendi
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.modalSecondaryButton}
                onClick={onClose}
              >
                Fechar
              </button>
              <button
                type="button"
                className={styles.modalAcceptButton}
                onClick={onAccept}
              >
                <Check aria-hidden="true" />
                Li e aceito
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const breachRequestId = useRef(0);

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [touched, setTouched] = useState<TouchedMap>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [conductOpened, setConductOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [breachStatus, setBreachStatus] = useState<BreachStatus>({
    state: "idle",
  });
  const [breachCheckedPassword, setBreachCheckedPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const passwordAnalysis = useMemo(
    () => analysePassword(formData.password),
    [formData.password],
  );
  const hasConfirmation = formData.confirmPassword.length > 0;
  const passwordsMatch =
    hasConfirmation && formData.password === formData.confirmPassword;

  const passwordLocallyAllowed =
    formData.password.length >= MIN_PASSWORD_LENGTH &&
    passwordAnalysis.tier >= MIN_PASSWORD_TIER &&
    !isDisallowedPassword(formData.password);

  const openModal = (kind: Exclude<ModalKind, null>) => {
    if (kind === "conduct") setConductOpened(true);
    if (kind === "privacy") setPrivacyOpened(true);
    setActiveModal(kind);
  };

  const updateField = (field: FieldName, value: string | boolean) => {
    const nextData = { ...formData, [field]: value } as FormState;
    setFormData(nextData);
    setSubmissionError("");

    if (field === "password") {
      breachRequestId.current += 1;
      setBreachStatus({ state: "idle" });
      setBreachCheckedPassword("");
    }

    if (touched[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateField(field, nextData),
      }));
    } else {
      setErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    }

    if (
      field === "password" &&
      (touched.confirmPassword || formData.confirmPassword)
    ) {
      setErrors((current) => ({
        ...current,
        confirmPassword: validateField("confirmPassword", nextData),
      }));
    }
  };

  const validateField = (
    field: FieldName,
    data = formData,
  ): string | undefined => {
    if (field === "name") {
      const value = data.name.trim();
      if (value.length < 2) return "Informe seu nome completo.";
      if (value.length > 100)
        return "O nome deve ter no máximo 100 caracteres.";
      return undefined;
    }

    if (field === "email") {
      return z.string().trim().email().safeParse(data.email).success
        ? undefined
        : "Digite um e-mail válido.";
    }

    if (field === "password") {
      if (data.password.length < MIN_PASSWORD_LENGTH) {
        return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      }

      if (isDisallowedPassword(data.password)) {
        return "Esta senha é usada como exemplo pela CONG. Crie uma combinação própria.";
      }

      const analysis = analysePassword(data.password);
      if (analysis.tier < MIN_PASSWORD_TIER) {
        return "Essa senha ainda está fraca. Fortaleça-a antes de continuar.";
      }

      if (
        breachStatus.state === "compromised" &&
        breachCheckedPassword === data.password
      ) {
        return "Esta senha apareceu em vazamentos conhecidos. Escolha outra.";
      }

      return undefined;
    }

    if (field === "confirmPassword") {
      if (!data.confirmPassword) return "Confirme sua senha.";
      if (data.confirmPassword !== data.password)
        return "As senhas precisam ser iguais.";
      return undefined;
    }

    if (field === "conductAccepted") {
      return data.conductAccepted
        ? undefined
        : "Leia e aceite o Código de Conduta para continuar.";
    }

    return data.privacyAccepted
      ? undefined
      : "Leia e aceite as informações de privacidade para continuar.";
  };

  const handleBlur = (field: FieldName) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field) }));
  };

  const updateCapsLock = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"));
  };

  const runBreachCheck = async (password: string): Promise<BreachStatus> => {
    if (!passwordLocallyAllowed || password !== formData.password) {
      return { state: "idle" };
    }

    const requestId = ++breachRequestId.current;
    setBreachStatus({ state: "checking" });

    try {
      const count = await getBreachCount(password);

      if (requestId !== breachRequestId.current) return { state: "idle" };

      const result: BreachStatus =
        count > 0 ? { state: "compromised", count } : { state: "safe" };
      setBreachStatus(result);
      setBreachCheckedPassword(password);

      if (count > 0) {
        setErrors((current) => ({
          ...current,
          password:
            "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
        }));
      }

      return result;
    } catch (error) {
      console.error("Password breach check failed:", error);

      if (requestId !== breachRequestId.current) return { state: "idle" };

      const result: BreachStatus = { state: "unavailable" };
      setBreachStatus(result);
      setBreachCheckedPassword(password);
      return result;
    }
  };

  const handlePasswordBlur = async () => {
    setCapsLockOn(false);
    setTouched((current) => ({ ...current, password: true }));

    const localError = validateField("password");
    setErrors((current) => ({ ...current, password: localError }));

    if (!localError) {
      await runBreachCheck(formData.password);
    }
  };

  const handleAcceptModal = () => {
    if (activeModal === "conduct") {
      updateField("conductAccepted", true);
      setTouched((current) => ({ ...current, conductAccepted: true }));
      setErrors((current) => ({ ...current, conductAccepted: undefined }));
    }

    if (activeModal === "privacy") {
      updateField("privacyAccepted", true);
      setTouched((current) => ({ ...current, privacyAccepted: true }));
      setErrors((current) => ({ ...current, privacyAccepted: undefined }));
    }

    setActiveModal(null);
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      conductAccepted: true,
      privacyAccepted: true,
    });

    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return;
    }

    let currentBreachStatus = breachStatus;
    const breachCheckIsCurrent =
      breachCheckedPassword === result.data.password &&
      (breachStatus.state === "safe" ||
        breachStatus.state === "compromised" ||
        breachStatus.state === "unavailable");

    if (!breachCheckIsCurrent) {
      currentBreachStatus = await runBreachCheck(result.data.password);
    }

    if (currentBreachStatus.state === "compromised") {
      setErrors((current) => ({
        ...current,
        password:
          "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
      }));
      return;
    }

    setErrors({});
    setSubmissionError("");
    setIsSubmitting(true);

    try {
      await apiPost<RegisterResponse>(
        "/auth/register",
        {
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        },
        false,
      );

      const email = result.data.email;
      sessionStorage.setItem("cong:pending-verification-email", email);

      navigate("/verifique-seu-email", {
        replace: true,
        state: {
          email,
          justRegistered: true,
        },
      });
    } catch (error) {
      setSubmissionError(getRegistrationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={goBack}>
          <ArrowLeft aria-hidden="true" />
          <span>Voltar</span>
        </button>

        <div className={styles.brand} aria-label="CONG">
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles />
          </span>
          <span className={styles.brandText}>
            <strong>CONG</strong>
            <small>Tecnologia para impacto social</small>
          </span>
        </div>

        <p className={styles.loginPrompt}>
          Já tem uma conta? <TransitionLink to="/login">Entrar</TransitionLink>
        </p>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCopy}>
            <span className={styles.eyebrow}>Crie sua conta</span>
            <h1>Faça parte do bando CONG</h1>
            <p>
              Depois do cadastro, você escolhe como quer ser chamado, como
              participa e quais experiências da CONG fazem sentido para você.
            </p>
          </div>

          <div className={styles.mascotStage} aria-hidden="true">
            <span className={styles.mascotHalo} />
            <img src={mascot} alt="" />
          </div>

          <div className={styles.sidebarNote}>
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Começamos só com o necessário.</strong>
              <small>
                Nome, e-mail e uma senha segura. O restante vem no primeiro
                acesso.
              </small>
            </span>
          </div>
        </aside>

        <section className={styles.card} aria-labelledby="register-title">
          <header className={styles.cardHeader}>
            <span className={styles.cardEyebrow}>Cadastro</span>
            <h2 id="register-title">Crie sua conta</h2>
            <p>Leva só alguns minutos.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="register-name">Nome completo</label>
              <div
                className={`${styles.inputWrap} ${touched.name && errors.name ? styles.inputError : ""}`}
              >
                <UserRound aria-hidden="true" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  aria-invalid={Boolean(touched.name && errors.name)}
                  aria-describedby={
                    touched.name && errors.name
                      ? "register-name-error"
                      : undefined
                  }
                  onChange={(event) => updateField("name", event.target.value)}
                  onBlur={() => handleBlur("name")}
                />
              </div>
              {touched.name && (
                <FieldError id="register-name-error">{errors.name}</FieldError>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="register-email">E-mail</label>
              <div
                className={`${styles.inputWrap} ${touched.email && errors.email ? styles.inputError : ""}`}
              >
                <Mail aria-hidden="true" />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  spellCheck="false"
                  placeholder="nome@exemplo.com"
                  value={formData.email}
                  aria-invalid={Boolean(touched.email && errors.email)}
                  aria-describedby={
                    touched.email && errors.email
                      ? "register-email-error"
                      : undefined
                  }
                  onChange={(event) => updateField("email", event.target.value)}
                  onBlur={() => handleBlur("email")}
                />
              </div>
              {touched.email && (
                <FieldError id="register-email-error">
                  {errors.email}
                </FieldError>
              )}
            </div>

            <div className={styles.passwordBlock}>
              <div className={styles.field}>
                <label htmlFor="register-password">Senha</label>
                <div
                  className={`${styles.inputWrap} ${touched.password && errors.password ? styles.inputError : ""}`}
                >
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    spellCheck="false"
                    autoCapitalize="off"
                    placeholder="Crie sua senha"
                    value={formData.password}
                    aria-invalid={Boolean(touched.password && errors.password)}
                    aria-describedby="register-password-help register-password-status register-password-error"
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    onKeyDown={updateCapsLock}
                    onKeyUp={updateCapsLock}
                    onBlur={handlePasswordBlur}
                  />
                  <button
                    type="button"
                    className={styles.revealButton}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div
                  className={styles.passwordRuleRow}
                  id="register-password-help"
                >
                  <span>
                    Mínimo de 10 caracteres. Senhas fracas ou inseguras não são
                    permitidas.
                  </span>
                  <button
                    type="button"
                    className={styles.infoButton}
                    onClick={() => openModal("passwordHelp")}
                    aria-label="Ver recomendações para criar uma senha segura"
                  >
                    <Info aria-hidden="true" />
                    <span className={styles.infoTooltip} role="tooltip">
                      Veja como criar uma senha longa e pouco previsível.
                    </span>
                  </button>
                </div>

                {capsLockOn && (
                  <p className={styles.capsWarning}>Caps Lock está ativado.</p>
                )}

                <div
                  id="register-password-status"
                  className={`${styles.vaultFeedback} ${styles[`tier${passwordAnalysis.tier}`]}`}
                  aria-live="polite"
                >
                  <PasswordVault tier={passwordAnalysis.tier} />

                  <div className={styles.vaultNarrative}>
                    <div className={styles.meter} aria-hidden="true">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={
                            step <= passwordAnalysis.tier
                              ? styles.meterActive
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    <strong>{passwordAnalysis.label}</strong>
                    <p>{passwordAnalysis.narrative}</p>
                    <small>
                      Representação visual da força estimada; não é garantia
                      absoluta de segurança.
                    </small>
                  </div>
                </div>

                <div className={styles.breachLine} aria-live="polite">
                  {breachStatus.state === "checking" && (
                    <span className={styles.breachChecking}>
                      <LoaderCircle aria-hidden="true" /> Verificando exposição
                      conhecida…
                    </span>
                  )}
                  {breachStatus.state === "safe" && (
                    <span className={styles.breachSafe}>
                      <ShieldCheck aria-hidden="true" /> Nenhuma ocorrência
                      encontrada na base consultada.
                    </span>
                  )}
                  {breachStatus.state === "compromised" && (
                    <span className={styles.breachDanger}>
                      <ShieldAlert aria-hidden="true" /> Esta senha apareceu em
                      vazamentos conhecidos. Escolha outra.
                    </span>
                  )}
                  {breachStatus.state === "unavailable" && (
                    <span className={styles.breachMuted}>
                      <ShieldAlert aria-hidden="true" /> A consulta externa não
                      pôde ser concluída agora.
                    </span>
                  )}
                </div>

                {touched.password && (
                  <FieldError id="register-password-error">
                    {errors.password}
                  </FieldError>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="register-confirm-password">
                  Confirmar senha
                </label>
                <div
                  className={`${styles.inputWrap} ${
                    touched.confirmPassword && errors.confirmPassword
                      ? styles.inputError
                      : ""
                  }`}
                >
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    spellCheck="false"
                    autoCapitalize="off"
                    placeholder="Digite novamente"
                    value={formData.confirmPassword}
                    aria-invalid={Boolean(
                      touched.confirmPassword && errors.confirmPassword,
                    )}
                    aria-describedby="register-confirm-status register-confirm-error"
                    onChange={(event) =>
                      updateField("confirmPassword", event.target.value)
                    }
                    onBlur={() => {
                      setCapsLockOn(false);
                      handleBlur("confirmPassword");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.revealButton}
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmação de senha"
                        : "Mostrar confirmação de senha"
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div
                  id="register-confirm-status"
                  className={styles.matchStatus}
                  aria-live="polite"
                >
                  {hasConfirmation && (
                    <span
                      className={
                        passwordsMatch ? styles.matchOk : styles.matchBad
                      }
                    >
                      {passwordsMatch ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <X aria-hidden="true" />
                      )}
                      {passwordsMatch
                        ? "As senhas coincidem."
                        : "As senhas ainda não coincidem."}
                    </span>
                  )}
                </div>

                {touched.confirmPassword && (
                  <FieldError id="register-confirm-error">
                    {errors.confirmPassword}
                  </FieldError>
                )}
              </div>
            </div>

            <div className={styles.acceptanceGroup}>
              <div className={styles.acceptanceItem}>
                <label
                  className={`${styles.acceptanceLabel} ${!conductOpened ? styles.acceptanceLocked : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.conductAccepted}
                    disabled={!conductOpened}
                    onChange={(event) =>
                      updateField("conductAccepted", event.target.checked)
                    }
                    onBlur={() => handleBlur("conductAccepted")}
                  />
                  <span className={styles.checkboxVisual} aria-hidden="true">
                    <Check />
                  </span>
                  <span>Li e aceito o Código de Conduta.</span>
                </label>
                <button
                  type="button"
                  className={styles.documentButton}
                  onClick={() => openModal("conduct")}
                >
                  {conductOpened
                    ? "Reabrir Código de Conduta"
                    : "Ler Código de Conduta"}
                </button>
                {touched.conductAccepted && (
                  <FieldError id="register-conduct-error">
                    {errors.conductAccepted}
                  </FieldError>
                )}
              </div>

              <div className={styles.acceptanceItem}>
                <label
                  className={`${styles.acceptanceLabel} ${!privacyOpened ? styles.acceptanceLocked : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.privacyAccepted}
                    disabled={!privacyOpened}
                    onChange={(event) =>
                      updateField("privacyAccepted", event.target.checked)
                    }
                    onBlur={() => handleBlur("privacyAccepted")}
                  />
                  <span className={styles.checkboxVisual} aria-hidden="true">
                    <Check />
                  </span>
                  <span>Li e aceito as informações de privacidade.</span>
                </label>
                <button
                  type="button"
                  className={styles.documentButton}
                  onClick={() => openModal("privacy")}
                >
                  {privacyOpened
                    ? "Reabrir informações de privacidade"
                    : "Ler informações de privacidade"}
                </button>
                {touched.privacyAccepted && (
                  <FieldError id="register-privacy-error">
                    {errors.privacyAccepted}
                  </FieldError>
                )}
              </div>
            </div>

            {submissionError && (
              <p className={styles.submitError} role="alert">
                {submissionError}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || breachStatus.state === "checking"}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className={styles.spinner} aria-hidden="true" />{" "}
                  Criando sua conta…
                </>
              ) : (
                <>Criar minha conta</>
              )}
            </button>
          </form>
        </section>
      </div>

      {activeModal && (
        <Modal
          kind={activeModal}
          onClose={() => setActiveModal(null)}
          onAccept={
            activeModal === "conduct" || activeModal === "privacy"
              ? handleAcceptModal
              : undefined
          }
        />
      )}
    </main>
  );
}
