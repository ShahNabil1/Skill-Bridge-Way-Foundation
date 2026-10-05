import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BrandNameProps = HTMLAttributes<HTMLSpanElement> & {
  showFoundation?: boolean;
  stacked?: boolean;
};

export function BrandName({ showFoundation = true, stacked = false, className, ...props }: BrandNameProps) {
  return (
    <span
      aria-label={showFoundation ? "Skill Bridgeway Foundation" : "Skill Bridgeway"}
      className={cn("brand-wordmark inline-flex flex-wrap items-baseline", stacked && "flex-col items-start", className)}
      {...props}
    >
      <span aria-hidden="true" className="brand-skill">Skill&nbsp;</span>
      <span aria-hidden="true" className="brand-bridge">Bridge</span>
      <span aria-hidden="true" className="brand-way">way</span>
      {showFoundation && <span aria-hidden="true" className={cn("brand-foundation", stacked ? "mt-1" : "ml-[0.32em]")}>Foundation</span>}
    </span>
  );
}