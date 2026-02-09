import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'btn-glow btn-cyber bg-primary text-primary-foreground shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.7)] hover:bg-primary/90 active:scale-[0.98] transition-all duration-300',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'btn-cyber border border-white/10 bg-zinc-900 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-zinc-800/80 hover:shadow-[0_0_20px_-10px_rgba(239,68,68,0.3)] active:scale-[0.98] transition-all duration-300',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg transition-all duration-300',
        ghost: 'text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-all duration-300',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (<Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />)
}

export { Button, buttonVariants }
