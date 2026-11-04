/** The Telegram mark: blue circle with the white paper plane. */
export function TelegramLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="120" cy="120" r="120" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M54 117.600 175.500 70.700c5.600-2 10.500 1.400 8.700 9.900l-20.700 97.600c-1.500 6.900-5.600 8.600-11.400 5.400l-31.500-23.200-15.200 14.600c-1.700 1.700-3.100 3.100-6.300 3.100l2.300-32.100 58.400-52.700c2.500-2.300-.6-3.500-3.900-1.300L82.700 133.100 51.600 123.400c-6.800-2.100-6.900-6.800 1.400-10.100Z"
      />
    </svg>
  );
}
