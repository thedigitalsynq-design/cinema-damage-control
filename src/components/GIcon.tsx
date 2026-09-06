import { clsx } from 'clsx';

/**
 * Google Material Symbols icon. Ligature name, e.g. <GIcon name="search" />.
 * `display: block` font-display hides the ligature text until the webfont
 * arrives, so offline renders blank instead of raw words.
 */
export function GIcon({
  name,
  size = 20,
  className,
  filled = false,
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  title?: string;
}) {
  return (
    <span
      aria-hidden={!title}
      title={title}
      role={title ? 'img' : undefined}
      className={clsx('material-symbols-outlined', filled && 'gicon-filled', className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
