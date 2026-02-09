param(
  [string]$branch = 'prueba1'
)

# Verificar que git esté disponible
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git no está disponible en esta máquina. Instala Git y vuelve a ejecutar el script."
  exit 1
}

# Crear rama, añadir archivos y hacer commit/push
git checkout -b $branch

git add src/components/InfoCard.tsx src/components/ProductionChart.tsx src/components/Dashboard.tsx src/hooks/useProductionData.ts src/types/dashboard.ts src/App.tsx

git commit -m "feat(dashboard): add dashboard, production chart, info cards and hook (no changes to sync/storage)"

git push -u origin $branch

Write-Output "Branch '$branch' creada y subida (si 'origin' está configurado y tienes permisos)."