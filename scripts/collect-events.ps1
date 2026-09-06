param(
  [string]$Path,
  [string]$OutFile,
  [int]$Days = 14,
  [int]$MaxEvents = 8000,
  [string]$LogName = "Security",
  [string]$EventIds = "4624,4625,4634,4647,4648,4672,4720,4722,4723,4724,4725,4726,4728,4729,4732,4733,4738,4740,4756,4767,4768,4769,4771,4776,4778,4779,4781,4800,4801"
)

$ErrorActionPreference = "Continue"
$idList = @($EventIds.Split(",") | ForEach-Object { [int]$_.Trim() })
$warnings = @()

function Resolve-Sid([string]$sid) {
  if (-not $sid) { return "" }
  try {
    return ([System.Security.Principal.SecurityIdentifier]$sid).Translate([System.Security.Principal.NTAccount]).Value
  } catch {
    return $sid
  }
}

function Convert-Event($event) {
  $dataObj = New-Object PSObject
  try {
    $xml = [xml]$event.ToXml()
    foreach ($node in $xml.Event.EventData.Data) {
      $name = [string]$node.Name
      if ($name) {
        Add-Member -InputObject $dataObj -NotePropertyName $name -NotePropertyValue ([string]$node.'#text') -Force
      }
    }
    if ($xml.Event.UserData -and $xml.Event.UserData.FirstChild) {
      foreach ($node in $xml.Event.UserData.FirstChild.ChildNodes) {
        if ($node.Name -and $node.Name -ne "#text") {
          Add-Member -InputObject $dataObj -NotePropertyName $node.Name -NotePropertyValue ([string]$node.InnerText) -Force
        }
      }
    }
  } catch {
    # Keep the event even if XML parsing fails.
  }

  $userSid = $dataObj.UserSid
  if ($userSid) {
    $resolved = Resolve-Sid $userSid
    if ($resolved) {
      Add-Member -InputObject $dataObj -NotePropertyName "User" -NotePropertyValue $resolved -Force
    }
  }

  return [pscustomobject]@{
    recordId = $event.RecordId
    eventId = $event.Id
    time = $event.TimeCreated.ToUniversalTime().ToString("o")
    computer = $event.MachineName
    channel = $event.LogName
    provider = $event.ProviderName
    data = $dataObj
    message = $event.Message
  }
}

function Collect-Log($logName, $ids, $max) {
  $filter = @{
    LogName = $logName
    StartTime = (Get-Date).AddDays(-1 * $Days)
  }
  if ($ids -and $ids.Count -gt 0) { $filter.Id = $ids }
  try {
    return @(Get-WinEvent -FilterHashtable $filter -MaxEvents $max -ErrorAction Stop)
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match "unauthorized|Access is denied|access denied") {
      $script:warnings += "Cannot read $logName without Administrator."
    } elseif ($msg -notmatch "No events were found") {
      $script:warnings += "${logName}: $msg"
    }
    return @()
  }
}

$payload = @()

if ($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "EVTX file not found: $Path"
  }
  try {
    $events = Get-WinEvent -FilterHashtable @{ Path = $Path; Id = $idList } -MaxEvents $MaxEvents -ErrorAction Stop
    foreach ($event in @($events)) { $payload += Convert-Event $event }
  } catch {
    if ($_.Exception.Message -notmatch "No events were found") {
      Write-Error $_.Exception.Message
      exit 1
    }
  }
} else {
  $channels = @(
    @{ Name = "Security"; Ids = $idList; Max = $MaxEvents },
    @{ Name = "Microsoft-Windows-TerminalServices-LocalSessionManager/Operational"; Ids = @(21, 22, 23, 24, 25, 39, 40, 41); Max = 4000 },
    @{ Name = "System"; Ids = @(7001, 7002); Max = 2000 }
  )
  foreach ($channel in $channels) {
    $events = Collect-Log $channel.Name $channel.Ids $channel.Max
    foreach ($event in $events) { $payload += Convert-Event $event }
  }
}

foreach ($warning in $warnings) {
  [Console]::Error.WriteLine($warning)
}

$json = if ($payload.Count -eq 0) { "[]" } else { @($payload) | ConvertTo-Json -Depth 6 -Compress }
if ($OutFile) {
  $dir = Split-Path -Parent $OutFile
  if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($OutFile, $json)
} else {
  Write-Output $json
}

if ($payload.Count -eq 0 -and $warnings.Count -gt 0) {
  exit 1
}
