import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import gsap from "gsap";

import styles from "./PasswordFields.module.css";
import {
  type BreachStatus,
  analysePassword,
} from "./passwordUtils";

type PasswordVaultProps = {
  tier: number;
};

function PasswordVault({ tier }: PasswordVaultProps) {
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
    gsap.set(ears, {
      scale: 0,
      y: -12,
      opacity: 0,
    });
    gsap.set(clip, {
      x: -140,
      y: -40,
      rotation: -110,
      scale: 0.7,
      opacity: 0,
    });
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
    gsap.set(shackle, {
      y: -34,
      rotation: -15,
    });
    gsap.set(padBody, {
      x: 6,
      scaleX: 1,
      scaleY: 1,
    });
    gsap.set(bolt, { opacity: 1 });
    gsap.set(house, {
      x: -220,
      opacity: 0,
    });
    gsap.set(strike, {
      x: 220,
      opacity: 0,
    });
    gsap.set(turn, {
      x: -220,
      opacity: 0,
    });
    gsap.set(knob, { rotation: 0 });
    gsap.set(slug, { x: 0 });
    gsap.set(rivets, {
      scale: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(vault, {
      scale: 0.06,
      rotation: -55,
      opacity: 0,
    });
    gsap.set(vaultBolts, { x: 0 });
    gsap.set(wheel, { rotation: 0 });
    gsap.set(lamp, { opacity: 0 });
    gsap.set(shock, {
      scale: 1,
      opacity: 0,
    });

    const timeline = gsap.timeline({
      paused: true,
      defaults: {
        ease: "power2.out",
      },
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
        {
          strokeDashoffset: 0,
          duration: 0.5,
          ease: "power2.inOut",
        },
        0.36,
      )
      .to(
        door,
        {
          keyframes: {
            x: [0, -1.5, 1.5, -1, 1, 0],
          },
          duration: 0.34,
          ease: "none",
        },
        0.92,
      )
      .addLabel("t1", 1.08)
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
      .to(
        bolt,
        {
          opacity: 0,
          duration: 0.22,
        },
        4.06,
      )
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
      .to(
        wheel,
        {
          rotation: 900,
          duration: 0.78,
          ease: "power2.inOut",
        },
        4.34,
      )
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
          keyframes: {
            scale: [1, 1.5],
            opacity: [0, 0.75, 0],
          },
          duration: 0.7,
          ease: "power2.out",
        },
        5.24,
      )
      .to(
        lamp,
        {
          opacity: 1,
          duration: 0.3,
        },
        5.34,
      )
      .addLabel("t4", 5.7);

    timelineRef.current = timeline;

    const setIdle = (nextTier: number) => {
      idleRef.current?.kill();
      idleRef.current = null;

      gsap.set([clipWob, padSway], {
        rotation: 0,
      });

      if (reduceMotion) return;

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

              {[
                [184, 246],
                [184, 300],
                [262, 246],
                [262, 300],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`} data-vault-part="rivet">
                  <circle cx={cx} cy={cy} r="4.5" fill="#6d7784" />
                </g>
              ))}
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

              {[
                [362, 246],
                [362, 300],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`} data-vault-part="rivet">
                  <circle cx={cx} cy={cy} r="4.5" fill="#6d7784" />
                </g>
              ))}
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

type PasswordFieldsProps = {
  password: string;
  confirmPassword: string;

  passwordError?: string;
  confirmPasswordError?: string;

  passwordTouched?: boolean;
  confirmPasswordTouched?: boolean;

  breachStatus: BreachStatus;

  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;

  onPasswordBlur?: () => void;
  onConfirmPasswordBlur?: () => void;

  onPasswordHelp?: () => void;

  passwordId?: string;
  confirmPasswordId?: string;

  passwordErrorId?: string;
  confirmPasswordErrorId?: string;

  disabled?: boolean;
};

export default function PasswordFields({
  password,
  confirmPassword,
  passwordError,
  confirmPasswordError,
  passwordTouched = false,
  confirmPasswordTouched = false,
  breachStatus,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordBlur,
  onConfirmPasswordBlur,
  onPasswordHelp,
  passwordId = "password",
  confirmPasswordId = "confirm-password",
  passwordErrorId = "password-error",
  confirmPasswordErrorId = "confirm-password-error",
  disabled = false,
}: PasswordFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const passwordAnalysis = useMemo(() => analysePassword(password), [password]);

  const hasConfirmation = confirmPassword.length > 0;

  const passwordsMatch = hasConfirmation && password === confirmPassword;

  const updateCapsLock = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"));
  };

  return (
    <div className={styles.passwordBlock}>
      <div className={styles.field}>
        <label htmlFor={passwordId}>Senha</label>

        <div
          className={`${styles.inputWrap} ${
            passwordTouched && passwordError ? styles.inputError : ""
          }`}
        >
          <LockKeyhole aria-hidden="true" />

          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            spellCheck="false"
            autoCapitalize="off"
            placeholder="Crie sua senha"
            value={password}
            disabled={disabled}
            aria-invalid={Boolean(passwordTouched && passwordError)}
            aria-describedby={`${passwordId}-help ${passwordId}-status ${passwordErrorId}`}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={updateCapsLock}
            onKeyUp={updateCapsLock}
            onBlur={() => {
              setCapsLockOn(false);
              onPasswordBlur?.();
            }}
          />

          <button
            type="button"
            className={styles.revealButton}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={styles.passwordRuleRow} id={`${passwordId}-help`}>
          <span>
            Mínimo de 10 caracteres. Senhas fracas ou inseguras não são
            permitidas.
          </span>

          {onPasswordHelp && (
            <button
              type="button"
              className={styles.infoButton}
              onClick={onPasswordHelp}
              aria-label="Ver recomendações para criar uma senha segura"
            >
              <Info aria-hidden="true" />

              <span className={styles.infoTooltip} role="tooltip">
                Veja como criar uma senha longa e pouco previsível.
              </span>
            </button>
          )}
        </div>

        {capsLockOn && (
          <p className={styles.capsWarning}>Caps Lock está ativado.</p>
        )}



        {passwordTouched && (
          <p id={passwordErrorId} className={styles.fieldError} role="alert">
            {passwordError}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={confirmPasswordId}>Confirmar senha</label>

        <div
          className={`${styles.inputWrap} ${
            confirmPasswordTouched && confirmPasswordError
              ? styles.inputError
              : ""
          }`}
        >
          <LockKeyhole aria-hidden="true" />

          <input
            id={confirmPasswordId}
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            spellCheck="false"
            autoCapitalize="off"
            placeholder="Digite novamente"
            value={confirmPassword}
            disabled={disabled}
            aria-invalid={Boolean(
              confirmPasswordTouched && confirmPasswordError,
            )}
            aria-describedby={`${confirmPasswordId}-status ${confirmPasswordErrorId}`}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            onBlur={() => {
              setCapsLockOn(false);
              onConfirmPasswordBlur?.();
            }}
          />

          <button
            type="button"
            className={styles.revealButton}
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={
              showConfirmPassword
                ? "Ocultar confirmação de senha"
                : "Mostrar confirmação de senha"
            }
            aria-pressed={showConfirmPassword}
            disabled={disabled}
          >
            {showConfirmPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </button>
        </div>

        <div
          id={`${confirmPasswordId}-status`}
          className={styles.matchStatus}
          aria-live="polite"
        >
          {hasConfirmation && (
            <span className={passwordsMatch ? styles.matchOk : styles.matchBad}>
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

        {confirmPasswordTouched && (
          <p
            id={confirmPasswordErrorId}
            className={styles.fieldError}
            role="alert"
          >
            {confirmPasswordError}
          </p>
        )}


        <div
          id={`${passwordId}-status`}
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
              Representação visual da força estimada; não é garantia absoluta de
              segurança.
            </small>
          </div>
        </div>

        <div className={styles.breachLine} aria-live="polite">
          {breachStatus.state === "checking" && (
            <span className={styles.breachChecking}>
              <LoaderCircle aria-hidden="true" />
              Verificando exposição conhecida…
            </span>
          )}

          {breachStatus.state === "safe" && (
            <span className={styles.breachSafe}>
              <ShieldCheck aria-hidden="true" />
              Nenhuma ocorrência encontrada na base consultada.
            </span>
          )}

          {breachStatus.state === "compromised" && (
            <span className={styles.breachDanger}>
              <ShieldAlert aria-hidden="true" />
              Esta senha apareceu em vazamentos conhecidos. Escolha outra.
            </span>
          )}

          {breachStatus.state === "unavailable" && (
            <span className={styles.breachMuted}>
              <ShieldAlert aria-hidden="true" />A consulta externa não pôde ser
              concluída agora.
            </span>
          )}
        </div>      </div>
    </div>
  );
}
