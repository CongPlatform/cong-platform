import { createContext, useContext } from "react";
import type { NavigateOptions, To } from "react-router-dom";

export type TransitionDestination = To | number;

export type PageTransitionContextValue = {
  navigateWithTransition: (
    destination: TransitionDestination,
    options?: NavigateOptions,
  ) => Promise<void>;
};

export const PageTransitionContext =
  createContext<PageTransitionContextValue | null>(null);

export function usePageTransition() {
  const context = useContext(PageTransitionContext);

  if (!context) {
    throw new Error(
      "usePageTransition precisa estar dentro de PageTransitionProvider.",
    );
  }

  return context;
}
