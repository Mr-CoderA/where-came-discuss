import type { ReactNode } from "react";

export interface HairlineRuleProps {
  readonly label?: string;
  readonly className?: string;
}

/**
 * Section divider: a 1px rule, never a card.
 */
export function HairlineRule({ label, className }: HairlineRuleProps): ReactNode {
  const cls = className ? `aa-rule ${className}` : "aa-rule";
  if (!label) {
    return <hr className={cls} />;
  }
  return (
    <div className={cls} role="separator" aria-label={label} />
  );
}
