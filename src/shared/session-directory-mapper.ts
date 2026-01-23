import { log } from "./logger"

/**
 * Session ID to directory mapping.
 * This is used to track the working directory of each session
 * so that search tools (grep, glob, ast-grep) can resolve paths
 * correctly in multi-project scenarios.
 */
const sessionDirectoryMap = new Map<string, string>()

/**
 * Store directory for a session.
 * @param sessionID - The session ID
 * @param directory - The working directory path
 */
export function setSessionDirectory(sessionID: string, directory: string): void {
  sessionDirectoryMap.set(sessionID, directory)
  log("Session directory mapped", { sessionID, directory })
}

/**
 * Get directory for a session.
 * @param sessionID - The session ID
 * @returns The directory path, or undefined if not found
 */
export function getSessionDirectory(sessionID: string): string | undefined {
  return sessionDirectoryMap.get(sessionID)
}

/**
 * Clear directory for a session.
 * @param sessionID - The session ID
 */
export function clearSessionDirectory(sessionID: string): void {
  const hadDirectory = sessionDirectoryMap.delete(sessionID)
  if (hadDirectory) {
    log("Session directory cleared", { sessionID })
  }
}

/**
 * Get all session directory mappings (for debugging/testing).
 * @returns A copy of the mapping
 */
export function getAllSessionDirectories(): Record<string, string> {
  return Object.fromEntries(sessionDirectoryMap)
}
