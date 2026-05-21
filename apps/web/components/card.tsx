import { clsx } from "clsx";

export function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={clsx("glass rounded-lg p-5 shadow-glow", className)}>{children}</section>;
}

