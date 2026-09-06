import { normalizeEvent } from "./parse"
import type { LogEvent, RawWinEvent } from "./types"

type User = {
  name: string
  domain: string
  ip: string
  workstation: string
  computer: string
}

const DOMAIN = "CORP"
const DC = "DC01.corp.local"
const FILE = "FS01.corp.local"

const users: User[] = [
  { name: "alice.martin", domain: DOMAIN, ip: "10.20.1.41", workstation: "IT-ALICE", computer: "IT-ALICE.corp.local" },
  { name: "bob.chen", domain: DOMAIN, ip: "10.20.2.18", workstation: "FIN-BOB", computer: "FIN-BOB.corp.local" },
  { name: "carol.nguyen", domain: DOMAIN, ip: "10.20.3.22", workstation: "HR-CAROL", computer: "HR-CAROL.corp.local" },
  { name: "dave.okafor", domain: DOMAIN, ip: "10.20.4.77", workstation: "DEV-DAVE", computer: "DEV-DAVE.corp.local" },
  { name: "eve.rossi", domain: DOMAIN, ip: "10.20.8.12", workstation: "CTR-EVE", computer: "RDS01.corp.local" },
]

let recordId = 120000
let logonSeq = 0x4a1000

function nextRecord() {
  recordId += 1
  return recordId
}

function nextLogonId() {
  logonSeq += 17
  return `0x${logonSeq.toString(16).toUpperCase()}`
}

function at(base: Date, daysAgo: number, hour: number, minute: number) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hour, minute, Math.floor(Math.random() * 50), 0)
  return d.toISOString()
}

function raw(
  eventId: number,
  time: string,
  computer: string,
  data: Record<string, string>,
): RawWinEvent {
  return {
    recordId: nextRecord(),
    eventId,
    time,
    computer,
    channel: "Security",
    provider: "Microsoft-Windows-Security-Auditing",
    data,
  }
}

function logon(user: User, time: string, type: number, extras: Record<string, string> = {}) {
  const { computer, TargetLogonId: existingId, ...dataExtras } = extras
  const logonId = existingId || nextLogonId()
  return raw(4624, time, computer || user.computer, {
    TargetUserName: user.name,
    TargetDomainName: user.domain,
    SubjectUserName: type === 3 ? "FS01$" : user.name,
    SubjectDomainName: user.domain,
    LogonType: String(type),
    IpAddress: dataExtras.IpAddress || user.ip,
    WorkstationName: dataExtras.WorkstationName || user.workstation,
    AuthenticationPackageName:
      dataExtras.AuthenticationPackageName || (type === 3 ? "Kerberos" : "Negotiate"),
    ProcessName: type === 10 ? "C:\\Windows\\System32\\svchost.exe" : "C:\\Windows\\System32\\winlogon.exe",
    ...dataExtras,
    TargetLogonId: logonId,
  })
}

function logoff(user: User, time: string, logonId: string, type: number, computer?: string) {
  return raw(4647, time, computer || user.computer, {
    TargetUserName: user.name,
    TargetDomainName: user.domain,
    TargetLogonId: logonId,
    LogonType: String(type),
  })
}

function fail(
  account: string,
  time: string,
  ip: string,
  status: string,
  workstation = "UNKNOWN",
  computer = DC,
) {
  return raw(4625, time, computer, {
    TargetUserName: account,
    TargetDomainName: DOMAIN,
    SubjectUserName: "-",
    LogonType: "3",
    IpAddress: ip,
    WorkstationName: workstation,
    Status: "0xC000006D",
    SubStatus: status,
    FailureReason: "%%2313",
    AuthenticationPackageName: "NTLM",
  })
}

function weekdayDays(from: Date, span: number) {
  const days: number[] = []
  for (let i = span; i >= 1; i--) {
    const d = new Date(from)
    d.setUTCDate(d.getUTCDate() - i)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) days.push(i)
  }
  return days
}

export function buildDemoEvents(now = new Date()): LogEvent[] {
  recordId = 120000
  logonSeq = 0x4a1000
  const rawEvents: RawWinEvent[] = []
  const workdays = weekdayDays(now, 14)

  for (const daysAgo of workdays) {
    for (const [user, startH, startM, endH, endM] of [
      [users[0], 7, 52, 17, 18],
      [users[1], 8, 11, 17, 44],
      [users[2], 8, 35, 16, 50],
      [users[3], 9, 4, 18, 22],
    ] as const) {
      const start = at(now, daysAgo, startH, startM)
      const end = at(now, daysAgo, endH, endM)
      const open = logon(user, start, 2)
      rawEvents.push(open)
      if (user.name === "alice.martin") {
        rawEvents.push(
          raw(4672, start, user.computer, {
            SubjectUserName: user.name,
            SubjectDomainName: user.domain,
            SubjectLogonId: open.data?.TargetLogonId ?? "",
            PrivilegeList: "SeDebugPrivilege SeImpersonatePrivilege SeTcbPrivilege",
          }),
        )
      }
      rawEvents.push(logoff(user, end, open.data?.TargetLogonId ?? "", 2))

      if (daysAgo % 3 === 0) {
        const net = logon(user, at(now, daysAgo, 11, 20), 3, {
          computer: FILE,
          IpAddress: user.ip,
          WorkstationName: user.workstation,
        })
        rawEvents.push(net)
        rawEvents.push(
          logoff(user, at(now, daysAgo, 11, 41), net.data?.TargetLogonId ?? "", 3, FILE),
        )
      }
    }

    const rdp = logon(users[4], at(now, daysAgo, 9, 15), 10, {
      computer: "RDS01.corp.local",
      IpAddress: users[4].ip,
    })
    rawEvents.push(rdp)
    rawEvents.push(
      logoff(
        users[4],
        at(now, daysAgo, 16, 5),
        rdp.data?.TargetLogonId ?? "",
        10,
        "RDS01.corp.local",
      ),
    )
  }

  const backupTimes = weekdayDays(now, 10)
  for (const daysAgo of backupTimes) {
    rawEvents.push(
      logon(
        {
          name: "svc_backup",
          domain: DOMAIN,
          ip: "10.20.0.8",
          workstation: "FS01",
          computer: FILE,
        },
        at(now, daysAgo, 2, 5),
        5,
        { AuthenticationPackageName: "Negotiate" },
      ),
    )
  }

  const late = logon(users[3], at(now, 2, 21, 42), 2)
  rawEvents.push(late)
  rawEvents.push(logoff(users[3], at(now, 2, 23, 10), late.data?.TargetLogonId ?? "", 2))

  const nightRdp = logon(users[0], at(now, 1, 22, 13), 10, {
    computer: "RDS01.corp.local",
    IpAddress: "185.220.101.47",
    WorkstationName: "TOR-EXIT",
  })
  rawEvents.push(nightRdp)
  rawEvents.push(
    raw(4672, at(now, 1, 22, 13), "RDS01.corp.local", {
      SubjectUserName: users[0].name,
      SubjectDomainName: DOMAIN,
      SubjectLogonId: nightRdp.data?.TargetLogonId ?? "",
      PrivilegeList: "SeDebugPrivilege SeTcbPrivilege",
    }),
  )

  const attacker = "185.220.101.47"
  for (let i = 0; i < 14; i++) {
    rawEvents.push(
      fail("dave.okafor", at(now, 1, 21, 48 + Math.floor(i / 3)), attacker, "0xC000006A", "WIN-ATTACK"),
    )
  }
  rawEvents.push(
    fail("administrator", at(now, 1, 21, 55), attacker, "0xC000006A", "WIN-ATTACK"),
  )
  rawEvents.push(
    fail("administrator", at(now, 1, 21, 56), attacker, "0xC000006A", "WIN-ATTACK"),
  )

  for (let i = 0; i < 9; i++) {
    rawEvents.push(
      fail("eve.rossi", at(now, 0, 8, 12 + i), "203.0.113.88", "0xC000006A", "KIOSK-02", "RDS01.corp.local"),
    )
  }
  rawEvents.push(
    raw(4740, at(now, 0, 8, 22), DC, {
      TargetUserName: "eve.rossi",
      TargetDomainName: DOMAIN,
      SubjectUserName: "RDS01$",
      SubjectDomainName: DOMAIN,
      WorkstationName: "KIOSK-02",
    }),
  )

  const sprayAccounts = [
    "alice.martin",
    "bob.chen",
    "carol.nguyen",
    "finance.ap",
    "hr.payroll",
    "ops.helpdesk",
    "guest",
    "temp.vendor",
  ]
  for (const account of sprayAccounts) {
    rawEvents.push(fail(account, at(now, 3, 3, 14), "198.51.100.23", "0xC000006A", "scan-host"))
    rawEvents.push(fail(account, at(now, 3, 3, 15), "198.51.100.23", "0xC000006A", "scan-host"))
  }

  rawEvents.push(
    fail("old.contractor", at(now, 4, 10, 2), "10.20.8.90", "0xC0000072", "CTR-OLD"),
  )
  rawEvents.push(
    fail("old.contractor", at(now, 4, 10, 3), "10.20.8.90", "0xC0000072", "CTR-OLD"),
  )

  rawEvents.push(
    raw(4720, at(now, 5, 9, 30), DC, {
      TargetUserName: "temp.vendor",
      TargetDomainName: DOMAIN,
      SubjectUserName: "alice.martin",
      SubjectDomainName: DOMAIN,
      SamAccountName: "temp.vendor",
    }),
  )
  rawEvents.push(
    raw(4722, at(now, 5, 9, 31), DC, {
      TargetUserName: "temp.vendor",
      TargetDomainName: DOMAIN,
      SubjectUserName: "alice.martin",
      SubjectDomainName: DOMAIN,
    }),
  )
  rawEvents.push(
    raw(4732, at(now, 1, 22, 18), "RDS01.corp.local", {
      MemberName: "CORP\\eve.rossi",
      TargetUserName: "Administrators",
      SubjectUserName: "alice.martin",
      SubjectDomainName: DOMAIN,
    }),
  )
  rawEvents.push(
    raw(4724, at(now, 6, 14, 12), DC, {
      TargetUserName: "bob.chen",
      TargetDomainName: DOMAIN,
      SubjectUserName: "alice.martin",
      SubjectDomainName: DOMAIN,
    }),
  )
  rawEvents.push(
    raw(4648, at(now, 2, 15, 8), users[3].computer, {
      SubjectUserName: "dave.okafor",
      SubjectDomainName: DOMAIN,
      TargetUserName: "administrator",
      TargetDomainName: DOMAIN,
      IpAddress: users[3].ip,
      ProcessName: "C:\\Windows\\System32\\runas.exe",
    }),
  )
  rawEvents.push(
    raw(4778, at(now, 0, 11, 4), "RDS01.corp.local", {
      AccountName: "eve.rossi",
      AccountDomain: DOMAIN,
      ClientName: "CTR-EVE",
      ClientAddress: users[4].ip,
    }),
  )
  rawEvents.push(
    raw(4800, at(now, 0, 12, 30), users[1].computer, {
      TargetUserName: "bob.chen",
      TargetDomainName: DOMAIN,
    }),
  )
  rawEvents.push(
    raw(4801, at(now, 0, 13, 5), users[1].computer, {
      TargetUserName: "bob.chen",
      TargetDomainName: DOMAIN,
    }),
  )

  const todayAlice = logon(users[0], at(now, 0, 7, 48), 2)
  rawEvents.push(todayAlice)
  rawEvents.push(
    raw(4672, at(now, 0, 7, 48), users[0].computer, {
      SubjectUserName: users[0].name,
      SubjectDomainName: DOMAIN,
      SubjectLogonId: todayAlice.data?.TargetLogonId ?? "",
      PrivilegeList: "SeDebugPrivilege SeImpersonatePrivilege",
    }),
  )
  rawEvents.push(logon(users[1], at(now, 0, 8, 9), 2))
  rawEvents.push(logon(users[2], at(now, 0, 8, 40), 2))
  rawEvents.push(logon(users[3], at(now, 0, 9, 12), 2))

  return rawEvents
    .map((event, index) => normalizeEvent(event, index))
    .sort((a, b) => a.time.localeCompare(b.time))
}
