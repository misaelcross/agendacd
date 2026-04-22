interface StaffAvatarProps {
  name: string
  initials?: string | null
  avatarColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm:  'h-7 w-7 text-xs',
  md:  'h-9 w-9 text-sm',
  lg:  'h-12 w-12 text-base',
}

export function StaffAvatar({
  name,
  initials,
  avatarColor = '#16a34a',
  size = 'md',
  className = '',
}: StaffAvatarProps) {
  const letters = initials?.toUpperCase() ?? name.slice(0, 2).toUpperCase()

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${SIZE[size]} ${className}`}
      style={{ backgroundColor: avatarColor }}
      title={name}
      aria-label={name}
    >
      {letters}
    </span>
  )
}
