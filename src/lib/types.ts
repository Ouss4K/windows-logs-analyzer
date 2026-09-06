export type LogonType = 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 1 | number

export type EventCategory =
  | "logon"
  | "logoff"
  | "failure"
  | "lockout"
  | "account"
  | "group"
  | "privilege"
  | "session"
  | "auth"
  | "other"

export type RawWinEvent = {
  recordId?: number
  eventId: number
  time: string
  computer?: string
  channel?: string
  provider?: string
  data?: Record<string, string | null | undefined>
  message?: string
}

export type LogEvent = {
  id: string
  recordId: number
  eventId: number
  category: EventCategory
  title: string
  time: string
  computer: string
  channel: string
  provider: string
  account: string
  domain: string
  targetAccount: string
  targetDomain: string
  callerAccount: string
  logonId: string
  logonType?: number
  logonTypeName: string
  ip: string
  workstation: string
  status: string
  subStatus: string
  failureReason: string
  authPackage: string
  processName: string
  privileges: string
  elevated: boolean
  message: string
}

export type UserSession = {
  id: string
  account: string
  domain: string
  computer: string
  logonId: string
  logonType?: number
  logonTypeName: string
  ip: string
  workstation: string
  start: string
  end?: string
  durationMs?: number
  status: "active" | "closed"
  elevated: boolean
}

export type AlertSeverity = "critical" | "high" | "medium" | "low"

export type Alert = {
  id: string
  rule: string
  severity: AlertSeverity
  title: string
  description: string
  time: string
  account: string
  ip: string
  computer: string
  eventIds: string[]
  count: number
}

export type IngestRun = {
  id: string
  source: "live" | "evtx" | "demo"
  startedAt: string
  finishedAt: string
  eventCount: number
  label: string
}

export type StoreShape = {
  events: LogEvent[]
  ingestHistory: IngestRun[]
  demo: boolean
}

export type DashboardStats = {
  totalEvents: number
  successfulLogons: number
  failedLogons: number
  uniqueUsers: number
  uniqueSources: number
  lockouts: number
  rdpLogons: number
  privilegedLogons: number
  openSessions: number
  afterHours: number
  alerts: number
  criticalAlerts: number
  lastEvent?: string
  firstEvent?: string
  demo: boolean
  ingestHistory: IngestRun[]
}

export type UserProfile = {
  account: string
  domain: string
  firstLogon?: string
  lastLogon?: string
  successfulLogons: number
  failedLogons: number
  rdpLogons: number
  afterHours: number
  lockouts: number
  sessionTimeMs: number
  openSessions: number
  sources: string[]
  computers: string[]
  riskScore: number
  riskLabel: "critical" | "high" | "medium" | "low"
  riskReasons: string[]
  privileged: boolean
  alertCount: number
}

export type SourceProfile = {
  id: string
  kind: "ip" | "workstation"
  value: string
  public: boolean
  users: string[]
  logons: number
  failures: number
  lastSeen: string
}

export type HeatCell = {
  day: number
  hour: number
  count: number
}
