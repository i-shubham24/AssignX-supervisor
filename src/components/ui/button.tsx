import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-[var(--ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The client app's signature button: coral gradient pill with a soft glow.
        primary:
          "border border-white/20 bg-gradient-to-b from-primary-from to-primary-to text-white shadow-[0_4px_14px_rgba(238,107,80,0.32),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(238,107,80,0.38),inset_0_1px_1px_rgba(255,255,255,0.3)]",
        dark: "bg-ink text-inverse hover:bg-ink-2 hover:-translate-y-px",
        outline: "border border-line-card bg-surface text-ink shadow-soft-sm hover:border-line hover:bg-hover",
        ghost: "text-ink-2 hover:bg-hover hover:text-ink",
        soft: "bg-primary-light text-primary-ink hover:brightness-95",
        danger: "bg-danger-ink text-white hover:brightness-110",
        "danger-soft": "bg-danger-bg text-danger-ink hover:brightness-95",
        success: "bg-success-ink text-white hover:brightness-110",
        client: "bg-client text-white shadow-[0_4px_12px_rgba(232,93,64,0.28)] hover:bg-client-ink",
        doer: "bg-doer text-white shadow-[0_4px_12px_rgba(10,101,192,0.25)] hover:bg-doer-ink",
      },
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});

export { buttonVariants };
