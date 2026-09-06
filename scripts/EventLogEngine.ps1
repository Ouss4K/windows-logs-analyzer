# Windows Event Log analysis helpers used by EventLogAnalyzer.ps1
Set-StrictMode -Version Latest

$script:LogonTypes = @{
  2  = 'Interactive'
  3  = 'Network'
  4  = 'Batch'
  5  = 'Service'
  7  = 'Unlock'
  8  = 'NetworkCleartext'
  9  = 'NewCredentials'
  10 = 'RemoteInteractive (RDP)'
  11 = 'CachedInteractive'
}

$script:InteractiveLogonTypes = @(2, 7, 10, 11)

$script:FailureStatus = @{
  '0xC0000064' = 'Unknown user name'
  '0xC000006A' = 'Wrong password'
  '0xC0000234' = 'Account locked out'
  '0xC0000072' = 'Account disabled'
  '0xC000006F' = 'Outside allowed logon hours'
  '0xC0000070' = 'Workstation restriction'
  '0xC0000193' = 'Account expired'
  '0xC0000071' = 'Password expired'
  '0xC000006E' = 'Account restriction'
  '0xC0000022' = 'Access denied'
  '0xC000015B' = 'Logon type not granted'
  '0xC000006D' = 'Bad user name or authentication'
  '0xC0000133' = 'Clocks out of sync'
  '0xC000018C' = 'Trusted relationship failed'
  '0xC0000224' = 'Password must be changed'
  '0xC0000225' = 'NTLM blocked'
}

$script:EventCatalog = @{
  4624 = @{ Category = 'logon';     Title = 'Successful logon' }
  4625 = @{ Category = 'failure';   Title = 'Failed logon' }
  4634 = @{ Category = 'logoff';    Title = 'Logoff' }
  4647 = @{ Category = 'logoff';    Title = 'User initiated logoff' }
  4648 = @{ Category = 'logon';     Title = 'Logon with explicit credentials' }
  4672 = @{ Category = 'privilege'; Title = 'Special privileges assigned' }
  4720 = @{ Category = 'account';   Title = 'User account created' }
  4722 = @{ Category = 'account';   Title = 'User account enabled' }
  4723 = @{ Category = 'account';   Title = 'Password change attempted' }
  4724 = @{ Category = 'account';   Title = 'Password reset' }
  4725 = @{ Category = 'account';   Title = 'User account disabled' }
  4726 = @{ Category = 'account';   Title = 'User account deleted' }
  4728 = @{ Category = 'group';     Title = 'Member added to global group' }
  4729 = @{ Category = 'group';     Title = 'Member removed from global group' }
  4732 = @{ Category = 'group';     Title = 'Member added to local group' }
  4733 = @{ Category = 'group';     Title = 'Member removed from local group' }
  4738 = @{ Category = 'account';   Title = 'User account changed' }
  4740 = @{ Category = 'lockout';   Title = 'Account locked out' }
  4756 = @{ Category = 'group';     Title = 'Member added to universal group' }
  4767 = @{ Category = 'account';   Title = 'Account unlocked' }
  4768 = @{ Category = 'auth';      Title = 'Kerberos TGT requested' }
  4769 = @{ Category = 'auth';      Title = 'Kerberos service ticket' }
  4771 = @{ Category = 'failure';   Title = 'Kerberos pre-auth failed' }
  4776 = @{ Category = 'auth';      Title = 'NTLM authentication' }
  4778 = @{ Category = 'session';   Title = 'Session reconnected' }
  4779 = @{ Category = 'session';   Title = 'Session disconnected' }
  4781 = @{ Category = 'account';   Title = 'Account renamed' }
  4800 = @{ Category = 'session';   Title = 'Workstation locked' }
  4801 = @{ Category = 'session';   Title = 'Workstation unlocked' }
  4656 = @{ Category = 'file';      Title = 'Object handle requested' }
  4658 = @{ Category = 'file';      Title = 'Object handle closed' }
  4659 = @{ Category = 'file';      Title = 'Object delete requested' }
  4660 = @{ Category = 'file';      Title = 'Object deleted' }
  4663 = @{ Category = 'file';      Title = 'Object access (file/registry)' }
  4670 = @{ Category = 'file';      Title = 'Object permissions changed' }
  5140 = @{ Category = 'file';      Title = 'Network share accessed' }
  5145 = @{ Category = 'file';      Title = 'Shared file checked' }
  4688 = @{ Category = 'process';   Title = 'Process created' }
  4689 = @{ Category = 'process';   Title = 'Process exited' }
  4697 = @{ Category = 'service';   Title = 'Service installed' }
  4698 = @{ Category = 'service';   Title = 'Scheduled task created' }
  4699 = @{ Category = 'service';   Title = 'Scheduled task deleted' }
  4700 = @{ Category = 'service';   Title = 'Scheduled task enabled' }
  4702 = @{ Category = 'service';   Title = 'Scheduled task updated' }
  104  = @{ Category = 'audit';     Title = 'Event log was cleared' }
  1102 = @{ Category = 'audit';     Title = 'Security log was cleared' }
  4616 = @{ Category = 'audit';     Title = 'System time changed' }
  4719 = @{ Category = 'audit';     Title = 'Audit policy changed' }
  4946 = @{ Category = 'firewall';  Title = 'Firewall rule listed' }
  4947 = @{ Category = 'firewall';  Title = 'Firewall rule changed' }
  4950 = @{ Category = 'firewall';  Title = 'Firewall setting changed' }
  2004 = @{ Category = 'firewall';  Title = 'Firewall rule added' }
  2005 = @{ Category = 'firewall';  Title = 'Firewall rule changed' }
  2006 = @{ Category = 'firewall';  Title = 'Firewall rule deleted' }
  21   = @{ Category = 'logon';     Title = 'Session logon' }
  22   = @{ Category = 'logon';     Title = 'Shell started' }
  23   = @{ Category = 'logoff';    Title = 'Session logoff' }
  24   = @{ Category = 'session';   Title = 'Session disconnected' }
  25   = @{ Category = 'session';   Title = 'Session reconnected' }
  39   = @{ Category = 'session';   Title = 'Session disconnected by other connection' }
  40   = @{ Category = 'session';   Title = 'Session disconnected' }
  41   = @{ Category = 'power';     Title = 'Kernel-Power / unexpected restart' }
  42   = @{ Category = 'power';     Title = 'System entering sleep' }
  1    = @{ Category = 'power';     Title = 'System time or power event' }
  12   = @{ Category = 'power';     Title = 'System started' }
  13   = @{ Category = 'power';     Title = 'System shutting down' }
  109  = @{ Category = 'power';     Title = 'Kernel-Power shutdown' }
  1074 = @{ Category = 'power';     Title = 'Shutdown / restart initiated' }
  1076 = @{ Category = 'power';     Title = 'Unclean shutdown reason' }
  6005 = @{ Category = 'power';     Title = 'Event log service started' }
  6006 = @{ Category = 'power';     Title = 'Event log service stopped' }
  6008 = @{ Category = 'power';     Title = 'Previous shutdown was unexpected' }
  6009 = @{ Category = 'power';     Title = 'Windows version at boot' }
  27   = @{ Category = 'network';   Title = 'Network adapter / link event' }
  32   = @{ Category = 'network';   Title = 'Network adapter event' }
  219  = @{ Category = 'hardware';  Title = 'Driver failed or delayed' }
  1014 = @{ Category = 'network';   Title = 'DNS name resolution timeout' }
  4201 = @{ Category = 'network';   Title = 'TCP/IP adapter configuration' }
  7000 = @{ Category = 'service';   Title = 'Service failed to start' }
  7001 = @{ Category = 'logon';     Title = 'User logon notification' }
  7002 = @{ Category = 'logoff';    Title = 'User logoff notification' }
  7023 = @{ Category = 'service';   Title = 'Service terminated with error' }
  7031 = @{ Category = 'service';   Title = 'Service crashed unexpectedly' }
  7034 = @{ Category = 'service';   Title = 'Service terminated unexpectedly' }
  7036 = @{ Category = 'service';   Title = 'Service entered a state' }
  7040 = @{ Category = 'service';   Title = 'Service start type changed' }
  7045 = @{ Category = 'service';   Title = 'New service installed' }
  1000 = @{ Category = 'crash';     Title = 'Application error / crash' }
  1001 = @{ Category = 'crash';     Title = 'Windows Error Reporting' }
  1002 = @{ Category = 'crash';     Title = 'Application hang' }
  1033 = @{ Category = 'software';  Title = 'Program installed (Windows Installer)' }
  1034 = @{ Category = 'software';  Title = 'Program removed (Windows Installer)' }
  11707 = @{ Category = 'software'; Title = 'Installation completed' }
  11724 = @{ Category = 'software'; Title = 'Application removed' }
  19   = @{ Category = 'software';  Title = 'Windows Update installed' }
  43   = @{ Category = 'software';  Title = 'Windows Update started installing' }
  8001 = @{ Category = 'network';   Title = 'Wi-Fi connected' }
  8002 = @{ Category = 'network';   Title = 'Wi-Fi failed to connect' }
  8003 = @{ Category = 'network';   Title = 'Wi-Fi disconnected' }
  10000 = @{ Category = 'network';  Title = 'Network connected' }
  10001 = @{ Category = 'network';  Title = 'Network disconnected' }
  400   = @{ Category = 'hardware'; Title = 'Device configured (PnP)' }
  410   = @{ Category = 'hardware'; Title = 'Device started (PnP)' }
  430   = @{ Category = 'hardware'; Title = 'Device removed (PnP)' }
  2100  = @{ Category = 'usb';      Title = 'USB device arrived' }
  2101  = @{ Category = 'usb';      Title = 'USB device removed' }
  2102  = @{ Category = 'usb';      Title = 'USB device removed' }
  2003  = @{ Category = 'usb';      Title = 'Driver load for device' }
}

$script:SecurityEventIds = @(
  4624, 4625, 4634, 4647, 4648, 4672, 4720, 4722, 4723, 4724, 4725, 4726,
  4728, 4729, 4732, 4733, 4738, 4740, 4756, 4767, 4768, 4769, 4771, 4776,
  4778, 4779, 4781, 4800, 4801, 4656, 4658, 4659, 4660, 4663, 4670, 5140, 5145,
  4688, 4689, 4697, 4698, 4699, 4700, 4702, 1102, 4616, 4719, 4946, 4947, 4950
)
$script:RdpEventIds = @(21, 22, 23, 24, 25, 39, 40, 41)
$script:SystemDiagIds = @(
  1, 12, 13, 27, 32, 41, 42, 104, 109, 219, 1014, 1074, 1076, 4201,
  6005, 6006, 6008, 6009, 7000, 7001, 7002, 7023, 7031, 7034, 7036, 7040, 7045
)
$script:AppDiagIds = @(1000, 1001, 1002, 1033, 1034, 11707, 11724, 19, 43)
$script:FilterPresets = @(
  'Everything'
  'Sign-ins (tried or succeeded)'
  'Successful sign-ins'
  'Failed sign-ins'
  'Time spent signed in'
  'Remote Desktop'
  'Files deleted or opened'
  'Network or Wi-Fi'
  'USB sticks and devices'
  'Programs installed or updated'
  'Restarts and sleep'
  'Apps that crashed'
  'Firewall changes'
  'Services and tasks'
  'Account changes'
  'Logs erased or clock changed'
)
$script:SensitiveGroups = @(
  'administrators', 'domain admins', 'enterprise admins', 'schema admins',
  'account operators', 'backup operators', 'remote desktop users'
)

function Test-IsAdministrator {
  try {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Test-IsMachineAccount([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $true }
  return $name.EndsWith('$') -or $name -eq 'SYSTEM' -or $name -eq 'ANONYMOUS LOGON' -or $name -eq '-'
}

function Test-IsPublicIp([string]$ip) {
  if ([string]::IsNullOrWhiteSpace($ip) -or $ip -eq '-' -or $ip -eq '::1' -or $ip -eq '127.0.0.1') { return $false }
  if ($ip.StartsWith('10.') -or $ip.StartsWith('192.168.') -or $ip.StartsWith('169.254.')) { return $false }
  $parts = $ip.Split('.')
  if ($parts[0] -eq '172') {
    $second = 0
    [void][int]::TryParse($parts[1], [ref]$second)
    if ($second -ge 16 -and $second -le 31) { return $false }
  }
  return $ip -match '^\d{1,3}(\.\d{1,3}){3}$'
}

function Test-IsAfterHours([datetime]$time) {
  $hour = $time.ToLocalTime().Hour
  return ($hour -ge 20 -or $hour -lt 6)
}

function Get-LogonTypeName([int]$type) {
  if ($script:LogonTypes.ContainsKey($type)) { return $script:LogonTypes[$type] }
  if ($type -gt 0) { return "Type $type" }
  return ''
}

function Get-FailureReason([string]$status, [string]$fallback) {
  if ($status) {
    $key = $status.ToUpperInvariant()
    if ($script:FailureStatus.ContainsKey($key)) { return $script:FailureStatus[$key] }
  }
  if ($fallback) { return $fallback }
  if ($status) { return $status }
  return ''
}

function Resolve-AccountSid([string]$sid) {
  if ([string]::IsNullOrWhiteSpace($sid)) { return '' }
  try {
    return ([Security.Principal.SecurityIdentifier]$sid).Translate([Security.Principal.NTAccount]).Value
  } catch {
    return $sid
  }
}

function Get-EventXmlMap($event) {
  $map = @{}
  try {
    $xml = [xml]$event.ToXml()
    if ($xml.Event.EventData -and $xml.Event.EventData.Data) {
      foreach ($node in @($xml.Event.EventData.Data)) {
        $name = [string]$node.Name
        if ($name) { $map[$name] = [string]$node.'#text' }
      }
    }
    if ($xml.Event.UserData -and $xml.Event.UserData.FirstChild) {
      foreach ($node in @($xml.Event.UserData.FirstChild.ChildNodes)) {
        if ($node.Name -and $node.Name -ne '#text') {
          $map[$node.Name] = [string]$node.InnerText
        }
      }
    }
  } catch {
    # Keep the event even if XML parsing fails.
  }
  return $map
}

function Get-MapText($map, [string[]]$keys) {
  foreach ($key in $keys) {
    if (-not $map.ContainsKey($key)) { continue }
    $value = [string]$map[$key]
    if ($value -and $value -ne '-' -and $value -ne '%%-') { return $value.Trim() }
  }
  return ''
}

function Get-NormalizedAccount([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return '' }
  if ($name.Contains('\')) { return ($name.Split('\') | Select-Object -Last 1) }
  return $name
}

function Convert-WinLogEvent {
  param($Event, [int]$Index = 0, [switch]$ParseXml)

  $time = $Event.TimeCreated
  if ($time.Kind -eq [DateTimeKind]::Utc) { $time = $time.ToLocalTime() }

  $map = @{}
  if ($ParseXml) { $map = Get-EventXmlMap $Event }

  if ($map.ContainsKey('UserSid') -and $map['UserSid']) {
    $resolved = Resolve-AccountSid $map['UserSid']
    if ($resolved) { $map['User'] = $resolved }
  }

  $eventId = [int]$Event.Id
  $channel = [string]$Event.LogName
  $def = $script:EventCatalog[$eventId]
  if ($eventId -eq 41 -and $channel -match 'TerminalServices|LocalSessionManager') {
    $def = @{ Category = 'logon'; Title = 'Session arbitration' }
  }
  $userField = Get-MapText $map @('User', 'TargetUserName', 'AccountName', 'SamAccountName')
  $domain = Get-MapText $map @('TargetDomainName', 'SubjectDomainName', 'AccountDomain')
  $target = Get-NormalizedAccount $userField
  if ($userField.Contains('\')) {
    $parts = $userField.Split('\')
    if (-not $domain) { $domain = $parts[0] }
    if ($parts.Count -gt 1) { $target = $parts[-1] }
  }

  $logonType = 0
  $logonTypeText = Get-MapText $map @('LogonType')
  if ($logonTypeText) { [void][int]::TryParse($logonTypeText, [ref]$logonType) }

  $address = (Get-MapText $map @('Address', 'IpAddress', 'ClientAddress')).Replace('::ffff:', '')
  if ($logonType -eq 0 -and $script:RdpEventIds -contains $eventId) {
    if ($address -and $address -ne 'LOCAL' -and $address -match '^\d') { $logonType = 10 } else { $logonType = 2 }
  }
  if ($logonType -eq 0 -and ($eventId -eq 7001 -or $eventId -eq 7002)) { $logonType = 2 }

  $isGroupEvent = @(4728, 4729, 4732, 4733, 4756) -contains $eventId
  $member = Get-NormalizedAccount (Get-MapText $map @('MemberName', 'MemberSid'))
  $caller = Get-NormalizedAccount (Get-MapText $map @('SubjectUserName', 'CallerUserName'))
  $account = if ($isGroupEvent) { if ($member) { $member } else { $caller } } else { if ($target) { $target } else { $caller } }
  if ((Test-IsMachineAccount $account) -and $caller -and -not (Test-IsMachineAccount $caller)) {
    $account = $caller
  }

  $status = Get-MapText $map @('Status', 'FailureCode')
  $subStatus = Get-MapText $map @('SubStatus')
  $failCode = if ($subStatus) { $subStatus } elseif ($status) { $status } else { '' }
  $privileges = Get-MapText $map @('PrivilegeList')
  $elevated = ($eventId -eq 4672) -or ($privileges -match 'SeDebugPrivilege|SeTcbPrivilege')
  $ip = ''
  if ($address -match '^\d{1,3}(\.\d{1,3}){3}$' -or $address.Contains(':')) { $ip = $address }
  $workstation = Get-MapText $map @('WorkstationName', 'Workstation')
  if (-not $ip) {
    if ($address) { $workstation = $address }
  }
  if ($workstation -eq 'LOCAL') { $workstation = [string]$Event.MachineName }

  $title = if ($def) { $def.Title } else { "Event $eventId" }
  $category = if ($def) { $def.Category } else { 'other' }
  $objectName = Get-MapText $map @('ObjectName', 'ObjectName2', 'ShareName', 'RelativeTargetName', 'NewProcessName')
  $deviceName = Get-MapText $map @('DeviceName', 'InstanceId', 'AdapterName', 'InterfaceAlias', 'ProfileName', 'SSID', 'ServiceName', 'ImageName', 'param1', 'Param1')
  $accessMask = Get-MapText $map @('AccessMask', 'AccessList')
  if ($eventId -eq 4663 -and ($accessMask -match '1537|Delete|0x10000|%%1537')) {
    $title = 'File or object deleted'
    $category = 'file'
  }
  $message = ''
  try {
    if ($Event.Message) { $message = ($Event.Message -split "`r`n")[0] }
  } catch { }
  if ($message.Length -gt 400) { $message = $message.Substring(0, 400) }

  $level = ''
  try { $level = [string]$Event.LevelDisplayName } catch { }

  [pscustomobject]@{
    Uid            = "$($Event.MachineName)-$($Event.RecordId)-$eventId-$($time.ToString('o'))"
    RecordId       = [long]$Event.RecordId
    EventId        = $eventId
    Category       = $category
    Title          = $title
    Time           = $time
    TimeText       = $time.ToString('yyyy-MM-dd HH:mm:ss')
    Computer       = [string]$Event.MachineName
    Channel        = [string]$Event.LogName
    Provider       = [string]$Event.ProviderName
    Level          = $level
    Account        = $account
    Domain         = $domain
    TargetAccount  = $target
    CallerAccount  = $caller
    LogonId        = Get-MapText $map @('TargetLogonId', 'SubjectLogonId', 'LogonID', 'SessionID', 'TSId')
    LogonType      = $logonType
    LogonTypeName  = Get-LogonTypeName $logonType
    Ip             = $ip
    Workstation    = $workstation
    Status         = $status
    SubStatus      = $subStatus
    FailureReason  = Get-FailureReason $failCode (Get-MapText $map @('FailureReason'))
    AuthPackage    = Get-MapText $map @('AuthenticationPackageName', 'PackageName', 'LmPackageName')
    ProcessName    = Get-MapText $map @('ProcessName')
    Privileges     = $privileges
    Elevated       = [bool]$elevated
    ObjectName     = $objectName
    DeviceName     = $deviceName
    AccessMask     = $accessMask
    Message        = $message
    Data           = $map
  }
}

function Read-WinLogChannel {
  param(
    [string]$LogName,
    [int[]]$Ids,
    [datetime]$StartTime,
    [int]$MaxEvents,
    [string]$ComputerName,
    [string]$Path
  )

  $filter = @{ StartTime = $StartTime }
  if ($Path) {
    $filter.Path = $Path
  } else {
    $filter.LogName = $LogName
  }
  if ($Ids -and $Ids.Count -gt 0) { $filter.Id = $Ids }

  $params = @{
    FilterHashtable = $filter
    MaxEvents       = $MaxEvents
    ErrorAction     = 'Stop'
  }
  if ($ComputerName -and $ComputerName -notin @('', '.', 'localhost', $env:COMPUTERNAME) -and -not $Path) {
    $params.ComputerName = $ComputerName
  }

  try {
    return @(Get-WinEvent @params)
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match 'No events were found') { return @() }
    throw
  }
}

function Invoke-EventCollection {
  param(
    [int]$Days = 7,
    [int]$MaxEvents = 4000,
    [string]$Mode = 'Investigation',
    [string]$ComputerName = '',
    [string]$EvtxPath = '',
    [string]$LogName = 'Security'
  )

  $warnings = New-Object System.Collections.Generic.List[string]
  $start = (Get-Date).AddDays(-1 * $Days)
  $raw = @()
  $parseXml = $true

  try {
    if ($EvtxPath) {
      if (-not (Test-Path -LiteralPath $EvtxPath)) {
        throw "EVTX file not found: $EvtxPath"
      }
      $raw = Read-WinLogChannel -Path $EvtxPath -Ids @($script:EventCatalog.Keys) -StartTime (Get-Date).AddYears(-20) -MaxEvents $MaxEvents
    } elseif ($Mode -eq 'Investigation' -or $Mode -eq 'Diagnostics') {
      $per = [Math]::Max(300, [Math]::Min(2500, [int]($MaxEvents / 2)))
      $channels = @(
        @{ Name = 'Security'; Ids = $script:SecurityEventIds; Max = $MaxEvents }
        @{ Name = 'Microsoft-Windows-TerminalServices-LocalSessionManager/Operational'; Ids = $script:RdpEventIds; Max = $per }
        @{ Name = 'System'; Ids = $script:SystemDiagIds; Max = $per }
        @{ Name = 'Application'; Ids = $script:AppDiagIds; Max = $per }
        @{ Name = 'Microsoft-Windows-NetworkProfile/Operational'; Ids = @(10000, 10001); Max = $per }
        @{ Name = 'Microsoft-Windows-WLAN-AutoConfig/Operational'; Ids = @(8001, 8002, 8003); Max = $per }
        @{ Name = 'Microsoft-Windows-Kernel-PnP/Configuration'; Ids = @(400, 410, 430); Max = $per }
        @{ Name = 'Microsoft-Windows-DriverFrameworks-UserMode/Operational'; Ids = @(2003, 2100, 2101, 2102); Max = $per }
        @{ Name = 'Microsoft-Windows-Windows Firewall With Advanced Security/Firewall'; Ids = @(2004, 2005, 2006); Max = $per }
        @{ Name = 'Microsoft-Windows-WindowsUpdateClient/Operational'; Ids = @(19, 43); Max = $per }
      )
      foreach ($channel in $channels) {
        try {
          $chunk = Read-WinLogChannel -LogName $channel.Name -Ids $channel.Ids -StartTime $start -MaxEvents $channel.Max -ComputerName $ComputerName
          $raw += $chunk
        } catch {
          $msg = $_.Exception.Message
          if ($msg -match 'unauthorized|Access is denied|access denied') {
            $warnings.Add("Cannot read $($channel.Name) without Administrator.") | Out-Null
          } elseif ($msg -notmatch 'does not exist|was not found|No events|There is not an event log') {
            $warnings.Add("$($channel.Name): $msg") | Out-Null
          }
        }
      }
    } else {
      $parseXml = $Mode -eq 'Security'
      $ids = if ($Mode -eq 'Security') { $script:SecurityEventIds } else { $null }
      $channelName = if ($LogName) { $LogName } else { $Mode }
      try {
        $raw = Read-WinLogChannel -LogName $channelName -Ids $ids -StartTime $start -MaxEvents $MaxEvents -ComputerName $ComputerName
      } catch {
        $msg = $_.Exception.Message
        if ($msg -match 'unauthorized|Access is denied|access denied') {
          $warnings.Add("Cannot read $channelName without Administrator.") | Out-Null
        } else {
          $warnings.Add($msg) | Out-Null
        }
      }
    }
  } catch {
    $warnings.Add($_.Exception.Message) | Out-Null
  }

  $events = New-Object System.Collections.Generic.List[object]
  $i = 0
  foreach ($item in @($raw)) {
    $events.Add((Convert-WinLogEvent -Event $item -Index $i -ParseXml:$parseXml)) | Out-Null
    $i++
  }

  $sorted = @($events | Sort-Object Time)
  [pscustomobject]@{
    Events   = $sorted
    Warnings = @($warnings)
    Count    = $sorted.Count
    Mode     = $Mode
  }
}

function Test-IsSuccessfulLogon($event) {
  return @(4624, 21, 7001) -contains $event.EventId
}

function Get-EventSessions {
  param($Events)

  $sessions = @{}
  $ordered = @($Events | Sort-Object Time)
  $starts = @(4624, 21, 7001)
  $ends = @(4634, 4647, 23, 7002)

  foreach ($event in $ordered) {
    $key = "$($event.Computer)|$($event.LogonId)|$($event.LogonType)"
    if (($starts -contains $event.EventId) -and ($event.LogonId -or $event.Account)) {
      $sessions[$key] = [pscustomobject]@{
        Id            = $key
        Account       = $event.Account
        Domain        = $event.Domain
        Computer      = $event.Computer
        LogonId       = $event.LogonId
        LogonType     = $event.LogonType
        LogonTypeName = $event.LogonTypeName
        Ip            = $event.Ip
        Workstation   = $event.Workstation
        Start         = $event.Time
        End           = $null
        DurationMs    = $null
        Status        = 'active'
        Elevated      = [bool]$event.Elevated
      }
    }

    if (($ends -contains $event.EventId) -and ($event.LogonId -or $event.Account)) {
      $match = $sessions[$key]
      if (-not $match) {
        $match = @($sessions.Values) | Where-Object {
          $_.Status -eq 'active' -and $_.Computer -eq $event.Computer -and (
            ($event.LogonId -and $_.LogonId -eq $event.LogonId) -or
            (-not $event.LogonId -and $_.Account -eq $event.Account)
          )
        } | Select-Object -First 1
      }
      if ($match) {
        $match.End = $event.Time
        $match.Status = 'closed'
        $match.DurationMs = [Math]::Max(0, ($event.Time - $match.Start).TotalMilliseconds)
      }
    }

    if ($event.EventId -eq 4672 -and $event.LogonId) {
      $priv = @($sessions.Values) | Where-Object { $_.LogonId -eq $event.LogonId -and $_.Computer -eq $event.Computer } | Select-Object -First 1
      if ($priv) { $priv.Elevated = $true }
    }
  }

  return @($sessions.Values | Sort-Object Start -Descending)
}

function Get-EventAlerts {
  param($Events)

  $alerts = New-Object System.Collections.Generic.List[object]
  $failures = @($Events | Where-Object { $_.EventId -eq 4625 })
  $logons = @($Events | Where-Object { Test-IsSuccessfulLogon $_ })

  $failBuckets = @{}
  foreach ($event in $failures) {
    $source = if ($event.Ip) { $event.Ip } else { $event.Workstation }
    $key = "$($event.Account)|$source"
    if (-not $failBuckets.ContainsKey($key)) { $failBuckets[$key] = New-Object System.Collections.Generic.List[object] }
    $failBuckets[$key].Add($event) | Out-Null
  }
  foreach ($key in $failBuckets.Keys) {
    $ordered = @($failBuckets[$key] | Sort-Object Time)
    $windowStart = 0
    for ($i = 0; $i -lt $ordered.Count; $i++) {
      while (($ordered[$i].Time - $ordered[$windowStart].Time).TotalMinutes -gt 10) { $windowStart++ }
      $count = $i - $windowStart + 1
      if ($count -ge 8) {
        $parts = $key.Split('|')
        $alerts.Add([pscustomobject]@{
          Id          = "brute-$key-$($ordered[$windowStart].Time.ToString('o'))"
          Rule        = 'brute_force'
          Severity    = 'critical'
          Title       = "Brute-force logon against $($parts[0])"
          Description = "$count failed logons from $(if ($parts[1]) { $parts[1] } else { 'unknown source' }) within 10 minutes."
          Time        = $ordered[$i].Time
          Account     = $parts[0]
          Ip          = $ordered[$windowStart].Ip
          Computer    = $ordered[$windowStart].Computer
          Count       = $count
        }) | Out-Null
        break
      }
    }
  }

  $sprayBuckets = @{}
  $sprayEvents = @{}
  foreach ($event in $failures) {
    $ip = if ($event.Ip) { $event.Ip } else { $event.Workstation }
    if (-not $ip) { continue }
    $window = [Math]::Floor($event.Time.Ticks / ([TimeSpan]::FromMinutes(15).Ticks))
    $key = "$ip|$window"
    if (-not $sprayBuckets.ContainsKey($key)) { $sprayBuckets[$key] = [System.Collections.Generic.HashSet[string]]::new() }
    [void]$sprayBuckets[$key].Add($event.Account)
    if (-not $sprayEvents.ContainsKey($key)) { $sprayEvents[$key] = New-Object System.Collections.Generic.List[object] }
    $sprayEvents[$key].Add($event) | Out-Null
  }
  foreach ($key in $sprayBuckets.Keys) {
    if ($sprayBuckets[$key].Count -ge 6) {
      $list = @($sprayEvents[$key])
      $alerts.Add([pscustomobject]@{
        Id          = "spray-$key"
        Rule        = 'password_spray'
        Severity    = 'high'
        Title       = 'Password spray suspected'
        Description = "$($sprayBuckets[$key].Count) distinct accounts failed from the same source in 15 minutes."
        Time        = $list[-1].Time
        Account     = (@($sprayBuckets[$key]) | Select-Object -First 4) -join ', '
        Ip          = $list[0].Ip
        Computer    = $list[0].Computer
        Count       = $sprayBuckets[$key].Count
      }) | Out-Null
    }
  }

  foreach ($event in @($Events | Where-Object { $_.EventId -eq 4740 })) {
    $account = if ($event.TargetAccount) { $event.TargetAccount } else { $event.Account }
    $alerts.Add([pscustomobject]@{
      Id          = "lockout-$($event.Uid)"
      Rule        = 'account_lockout'
      Severity    = 'high'
      Title       = "Account lockout: $account"
      Description = "Windows reported an account lockout on $($event.Computer)."
      Time        = $event.Time
      Account     = $account
      Ip          = $event.Ip
      Computer    = $event.Computer
      Count       = 1
    }) | Out-Null
  }

  foreach ($event in $logons) {
    if ($script:InteractiveLogonTypes -contains $event.LogonType -and -not (Test-IsMachineAccount $event.Account) -and (Test-IsAfterHours $event.Time)) {
      $alerts.Add([pscustomobject]@{
        Id          = "afterhours-$($event.Uid)"
        Rule        = 'after_hours'
        Severity    = $(if ($event.LogonType -eq 10) { 'high' } else { 'medium' })
        Title       = "After-hours $($event.LogonTypeName) by $($event.Account)"
        Description = "$($event.Account) signed in at $($event.Time.ToString('HH:mm')) from $(if ($event.Ip) { $event.Ip } elseif ($event.Workstation) { $event.Workstation } else { $event.Computer })."
        Time        = $event.Time
        Account     = $event.Account
        Ip          = $event.Ip
        Computer    = $event.Computer
        Count       = 1
      }) | Out-Null
    }
  }

  $privKeys = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($event in @($Events | Where-Object { $_.EventId -eq 4672 })) {
    $account = if ($event.Account) { $event.Account } else { $event.TargetAccount }
    if (Test-IsMachineAccount $account) { continue }
    $key = "$account|$($event.Time.ToString('yyyy-MM-dd'))"
    if (-not $privKeys.Add($key)) { continue }
    $alerts.Add([pscustomobject]@{
      Id          = "priv-$key"
      Rule        = 'privileged_logon'
      Severity    = 'medium'
      Title       = "Privileged logon: $account"
      Description = 'Special privileges were assigned to a new logon (event 4672).'
      Time        = $event.Time
      Account     = $account
      Ip          = $event.Ip
      Computer    = $event.Computer
      Count       = 1
    }) | Out-Null
  }

  foreach ($event in @($Events | Where-Object { @(4728, 4732, 4756) -contains $_.EventId })) {
    $group = ("$($event.TargetAccount) $($event.Message)").ToLowerInvariant()
    $hit = $false
    foreach ($name in $script:SensitiveGroups) {
      if ($group.Contains($name)) { $hit = $true; break }
    }
    if ($hit) {
      $who = if ($event.CallerAccount) { $event.CallerAccount } else { $event.Account }
      $alerts.Add([pscustomobject]@{
        Id          = "group-$($event.Uid)"
        Rule        = 'sensitive_group'
        Severity    = 'critical'
        Title       = 'Sensitive group membership changed'
        Description = "$who changed membership involving $(if ($event.TargetAccount) { $event.TargetAccount } else { 'a privileged group' })."
        Time        = $event.Time
        Account     = $who
        Ip          = $event.Ip
        Computer    = $event.Computer
        Count       = 1
      }) | Out-Null
    }
  }

  foreach ($event in @($Events | Where-Object { $_.EventId -eq 4648 })) {
    if (Test-IsMachineAccount $event.Account) { continue }
    $who = if ($event.CallerAccount) { $event.CallerAccount } else { $event.Account }
    $alerts.Add([pscustomobject]@{
      Id          = "explicit-$($event.Uid)"
      Rule        = 'explicit_credentials'
      Severity    = 'medium'
      Title       = "Explicit credentials used by $who"
      Description = 'A process logged on with alternate credentials (possible lateral movement).'
      Time        = $event.Time
      Account     = $who
      Ip          = $event.Ip
      Computer    = $event.Computer
      Count       = 1
    }) | Out-Null
  }

  foreach ($event in $failures) {
    if ($event.Status.ToUpperInvariant() -eq '0xC0000072' -or $event.FailureReason.ToLowerInvariant().Contains('disabled')) {
      $alerts.Add([pscustomobject]@{
        Id          = "disabled-$($event.Uid)"
        Rule        = 'disabled_account'
        Severity    = 'high'
        Title       = "Logon attempted with disabled account $($event.Account)"
        Description = 'A disabled account was used in an authentication attempt.'
        Time        = $event.Time
        Account     = $event.Account
        Ip          = $event.Ip
        Computer    = $event.Computer
        Count       = 1
      }) | Out-Null
    }
  }

  foreach ($event in $logons) {
    if ($event.LogonType -eq 10 -and (Test-IsPublicIp $event.Ip)) {
      $alerts.Add([pscustomobject]@{
        Id          = "rdp-ext-$($event.Uid)"
        Rule        = 'external_rdp'
        Severity    = 'high'
        Title       = "RDP from public IP $($event.Ip)"
        Description = "$($event.Account) opened a Remote Desktop session from a non-private address."
        Time        = $event.Time
        Account     = $event.Account
        Ip          = $event.Ip
        Computer    = $event.Computer
        Count       = 1
      }) | Out-Null
    }
  }

  $seenIps = @{}
  foreach ($event in @($logons | Sort-Object Time)) {
    if (-not $event.Account -or -not $event.Ip -or (Test-IsMachineAccount $event.Account)) { continue }
    if ($script:InteractiveLogonTypes -notcontains $event.LogonType) { continue }
    if (-not $seenIps.ContainsKey($event.Account)) { $seenIps[$event.Account] = [System.Collections.Generic.HashSet[string]]::new() }
    $known = $seenIps[$event.Account]
    if ($known.Count -ge 2 -and -not $known.Contains($event.Ip)) {
      $alerts.Add([pscustomobject]@{
        Id          = "newsrc-$($event.Uid)"
        Rule        = 'new_source'
        Severity    = $(if (Test-IsPublicIp $event.Ip) { 'high' } else { 'medium' })
        Title       = "New source for $($event.Account)"
        Description = "$($event.Account) signed in from $($event.Ip), which was not used in earlier sessions."
        Time        = $event.Time
        Account     = $event.Account
        Ip          = $event.Ip
        Computer    = $event.Computer
        Count       = 1
      }) | Out-Null
    }
    [void]$known.Add($event.Ip)
  }

  $rank = @{ critical = 0; high = 1; medium = 2; low = 3 }
  $seen = [System.Collections.Generic.HashSet[string]]::new()
  return @(
    $alerts |
      Where-Object { $seen.Add($_.Id) } |
      Sort-Object @{ Expression = { $rank[$_.Severity] } }, @{ Expression = 'Time'; Descending = $true }
  )
}

function Get-EventUserProfiles {
  param($Events, $Alerts, $Sessions)

  $names = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($event in @($Events)) {
    foreach ($name in @($event.Account, $event.TargetAccount, $event.CallerAccount)) {
      if ($name -and -not (Test-IsMachineAccount $name)) { [void]$names.Add($name) }
    }
  }

  $interactive = @($Sessions | Where-Object { $script:InteractiveLogonTypes -contains $_.LogonType })
  $profiles = New-Object System.Collections.Generic.List[object]

  foreach ($account in $names) {
    $related = @($Events | Where-Object { $_.Account -eq $account -or $_.TargetAccount -eq $account -or $_.CallerAccount -eq $account })
    $logons = @($related | Where-Object { (Test-IsSuccessfulLogon $_) -and $_.Account -eq $account })
    $failures = @($related | Where-Object { $_.EventId -eq 4625 })
    $userSessions = @($interactive | Where-Object { $_.Account -eq $account })
    $sources = @($logons | ForEach-Object { if ($_.Ip) { $_.Ip } else { $_.Workstation } } | Where-Object { $_ } | Select-Object -Unique)
    $afterHours = @($logons | Where-Object { $script:InteractiveLogonTypes -contains $_.LogonType -and (Test-IsAfterHours $_.Time) }).Count
    $lockouts = @($related | Where-Object { $_.EventId -eq 4740 }).Count
    $privileged = @($related | Where-Object { $_.EventId -eq 4672 -or $_.Elevated }).Count -gt 0
    $publicRdp = @($logons | Where-Object { $_.LogonType -eq 10 -and (Test-IsPublicIp $_.Ip) }).Count -gt 0
    $userAlerts = @($Alerts | Where-Object {
        @($_.Account.Split(',') | ForEach-Object { $_.Trim() }) -contains $account
      })
    $sessionTimeMs = 0.0
    foreach ($session in $userSessions) {
      if ($session.DurationMs) { $sessionTimeMs += $session.DurationMs }
    }
    $times = @($logons | Sort-Object Time | ForEach-Object { $_.Time })

    $reasons = New-Object System.Collections.Generic.List[string]
    $score = 0
    if ($failures.Count -ge 3) {
      $score += [Math]::Min(30, $failures.Count * 2)
      $reasons.Add("$($failures.Count) failed logons") | Out-Null
    }
    if ($lockouts -gt 0) { $score += 25; $reasons.Add('account lockout') | Out-Null }
    if ($afterHours -gt 0) {
      $score += [Math]::Min(20, $afterHours * 6)
      $reasons.Add('after-hours access') | Out-Null
    }
    if ($publicRdp) { $score += 25; $reasons.Add('RDP from a public IP') | Out-Null }
    if ($privileged) { $score += 8; $reasons.Add('privileged logon') | Out-Null }
    if (@($userAlerts | Where-Object { $_.Rule -in @('brute_force', 'password_spray') }).Count -gt 0) {
      $score += 20
      $reasons.Add('password attack') | Out-Null
    }
    if (@($userAlerts | Where-Object { $_.Rule -eq 'sensitive_group' }).Count -gt 0) {
      $score += 20
      $reasons.Add('sensitive group change') | Out-Null
    }
    $score = [Math]::Min(100, $score)
    $label = if ($score -ge 70) { 'critical' } elseif ($score -ge 40) { 'high' } elseif ($score -ge 20) { 'medium' } else { 'low' }

    $profiles.Add([pscustomobject]@{
      Account          = $account
      Domain           = $(if ($logons.Count -and $logons[0].Domain) { $logons[0].Domain } elseif ($related.Count) { $related[0].Domain } else { '' })
      FirstLogon       = $(if ($times.Count) { $times[0] } else { $null })
      LastLogon        = $(if ($times.Count) { $times[-1] } else { $null })
      SuccessfulLogons = $logons.Count
      FailedLogons     = $failures.Count
      RdpLogons        = @($logons | Where-Object { $_.LogonType -eq 10 }).Count
      AfterHours       = $afterHours
      Lockouts         = $lockouts
      SessionTimeMs    = $sessionTimeMs
      OpenSessions     = @($userSessions | Where-Object { $_.Status -eq 'active' }).Count
      Sources          = $sources
      Privileged       = $privileged
      AlertCount       = $userAlerts.Count
      RiskScore        = $score
      RiskLabel        = $label
      RiskReasons      = @($reasons)
    }) | Out-Null
  }

  return @($profiles | Sort-Object RiskScore, LastLogon -Descending)
}

function Get-EventStats {
  param($Events, $Alerts, $Sessions)

  $logons = @($Events | Where-Object { Test-IsSuccessfulLogon $_ })
  $failures = @($Events | Where-Object { $_.EventId -eq 4625 })
  $users = [System.Collections.Generic.HashSet[string]]::new()
  $sources = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($event in @($Events)) {
    if ($event.Account -and -not (Test-IsMachineAccount $event.Account)) { [void]$users.Add($event.Account) }
    if ($event.Ip) { [void]$sources.Add($event.Ip) }
  }
  $afterHours = @($logons | Where-Object {
      $script:InteractiveLogonTypes -contains $_.LogonType -and (Test-IsAfterHours $_.Time)
    }).Count
  $open = @($Sessions | Where-Object {
      $_.Status -eq 'active' -and $script:InteractiveLogonTypes -contains $_.LogonType
    }).Count
  $times = @($Events | Sort-Object Time | ForEach-Object { $_.Time })

  [pscustomobject]@{
    TotalEvents       = @($Events).Count
    SuccessfulLogons  = $logons.Count
    FailedLogons      = $failures.Count
    UniqueUsers       = $users.Count
    UniqueSources     = $sources.Count
    Lockouts          = @($Events | Where-Object { $_.EventId -eq 4740 }).Count
    RdpLogons         = @($logons | Where-Object { $_.LogonType -eq 10 }).Count
    PrivilegedLogons  = @($Events | Where-Object { $_.EventId -eq 4672 }).Count
    OpenSessions      = $open
    AfterHours        = $afterHours
    Alerts            = @($Alerts).Count
    CriticalAlerts    = @($Alerts | Where-Object { $_.Severity -eq 'critical' }).Count
    Crashes           = @($Events | Where-Object { $_.Category -eq 'crash' }).Count
    Reboots           = @($Events | Where-Object { $_.EventId -in @(1074, 6008, 41, 12, 6005) }).Count
    FileEvents        = @($Events | Where-Object { $_.Category -eq 'file' }).Count
    NetworkEvents     = @($Events | Where-Object { $_.Category -eq 'network' }).Count
    FirstEvent        = $(if ($times.Count) { $times[0] } else { $null })
    LastEvent         = $(if ($times.Count) { $times[-1] } else { $null })
  }
}

function Get-LogonHeatmap {
  param($Events)

  $cells = @{}
  for ($day = 0; $day -lt 7; $day++) {
    for ($hour = 0; $hour -lt 24; $hour++) {
      $cells["$day-$hour"] = 0
    }
  }
  foreach ($event in @($Events)) {
    if (@(4624, 21, 7001) -notcontains $event.EventId) { continue }
    if (Test-IsMachineAccount $event.Account) { continue }
    if ($script:InteractiveLogonTypes -notcontains $event.LogonType) { continue }
    $local = $event.Time.ToLocalTime()
    $key = "$([int]$local.DayOfWeek)-$($local.Hour)"
    $cells[$key]++
  }
  return $cells
}

function Get-LogonsByType {
  param($Events)
  $counts = @{}
  foreach ($event in @($Events | Where-Object { Test-IsSuccessfulLogon $_ })) {
    $label = if ($event.LogonTypeName) { $event.LogonTypeName } else { 'Unknown' }
    if (-not $counts.ContainsKey($label)) { $counts[$label] = 0 }
    $counts[$label]++
  }
  return @($counts.GetEnumerator() | Sort-Object Value -Descending)
}

function Get-TopFailedAccounts {
  param($Events, [int]$Limit = 8)
  $counts = @{}
  foreach ($event in @($Events | Where-Object { $_.EventId -eq 4625 })) {
    if (-not $event.Account -or (Test-IsMachineAccount $event.Account)) { continue }
    if (-not $counts.ContainsKey($event.Account)) { $counts[$event.Account] = 0 }
    $counts[$event.Account]++
  }
  return @($counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First $Limit)
}

function Format-DurationMs($ms) {
  if ($null -eq $ms) { return '' }
  $ts = [TimeSpan]::FromMilliseconds([double]$ms)
  if ($ts.TotalHours -ge 24) { return ('{0}d {1:d2}h {2:d2}m' -f [int]$ts.TotalDays, $ts.Hours, $ts.Minutes) }
  if ($ts.TotalHours -ge 1) { return ('{0:d2}h {1:d2}m' -f [int][Math]::Floor($ts.TotalHours), $ts.Minutes) }
  if ($ts.TotalMinutes -ge 1) { return ('{0}m {1:d2}s' -f $ts.Minutes, $ts.Seconds) }
  return ('{0}s' -f $ts.Seconds)
}

function Format-EventDetail($event) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("Time        : $($event.TimeText)") | Out-Null
  $lines.Add("Event ID    : $($event.EventId)  $($event.Title)") | Out-Null
  $lines.Add("Category    : $($event.Category)") | Out-Null
  $lines.Add("Channel     : $($event.Channel)") | Out-Null
  $lines.Add("Computer    : $($event.Computer)") | Out-Null
  $lines.Add("Provider    : $($event.Provider)") | Out-Null
  $lines.Add("Account     : $(if ($event.Domain) { "$($event.Domain)\$($event.Account)" } else { $event.Account })") | Out-Null
  if ($event.CallerAccount) { $lines.Add("Caller      : $($event.CallerAccount)") | Out-Null }
  if ($event.TargetAccount -and $event.TargetAccount -ne $event.Account) { $lines.Add("Target      : $($event.TargetAccount)") | Out-Null }
  if ($event.LogonTypeName) { $lines.Add("Logon type  : $($event.LogonType) $($event.LogonTypeName)") | Out-Null }
  if ($event.Ip) { $lines.Add("IP address  : $($event.Ip)") | Out-Null }
  if ($event.Workstation) { $lines.Add("Workstation : $($event.Workstation)") | Out-Null }
  if ($event.AuthPackage) { $lines.Add("Auth        : $($event.AuthPackage)") | Out-Null }
  if ($event.FailureReason) { $lines.Add("Failure     : $($event.FailureReason) $($event.Status) $($event.SubStatus)") | Out-Null }
  if ($event.ProcessName) { $lines.Add("Process     : $($event.ProcessName)") | Out-Null }
  if ($event.ObjectName) { $lines.Add("Object      : $($event.ObjectName)") | Out-Null }
  if ($event.DeviceName) { $lines.Add("Device      : $($event.DeviceName)") | Out-Null }
  if ($event.AccessMask) { $lines.Add("Access      : $($event.AccessMask)") | Out-Null }
  if ($event.LogonId) { $lines.Add("Logon ID    : $($event.LogonId)") | Out-Null }
  $lines.Add('') | Out-Null
  $lines.Add($event.Message) | Out-Null
  if ($event.Data -and $event.Data.Keys.Count -gt 0) {
    $lines.Add('') | Out-Null
    $lines.Add('--- Event data ---') | Out-Null
    foreach ($key in ($event.Data.Keys | Sort-Object)) {
      $lines.Add(('{0,-24} {1}' -f $key, $event.Data[$key])) | Out-Null
    }
  }
  return ($lines -join [Environment]::NewLine)
}

function Test-EventUserMatch($event, [string]$user) {
  if ([string]::IsNullOrWhiteSpace($user) -or $user -eq 'All users' -or $user -eq 'Everyone') { return $true }
  $name = $user.ToLowerInvariant()
  if ($name.EndsWith(' (local)')) { $name = $name.Substring(0, $name.Length - 8) }
  foreach ($candidate in @($event.Account, $event.TargetAccount, $event.CallerAccount)) {
    if ($candidate -and $candidate.ToLowerInvariant() -eq $name) { return $true }
  }
  return $false
}

function Test-EventPreset {
  param($Event, [string]$Preset)
  if (-not $Preset -or $Preset -eq 'All events' -or $Preset -eq 'Everything') { return $true }
  $id = $Event.EventId
  $cat = [string]$Event.Category
  $msg = [string]$Event.Message
  $ch = [string]$Event.Channel
  switch ($Preset) {
    'Sign-ins (tried or succeeded)' { return @(4624, 4625, 4648, 4771, 4776, 4768, 21, 7001) -contains $id }
    'Successful sign-ins' { return (Test-IsSuccessfulLogon $Event) }
    'Failed sign-ins' { return @(4625, 4771) -contains $id }
    'Time spent signed in' { return @(4624, 4634, 4647, 21, 23, 7001, 7002, 4778, 4779, 4800, 4801) -contains $id }
    'Remote Desktop' { return ($Event.LogonType -eq 10) -or ($ch -match 'TerminalServices') -or (@(21, 22, 23, 24, 25, 4778, 4779) -contains $id) }
    'Files deleted or opened' {
      return ($cat -eq 'file') -or (@(4659, 4660, 4663, 5140, 5145) -contains $id) -or ($msg -match 'deleted|Delete|Recycle')
    }
    'Network or Wi-Fi' {
      return ($cat -eq 'network') -or ($ch -match 'NetworkProfile|WLAN|Dhcp|NDIS|Tcpip') -or ($msg -match 'adapter|media disconnected|media connected|Wi-Fi|SSID|DHCP')
    }
    'USB sticks and devices' {
      return ($cat -in @('usb', 'hardware')) -or ($ch -match 'PnP|DriverFrameworks|USB') -or ($msg -match 'USB|removable|device started|device removed')
    }
    'Programs installed or updated' { return ($cat -eq 'software') -or (@(1033, 1034, 11707, 11724, 19, 43) -contains $id) }
    'Restarts and sleep' { return ($cat -eq 'power') -or (@(12, 13, 41, 42, 1074, 1076, 6005, 6006, 6008, 6009) -contains $id) }
    'Apps that crashed' { return ($cat -eq 'crash') -or (@(1000, 1001, 1002, 7031, 7034) -contains $id) }
    'Firewall changes' { return ($cat -eq 'firewall') -or (@(4946, 4947, 4950, 2004, 2005, 2006) -contains $id) }
    'Services and tasks' { return ($cat -eq 'service') -or ($cat -eq 'process') -or (@(7045, 7040, 7036, 4697, 4698, 4699, 4688) -contains $id) }
    'Account changes' { return ($cat -in @('account', 'group', 'lockout')) }
    'Logs erased or clock changed' { return (@(104, 1102, 4616) -contains $id) }
    default { return $true }
  }
}

function Get-LocalComputerUsers {
  $list = New-Object System.Collections.Generic.List[object]
  $admins = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  try {
    foreach ($member in @(Get-LocalGroupMember -Group 'Administrators' -ErrorAction Stop)) {
      $short = ($member.Name -split '\\')[-1]
      [void]$admins.Add($short)
    }
  } catch { }

  try {
    foreach ($user in @(Get-LocalUser -ErrorAction Stop)) {
      $list.Add([pscustomobject]@{
          Name              = $user.Name
          FullName          = [string]$user.FullName
          Enabled           = [bool]$user.Enabled
          Description       = [string]$user.Description
          LastLogon         = $user.LastLogon
          PasswordRequired  = [bool]$user.PasswordRequired
          PasswordExpires   = $user.PasswordExpires
          UserMayChangePass = [bool]$user.UserMayChangePassword
          PrincipalSource   = [string]$user.PrincipalSource
          Admin             = $admins.Contains($user.Name)
          Local             = $true
        }) | Out-Null
    }
  } catch {
    try {
      $adsi = [ADSI]'WinNT://./,computer'
      foreach ($child in $adsi.Children) {
        if ($child.SchemaClassName -ne 'User') { continue }
        $name = $child.Name.Value
        $list.Add([pscustomobject]@{
            Name              = $name
            FullName          = ''
            Enabled           = $true
            Description       = [string]$child.Description.Value
            LastLogon         = $null
            PasswordRequired  = $true
            PasswordExpires   = $null
            UserMayChangePass = $true
            PrincipalSource   = 'Local'
            Admin             = $admins.Contains($name)
            Local             = $true
          }) | Out-Null
      }
    } catch { }
  }
  return @($list | Sort-Object Name)
}

function Get-ConnectionSummary {
  param($Sessions, $Events)

  $byUser = @{}
  foreach ($session in @($Sessions)) {
    if (-not $session.Account -or (Test-IsMachineAccount $session.Account)) { continue }
    if (-not $byUser.ContainsKey($session.Account)) {
      $byUser[$session.Account] = [pscustomobject]@{
        Account      = $session.Account
        Sessions     = 0
        Active       = 0
        TotalMs      = 0.0
        First        = $session.Start
        Last         = $session.Start
        LastEnd      = $session.End
        Types        = [System.Collections.Generic.HashSet[string]]::new()
        Failed       = 0
        Sources      = [System.Collections.Generic.HashSet[string]]::new()
      }
    }
    $row = $byUser[$session.Account]
    $row.Sessions++
    if ($session.Status -eq 'active') { $row.Active++ }
    if ($session.DurationMs) { $row.TotalMs += $session.DurationMs }
    if ($session.Start -lt $row.First) { $row.First = $session.Start }
    if ($session.Start -gt $row.Last) { $row.Last = $session.Start }
    if ($session.LogonTypeName) { [void]$row.Types.Add($session.LogonTypeName) }
    $src = if ($session.Ip) { $session.Ip } else { $session.Workstation }
    if ($src) { [void]$row.Sources.Add($src) }
  }
  foreach ($event in @($Events | Where-Object { $_.EventId -eq 4625 })) {
    if (-not $event.Account -or (Test-IsMachineAccount $event.Account)) { continue }
    if (-not $byUser.ContainsKey($event.Account)) {
      $byUser[$event.Account] = [pscustomobject]@{
        Account  = $event.Account
        Sessions = 0
        Active   = 0
        TotalMs  = 0.0
        First    = $event.Time
        Last     = $event.Time
        LastEnd  = $null
        Types    = [System.Collections.Generic.HashSet[string]]::new()
        Failed   = 0
        Sources  = [System.Collections.Generic.HashSet[string]]::new()
      }
    }
    $byUser[$event.Account].Failed++
  }
  foreach ($row in $byUser.Values) {
    $row | Add-Member -NotePropertyName TypeText -NotePropertyValue ((@($row.Types) | Sort-Object) -join ', ') -Force
    $row | Add-Member -NotePropertyName SourceText -NotePropertyValue ((@($row.Sources) | Select-Object -First 4) -join ', ') -Force
  }
  return @($byUser.Values | Sort-Object Last -Descending)
}

