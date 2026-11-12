Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\fund\public\logo_final_page.jpg"
$dstPath = Join-Path $PSScriptRoot "..\fund\public\logo.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y += 2) {
    for ($x = 0; $x -lt $bmp.Width; $x += 2) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.R -lt 240 -or $p.G -lt 240 -or $p.B -lt 240) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Found logo bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"

# Add small 20px padding around emblem
$padding = 16
$cropX = [Math]::Max(0, $minX - $padding)
$cropY = [Math]::Max(0, $minY - $padding)
$cropW = [Math]::Min($bmp.Width - $cropX, ($maxX - $minX) + ($padding * 2))
$cropH = [Math]::Min($bmp.Height - $cropY, ($maxY - $minY) + ($padding * 2))

Write-Host "Cropping rect: X=$cropX, Y=$cropY, W=$cropW, H=$cropH"

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$croppedBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Copy cropped region with transparent background for pure white pixels outside
for ($y = 0; $y -lt $cropH; $y++) {
    for ($x = 0; $x -lt $cropW; $x++) {
        $p = $bmp.GetPixel($cropX + $x, $cropY + $y)
        # Check if outer white background
        if ($p.R -ge 248 -and $p.G -ge 248 -and $p.B -ge 248) {
            # Make transparent
            $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        } else {
            # Smooth blend near edges
            $brightness = ($p.R + $p.G + $p.B) / 3.0
            if ($brightness -gt 240) {
                $alpha = [int](255 * (255 - $brightness) / 15.0)
                if ($alpha -lt 0) { $alpha = 0 }
                if ($alpha -gt 255) { $alpha = 255 }
                $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            } else {
                $croppedBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
            }
        }
    }
}

$bmp.Dispose()

$croppedBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$croppedBmp.Dispose()

Write-Host "Saved transparent cropped logo to $dstPath"
