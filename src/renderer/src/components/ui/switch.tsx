import * as SwitchPrimitive from '@radix-ui/react-switch'

export function Switch({
  checked,
  disabled,
  onCheckedChange,
  label
}: {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (v: boolean) => void
  label: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full bg-fill-strong transition-colors duration-200 before:absolute before:-inset-2 before:content-[''] disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block size-[22px] rounded-full bg-white [box-shadow:0_2px_6px_rgba(0,0,0,0.25)] [transform:translateX(2px)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=checked]:[transform:translateX(20px)]" />
    </SwitchPrimitive.Root>
  )
}
