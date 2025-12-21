"use client";

import { SVGProps, forwardRef } from "react";

// Custom SVG component that suppresses hydration warnings
// This prevents issues with browser extensions like Dark Reader
// that modify SVG elements and cause hydration mismatches
const Icon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ children, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        suppressHydrationWarning
        {...props}
      >
        {children}
      </svg>
    );
  }
);

Icon.displayName = "Icon";

export default Icon;