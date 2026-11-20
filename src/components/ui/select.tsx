import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

/**
 * A listbox select, never the browser's own dropdown (same rule as Dolancer), so it
 * looks identical everywhere and can carry a hint line per option.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select",
  id,
  className,
  size = "md",
  disabled,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  id?: string;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-line-card bg-surface px-3 text-left text-sm shadow-soft-sm transition-[border-color,box-shadow] hover:border-line focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
            size === "sm" ? "h-8" : "h-9",
            className,
          )}
        >
          <span className={cn("truncate", !current && "text-ink-3")}>{current ? current.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 max-h-80 min-w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-lg border border-line-card bg-surface p-1 shadow-soft-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const el = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLButtonElement>("[aria-selected='true'], button:not([disabled])");
            el?.focus();
          }}
        >
          <div role="listbox" aria-label={ariaLabel}>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={o.disabled}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const items = Array.from(e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
                      const i = items.indexOf(e.currentTarget);
                      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-hover focus-visible:bg-hover disabled:cursor-not-allowed disabled:opacity-50",
                    selected && "bg-primary-light/60",
                  )}
                >
                  <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-primary", !selected && "invisible")} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{o.label}</span>
                    {o.hint ? <span className="block text-xs text-ink-3">{o.hint}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
