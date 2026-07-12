import { cn } from "@/lib/cn";

type Tone = "default" | "solid" | "outline";

const tones: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  solid: "bg-accent text-accent-foreground",
  outline: "border border-border text-foreground",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
