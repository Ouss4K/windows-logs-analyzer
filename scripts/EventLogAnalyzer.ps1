#Requires -Version 5.1
param(
  [switch]$CollectOnly,
  [int]$Days = 7,
  [int]$MaxEvents = 400,
  [string]$Mode = 'Investigation'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:EnginePath = Join-Path $PSScriptRoot 'EventLogEngine.ps1'
. $script:EnginePath

if ($CollectOnly) {
  $result = Invoke-EventCollection -Days $Days -MaxEvents $MaxEvents -Mode $Mode
  $alerts = Get-EventAlerts -Events $result.Events
  Write-Output ("Events={0} Warnings={1} Alerts={2}" -f $result.Count, ($result.Warnings -join '; '), @($alerts).Count)
  if ($result.Warnings) { $result.Warnings | ForEach-Object { Write-Warning $_ } }
  exit 0
}

if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
  $exe = (Get-Process -Id $PID).Path
  $argList = @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath) + $args
  Start-Process -FilePath $exe -ArgumentList $argList
  exit
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:C = @{
  Bg      = [Drawing.Color]::FromArgb(15, 18, 28)
  Header  = [Drawing.Color]::FromArgb(11, 14, 22)
  Nav     = [Drawing.Color]::FromArgb(17, 21, 32)
  Panel   = [Drawing.Color]::FromArgb(22, 27, 40)
  Panel2  = [Drawing.Color]::FromArgb(28, 35, 52)
  Border  = [Drawing.Color]::FromArgb(42, 52, 73)
  Text    = [Drawing.Color]::FromArgb(226, 232, 240)
  Muted   = [Drawing.Color]::FromArgb(148, 163, 184)
  Accent  = [Drawing.Color]::FromArgb(56, 189, 248)
  Accent2 = [Drawing.Color]::FromArgb(14, 116, 144)
  Ok      = [Drawing.Color]::FromArgb(52, 211, 153)
  Warn    = [Drawing.Color]::FromArgb(251, 191, 36)
  High    = [Drawing.Color]::FromArgb(251, 146, 60)
  Danger  = [Drawing.Color]::FromArgb(248, 113, 113)
  Grid    = [Drawing.Color]::FromArgb(17, 24, 39)
  Row     = [Drawing.Color]::FromArgb(22, 27, 40)
  RowAlt  = [Drawing.Color]::FromArgb(26, 32, 48)
}

$script:Ui = @{}
$script:Data = @{
  Events   = @()
  Alerts   = @()
  Sessions = @()
  Users    = @()
  Stats    = $null
  Heatmap  = @{}
  Types    = @()
  Failed   = @()
  Index    = @{}
  View     = 'Dashboard'
  Busy     = $false
  Work     = $null
  LocalUsers = @()
  Connections = @()
  UpdatingFilters = $false
}

$script:FontUi    = New-Object Drawing.Font('Segoe UI', 9)
$script:FontTitle = New-Object Drawing.Font('Segoe UI Semibold', 16)
$script:FontSub   = New-Object Drawing.Font('Segoe UI', 9)
$script:FontKpi   = New-Object Drawing.Font('Segoe UI Semibold', 18)
$script:FontSmall = New-Object Drawing.Font('Segoe UI', 8)
$script:FontMono  = New-Object Drawing.Font('Consolas', 9)
$script:FontNav   = New-Object Drawing.Font('Segoe UI Semibold', 10)
$script:FontCard  = New-Object Drawing.Font('Segoe UI', 8.25)

function Enable-DoubleBuffer {
  param($Control)
  try {
    $prop = $Control.GetType().GetProperty('DoubleBuffered', [Reflection.BindingFlags]'NonPublic,Instance')
    if ($prop) { $prop.SetValue($Control, $true, $null) }
  } catch { }
}

function New-UiButton {
  param($Text, $Back, $Fore, [int]$Width = 118, [int]$Height = 32)
  $b = New-Object Windows.Forms.Button
  $b.Text = $Text
  $b.FlatStyle = 'Flat'
  $b.FlatAppearance.BorderSize = 0
  $b.BackColor = $Back
  $b.ForeColor = $Fore
  $b.Width = $Width
  $b.Height = $Height
  $b.Font = $script:FontUi
  $b.Cursor = [Windows.Forms.Cursors]::Hand
  $b.TabStop = $false
  return $b
}

function New-UiLabel {
  param($Text, $Font, $Color, [Drawing.ContentAlignment]$Align = 'MiddleLeft')
  $l = New-Object Windows.Forms.Label
  $l.Text = $Text
  $l.Font = $Font
  $l.ForeColor = $Color
  $l.BackColor = [Drawing.Color]::Transparent
  $l.TextAlign = $Align
  $l.AutoSize = $false
  return $l
}

function New-DarkCombo([int]$Width = 160) {
  $c = New-Object Windows.Forms.ComboBox
  $c.DropDownStyle = 'DropDownList'
  $c.FlatStyle = 'Flat'
  $c.BackColor = $script:C.Panel2
  $c.ForeColor = $script:C.Text
  $c.Width = $Width
  $c.Height = 26
  $c.Font = $script:FontUi
  return $c
}

function New-DarkGrid {
  $g = New-Object Windows.Forms.DataGridView
  Enable-DoubleBuffer $g
  $g.BackgroundColor = $script:C.Grid
  $g.BorderStyle = 'None'
  $g.CellBorderStyle = 'SingleHorizontal'
  $g.GridColor = $script:C.Border
  $g.EnableHeadersVisualStyles = $false
  $g.ColumnHeadersHeight = 34
  $g.ColumnHeadersHeightSizeMode = 'DisableResizing'
  $g.ColumnHeadersDefaultCellStyle.BackColor = [Drawing.Color]::FromArgb(30, 41, 59)
  $g.ColumnHeadersDefaultCellStyle.ForeColor = $script:C.Muted
  $g.ColumnHeadersDefaultCellStyle.Font = $script:FontCard
  $g.ColumnHeadersDefaultCellStyle.SelectionBackColor = [Drawing.Color]::FromArgb(30, 41, 59)
  $g.ColumnHeadersBorderStyle = 'None'
  $g.DefaultCellStyle.BackColor = $script:C.Row
  $g.DefaultCellStyle.ForeColor = $script:C.Text
  $g.DefaultCellStyle.SelectionBackColor = [Drawing.Color]::FromArgb(14, 116, 144)
  $g.DefaultCellStyle.SelectionForeColor = $script:C.Text
  $g.DefaultCellStyle.Font = $script:FontUi
  $g.AlternatingRowsDefaultCellStyle.BackColor = $script:C.RowAlt
  $g.AlternatingRowsDefaultCellStyle.ForeColor = $script:C.Text
  $g.AlternatingRowsDefaultCellStyle.SelectionBackColor = [Drawing.Color]::FromArgb(14, 116, 144)
  $g.RowHeadersVisible = $false
  $g.AllowUserToAddRows = $false
  $g.AllowUserToDeleteRows = $false
  $g.AllowUserToResizeRows = $false
  $g.ReadOnly = $true
  $g.SelectionMode = 'FullRowSelect'
  $g.MultiSelect = $false
  $g.AutoSizeColumnsMode = 'Fill'
  $g.RowTemplate.Height = 30
  $g.Dock = 'Fill'
  return $g
}

function Set-UiBusy([bool]$busy, [string]$text = '') {
  $script:Ui.LoadBtn.Enabled = -not $busy
  $script:Ui.EvtxBtn.Enabled = -not $busy
  $script:Ui.ExportBtn.Enabled = -not $busy
  $script:Ui.AdminBtn.Enabled = -not $busy
  $script:Ui.Form.UseWaitCursor = $busy
  if ($text) { $script:Ui.Status.Text = $text }
}

function Show-View([string]$name) {
  $script:Data.View = $name
  $script:Ui.DashPanel.Visible = $name -eq 'Dashboard'
  $script:Ui.EventsPanel.Visible = $name -eq 'Events'
  $script:Ui.AlertsPanel.Visible = $name -eq 'Alerts'
  $script:Ui.SessionsPanel.Visible = $name -eq 'Sessions'
  $script:Ui.UsersPanel.Visible = $name -eq 'Users'
  $script:Ui.LocalPanel.Visible = $name -eq 'Local'
  $script:Ui.TimePanel.Visible = $name -eq 'Time'
  foreach ($item in $script:Ui.NavButtons.GetEnumerator()) {
    $on = $item.Key -eq $name
    $item.Value.BackColor = if ($on) { $script:C.Accent2 } else { $script:C.Nav }
    $item.Value.ForeColor = if ($on) { $script:C.Text } else { $script:C.Muted }
  }
}

function Get-SelectedUser {
  if (-not $script:Ui.FilterUser -or $null -eq $script:Ui.FilterUser.SelectedItem) { return '' }
  $item = [string]$script:Ui.FilterUser.SelectedItem
  if ([string]::IsNullOrWhiteSpace($item) -or $item -eq 'All users' -or $item -eq 'Everyone') { return '' }
  return $item.Replace(' (local)', '')
}

function Get-CollectionMode {
  switch ([string]$script:Ui.Mode.SelectedItem) {
    'This PC (recommended)' { return 'Investigation' }
    'Sign-in log' { return 'Security' }
    'Apps' { return 'Application' }
    'Windows system' { return 'System' }
    'Setup' { return 'Setup' }
    default { return 'Investigation' }
  }
}

function Request-FilterRefresh {
  if ($script:Data.UpdatingFilters) { return }
  if (-not $script:Ui.EventsGrid) { return }
  Update-AllViews
}

function Get-VisibleEvents {
  $q = if ($script:Ui.Search) { $script:Ui.Search.Text.Trim() } else { '' }
  $hideMachines = $script:Ui.HideMachines -and $script:Ui.HideMachines.Checked
  $user = Get-SelectedUser
  $preset = if ($script:Ui.FilterWhat) { [string]$script:Ui.FilterWhat.SelectedItem } else { 'Everything' }
  $logon = if ($script:Ui.FilterLogon) { [string]$script:Ui.FilterLogon.SelectedItem } else { 'Any' }
  $from = $null
  $to = $null
  if ($script:Ui.FilterFrom -and $script:Ui.FilterFrom.Checked) { $from = $script:Ui.FilterFrom.Value }
  if ($script:Ui.FilterTo -and $script:Ui.FilterTo.Checked) { $to = $script:Ui.FilterTo.Value }

  $list = @($script:Data.Events)
  if ($hideMachines -and -not $user) {
    $list = @($list | Where-Object { -not (Test-IsMachineAccount $_.Account) })
  }
  if ($user) {
    $list = @($list | Where-Object { Test-EventUserMatch $_ $user })
  }
  if ($preset -and $preset -ne 'All events' -and $preset -ne 'Everything') {
    $list = @($list | Where-Object { Test-EventPreset $_ $preset })
  }
  switch ($logon) {
    'Tried to sign in' { $list = @($list | Where-Object { @(4624, 4625, 4648, 4771, 4776, 21, 7001) -contains $_.EventId }) }
    'Signed in'        { $list = @($list | Where-Object { Test-IsSuccessfulLogon $_ }) }
    'Failed'           { $list = @($list | Where-Object { @(4625, 4771) -contains $_.EventId }) }
    'Attempts only'    { $list = @($list | Where-Object { @(4624, 4625, 4648, 4771, 4776, 21, 7001) -contains $_.EventId }) }
    'Success only'     { $list = @($list | Where-Object { Test-IsSuccessfulLogon $_ }) }
    'Failed only'      { $list = @($list | Where-Object { @(4625, 4771) -contains $_.EventId }) }
  }
  if ($from) { $list = @($list | Where-Object { $_.Time -ge $from }) }
  if ($to) { $list = @($list | Where-Object { $_.Time -le $to }) }
  if ($q) {
    $q2 = $q.ToLowerInvariant()
    $list = @($list | Where-Object {
        $blob = ('{0} {1} {2} {3} {4} {5} {6} {7} {8} {9} {10}' -f $_.Account, $_.Title, $_.Ip, $_.Workstation, $_.Computer, $_.EventId, $_.Message, $_.FailureReason, $_.Channel, $_.ObjectName, $_.DeviceName)
        $blob.ToLowerInvariant().Contains($q2)
      })
  }
  return $list
}

function Get-VisibleSessions {
  $user = Get-SelectedUser
  $from = $null
  $to = $null
  if ($script:Ui.FilterFrom -and $script:Ui.FilterFrom.Checked) { $from = $script:Ui.FilterFrom.Value }
  if ($script:Ui.FilterTo -and $script:Ui.FilterTo.Checked) { $to = $script:Ui.FilterTo.Value }
  $list = @($script:Data.Sessions)
  if ($user) { $list = @($list | Where-Object { $_.Account -eq $user }) }
  if ($from) { $list = @($list | Where-Object { $_.Start -ge $from }) }
  if ($to) { $list = @($list | Where-Object { $_.Start -le $to }) }
  return $list
}

function Get-SeverityColor([string]$sev) {
  switch ($sev) {
    'critical' { return $script:C.Danger }
    'high'     { return $script:C.High }
    'medium'   { return $script:C.Warn }
    'low'      { return $script:C.Ok }
    default    { return $script:C.Muted }
  }
}

function Bind-Grid($grid, $rows, $columns) {
  $table = New-Object Data.DataTable
  foreach ($col in $columns) {
    [void]$table.Columns.Add($col)
  }
  foreach ($row in $rows) {
    [void]$table.Rows.Add([object[]]$row)
  }
  $grid.DataSource = $table
  if ($grid.Columns.Contains('Uid')) {
    $grid.Columns['Uid'].Visible = $false
  }
}

function Update-EventsGrid {
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($e in @(Get-VisibleEvents | Sort-Object Time -Descending)) {
    $extra = if ($e.ObjectName) { $e.ObjectName } elseif ($e.DeviceName) { $e.DeviceName } else { [string]$e.FailureReason }
    if ($extra -and $extra.Length -gt 70) { $extra = $extra.Substring(0, 70) }
    $rows.Add(@($e.Uid, $e.TimeText, [string]$e.EventId, $e.Title, $e.Account, $e.LogonTypeName, $e.Ip, $extra, $e.Computer, $e.Channel)) | Out-Null
  }
  Bind-Grid $script:Ui.EventsGrid $rows @('Uid', 'Time', 'ID', 'Title', 'Account', 'Logon type', 'IP', 'Object / device', 'Computer', 'Channel')
  $script:Ui.EventsCount.Text = '{0} matching rows' -f $rows.Count
}

function Update-AlertsGrid {
  $user = Get-SelectedUser
  $rows = New-Object System.Collections.Generic.List[object]
  $alerts = @($script:Data.Alerts)
  if ($user) {
    $alerts = @($alerts | Where-Object { @($_.Account.Split(',') | ForEach-Object { $_.Trim() }) -contains $user })
  }
  foreach ($a in $alerts) {
    $rows.Add(@($a.Id, $a.Severity.ToUpperInvariant(), $a.Time.ToString('yyyy-MM-dd HH:mm:ss'), $a.Title, $a.Account, $a.Ip, $a.Computer, [string]$a.Count)) | Out-Null
  }
  Bind-Grid $script:Ui.AlertsGrid $rows @('Uid', 'Severity', 'Time', 'Title', 'Account', 'IP', 'Computer', 'Count')
}

function Update-SessionsGrid {
  $rows = New-Object System.Collections.Generic.List[object]
  $sessions = @(Get-VisibleSessions)
  $totalMs = 0.0
  foreach ($s in $sessions) {
    if ($s.DurationMs) { $totalMs += $s.DurationMs }
    $end = if ($s.End) { $s.End.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
    $elev = if ($s.Elevated) { 'Yes' } else { '' }
    $rows.Add(@($s.Id, $s.Account, $s.LogonTypeName, $s.Start.ToString('yyyy-MM-dd HH:mm:ss'), $end, (Format-DurationMs $s.DurationMs), $s.Status, $s.Ip, $s.Computer, $elev)) | Out-Null
  }
  Bind-Grid $script:Ui.SessionsGrid $rows @('Uid', 'Account', 'Type', 'Start', 'End', 'Duration', 'Status', 'IP', 'Computer', 'Elevated')
  if ($script:Ui.SessionSummary) {
    $who = Get-SelectedUser
    $label = if ($who) { $who } else { 'everyone' }
    $script:Ui.SessionSummary.Text = ('{0} spent {1} signed in  |  {2} visits  |  {3} still signed in' -f $label, (Format-DurationMs $totalMs), $sessions.Count, @($sessions | Where-Object { $_.Status -eq 'active' }).Count)
  }
}

function Update-UsersGrid {
  $user = Get-SelectedUser
  $rows = New-Object System.Collections.Generic.List[object]
  $profiles = @($script:Data.Users)
  if ($user) { $profiles = @($profiles | Where-Object { $_.Account -eq $user }) }
  foreach ($u in $profiles) {
    $last = if ($u.LastLogon) { $u.LastLogon.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
    $src = (@($u.Sources) | Select-Object -First 3) -join ', '
    $rows.Add(@($u.Account, $u.Domain, [string]$u.SuccessfulLogons, [string]$u.FailedLogons, [string]$u.RdpLogons, [string]$u.AfterHours, [string]$u.RiskScore, $u.RiskLabel, $last, $src, ($u.RiskReasons -join '; '))) | Out-Null
  }
  Bind-Grid $script:Ui.UsersGrid $rows @('Account', 'Domain', 'Logons', 'Failures', 'RDP', 'After hours', 'Score', 'Risk', 'Last logon', 'Sources', 'Why')
}

function Update-LocalGrid {
  if (-not $script:Ui.LocalGrid) { return }
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($u in @($script:Data.LocalUsers)) {
    $last = if ($u.LastLogon) { $u.LastLogon.ToString('yyyy-MM-dd HH:mm') } else { '' }
    $expires = if ($u.PasswordExpires) { $u.PasswordExpires.ToString('yyyy-MM-dd') } else { 'Never' }
    $rows.Add(@(
        $u.Name,
        $u.FullName,
        $(if ($u.Enabled) { 'Enabled' } else { 'Disabled' }),
        $(if ($u.Admin) { 'Admin' } else { '' }),
        $last,
        $(if ($u.PasswordRequired) { 'Yes' } else { 'No' }),
        $expires,
        $u.Description
      )) | Out-Null
  }
  Bind-Grid $script:Ui.LocalGrid $rows @('User', 'Full name', 'Status', 'Admin', 'Last logon (SAM)', 'Password required', 'Password expires', 'Description')
  if ($script:Ui.LocalSummary) {
    $enabled = @($script:Data.LocalUsers | Where-Object { $_.Enabled }).Count
    $admins = @($script:Data.LocalUsers | Where-Object { $_.Admin }).Count
    $script:Ui.LocalSummary.Text = ('{0} local users  |  {1} enabled  |  {2} administrators' -f @($script:Data.LocalUsers).Count, $enabled, $admins)
  }
}

function Update-TimeGrid {
  if (-not $script:Ui.TimeGrid) { return }
  $user = Get-SelectedUser
  $rows = New-Object System.Collections.Generic.List[object]
  $rowsSrc = @($script:Data.Connections)
  if ($user) { $rowsSrc = @($rowsSrc | Where-Object { $_.Account -eq $user }) }
  foreach ($c in $rowsSrc) {
    $first = if ($c.First) { $c.First.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
    $last = if ($c.Last) { $c.Last.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
    $rows.Add(@($c.Account, [string]$c.Sessions, [string]$c.Active, (Format-DurationMs $c.TotalMs), [string]$c.Failed, $first, $last, $c.TypeText, $c.SourceText)) | Out-Null
  }
  Bind-Grid $script:Ui.TimeGrid $rows @('Person', 'Visits', 'Still in', 'Time on this PC', 'Failed tries', 'First time', 'Last time', 'How they signed in', 'From where')
}

function Refresh-UserCombo {
  if (-not $script:Ui.FilterUser) { return }
  $script:Data.UpdatingFilters = $true
  $keep = [string]$script:Ui.FilterUser.SelectedItem
  $script:Ui.FilterUser.Items.Clear()
  [void]$script:Ui.FilterUser.Items.Add('Everyone')
  $seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($u in @($script:Data.LocalUsers)) {
    [void]$script:Ui.FilterUser.Items.Add("$($u.Name) (local)")
    [void]$seen.Add($u.Name)
  }
  foreach ($p in @($script:Data.Users)) {
    if ($p.Account -and -not $seen.Contains($p.Account)) {
      [void]$script:Ui.FilterUser.Items.Add($p.Account)
      [void]$seen.Add($p.Account)
    }
  }
  if ($keep -and $script:Ui.FilterUser.Items.Contains($keep)) {
    $script:Ui.FilterUser.SelectedItem = $keep
  } else {
    $script:Ui.FilterUser.SelectedIndex = 0
  }
  $script:Data.UpdatingFilters = $false
}

function Clear-DiagnosticFilters {
  $script:Data.UpdatingFilters = $true
  if ($script:Ui.FilterUser.Items.Count -gt 0) { $script:Ui.FilterUser.SelectedIndex = 0 }
  if ($script:Ui.FilterWhat.Items.Count -gt 0) { $script:Ui.FilterWhat.SelectedIndex = 0 }
  if ($script:Ui.FilterLogon.Items.Count -gt 0) { $script:Ui.FilterLogon.SelectedIndex = 0 }
  $script:Ui.FilterFrom.Checked = $false
  $script:Ui.FilterTo.Checked = $false
  $script:Ui.Search.Text = ''
  $script:Data.UpdatingFilters = $false
  Update-AllViews
}

function Set-QuickPreset([string]$preset) {
  $script:Data.UpdatingFilters = $true
  $script:Ui.FilterWhat.SelectedItem = $preset
  $script:Data.UpdatingFilters = $false
  Show-View 'Events'
  Update-AllViews
}

function Select-UserInFilter([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return }
  $script:Data.UpdatingFilters = $true
  $local = "$name (local)"
  if ($script:Ui.FilterUser.Items.Contains($local)) {
    $script:Ui.FilterUser.SelectedItem = $local
  } elseif ($script:Ui.FilterUser.Items.Contains($name)) {
    $script:Ui.FilterUser.SelectedItem = $name
  } else {
    [void]$script:Ui.FilterUser.Items.Add($name)
    $script:Ui.FilterUser.SelectedItem = $name
  }
  $script:Data.UpdatingFilters = $false
}

function Set-Kpi([string]$name, $value, [string]$hint, [string]$tone = 'default') {
  $kpi = $script:Ui.Kpis[$name]
  $kpi.Value.Text = [string]$value
  if ($hint) { $kpi.Hint.Text = $hint }
  $kpi.Value.ForeColor = switch ($tone) {
    'ok'     { $script:C.Ok }
    'warn'   { $script:C.Warn }
    'danger' { $script:C.Danger }
    default  { $script:C.Text }
  }
}

function Update-Dashboard {
  $s = $script:Data.Stats
  if (-not $s) { return }
  Set-Kpi 'logons' $s.SuccessfulLogons 'People who signed in' 'ok'
  Set-Kpi 'failures' $s.FailedLogons 'Wrong password or unknown name' $(if ($s.FailedLogons -gt 20) { 'danger' } elseif ($s.FailedLogons -gt 0) { 'warn' } else { 'ok' })
  Set-Kpi 'sessions' $s.OpenSessions 'Still signed in right now'
  Set-Kpi 'alerts' $s.Alerts $(if ($s.CriticalAlerts -gt 0) { "$($s.CriticalAlerts) need a closer look" } else { 'Nothing urgent' }) $(if ($s.CriticalAlerts -gt 0) { 'danger' } elseif ($s.Alerts -gt 0) { 'warn' } else { 'ok' })
  Set-Kpi 'users' $s.UniqueUsers 'People seen in these logs'
  Set-Kpi 'rdp' $s.RdpLogons 'Signed in from another computer'
  Set-Kpi 'lockouts' $s.Lockouts 'Windows locked the account' $(if ($s.Lockouts -gt 0) { 'danger' } else { 'ok' })
  Set-Kpi 'after' $s.AfterHours 'Signed in between 8pm and 6am' $(if ($s.AfterHours -gt 0) { 'warn' } else { 'default' })
  if ($script:Ui.Kpis.ContainsKey('crashes')) {
    Set-Kpi 'crashes' $s.Crashes 'App / service crashes' $(if ($s.Crashes -gt 0) { 'danger' } else { 'ok' })
  }
  $script:Ui.Heatmap.Invalidate()
  $script:Ui.TypeChart.Invalidate()
  $script:Ui.FailChart.Invalidate()

  $script:Ui.AlertPreview.Items.Clear()
  foreach ($alert in @($script:Data.Alerts | Select-Object -First 8)) {
    [void]$script:Ui.AlertPreview.Items.Add(('{0,-8}  {1}' -f $alert.Severity.ToUpperInvariant(), $alert.Title))
  }
  if ($script:Ui.AlertPreview.Items.Count -eq 0) {
    [void]$script:Ui.AlertPreview.Items.Add('Nothing worrying in what we read so far.')
  }
}

function Update-AllViews {
  Update-Dashboard
  Update-EventsGrid
  Update-AlertsGrid
  Update-SessionsGrid
  Update-UsersGrid
  Update-LocalGrid
  Update-TimeGrid
}

function Complete-LogCollection($payload) {
  $events = @()
  $warnings = @()
  if ($payload) {
    $events = @($payload.Events)
    $warnings = @($payload.Warnings)
  }
  $script:Data.Events = $events
  $script:Data.Index = @{}
  foreach ($event in $events) { $script:Data.Index[$event.Uid] = $event }
  $script:Data.Alerts = @(Get-EventAlerts -Events $events)
  $script:Data.Sessions = @(Get-EventSessions -Events $events)
  $script:Data.Users = @(Get-EventUserProfiles -Events $events -Alerts $script:Data.Alerts -Sessions $script:Data.Sessions)
  $script:Data.Stats = Get-EventStats -Events $events -Alerts $script:Data.Alerts -Sessions $script:Data.Sessions
  $script:Data.Heatmap = Get-LogonHeatmap -Events $events
  $script:Data.Types = @(Get-LogonsByType -Events $events)
  $script:Data.Failed = @(Get-TopFailedAccounts -Events $events)
  $script:Data.LocalUsers = @(Get-LocalComputerUsers)
  $script:Data.Connections = @(Get-ConnectionSummary -Sessions $script:Data.Sessions -Events $events)
  Refresh-UserCombo

  Update-AllViews
  $admin = if (Test-IsAdministrator) { 'running with full access' } else { 'running as a normal user' }
  $warn = if ($warnings.Count) { '  |  ' + ($warnings -join '  |  ') } else { '' }
  $range = ''
  if ($script:Data.Stats.FirstEvent) {
    $from = $script:Data.Stats.FirstEvent.ToString('yyyy-MM-dd HH:mm')
    $to = $script:Data.Stats.LastEvent.ToString('yyyy-MM-dd HH:mm')
    $range = "  |  from $from to $to"
  }
  $script:Ui.Status.Text = 'Found {0} things that happened  |  {1}{2}{3}' -f $events.Count, $admin, $range, $warn
  $script:Ui.Banner.Visible = -not (Test-IsAdministrator)
  if ($events.Count -eq 0 -and $warnings.Count -gt 0) {
    [Windows.Forms.MessageBox]::Show(($warnings -join [Environment]::NewLine), 'Nothing was found', 'OK', 'Warning')
  }
}

function Start-LogCollection {
  param([string]$EvtxPath = '')
  if ($script:Data.Busy) { return }
  $script:Data.Busy = $true
  Set-UiBusy $true 'Reading what happened on this PC. This can take a minute...'

  $days = [int]$script:Ui.Days.Value
  $max = [int]$script:Ui.Max.Value
  $mode = Get-CollectionMode
  $computer = $script:Ui.Computer.Text.Trim()
  $engine = $script:EnginePath

  $runspace = [runspacefactory]::CreateRunspace()
  $runspace.Open()
  $ps = [powershell]::Create()
  $ps.Runspace = $runspace
  [void]$ps.AddScript({
      param($EnginePath, $Days, $MaxEvents, $Mode, $ComputerName, $EvtxPath)
      . $EnginePath
      Invoke-EventCollection -Days $Days -MaxEvents $MaxEvents -Mode $Mode -ComputerName $ComputerName -EvtxPath $EvtxPath -LogName $Mode
    }).AddArgument($engine).AddArgument($days).AddArgument($max).AddArgument($mode).AddArgument($computer).AddArgument($EvtxPath)

  $script:Data.Work = @{ PowerShell = $ps; Handle = $ps.BeginInvoke(); Runspace = $runspace }
  $script:Ui.Poll.Start()
}

function Finish-BackgroundWork {
  $work = $script:Data.Work
  if (-not $work -or -not $work.Handle.IsCompleted) { return }
  $script:Ui.Poll.Stop()
  try {
    $result = $work.PowerShell.EndInvoke($work.Handle)
    $errs = @($work.PowerShell.Streams.Error)
    if ($errs.Count -gt 0) {
      throw (($errs | ForEach-Object { $_.ToString() } | Select-Object -First 3) -join [Environment]::NewLine)
    }
    $payload = @($result) | Select-Object -Last 1
    Complete-LogCollection $payload
  } catch {
    $script:Ui.Status.Text = 'Could not read the logs'
    [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Could not read the logs', 'OK', 'Error')
  } finally {
    $work.PowerShell.Dispose()
    $work.Runspace.Dispose()
    $script:Data.Work = $null
    $script:Data.Busy = $false
    Set-UiBusy $false
  }
}

function Show-EventFromGrid($grid) {
  if ($null -eq $grid.CurrentRow) { return }
  $uid = [string]$grid.CurrentRow.Cells['Uid'].Value
  $event = $script:Data.Index[$uid]
  if ($event) { $script:Ui.Detail.Text = Format-EventDetail $event }
}

function Export-CurrentView {
  if ($script:Data.Events.Count -eq 0) {
    [Windows.Forms.MessageBox]::Show('Read this PC first, then you can save a copy.', 'Nothing to save yet')
    return
  }
  $dialog = New-Object Windows.Forms.SaveFileDialog
  $dialog.Filter = 'CSV (*.csv)|*.csv|JSON (*.json)|*.json'
  $dialog.FileName = "event-logs-$(Get-Date -Format yyyyMMdd-HHmm)"
  if ($dialog.ShowDialog() -ne 'OK') { return }
  $events = Get-VisibleEvents
  if ($dialog.FileName.ToLowerInvariant().EndsWith('.json')) {
    $events | Select-Object TimeText, EventId, Title, Category, Account, Domain, LogonTypeName, Ip, Workstation, Computer, Channel, FailureReason, Message |
      ConvertTo-Json -Depth 4 |
      Set-Content -Encoding UTF8 -LiteralPath $dialog.FileName
  } else {
    $events | Select-Object TimeText, EventId, Title, Category, Account, Domain, LogonTypeName, Ip, Workstation, Computer, Channel, Status, FailureReason, Message |
      Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $dialog.FileName
  }
  $script:Ui.Status.Text = "Saved $($events.Count) rows to $($dialog.FileName)"
}

function Restart-AsAdministrator {
  $exe = (Get-Process -Id $PID).Path
  $argList = @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
  Start-Process -FilePath $exe -Verb RunAs -ArgumentList $argList
  $script:Ui.Form.Close()
}

function Draw-Heatmap($g, $width, $height) {
  $cells = $script:Data.Heatmap
  if (-not $cells -or $cells.Count -eq 0) {
    $g.DrawString('Read this PC to see when people signed in.', $script:FontUi, (New-Object Drawing.SolidBrush $script:C.Muted), 12, 16)
    return
  }
  $max = 1
  foreach ($v in $cells.Values) { if ($v -gt $max) { $max = $v } }
  $left = 40
  $top = 6
  $cellW = [Math]::Max(10, [int](($width - $left - 8) / 24))
  $cellH = [Math]::Max(14, [int](($height - $top - 20) / 7))
  $days = @('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')
  $muted = New-Object Drawing.SolidBrush $script:C.Muted
  for ($d = 0; $d -lt 7; $d++) {
    $g.DrawString($days[$d], $script:FontSmall, $muted, 4, $top + $d * $cellH + 2)
    for ($h = 0; $h -lt 24; $h++) {
      $n = [int]$cells["$d-$h"]
      $t = $n / $max
      $color = if ($n -eq 0) {
        [Drawing.Color]::FromArgb(255, 30, 41, 59)
      } else {
        [Drawing.Color]::FromArgb(255, [int](15 + 30 * $t), [int](80 + 120 * $t), [int](90 + 140 * $t))
      }
      $brush = New-Object Drawing.SolidBrush $color
      $g.FillRectangle($brush, $left + $h * $cellW, $top + $d * $cellH, $cellW - 2, $cellH - 2)
      $brush.Dispose()
    }
  }
  for ($h = 0; $h -lt 24; $h += 3) {
    $g.DrawString("$h", $script:FontSmall, $muted, $left + $h * $cellW, $top + 7 * $cellH)
  }
  $muted.Dispose()
}

function Draw-Bars($g, $width, $height, $items, [string]$empty) {
  if (-not $items -or @($items).Count -eq 0) {
    $brush = New-Object Drawing.SolidBrush $script:C.Muted
    $g.DrawString($empty, $script:FontUi, $brush, 12, 16)
    $brush.Dispose()
    return
  }
  $max = 1
  foreach ($item in $items) { if ([int]$item.Value -gt $max) { $max = [int]$item.Value } }
  $i = 0
  $rowH = [Math]::Max(22, [int]($height / [Math]::Max(1, @($items).Count)))
  $muted = New-Object Drawing.SolidBrush $script:C.Muted
  $text = New-Object Drawing.SolidBrush $script:C.Text
  $bar = New-Object Drawing.SolidBrush $script:C.Accent2
  foreach ($item in $items) {
    $y = 6 + $i * $rowH
    $g.DrawString([string]$item.Key, $script:FontSmall, $muted, 8, $y)
    $w = [int](($width - 160) * ([int]$item.Value / $max))
    $g.FillRectangle($bar, 150, $y + 2, [Math]::Max(4, $w), 12)
    $g.DrawString([string]$item.Value, $script:FontSmall, $text, 150 + [Math]::Max(4, $w) + 8, $y)
    $i++
  }
  $muted.Dispose(); $text.Dispose(); $bar.Dispose()
}

# --- Form ---
$form = New-Object Windows.Forms.Form
$form.Text = 'Windows Logs Analyzer'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object Drawing.Size(1380, 860)
$form.MinimumSize = New-Object Drawing.Size(1100, 680)
$form.BackColor = $script:C.Bg
$form.ForeColor = $script:C.Text
$form.Font = $script:FontUi
$form.KeyPreview = $true
Enable-DoubleBuffer $form
$script:Ui.Form = $form

$accentBar = New-Object Windows.Forms.Panel
$accentBar.Dock = 'Top'
$accentBar.Height = 4
$accentBar.BackColor = $script:C.Accent

$header = New-Object Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 78
$header.BackColor = $script:C.Header

$title = New-UiLabel 'Windows Logs Analyzer' $script:FontTitle $script:C.Text
$title.SetBounds(18, 10, 420, 32)
$header.Controls.Add($title)
$subtitle = New-UiLabel 'See what happened on this PC. Nothing leaves your computer.' $script:FontSmall $script:C.Muted
$subtitle.SetBounds(20, 42, 520, 22)
$header.Controls.Add($subtitle)

$script:Ui.Mode = New-Object Windows.Forms.ComboBox
$script:Ui.Mode.DropDownStyle = 'DropDownList'
$script:Ui.Mode.FlatStyle = 'Flat'
$script:Ui.Mode.BackColor = $script:C.Panel2
$script:Ui.Mode.ForeColor = $script:C.Text
$script:Ui.Mode.SetBounds(560, 22, 168, 28)
@('This PC (recommended)', 'Sign-in log', 'Apps', 'Windows system', 'Setup') | ForEach-Object { [void]$script:Ui.Mode.Items.Add($_) }
$script:Ui.Mode.SelectedIndex = 0
$header.Controls.Add($script:Ui.Mode)

$daysLbl = New-UiLabel 'Last days' $script:FontSmall $script:C.Muted
$daysLbl.SetBounds(740, 8, 50, 16)
$header.Controls.Add($daysLbl)
$script:Ui.Days = New-Object Windows.Forms.NumericUpDown
$script:Ui.Days.Minimum = 1; $script:Ui.Days.Maximum = 90; $script:Ui.Days.Value = 7
$script:Ui.Days.BackColor = $script:C.Panel2; $script:Ui.Days.ForeColor = $script:C.Text
$script:Ui.Days.BorderStyle = 'FixedSingle'
$script:Ui.Days.SetBounds(740, 26, 58, 26)
$header.Controls.Add($script:Ui.Days)

$maxLbl = New-UiLabel 'How many' $script:FontSmall $script:C.Muted
$maxLbl.SetBounds(808, 8, 50, 16)
$header.Controls.Add($maxLbl)
$script:Ui.Max = New-Object Windows.Forms.NumericUpDown
$script:Ui.Max.Minimum = 100; $script:Ui.Max.Maximum = 20000; $script:Ui.Max.Increment = 500; $script:Ui.Max.Value = 4000
$script:Ui.Max.BackColor = $script:C.Panel2; $script:Ui.Max.ForeColor = $script:C.Text
$script:Ui.Max.BorderStyle = 'FixedSingle'
$script:Ui.Max.SetBounds(808, 26, 72, 26)
$header.Controls.Add($script:Ui.Max)

$pcLbl = New-UiLabel 'Which PC' $script:FontSmall $script:C.Muted
$pcLbl.SetBounds(890, 8, 70, 16)
$header.Controls.Add($pcLbl)
$script:Ui.Computer = New-Object Windows.Forms.TextBox
$script:Ui.Computer.Text = $env:COMPUTERNAME
$script:Ui.Computer.BackColor = $script:C.Panel2
$script:Ui.Computer.ForeColor = $script:C.Text
$script:Ui.Computer.BorderStyle = 'FixedSingle'
$script:Ui.Computer.SetBounds(890, 26, 130, 26)
$header.Controls.Add($script:Ui.Computer)

$script:Ui.LoadBtn = New-UiButton 'Read this PC' $script:C.Accent $script:C.Header 108 32
$script:Ui.LoadBtn.SetBounds(1034, 22, 108, 32)
$script:Ui.LoadBtn.add_Click({ Start-LogCollection })
$header.Controls.Add($script:Ui.LoadBtn)

$script:Ui.EvtxBtn = New-UiButton 'Open a file' $script:C.Panel2 $script:C.Text 100 32
$script:Ui.EvtxBtn.FlatAppearance.BorderSize = 1
$script:Ui.EvtxBtn.FlatAppearance.BorderColor = $script:C.Border
$script:Ui.EvtxBtn.SetBounds(1140, 22, 100, 32)
$script:Ui.EvtxBtn.add_Click({
    $d = New-Object Windows.Forms.OpenFileDialog
    $d.Filter = 'Saved Windows logs (*.evtx)|*.evtx|All files (*.*)|*.*'
    if ($d.ShowDialog() -eq 'OK') { Start-LogCollection -EvtxPath $d.FileName }
  })
$header.Controls.Add($script:Ui.EvtxBtn)

$script:Ui.ExportBtn = New-UiButton 'Save a copy' $script:C.Panel2 $script:C.Text 96 32
$script:Ui.ExportBtn.FlatAppearance.BorderSize = 1
$script:Ui.ExportBtn.FlatAppearance.BorderColor = $script:C.Border
$script:Ui.ExportBtn.SetBounds(1246, 22, 96, 32)
$script:Ui.ExportBtn.add_Click({ Export-CurrentView })
$header.Controls.Add($script:Ui.ExportBtn)

$statusBar = New-Object Windows.Forms.Panel
$statusBar.Dock = 'Bottom'
$statusBar.Height = 28
$statusBar.BackColor = $script:C.Header
$script:Ui.Status = New-UiLabel 'Ready. Click Read this PC. For sign-in details, run as administrator.' $script:FontSmall $script:C.Muted
$script:Ui.Status.Dock = 'Fill'
$script:Ui.Status.Padding = New-Object Windows.Forms.Padding(12, 0, 8, 0)
$statusBar.Controls.Add($script:Ui.Status)

$nav = New-Object Windows.Forms.Panel
$nav.Dock = 'Left'
$nav.Width = 178
$nav.BackColor = $script:C.Nav

$script:Ui.NavButtons = @{}
$navItems = @(
  @{ Name = 'Dashboard'; Label = 'Home' }
  @{ Name = 'Events';    Label = 'What happened' }
  @{ Name = 'Alerts';    Label = 'Warnings' }
  @{ Name = 'Sessions';  Label = 'Sessions' }
  @{ Name = 'Time';      Label = 'Time on PC' }
  @{ Name = 'Local';     Label = 'People' }
  @{ Name = 'Users';     Label = 'Risk' }
)
$y = 18
foreach ($item in $navItems) {
  $btn = New-UiButton $item.Label $script:C.Nav $script:C.Muted 150 38
  $btn.Font = $script:FontNav
  $btn.TextAlign = 'MiddleLeft'
  $btn.Padding = New-Object Windows.Forms.Padding(16, 0, 0, 0)
  $btn.SetBounds(14, $y, 150, 38)
  $name = $item.Name
  $btn.add_Click({ Show-View $name }.GetNewClosure())
  $nav.Controls.Add($btn)
  $script:Ui.NavButtons[$item.Name] = $btn
  $y += 46
}

$script:Ui.AdminBtn = New-UiButton 'Use administrator' $script:C.Panel2 $script:C.Warn 150 32
$script:Ui.AdminBtn.SetBounds(14, 352, 150, 32)
$script:Ui.AdminBtn.add_Click({ Restart-AsAdministrator })
$nav.Controls.Add($script:Ui.AdminBtn)
if (Test-IsAdministrator) { $script:Ui.AdminBtn.Visible = $false }

$hostPanel = New-Object Windows.Forms.Panel
$hostPanel.Dock = 'Fill'
$hostPanel.BackColor = $script:C.Bg
$hostPanel.Padding = New-Object Windows.Forms.Padding(14)

$form.Controls.Add($hostPanel)
$form.Controls.Add($nav)
$form.Controls.Add($statusBar)
$form.Controls.Add($header)
$form.Controls.Add($accentBar)

$script:Ui.Banner = New-Object Windows.Forms.Panel
$script:Ui.Banner.Dock = 'Top'
$script:Ui.Banner.Height = 36
$script:Ui.Banner.BackColor = [Drawing.Color]::FromArgb(66, 48, 20)
$bannerText = New-UiLabel 'For failed passwords and lockouts, click Use administrator.' $script:FontSmall $script:C.Warn
$bannerText.Dock = 'Fill'
$bannerText.Padding = New-Object Windows.Forms.Padding(10, 0, 0, 0)
$script:Ui.Banner.Controls.Add($bannerText)
$script:Ui.Banner.Visible = -not (Test-IsAdministrator)

$script:Ui.FilterBar = New-Object Windows.Forms.Panel
$script:Ui.FilterBar.Dock = 'Top'
$script:Ui.FilterBar.Height = 92
$script:Ui.FilterBar.BackColor = $script:C.Panel
$userLab = New-UiLabel 'Who' $script:FontSmall $script:C.Muted
$userLab.SetBounds(10, 4, 70, 16)
$script:Ui.FilterBar.Controls.Add($userLab)
$script:Ui.FilterUser = New-DarkCombo 190
$script:Ui.FilterUser.SetBounds(10, 20, 190, 26)
[void]$script:Ui.FilterUser.Items.Add('Everyone')
$script:Ui.FilterUser.SelectedIndex = 0
$script:Ui.FilterUser.add_SelectedIndexChanged({ Request-FilterRefresh })
$script:Ui.FilterBar.Controls.Add($script:Ui.FilterUser)

$whatLab = New-UiLabel 'What happened' $script:FontSmall $script:C.Muted
$whatLab.SetBounds(210, 4, 120, 16)
$script:Ui.FilterBar.Controls.Add($whatLab)
$script:Ui.FilterWhat = New-DarkCombo 210
$script:Ui.FilterWhat.SetBounds(210, 20, 210, 26)
foreach ($p in $script:FilterPresets) { [void]$script:Ui.FilterWhat.Items.Add($p) }
$script:Ui.FilterWhat.SelectedIndex = 0
$script:Ui.FilterWhat.add_SelectedIndexChanged({ Request-FilterRefresh })
$script:Ui.FilterBar.Controls.Add($script:Ui.FilterWhat)

$logonLab = New-UiLabel 'Sign-in tries' $script:FontSmall $script:C.Muted
$logonLab.SetBounds(430, 4, 110, 16)
$script:Ui.FilterBar.Controls.Add($logonLab)
$script:Ui.FilterLogon = New-DarkCombo 128
$script:Ui.FilterLogon.SetBounds(430, 20, 128, 26)
@('Any', 'Tried to sign in', 'Signed in', 'Failed') | ForEach-Object { [void]$script:Ui.FilterLogon.Items.Add($_) }
$script:Ui.FilterLogon.SelectedIndex = 0
$script:Ui.FilterLogon.add_SelectedIndexChanged({ Request-FilterRefresh })
$script:Ui.FilterBar.Controls.Add($script:Ui.FilterLogon)

$fromLab = New-UiLabel 'From' $script:FontSmall $script:C.Muted
$fromLab.SetBounds(568, 4, 50, 16)
$script:Ui.FilterBar.Controls.Add($fromLab)
$script:Ui.FilterFrom = New-Object Windows.Forms.DateTimePicker
$script:Ui.FilterFrom.Format = 'Custom'
$script:Ui.FilterFrom.CustomFormat = 'yyyy-MM-dd HH:mm'
$script:Ui.FilterFrom.ShowCheckBox = $true
$script:Ui.FilterFrom.Checked = $false
$script:Ui.FilterFrom.Value = (Get-Date).AddDays(-7)
$script:Ui.FilterFrom.SetBounds(568, 20, 158, 26)
$script:Ui.FilterFrom.add_ValueChanged({ Request-FilterRefresh })
$script:Ui.FilterBar.Controls.Add($script:Ui.FilterFrom)

$toLab = New-UiLabel 'To' $script:FontSmall $script:C.Muted
$toLab.SetBounds(736, 4, 40, 16)
$script:Ui.FilterBar.Controls.Add($toLab)
$script:Ui.FilterTo = New-Object Windows.Forms.DateTimePicker
$script:Ui.FilterTo.Format = 'Custom'
$script:Ui.FilterTo.CustomFormat = 'yyyy-MM-dd HH:mm'
$script:Ui.FilterTo.ShowCheckBox = $true
$script:Ui.FilterTo.Checked = $false
$script:Ui.FilterTo.Value = Get-Date
$script:Ui.FilterTo.SetBounds(736, 20, 158, 26)
$script:Ui.FilterTo.add_ValueChanged({ Request-FilterRefresh })
$script:Ui.FilterBar.Controls.Add($script:Ui.FilterTo)

$clearBtn = New-UiButton 'Show everything' $script:C.Panel2 $script:C.Text 118 26
$clearBtn.FlatAppearance.BorderSize = 1
$clearBtn.FlatAppearance.BorderColor = $script:C.Border
$clearBtn.SetBounds(906, 20, 100, 26)
$clearBtn.add_Click({ Clear-DiagnosticFilters })
$script:Ui.FilterBar.Controls.Add($clearBtn)

$quick = New-Object Windows.Forms.FlowLayoutPanel
$quick.SetBounds(6, 52, 1180, 36)
$quick.BackColor = $script:C.Panel
$quick.WrapContents = $false
$script:Ui.FilterBar.Controls.Add($quick)
$quickDefs = @(
  @{ Text = 'Sign-ins'; Preset = 'Sign-ins (tried or succeeded)' }
  @{ Text = 'Failed'; Preset = 'Failed sign-ins' }
  @{ Text = 'Time on PC'; Preset = 'Time spent signed in' }
  @{ Text = 'Deleted files'; Preset = 'Files deleted or opened' }
  @{ Text = 'Network'; Preset = 'Network or Wi-Fi' }
  @{ Text = 'USB'; Preset = 'USB sticks and devices' }
  @{ Text = 'Crashes'; Preset = 'Apps that crashed' }
  @{ Text = 'Restarts'; Preset = 'Restarts and sleep' }
  @{ Text = 'Programs'; Preset = 'Programs installed or updated' }
)
foreach ($qdef in $quickDefs) {
  $qb = New-UiButton $qdef.Text $script:C.Panel2 $script:C.Accent 108 28
  $presetName = $qdef.Preset
  $qb.add_Click({
      if ($presetName -eq 'Time spent signed in') {
        Show-View 'Time'
        Request-FilterRefresh
      } else {
        Set-QuickPreset $presetName
      }
    }.GetNewClosure())
  $quick.Controls.Add($qb)
}

function New-ContentPanel {
  $p = New-Object Windows.Forms.Panel
  $p.Dock = 'Fill'
  $p.BackColor = $script:C.Bg
  $p.Visible = $false
  Enable-DoubleBuffer $p
  return $p
}

$script:Ui.DashPanel = New-ContentPanel
$script:Ui.EventsPanel = New-ContentPanel
$script:Ui.AlertsPanel = New-ContentPanel
$script:Ui.SessionsPanel = New-ContentPanel
$script:Ui.UsersPanel = New-ContentPanel
$script:Ui.LocalPanel = New-ContentPanel
$script:Ui.TimePanel = New-ContentPanel
$hostPanel.Controls.Add($script:Ui.UsersPanel)
$hostPanel.Controls.Add($script:Ui.LocalPanel)
$hostPanel.Controls.Add($script:Ui.TimePanel)
$hostPanel.Controls.Add($script:Ui.SessionsPanel)
$hostPanel.Controls.Add($script:Ui.AlertsPanel)
$hostPanel.Controls.Add($script:Ui.EventsPanel)
$hostPanel.Controls.Add($script:Ui.DashPanel)
$hostPanel.Controls.Add($script:Ui.FilterBar)
$hostPanel.Controls.Add($script:Ui.Banner)

# Dashboard
$dash = New-Object Windows.Forms.TableLayoutPanel
$dash.Dock = 'Fill'
$dash.ColumnCount = 2
$dash.RowCount = 3
$dash.BackColor = $script:C.Bg
[void]$dash.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle([Windows.Forms.SizeType]::Percent, 62)))
[void]$dash.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle([Windows.Forms.SizeType]::Percent, 38)))
[void]$dash.RowStyles.Add((New-Object Windows.Forms.RowStyle([Windows.Forms.SizeType]::Absolute, 168)))
[void]$dash.RowStyles.Add((New-Object Windows.Forms.RowStyle([Windows.Forms.SizeType]::Percent, 55)))
[void]$dash.RowStyles.Add((New-Object Windows.Forms.RowStyle([Windows.Forms.SizeType]::Percent, 45)))
$script:Ui.DashPanel.Controls.Add($dash)

$kpiHost = New-Object Windows.Forms.TableLayoutPanel
$kpiHost.Dock = 'Fill'
$kpiHost.ColumnCount = 4
$kpiHost.RowCount = 2
$kpiHost.Margin = New-Object Windows.Forms.Padding(0, 0, 0, 8)
for ($i = 0; $i -lt 4; $i++) { [void]$kpiHost.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle([Windows.Forms.SizeType]::Percent, 25))) }
[void]$kpiHost.RowStyles.Add((New-Object Windows.Forms.RowStyle([Windows.Forms.SizeType]::Percent, 50)))
[void]$kpiHost.RowStyles.Add((New-Object Windows.Forms.RowStyle([Windows.Forms.SizeType]::Percent, 50)))
$dash.Controls.Add($kpiHost, 0, 0)
$dash.SetColumnSpan($kpiHost, 2)

$script:Ui.Kpis = @{}
$kpiDefs = @(
  @{ Key = 'logons';    Label = 'Signed in' }
  @{ Key = 'failures';  Label = 'Could not sign in' }
  @{ Key = 'sessions';  Label = 'Still signed in' }
  @{ Key = 'alerts';    Label = 'Things to check' }
  @{ Key = 'users';     Label = 'People' }
  @{ Key = 'rdp';       Label = 'Remote Desktop' }
  @{ Key = 'lockouts';  Label = 'Locked accounts' }
  @{ Key = 'after';     Label = 'Late-night sign-ins' }
)
$idx = 0
foreach ($def in $kpiDefs) {
  $card = New-Object Windows.Forms.Panel
  $card.Dock = 'Fill'
  $card.BackColor = $script:C.Panel
  $card.Margin = New-Object Windows.Forms.Padding(4)
  $lab = New-UiLabel $def.Label $script:FontSmall $script:C.Muted
  $lab.SetBounds(12, 8, 200, 18)
  $val = New-UiLabel '0' $script:FontKpi $script:C.Text
  $val.SetBounds(12, 26, 200, 32)
  $hint = New-UiLabel '' $script:FontSmall $script:C.Muted
  $hint.SetBounds(12, 58, 220, 18)
  $card.Controls.Add($lab); $card.Controls.Add($val); $card.Controls.Add($hint)
  $kpiHost.Controls.Add($card, ($idx % 4), [int][Math]::Floor($idx / 4))
  $script:Ui.Kpis[$def.Key] = @{ Value = $val; Hint = $hint }
  $idx++
}

function New-ChartPanel([string]$titleText) {
  $wrap = New-Object Windows.Forms.Panel
  $wrap.Dock = 'Fill'
  $wrap.BackColor = $script:C.Panel
  $wrap.Margin = New-Object Windows.Forms.Padding(4)
  $lab = New-UiLabel $titleText $script:FontNav $script:C.Text
  $lab.Dock = 'Top'
  $lab.Height = 28
  $lab.Padding = New-Object Windows.Forms.Padding(10, 6, 0, 0)
  $box = New-Object Windows.Forms.PictureBox
  $box.Dock = 'Fill'
  $box.BackColor = $script:C.Panel
  Enable-DoubleBuffer $box
  $wrap.Controls.Add($box)
  $wrap.Controls.Add($lab)
  return @{ Panel = $wrap; Box = $box }
}

$heat = New-ChartPanel 'When people signed in'
$script:Ui.Heatmap = $heat.Box
$script:Ui.Heatmap.add_Paint({
    param($s, $e)
    $e.Graphics.SmoothingMode = 'AntiAlias'
    $e.Graphics.Clear($script:C.Panel)
    Draw-Heatmap $e.Graphics $s.ClientSize.Width $s.ClientSize.Height
  })
$dash.Controls.Add($heat.Panel, 0, 1)

$types = New-ChartPanel 'How they signed in'
$script:Ui.TypeChart = $types.Box
$script:Ui.TypeChart.add_Paint({
    param($s, $e)
    $e.Graphics.SmoothingMode = 'AntiAlias'
    $e.Graphics.Clear($script:C.Panel)
    Draw-Bars $e.Graphics $s.ClientSize.Width $s.ClientSize.Height $script:Data.Types 'Nobody signed in during this period.'
  })
$dash.Controls.Add($types.Panel, 1, 1)

$alertWrap = New-Object Windows.Forms.Panel
$alertWrap.Dock = 'Fill'
$alertWrap.BackColor = $script:C.Panel
$alertWrap.Margin = New-Object Windows.Forms.Padding(4)
$alertLab = New-UiLabel 'Things to look at first' $script:FontNav $script:C.Text
$alertLab.Dock = 'Top'; $alertLab.Height = 28; $alertLab.Padding = New-Object Windows.Forms.Padding(10, 6, 0, 0)
$script:Ui.AlertPreview = New-Object Windows.Forms.ListBox
$script:Ui.AlertPreview.Dock = 'Fill'
$script:Ui.AlertPreview.BorderStyle = 'None'
$script:Ui.AlertPreview.BackColor = $script:C.Panel
$script:Ui.AlertPreview.ForeColor = $script:C.Text
$script:Ui.AlertPreview.Font = $script:FontUi
$script:Ui.AlertPreview.IntegralHeight = $false
$alertWrap.Controls.Add($script:Ui.AlertPreview)
$alertWrap.Controls.Add($alertLab)
$dash.Controls.Add($alertWrap, 0, 2)

$fail = New-ChartPanel 'Who failed to sign in'
$script:Ui.FailChart = $fail.Box
$script:Ui.FailChart.add_Paint({
    param($s, $e)
    $e.Graphics.SmoothingMode = 'AntiAlias'
    $e.Graphics.Clear($script:C.Panel)
    Draw-Bars $e.Graphics $s.ClientSize.Width $s.ClientSize.Height $script:Data.Failed 'No failed sign-ins during this period.'
  })
$dash.Controls.Add($fail.Panel, 1, 2)

# Events
$filter = New-Object Windows.Forms.Panel
$filter.Dock = 'Top'
$filter.Height = 42
$filter.BackColor = $script:C.Bg
$searchLab = New-UiLabel 'Search' $script:FontSmall $script:C.Muted
$searchLab.SetBounds(0, 12, 50, 20)
$filter.Controls.Add($searchLab)
$script:Ui.Search = New-Object Windows.Forms.TextBox
$script:Ui.Search.BackColor = $script:C.Panel2
$script:Ui.Search.ForeColor = $script:C.Text
$script:Ui.Search.BorderStyle = 'FixedSingle'
$script:Ui.Search.SetBounds(52, 8, 320, 26)
$script:Ui.Search.add_TextChanged({ Request-FilterRefresh })
$filter.Controls.Add($script:Ui.Search)
$script:Ui.HideMachines = New-Object Windows.Forms.CheckBox
$script:Ui.HideMachines.Text = 'Hide system accounts'
$script:Ui.HideMachines.Checked = $true
$script:Ui.HideMachines.ForeColor = $script:C.Muted
$script:Ui.HideMachines.AutoSize = $true
$script:Ui.HideMachines.Location = New-Object Drawing.Point(390, 12)
$script:Ui.HideMachines.add_CheckedChanged({ Request-FilterRefresh })
$filter.Controls.Add($script:Ui.HideMachines)
$script:Ui.EventsCount = New-UiLabel '' $script:FontSmall $script:C.Muted 'MiddleRight'
$script:Ui.EventsCount.Anchor = 'Top, Right'
$script:Ui.EventsCount.SetBounds(900, 12, 200, 20)
$filter.Controls.Add($script:Ui.EventsCount)

$split = New-Object Windows.Forms.SplitContainer
$split.Dock = 'Fill'
$split.Orientation = 'Horizontal'
$split.BackColor = $script:C.Border
$split.SplitterWidth = 6
$script:Ui.EventsPanel.Controls.Add($split)
$script:Ui.EventsPanel.Controls.Add($filter)
$script:Ui.EventSplit = $split

$script:Ui.EventsGrid = New-DarkGrid
$script:Ui.EventsGrid.add_SelectionChanged({ Show-EventFromGrid $script:Ui.EventsGrid })
$split.Panel1.Controls.Add($script:Ui.EventsGrid)

$script:Ui.Detail = New-Object Windows.Forms.TextBox
$script:Ui.Detail.Multiline = $true
$script:Ui.Detail.ReadOnly = $true
$script:Ui.Detail.ScrollBars = 'Vertical'
$script:Ui.Detail.BorderStyle = 'None'
$script:Ui.Detail.BackColor = $script:C.Panel
$script:Ui.Detail.ForeColor = $script:C.Text
$script:Ui.Detail.Font = $script:FontMono
$script:Ui.Detail.Dock = 'Fill'
$script:Ui.Detail.Text = 'Click a row to read the details.'
$split.Panel2.Controls.Add($script:Ui.Detail)

# Alerts / Sessions / Users
$script:Ui.AlertsGrid = New-DarkGrid
$script:Ui.AlertsGrid.add_CellFormatting({
    param($s, $e)
    if ($s.Columns[$e.ColumnIndex].Name -eq 'Severity' -and $e.Value) {
      $e.CellStyle.ForeColor = Get-SeverityColor ([string]$e.Value).ToLowerInvariant()
    }
  })
$script:Ui.AlertsGrid.add_CellDoubleClick({
    if ($null -eq $script:Ui.AlertsGrid.CurrentRow) { return }
    $script:Ui.Search.Text = [string]$script:Ui.AlertsGrid.CurrentRow.Cells['Account'].Value
    Select-UserInFilter ([string]$script:Ui.AlertsGrid.CurrentRow.Cells['Account'].Value)
    Show-View 'Events'
    Update-AllViews
  })
$script:Ui.AlertsPanel.Controls.Add($script:Ui.AlertsGrid)

$script:Ui.SessionSummary = New-UiLabel 'Pick a person above, or click Read this PC to see time spent signed in.' $script:FontUi $script:C.Muted
$script:Ui.SessionSummary.Dock = 'Top'
$script:Ui.SessionSummary.Height = 28
$script:Ui.SessionSummary.Padding = New-Object Windows.Forms.Padding(8, 6, 0, 0)
$script:Ui.SessionsGrid = New-DarkGrid
$script:Ui.SessionsPanel.Controls.Add($script:Ui.SessionsGrid)
$script:Ui.SessionsPanel.Controls.Add($script:Ui.SessionSummary)

$script:Ui.UsersGrid = New-DarkGrid
$script:Ui.UsersGrid.add_CellFormatting({
    param($s, $e)
    if ($s.Columns[$e.ColumnIndex].Name -eq 'Risk' -and $e.Value) {
      $e.CellStyle.ForeColor = Get-SeverityColor ([string]$e.Value)
    }
  })
$script:Ui.UsersGrid.add_CellDoubleClick({
    if ($null -eq $script:Ui.UsersGrid.CurrentRow) { return }
    Select-UserInFilter ([string]$script:Ui.UsersGrid.CurrentRow.Cells['Account'].Value)
    Show-View 'Time'
    Update-AllViews
  })
$script:Ui.UsersPanel.Controls.Add($script:Ui.UsersGrid)

$script:Ui.LocalSummary = New-UiLabel 'Everyone who has an account on this PC.' $script:FontUi $script:C.Muted
$script:Ui.LocalSummary.Dock = 'Top'
$script:Ui.LocalSummary.Height = 28
$script:Ui.LocalSummary.Padding = New-Object Windows.Forms.Padding(8, 6, 0, 0)
$script:Ui.LocalGrid = New-DarkGrid
$script:Ui.LocalGrid.add_CellDoubleClick({
    if ($null -eq $script:Ui.LocalGrid.CurrentRow) { return }
    Select-UserInFilter ([string]$script:Ui.LocalGrid.CurrentRow.Cells['User'].Value)
    Show-View 'Time'
    Update-AllViews
  })
$script:Ui.LocalPanel.Controls.Add($script:Ui.LocalGrid)
$script:Ui.LocalPanel.Controls.Add($script:Ui.LocalSummary)

$timeHelp = New-UiLabel 'How long each person spent signed in. Pick someone above, then double-click a row to see each visit.' $script:FontSmall $script:C.Muted
$timeHelp.Dock = 'Top'
$timeHelp.Height = 24
$timeHelp.Padding = New-Object Windows.Forms.Padding(8, 4, 0, 0)
$script:Ui.TimeGrid = New-DarkGrid
$script:Ui.TimeGrid.add_CellDoubleClick({
    if ($null -eq $script:Ui.TimeGrid.CurrentRow) { return }
    Select-UserInFilter ([string]$script:Ui.TimeGrid.CurrentRow.Cells['Person'].Value)
    Show-View 'Sessions'
    Update-AllViews
  })
$script:Ui.TimePanel.Controls.Add($script:Ui.TimeGrid)
$script:Ui.TimePanel.Controls.Add($timeHelp)

$script:Ui.Poll = New-Object Windows.Forms.Timer
$script:Ui.Poll.Interval = 250
$script:Ui.Poll.add_Tick({ Finish-BackgroundWork })

$form.add_KeyDown({
    param($s, $e)
    if ($e.KeyCode -eq 'F5') { Start-LogCollection }
    elseif ($e.Control -and $e.KeyCode -eq 'E') { Export-CurrentView }
    elseif ($e.Control -and $e.KeyCode -eq 'F') { Show-View 'Events'; $script:Ui.Search.Focus() }
  })
$form.add_Shown({
    Show-View 'Dashboard'
    try {
      $script:Data.LocalUsers = @(Get-LocalComputerUsers)
      Refresh-UserCombo
      Update-LocalGrid
    } catch { }
    if ($script:Ui.EventSplit -and $script:Ui.EventSplit.Height -gt 240) {
      $script:Ui.EventSplit.SplitterDistance = $script:Ui.EventSplit.Height - 180
    }
    $script:Ui.Boot = New-Object Windows.Forms.Timer
    $script:Ui.Boot.Interval = 300
    $script:Ui.Boot.add_Tick({
        $script:Ui.Boot.Stop()
        $script:Ui.Boot.Dispose()
        Start-LogCollection
      })
    $script:Ui.Boot.Start()
  })
$form.add_FormClosed({
    if ($script:Ui.Poll) { $script:Ui.Poll.Stop(); $script:Ui.Poll.Dispose() }
    if ($script:Data.Work) {
      try { $script:Data.Work.PowerShell.Stop() } catch { }
      try { $script:Data.Work.PowerShell.Dispose(); $script:Data.Work.Runspace.Dispose() } catch { }
    }
  })

[void][Windows.Forms.Application]::Run($form)
