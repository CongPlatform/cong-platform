import { forwardRef, type MouseEvent } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { usePageTransition } from "./PageTransitionContext";

type TransitionLinkProps = LinkProps & {
  disabledTransition?: boolean;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0
  );
}

export const TransitionLink = forwardRef<
  HTMLAnchorElement,
  TransitionLinkProps
>(function TransitionLink(
  {
    to,
    replace,
    state,
    target,
    reloadDocument,
    preventScrollReset,
    relative,
    disabledTransition = false,
    onClick,
    ...props
  },
  ref
) {
  const { navigateWithTransition } = usePageTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) return;
    if (disabledTransition) return;
    if (reloadDocument) return;
    if (target && target !== "_self") return;
    if (isModifiedEvent(event)) return;

    event.preventDefault();

    void navigateWithTransition(to, {
      replace,
      state,
      preventScrollReset,
      relative,
    });
  }

  return (
    <Link
      ref={ref}
      to={to}
      replace={replace}
      state={state}
      target={target}
      reloadDocument={reloadDocument}
      preventScrollReset={preventScrollReset}
      relative={relative}
      onClick={handleClick}
      {...props}
    />
  );
});