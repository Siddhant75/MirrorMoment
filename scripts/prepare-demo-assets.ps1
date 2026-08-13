param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$resolvedRoot = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1

if (-not $jpegCodec) {
  throw "A JPEG encoder is required to prepare demo assets."
}

function Assert-ProjectPath {
  param([string]$Path)

  $resolved = [IO.Path]::GetFullPath($Path)
  if (-not $resolved.StartsWith($resolvedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Asset path escaped the MirrorMoment repository."
  }
  return $resolved
}

function Convert-ToProjectJpeg {
  param(
    [string]$Source,
    [string]$Destination
  )

  $sourcePath = (Resolve-Path -LiteralPath (Assert-ProjectPath $Source)).Path
  $destinationPath = Assert-ProjectPath $Destination
  $destinationDirectory = Split-Path -Parent $destinationPath
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  $temporaryPath = Assert-ProjectPath ($destinationPath + ".tmp")

  $sourceImage = [Drawing.Image]::FromFile($sourcePath)
  $bitmap = $null
  $graphics = $null
  $encoderParameters = $null
  try {
    $bitmap = [Drawing.Bitmap]::new(
      $sourceImage.Width,
      $sourceImage.Height,
      [Drawing.Imaging.PixelFormat]::Format24bppRgb
    )
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([Drawing.Color]::White)
    $graphics.DrawImage($sourceImage, 0, 0, $sourceImage.Width, $sourceImage.Height)

    $encoderParameters = [Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParameters.Param[0] = [Drawing.Imaging.EncoderParameter]::new(
      [Drawing.Imaging.Encoder]::Quality,
      [long]88
    )
    $bitmap.Save($temporaryPath, $jpegCodec, $encoderParameters)
  }
  finally {
    if ($encoderParameters) { $encoderParameters.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    $sourceImage.Dispose()
  }

  Move-Item -LiteralPath $temporaryPath -Destination $destinationPath -Force
}

$catalogSource = Assert-ProjectPath (Join-Path $resolvedRoot "assets\catalog-source")
$catalogDestination = Assert-ProjectPath (Join-Path $resolvedRoot "public\catalog")
$catalogFiles = @(Get-ChildItem -LiteralPath $catalogSource -Filter "*.png" -File | Sort-Object Name)
if ($catalogFiles.Count -ne 9) {
  throw "Expected exactly nine original catalog PNG files."
}

foreach ($file in $catalogFiles) {
  $destination = Join-Path $catalogDestination ($file.BaseName + ".jpg")
  Convert-ToProjectJpeg -Source $file.FullName -Destination $destination
}

$privateSource = Assert-ProjectPath (Join-Path $resolvedRoot "private-demo-images")
$replayDestination = Assert-ProjectPath (Join-Path $resolvedRoot "public\replay")
$replaySources = [ordered]@{
  "synthetic-face-matched-tight.png" = "synthetic-face.jpg"
  "synthetic-body.png" = "synthetic-body.jpg"
  "live-navy-tailoring.jpg" = "navy-tailoring-result.jpg"
  "live-cocoa-blazer-set.jpg" = "cocoa-blazer-set-result.jpg"
  "live-graphite-set.jpg" = "graphite-set-result.jpg"
}

foreach ($entry in $replaySources.GetEnumerator()) {
  Convert-ToProjectJpeg `
    -Source (Join-Path $privateSource $entry.Key) `
    -Destination (Join-Path $replayDestination $entry.Value)
}

Write-Output "Prepared 9 catalog JPEGs and 5 replay JPEGs."
