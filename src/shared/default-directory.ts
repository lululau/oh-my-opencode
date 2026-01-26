import { resolve } from "path"

let defaultDirectory: string | null = null

export function setDefaultDirectory(dir: string | null | undefined): void {
  if (dir && dir.trim()) {
    defaultDirectory = dir
  }
}

export function getDefaultDirectory(): string {
  return defaultDirectory ?? process.cwd()
}

export function resolveDefaultDirectoryPath(input?: string | null): string {
  if (!input) return getDefaultDirectory()
  return resolve(getDefaultDirectory(), input)
}
