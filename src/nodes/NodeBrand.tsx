export function NodeBrand({ brand }: { brand?: string }) {
  const value = brand?.trim()
  if (!value) return null
  return <div className="fo-brand">{value}</div>
}
