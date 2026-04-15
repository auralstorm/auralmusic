import * as React from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'

export type ColorPickerProps = React.ComponentProps<typeof HexColorPicker>

const ColorPicker = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'h-fit min-h-[200px] w-fit rounded-md border shadow-sm',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ColorPicker.displayName = 'ColorPicker'

const ColorPickerHex = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentProps<typeof HexColorPicker>, 'onChange'> &
    ColorPickerProps
>(({ className, style, ...props }, _ref) => (
  <HexColorPicker
    className={cn(
      'aural-color-picker w-full rounded-none border-0 bg-transparent [&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-6 [&_.react-colorful__hue]:rounded-full [&_.react-colorful__hue-pointer]:size-7 [&_.react-colorful__hue-pointer]:border-2 [&_.react-colorful__hue-pointer]:border-white [&_.react-colorful__hue-pointer]:bg-transparent [&_.react-colorful__hue-pointer]:shadow-none [&_.react-colorful__interactive]:rounded-[18px] [&_.react-colorful__pointer]:size-8 [&_.react-colorful__pointer]:border-[3px] [&_.react-colorful__pointer]:border-white [&_.react-colorful__pointer]:bg-transparent [&_.react-colorful__pointer]:shadow-none [&_.react-colorful__saturation]:rounded-[18px]',
      className
    )}
    style={{ width: '100%', height: 220, background: 'transparent', ...style }}
    {...props}
  />
))
ColorPickerHex.displayName = 'ColorPickerHex'

const ColorPickerInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring mt-0.5 flex h-fit w-[200px] bg-transparent px-1 py-1 text-base uppercase transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      className
    )}
    ref={ref}
    {...props}
  />
))
ColorPickerInput.displayName = 'ColorPickerInput'

export { ColorPicker, ColorPickerHex, ColorPickerInput }
