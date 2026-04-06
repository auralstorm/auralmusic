import React from 'react'
import * as LucideIcons from 'lucide-react'

interface IconProps extends React.HTMLAttributes<SVGElement> {
  name: string
  size?: number
}

const Icon = ({ name, size = 24, ...props }: IconProps) => {
  const IconComponent = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<any>

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`)
    return null
  }

  return <IconComponent size={size} {...props} />
}

export default Icon
