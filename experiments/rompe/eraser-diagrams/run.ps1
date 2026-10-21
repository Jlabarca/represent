$ErrorActionPreference = 'Stop'
$experiment = 'D:/ware/represent/experiments/rompe/eraser-diagrams'
$cli = 'D:/ware/represent/references/eraser-diagrams/packages/diagrams-cli/dist/cli.js'
$inputs = @(
  "$experiment/inputs/prompt1-economy.json",
  "$experiment/inputs/prompt1-risk-zones.json",
  "$experiment/inputs/prompt1-grouping.json",
  "$experiment/inputs/prompt2-poster.json"
)
& node "$experiment/generate-inputs.mjs"
if ($LASTEXITCODE -ne 0) { throw 'Input generation failed.' }
& node $cli validate @inputs --no-config --json
if ($LASTEXITCODE -ne 0) { throw 'Eraser input validation failed.' }
& node $cli render @inputs --no-config --chromium-path 'C:/Program Files/Google/Chrome/Application/chrome.exe' --format png --out-dir "$experiment/rendered" --scale 1.25 --json
if ($LASTEXITCODE -ne 0) { throw 'Eraser PNG rendering failed.' }
