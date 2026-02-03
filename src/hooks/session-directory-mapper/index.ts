import type { PluginInput } from "@opencode-ai/plugin"
import { setSessionDirectory, clearSessionDirectory } from "../../shared/session-directory-mapper"
import { log } from "../../shared/logger"

export function createSessionDirectoryMapperHook(ctx: PluginInput) {
  const sessionCreatedHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    if (event.type !== "session.created" && event.type !== "session.updated") return

    const props = event.properties as Record<string, unknown> | undefined
    const sessionInfo = props?.info as { id?: string } | undefined
    const sessionID = sessionInfo?.id

    if (sessionID) {
      setSessionDirectory(sessionID, ctx.directory)
      log("Session directory mapped from session.created event", { sessionID, directory: ctx.directory })
    }
  }

  const sessionDeleteHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    if (event.type !== "session.deleted") return

    const props = event.properties as Record<string, unknown> | undefined
    const sessionInfo = props?.info as { id?: string } | undefined
    const sessionID = sessionInfo?.id

    if (sessionID) {
      clearSessionDirectory(sessionID)
    }
  }

  return {
    event: async (input: { event: { type: string; properties?: unknown } }) => {
      await sessionCreatedHandler(input)
      await sessionDeleteHandler(input)
    },
  }
}
