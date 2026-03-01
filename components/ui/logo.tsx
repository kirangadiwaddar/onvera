import React from "react"

interface LogoProps {
  width?: number | string
  height?: number | string
  className?: string
}

export default function Logo({
  width = 40,
  height = 48,
  className,
}: LogoProps) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 504 319" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M88 254C88 237.431 101.431 224 118 224H369C385.569 224 399 237.431 399 254V319H88V254Z" fill="#8B5CF6" />
      <path d="M137 142C137 125.431 150.431 112 167 112H418C434.569 112 448 125.431 448 142V207H137V142Z" fill="#A78BFA" />
      <path d="M193 30C193 13.4315 206.431 0 223 0H474C490.569 0 504 13.4315 504 30V95H193V30Z" fill="#C4B5FD" />
      <circle cx="23.5" cy="295.5" r="23.5" fill="#7C3AED" />
    </svg>

  )
}
