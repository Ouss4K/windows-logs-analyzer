import {
  EVENT_CATALOG,
  failureReason,
  isMachineAccount,
  logonTypeName,
} from "./catalog"
import type { LogEvent, RawWinEvent } from "./types"

function text(data: Record<string, string | null | undefined> | undefined, ...keys: string[]) {
  if (!data) return ""
  for (const key of keys) {
    const value = data[key]
    if (value && value !== "-" && value !== "%%-") return value.trim()
  }
  return ""
}

function parseLogonType(value: string) {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? undefined : n
}

function normalizeAccount(name: string) {
  if (!name) return ""
  if (name.includes("\\")) return name.split("\\").pop() ?? name
  return name
}

export function normalizeEvent(raw: RawWinEvent, index = 0): LogEvent {
  const data = raw.data ?? {}
  const def = EVENT_CATALOG[raw.eventId]
  const userField = text(data, "User", "TargetUserName", "TargetUserName2", "AccountName", "SamAccountName")
  let domain = text(data, "TargetDomainName", "SubjectDomainName", "AccountDomain")
  let target = normalizeAccount(userField)
  if (userField.includes("\\")) {
    const [maybeDomain, maybeUser] = userField.split("\\")
    domain = domain || maybeDomain
    target = maybeUser || target
  }
  let logonType = parseLogonType(text(data, "LogonType"))
  const address = text(data, "Address", "IpAddress", "ClientAddress", "IpAddress2").replace(/^::ffff:/, "")
  if (logonType == null && [21, 22, 23, 24, 25, 39, 40, 41].includes(raw.eventId)) {
    logonType = address && address !== "LOCAL" && /^\d/.test(address) ? 10 : 2
  }
  if (logonType == null && (raw.eventId === 7001 || raw.eventId === 7002)) {
    logonType = 2
  }
  const isGroupEvent = [4728, 4729, 4732, 4733, 4756].includes(raw.eventId)
  const member = normalizeAccount(text(data, "MemberName", "MemberSid"))
  const caller = normalizeAccount(
    text(data, "SubjectUserName", "CallerUserName"),
  )
  const account = isGroupEvent ? member || caller : target || caller
  const status = text(data, "Status", "FailureCode")
  const subStatus = text(data, "SubStatus")
  const privileges = text(data, "PrivilegeList")
  const elevated =
    raw.eventId === 4672 ||
    privileges.toLowerCase().includes("sedebugprivilege") ||
    privileges.toLowerCase().includes("setcbprivilege")
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(address) || address.includes(":") ? address : ""
  const workstation = ip ? text(data, "WorkstationName", "Workstation") : address || text(data, "WorkstationName", "Workstation")

  return {
    id: `${raw.computer ?? "host"}-${raw.recordId ?? index}-${raw.eventId}-${raw.time}`,
    recordId: raw.recordId ?? index,
    eventId: raw.eventId,
    category: def?.category ?? "other",
    title: def?.title ?? `Event ${raw.eventId}`,
    time: new Date(raw.time).toISOString(),
    computer: raw.computer || "Unknown",
    channel: raw.channel || "Security",
    provider: raw.provider || "Microsoft-Windows-Security-Auditing",
    account: isMachineAccount(account) && caller ? caller : account,
    domain,
    targetAccount: target,
    targetDomain: domain,
    callerAccount: caller,
    logonId: text(data, "TargetLogonId", "SubjectLogonId", "LogonID", "SessionID", "TSId"),
    logonType,
    logonTypeName: logonTypeName(logonType),
    ip,
    workstation: workstation === "LOCAL" ? raw.computer || "LOCAL" : workstation,
    status,
    subStatus,
    failureReason: failureReason(subStatus || status, text(data, "FailureReason")),
    authPackage: text(data, "AuthenticationPackageName", "PackageName", "LmPackageName"),
    processName: text(data, "ProcessName"),
    privileges,
    elevated,
    message: raw.message?.split("\r\n")[0]?.slice(0, 240) ?? "",
  }
}

export function normalizeEvents(raw: RawWinEvent[]) {
  return raw
    .filter((event) => Number.isFinite(event.eventId) && event.time)
    .map((event, index) => normalizeEvent(event, index))
    .sort((a, b) => a.time.localeCompare(b.time))
}
