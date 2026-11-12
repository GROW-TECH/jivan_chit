param()

$root = $PSScriptRoot | Split-Path -Parent
Set-Location $root

Write-Host "Creating dist.zip..."
Remove-Item -Force -ErrorAction SilentlyContinue dist.zip, deploy_live.zip, ui_update.zip

# 1. dist.zip
Compress-Archive -Path 'dist\*' -DestinationPath 'dist.zip' -Force

# 2. ui_update.zip (only UI files: index.html & assets)
$uiStaging = Join-Path $env:TEMP ('ui_update_' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $uiStaging | Out-Null
Copy-Item -Path 'dist\index.html' -Destination $uiStaging
Copy-Item -Path 'dist\assets' -Destination $uiStaging -Recurse
Compress-Archive -Path (Join-Path $uiStaging '*') -DestinationPath 'ui_update.zip' -Force
Remove-Item -Path $uiStaging -Recurse -Force

# 3. deploy_live.zip (full deploy package)
$deployStaging = Join-Path $env:TEMP ('deploy_live_' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $deployStaging | Out-Null
Copy-Item -Path 'dist\*' -Destination $deployStaging -Recurse
Copy-Item -Path 'deploy_package.json' -Destination (Join-Path $deployStaging 'package.json')
Compress-Archive -Path (Join-Path $deployStaging '*') -DestinationPath 'deploy_live.zip' -Force
Remove-Item -Path $deployStaging -Recurse -Force

Write-Host "Zips generated successfully:"
Get-Item dist.zip, ui_update.zip, deploy_live.zip | Select-Object Name, Length, LastWriteTime
