type Props = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
};

/** Robinhood-style green feather mark for multichain branding sections. */
export function RobinhoodLogo({ size = 40, className = "", showWordmark = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/robinhood-feather.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 drop-shadow-[0_0_12px_rgba(0,200,5,0.45)]"
        aria-hidden
      />
      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-[#00C805]">
          Robinhood
        </span>
      )}
    </div>
  );
}
