type Props = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
};

/** Official Robinhood feather mark — logo tile on dark UI, not neon text. */
export function RobinhoodLogo({ size = 40, className = "", showWordmark = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <img
          src="/robinhood-logo.png"
          alt="Robinhood"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-white">
          Robinhood
        </span>
      )}
    </div>
  );
}
