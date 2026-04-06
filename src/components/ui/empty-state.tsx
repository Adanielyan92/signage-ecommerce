import { type ReactNode } from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted">
        <Icon className="h-7 w-7 text-brand-text-secondary" />
      </div>
      <h2 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-brand-text-secondary">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
