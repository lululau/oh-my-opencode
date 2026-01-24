import { resolve } from "path"
import { log } from "./logger"
import { getSessionDirectory } from "./session-directory-mapper"

let defaultDirectory: string | null = null


export function resolveSessionDirectoryPath(sessionID: string, input?: string | null): string {
  const sessionDir = getSessionDirectory(sessionID)
  const baseDir = sessionDir ?? defaultDirectory ?? process.cwd()

  if (!input) {
    log("Getting session directory", { sessionID, result: baseDir })
    return baseDir
  }

  const resolved = resolve(baseDir, input)
  log("Resolving session directory path", { sessionID, input, resolved })
  return resolved
}
