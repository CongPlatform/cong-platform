import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  useLocation,
  useNavigate,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

import styles from "./PageTransitionProvider.module.css";
import {
  PageTransitionContext,
  type PageTransitionContextValue,
  type TransitionDestination,
} from "./PageTransitionContext";

gsap.registerPlugin(DrawSVGPlugin);

type PageTransitionProviderProps = {
  children: ReactNode;
};

const LINE_STROKE_WIDTH = 2;
const COVER_STROKE_WIDTH = 150;
const LEAVE_DURATION = 1;
const ENTER_DURATION = 1;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function getRouteKey(pathname: string, search: string, hash: string) {
  return `${pathname}${search}${hash}`;
}

function getDestinationPathname(
  destination: TransitionDestination,
  currentPathname: string,
) {
  if (typeof destination === "number") return null;

  if (typeof destination === "string") {
    try {
      return new URL(destination, window.location.origin).pathname;
    } catch {
      return destination.split(/[?#]/)[0] || currentPathname;
    }
  }

  return destination.pathname ?? currentPathname;
}

function isInternalRoute(pathname: string) {
  return pathname === "/em-construcao" || pathname.startsWith("/app");
}

function shouldUsePageTransition(
  currentPathname: string,
  destination: TransitionDestination,
) {
  if (typeof destination === "number") return false;

  const destinationPathname = getDestinationPathname(
    destination,
    currentPathname,
  );

  if (!destinationPathname) return false;

  /*
   * A animação pertence somente ao site institucional.
   * Navegações do sistema logado, autenticação concluída e histórico
   * precisam ser imediatas para não mostrar a nova página duas vezes.
   */
  return (
    !isInternalRoute(currentPathname) && !isInternalRoute(destinationPathname)
  );
}

function isCurrentDestination(
  destination: TransitionDestination,
  currentRouteKey: string,
) {
  if (typeof destination === "number") return destination === 0;

  if (typeof destination === "string") {
    try {
      const url = new URL(destination, window.location.origin);
      return `${url.pathname}${url.search}${url.hash}` === currentRouteKey;
    } catch {
      return destination === currentRouteKey;
    }
  }

  const pathname = destination.pathname ?? "";
  const search = destination.search ?? "";
  const hash = destination.hash ?? "";

  return `${pathname}${search}${hash}` === currentRouteKey;
}

export function PageTransitionProvider({
  children,
}: PageTransitionProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isAnimatingRef = useRef(false);

  const routeKey = getRouteKey(
    location.pathname,
    location.search,
    location.hash,
  );

  const hideOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const path = pathRef.current;

    if (!overlay || !path) return;

    gsap.set(overlay, {
      autoAlpha: 0,
      pointerEvents: "none",
    });

    gsap.set(path, {
      drawSVG: "0% 0%",
      strokeWidth: LINE_STROKE_WIDTH,
    });
  }, []);

  const coverViewport = useCallback(() => {
    const overlay = overlayRef.current;
    const path = pathRef.current;

    if (!overlay || !path) return;

    gsap.set(overlay, {
      autoAlpha: 1,
      pointerEvents: "auto",
    });

    gsap.set(path, {
      drawSVG: "0% 100%",
      strokeWidth: COVER_STROKE_WIDTH,
    });
  }, []);

  const playLeave = useCallback(() => {
    return new Promise<void>((resolve) => {
      const overlay = overlayRef.current;
      const path = pathRef.current;

      if (!overlay || !path || prefersReducedMotion()) {
        resolve();
        return;
      }

      timelineRef.current?.kill();

      gsap.set(overlay, {
        autoAlpha: 1,
        pointerEvents: "auto",
      });

      gsap.set(path, {
        drawSVG: "0% 0%",
        strokeWidth: LINE_STROKE_WIDTH,
      });

      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        resolve();
      };

      timelineRef.current = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
          overwrite: true,
        },
        onComplete: finish,
        onInterrupt: finish,
      });

      timelineRef.current.to(path, {
        drawSVG: "0% 100%",
        strokeWidth: COVER_STROKE_WIDTH,
        duration: LEAVE_DURATION,
      });
    });
  }, []);

  const playEnter = useCallback(() => {
    return new Promise<void>((resolve) => {
      const overlay = overlayRef.current;
      const path = pathRef.current;

      if (!overlay || !path || prefersReducedMotion()) {
        hideOverlay();
        resolve();
        return;
      }

      timelineRef.current?.kill();
      coverViewport();

      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        hideOverlay();
        resolve();
      };

      timelineRef.current = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
          overwrite: true,
        },
        onComplete: finish,
        onInterrupt: finish,
      });

      timelineRef.current.to(path, {
        drawSVG: "100% 100%",
        strokeWidth: LINE_STROKE_WIDTH,
        duration: ENTER_DURATION,
      });
    });
  }, [coverViewport, hideOverlay]);

  const navigateImmediately = useCallback(
    (destination: TransitionDestination, options?: NavigateOptions) => {
      timelineRef.current?.kill();
      hideOverlay();
      isAnimatingRef.current = false;

      if (typeof destination === "number") {
        navigate(destination);
        return;
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      navigate(destination as To, options);
    },
    [hideOverlay, navigate],
  );

  const navigateWithTransition = useCallback(
    async (destination: TransitionDestination, options?: NavigateOptions) => {
      if (isCurrentDestination(destination, routeKey) && !options?.replace) {
        return;
      }

      if (
        !shouldUsePageTransition(location.pathname, destination) ||
        prefersReducedMotion()
      ) {
        navigateImmediately(destination, options);
        return;
      }

      if (isAnimatingRef.current) return;

      isAnimatingRef.current = true;

      try {
        await playLeave();

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        navigate(destination as To, options);

        /* A rota nova é montada enquanto o desenho cobre toda a tela. */
        await waitForNextPaint();
        await playEnter();
      } finally {
        isAnimatingRef.current = false;
      }
    },
    [
      location.pathname,
      navigate,
      navigateImmediately,
      playEnter,
      playLeave,
      routeKey,
    ],
  );

  /*
   * Não existe mais uma animação automática ao detectar mudança de rota.
   * Isso é intencional: POP, <Navigate> e useNavigate não podem iniciar a
   * cobertura depois que a página nova já apareceu.
   */
  useLayoutEffect(() => {
    hideOverlay();

    return () => {
      timelineRef.current?.kill();
    };
  }, [hideOverlay]);

  const contextValue = useMemo<PageTransitionContextValue>(
    () => ({ navigateWithTransition }),
    [navigateWithTransition],
  );

  return (
    <PageTransitionContext.Provider value={contextValue}>
      {children}

      <div
        ref={overlayRef}
        className={styles.transitionOverlay}
        aria-hidden={true}
      >
        <svg
          className={styles.transitionSvg}
          width="664"
          height="327"
          viewBox="0 0 664 327"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden={true}
        >
          <path
            ref={pathRef}
            className={styles.transitionPath}
            d="M2.42389 145.04C2.42389 145.04 38.9404 -0.252398 114.424 2.53979C215.088 6.26343 28.9048 222.809 114.424 276.04C212.424 337.04 238.434 -17.7373 336.924 51.0398C414.599 105.282 226.156 232.744 310.424 276.04C408.259 326.306 391.01 31.8622 498.424 55.5398C606.507 79.365 399.94 298.27 507.924 322.54C619.635 347.647 660.924 70.0398 660.924 70.0398"
          />
        </svg>
      </div>
    </PageTransitionContext.Provider>
  );
}
