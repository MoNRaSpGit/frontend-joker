// Los productos con variantes (tamaño, presentación, "para N personas",
// packs) se guardan como filas separadas en la base, con la variante al
// final del nombre entre parentesis: "Pizza con Muzzarella (Metro)".
// Esto separa esa parte para poder agrupar todas las variantes de un
// mismo producto en una sola tarjeta.
export function splitVariantLabel(name: string): { baseName: string; variantLabel: string | null } {
  const match = name.match(/^(.*)\s\(([^)]+)\)\s*$/);
  if (!match) {
    return { baseName: name, variantLabel: null };
  }

  return { baseName: match[1].trim(), variantLabel: match[2].trim() };
}
