# Le dice a Capri si estás presentando o en una llamada, para que se quede callada.
# Imprime una línea JSON cada vez que algo cambia. No manda títulos ni contenido de tus ventanas:
# solo el nombre del programa que la puso en modo silencio (PowerPoint, Zoom, Teams, Meet…).
#
#   powershell -File presenta.ps1 <pid de Capri>
#
# Qué mira (todo local, cada 2 s):
#  - Windows: si una app está en pantalla completa o en modo presentación (SHQueryUserNotificationState).
#  - PowerPoint dando la presentación (ventana "screenClass").
#  - Las barras de "estás compartiendo" de Chrome/Edge (Meet), Zoom, Teams, Discord, Slack, Webex, y si OBS está abierto.
#  - Si otro programa está usando el micrófono (Configuración → Privacidad → Micrófono), o sea, estás en una llamada.

param([int]$CapriPid = 0)
$ErrorActionPreference = 'SilentlyContinue'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public static class CapriPresenta {
  delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern int GetWindowThreadProcessId(IntPtr hwnd, out int pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder s, int max);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder s, int max);

  // 2 = pantalla completa (busy), 3 = juego/video D3D en pantalla completa, 4 = modo presentación
  public static int Estado() { int s; return SHQueryUserNotificationState(out s) == 0 ? s : 0; }
  public static int PidAlFrente() { int p; GetWindowThreadProcessId(GetForegroundWindow(), out p); return p; }

  // ventanas visibles: pid, clase y título (solo se usan aquí para buscar las barras de "compartiendo")
  public static List<string[]> Ventanas() {
    var l = new List<string[]>();
    EnumWindows((h, x) => {
      if (!IsWindowVisible(h)) return true;
      var t = new StringBuilder(256); GetWindowText(h, t, 256);
      var c = new StringBuilder(128); GetClassName(h, c, 128);
      int p; GetWindowThreadProcessId(h, out p);
      l.Add(new string[] { p.ToString(), c.ToString(), t.ToString() });
      return l.Count < 400;
    }, IntPtr.Zero);
    return l;
  }
}
"@

$compartiendo = '(is sharing|are sharing|you.re sharing|sharing your|está compartiendo|esta compartiendo|estás compartiendo|estas compartiendo|compartiendo (la |tu |su |una |esta )?(pantalla|ventana|pestaña|contenido)|sharing control bar|control de uso compartido|barra de control para compartir|screen share|share toolbar|presentando ahora|you are presenting|estás presentando)'
$apps = @{ 'zoom' = 'Zoom'; 'ms-teams' = 'Teams'; 'teams' = 'Teams'; 'chrome' = 'Meet (Chrome)'; 'msedge' = 'Meet (Edge)';
  'firefox' = 'Firefox'; 'brave' = 'Brave'; 'opera' = 'Opera'; 'discord' = 'Discord'; 'slack' = 'Slack';
  'webex' = 'Webex'; 'webexmta' = 'Webex'; 'ciscocollabhost' = 'Webex'; 'skype' = 'Skype'; 'whatsapp' = 'WhatsApp' }
$micKeys = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone',
             'HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone\NonPackaged')

function Nombre([string]$k) {
  $n = ($k -split '#')[-1] -replace '\.exe$', ''
  $n = ($n -split '_')[0]
  $l = $n.ToLower()
  foreach ($a in $apps.Keys) { if ($l -like "*$a*") { return $apps[$a] } }
  return $n
}

function MicEnUso {
  foreach ($base in $micKeys) {
    foreach ($k in (Get-ChildItem $base)) {
      if ($k.PSChildName -eq 'NonPackaged') { continue }
      if ($k.PSChildName -match '(?i)capri|electron') { continue }   # Capri escuchándote no cuenta
      $p = Get-ItemProperty $k.PSPath
      if ($p.LastUsedTimeStart -and $p.LastUsedTimeStop -eq 0) { return (Nombre $k.PSChildName) }
    }
  }
  return $null
}

$last = ''
$tick = 0
while ($true) {
  if ($CapriPid -and -not (Get-Process -Id $CapriPid)) { exit 0 }
  $estado = [CapriPresenta]::Estado()
  $fg = [CapriPresenta]::PidAlFrente()
  $por = $null; $tipo = $null

  # PowerPoint / pantalla completa / modo presentación (si la que está al frente es la propia Capri, no cuenta)
  $procs = @{}
  foreach ($pr in (Get-Process)) { $procs[[string]$pr.Id] = $pr.ProcessName.ToLower() }
  $ventanas = [CapriPresenta]::Ventanas()
  foreach ($v in $ventanas) {
    if ($v[1] -eq 'screenClass' -and $procs[$v[0]] -eq 'powerpnt') { $por = 'PowerPoint'; $tipo = 'presentacion'; break }
  }
  if (-not $por -and $fg -ne $CapriPid -and ($estado -eq 2 -or $estado -eq 3 -or $estado -eq 4)) {
    $n = $procs[[string]$fg]
    $por = if ($n -eq 'powerpnt') { 'PowerPoint' } elseif ($n) { $n } else { 'pantalla completa' }
    $tipo = if ($estado -eq 4) { 'presentacion' } else { 'pantalla' }
  }
  # barras de "estás compartiendo" de las apps de reunión
  if (-not $por) {
    foreach ($v in $ventanas) {
      $n = $procs[$v[0]]
      if (-not $n -or -not $v[2]) { continue }
      if ($apps.ContainsKey($n) -and $v[2] -match $compartiendo) { $por = $apps[$n]; $tipo = 'compartiendo'; break }
    }
  }
  if (-not $por) {
    foreach ($n in $procs.Values) { if ($n -eq 'obs64' -or $n -eq 'obs32' -or $n -eq 'obs') { $por = 'OBS'; $tipo = 'compartiendo'; break } }
  }
  # micrófono en uso por otra app = estás en una llamada (cada 4 s, el registro es más lento)
  if ($tick % 2 -eq 0) { $script:mic = MicEnUso }
  $tick++

  $j = '{"tipo":' + $(if ($tipo) { '"' + $tipo + '"' } else { 'null' }) +
       ',"por":' + $(if ($por) { '"' + ($por -replace '[\\"]', '') + '"' } else { 'null' }) +
       ',"llamada":' + $(if ($script:mic) { '"' + ($script:mic -replace '[\\"]', '') + '"' } else { 'null' }) + '}'
  if ($j -ne $last) { $last = $j; [Console]::Out.WriteLine($j); [Console]::Out.Flush() }
  Start-Sleep -Milliseconds 2000
}
