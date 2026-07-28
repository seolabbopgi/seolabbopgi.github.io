# seolabbopgi GitHub Pages 자동 배포 스크립트
# 사용법: gh auth login 완료 후 .\scripts\deploy-github.ps1

$ErrorActionPreference = "Stop"
$RepoPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoPath

Write-Host "==> GitHub 인증 확인..."
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "먼저 실행: gh auth login --hostname github.com --git-protocol https --scopes repo,admin:org,workflow"
    exit 1
}

$Org = "seolabbopgi"
$Repo = "seolabbopgi.github.io"
$Remote = "https://github.com/$Org/$Repo.git"

Write-Host "==> 조직 '$Org' 확인..."
$orgExists = $false
try {
    gh api "orgs/$Org" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $orgExists = $true }
} catch {}

if (-not $orgExists) {
    Write-Host "==> 조직 '$Org' 생성..."
    gh api -X POST orgs -f login=$Org -f profile_name=$Org -f admin=wooeong 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "조직 자동 생성 실패. https://github.com/organizations/plan 에서 '$Org' 조직을 수동 생성하세요."
        Write-Host "생성 후 이 스크립트를 다시 실행하세요."
        exit 1
    }
}

Write-Host "==> 저장소 '$Repo' 확인..."
$repoExists = $false
try {
    gh repo view "$Org/$Repo" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $repoExists = $true }
} catch {}

if (-not $repoExists) {
    Write-Host "==> 저장소 생성..."
    gh repo create "$Org/$Repo" --public --description "seolabbopgi card gacha" 
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "==> remote 설정..."
git remote set-url origin $Remote
git branch -M main

Write-Host "==> push..."
git push -u origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> GitHub Pages (Actions) 설정..."
gh api -X PUT "repos/$Org/$Repo/pages" -f "build_type=workflow" 2>$null

Write-Host ""
Write-Host "완료!"
Write-Host "  저장소: https://github.com/$Org/$Repo"
Write-Host "  사이트:  https://seolabbopgi.github.io"
Write-Host "  (Actions 배포 완료까지 1~3분 소요)"
