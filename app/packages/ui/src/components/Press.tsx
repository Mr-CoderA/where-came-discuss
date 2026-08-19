import type { ButtonHTMLAttributes, ReactNode } from "react";

export type PressKind = "plain" | "accent";

export interface PressProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  readonly kind?: PressKind;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Text-first control. Lift on hover is hardware-accelerated; active state resets transform instantly.
 */
export function Press({
  kind = "plain",
  className,
  type = "button",
  children,
  ...rest
}: PressProps): ReactNode {
  const classes = ["aa-press", "aa-lift", `aa-press--${kind}`];
  if (className) {
    classes.push(className);
  }
  return (
    <button type={type} className={classes.join(" ")} {...rest}>
      {children}
    </button>
  );
}
