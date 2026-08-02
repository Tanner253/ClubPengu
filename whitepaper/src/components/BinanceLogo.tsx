type Props = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
};

/** Binance mark — BSC / BNB Smart Chain tile on dark UI. */
export function BinanceLogo({ size = 40, className = "", showWordmark = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black"
        style={{ width: size, height: size }}
      >
        <img
          src="/binance-logo.png"
          alt="Binance"
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-white">
          Binance
        </span>
      )}
    </div>
  );
}
