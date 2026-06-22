import type { ComponentType } from 'react'

export type AppId = string

export interface AppDefinition {
  id: AppId
  title: string
  icon: string // emoji / glyph (no image assets needed yet)
  component: ComponentType
  defaultSize?: { width: number; height: number }
}

export interface WindowInstance {
  id: string // unique per open window
  appId: AppId
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
  maximized: boolean
}
