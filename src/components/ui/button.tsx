import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-100 ease-out transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39ff14]/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#39ff14] text-black font-bold hover:bg-[#45ff28] active:scale-[0.97]",
        destructive:
          "bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.97]",
        outline:
          "border border-zinc-700 bg-transparent text-white hover:bg-zinc-800/50 active:scale-[0.97]",
        secondary:
          "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-[0.97]",
        ghost:
          "text-zinc-400 hover:text-white hover:bg-zinc-800/50 active:scale-[0.97]",
        neon:
          "bg-[#39ff14] text-black font-black uppercase tracking-wider hover:bg-[#45ff28] active:scale-[0.97] shadow-[0_0_30px_rgba(57,255,20,0.3)]",
        "neon-pink":
          "bg-[#ff2d7b] text-white font-black uppercase tracking-wider hover:bg-[#ff4590] active:scale-[0.97] shadow-[0_0_30px_rgba(255,45,123,0.3)]",
        "neon-outline":
          "border-2 border-[#39ff14] text-[#39ff14] hover:bg-[#39ff14]/10 active:scale-[0.97]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg min-h-[56px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
