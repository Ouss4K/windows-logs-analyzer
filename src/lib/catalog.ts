import type { EventCategory } from "./types"

export const LOGON_TYPES: Record<number, string> = {
  2: "Interactive",
  3: "Network",
  4: "Batch",
  5: "Service",
  7: "Unlock",
  8: "NetworkCleartext",
  9: "NewCredentials",
  10: "RemoteInteractive (RDP)",
  11: "CachedInteractive",
}

export const INTERACTIVE_LOGON_TYPES = new Set([2, 7, 10, 11])

export const FAILURE_STATUS: Record<string, string> = {
  "0xC0000064": "Unknown user name",
  "0xC000006A": "Wrong password",
  "0xC0000234": "Account locked out",
  "0xC0000072": "Account disabled",
  "0xC000006F": "Outside allowed logon hours",
  "0xC0000070": "Workstation restriction",
  "0xC0000193": "Account expired",
  "0xC0000071": "Password expired",
  "0xC000006E": "Account restriction",
  "0xC0000022": "Access denied",
  "0xC000015B": "Logon type not granted",
  "0xC000006D": "Bad user name or authentication",
  "0xC0000133": "Clocks out of sync",
  "0xC000018C": "Trusted relationship failed",
  "0xC0000224": "Password must be changed",
  "0xC0000225": "NTLM blocked",
}

export type EventDefinition = {
  eventId: number
  category: EventCategory
  title: string
}

export const EVENT_CATALOG: Record<number, EventDefinition> = {
  4624: { eventId: 4624, category: "logon", title: "Successful logon" },
  4625: { eventId: 4625, category: "failure", title: "Failed logon" },
  4634: { eventId: 4634, category: "logoff", title: "Logoff" },
  4647: { eventId: 4647, category: "logoff", title: "User initiated logoff" },
  4648: { eventId: 4648, category: "logon", title: "Logon with explicit credentials" },
  4672: { eventId: 4672, category: "privilege", title: "Special privileges assigned" },
  4720: { eventId: 4720, category: "account", title: "User account created" },
  4722: { eventId: 4722, category: "account", title: "User account enabled" },
  4723: { eventId: 4723, category: "account", title: "Password change attempted" },
  4724: { eventId: 4724, category: "account", title: "Password reset" },
  4725: { eventId: 4725, category: "account", title: "User account disabled" },
  4726: { eventId: 4726, category: "account", title: "User account deleted" },
  4728: { eventId: 4728, category: "group", title: "Member added to global group" },
  4729: { eventId: 4729, category: "group", title: "Member removed from global group" },
  4732: { eventId: 4732, category: "group", title: "Member added to local group" },
  4733: { eventId: 4733, category: "group", title: "Member removed from local group" },
  4738: { eventId: 4738, category: "account", title: "User account changed" },
  4740: { eventId: 4740, category: "lockout", title: "Account locked out" },
  4756: { eventId: 4756, category: "group", title: "Member added to universal group" },
  4767: { eventId: 4767, category: "account", title: "Account unlocked" },
  4768: { eventId: 4768, category: "auth", title: "Kerberos TGT requested" },
  4769: { eventId: 4769, category: "auth", title: "Kerberos service ticket" },
  4771: { eventId: 4771, category: "failure", title: "Kerberos pre-auth failed" },
  4776: { eventId: 4776, category: "auth", title: "NTLM authentication" },
  4778: { eventId: 4778, category: "session", title: "Session reconnected" },
  4779: { eventId: 4779, category: "session", title: "Session disconnected" },
  4781: { eventId: 4781, category: "account", title: "Account renamed" },
  4800: { eventId: 4800, category: "session", title: "Workstation locked" },
  4801: { eventId: 4801, category: "session", title: "Workstation unlocked" },
  21: { eventId: 21, category: "logon", title: "Session logon" },
  22: { eventId: 22, category: "logon", title: "Shell started" },
  23: { eventId: 23, category: "logoff", title: "Session logoff" },
  24: { eventId: 24, category: "session", title: "Session disconnected" },
  25: { eventId: 25, category: "session", title: "Session reconnected" },
  39: { eventId: 39, category: "session", title: "Session disconnected by other connection" },
  40: { eventId: 40, category: "session", title: "Session disconnected" },
  41: { eventId: 41, category: "logon", title: "Session arbitration" },
  7001: { eventId: 7001, category: "logon", title: "User logon notification" },
  7002: { eventId: 7002, category: "logoff", title: "User logoff notification" },
}

export const COLLECT_EVENT_IDS = Object.keys(EVENT_CATALOG).map(Number)

export function logonTypeName(type?: number) {
  if (type == null || Number.isNaN(type)) return ""
  return LOGON_TYPES[type] ?? `Type ${type}`
}

export function failureReason(status?: string, fallback?: string) {
  if (!status) return fallback ?? ""
  const key = status.toUpperCase()
  return FAILURE_STATUS[key] ?? fallback ?? status
}

export function isMachineAccount(name: string) {
  return name.endsWith("$") || name === "SYSTEM" || name === "ANONYMOUS LOGON"
}

export const SENSITIVE_GROUPS = [
  "administrators",
  "domain admins",
  "enterprise admins",
  "schema admins",
  "account operators",
  "backup operators",
  "remote desktop users",
]
