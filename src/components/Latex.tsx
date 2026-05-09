import { useMemo } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

interface LatexProps {
  children: string
  display?: boolean
  className?: string
}

export function Latex({
  children,
  display = false,
  className = "",
}: LatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      })
    } catch {
      return children
    }
  }, [children, display])

  const Component = display ? "div" : "span"

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
