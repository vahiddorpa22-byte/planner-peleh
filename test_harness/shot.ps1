param([string]$Url, [string]$Out, [int]$Wait = 12000, [string]$UA = "")
# LOCAL TEST ONLY: headless Edge, app framed at 390x844 via shot.html (fresh temp profile each run).
# Retries when the shot is just the tiny "loading" screen (headless virtual time is sometimes flaky).
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$origin = ([uri]$Url).GetLeftPart([UriPartial]::Authority)
$frame = "$origin/shot.html?u=" + [uri]::EscapeDataString($Url)
for($try = 1; $try -le 4; $try++){
  $prof = Join-Path $env:TEMP ("peleh-shot-" + [guid]::NewGuid().ToString("N"))
  if(Test-Path $Out){ Remove-Item $Out -Force }
  & $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$prof" --window-size=390,844 $(if($UA){"--user-agent=`"$UA`""}) --virtual-time-budget=$Wait --screenshot="$Out" "$frame" 2>$null | Out-Null
  Start-Sleep -Milliseconds 300
  Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
  if((Test-Path $Out) -and (Get-Item $Out).Length -gt 22000){ "saved $Out (try $try)"; return }
}
"WEAK $Out (" + $(if(Test-Path $Out){ (Get-Item $Out).Length } else { 0 }) + " bytes)"
