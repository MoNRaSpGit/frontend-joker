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

// "ingredients" se guarda como lista separada por comas (ej. "Carne,
// huevo, lechuga, tomate"). La separamos para armar el checklist del
// modo Dev.
export function parseIngredientList(ingredients: string | null | undefined): string[] {
  if (!ingredients) return [];
  return ingredients
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export type ChoiceGroup = { label: string; options: string[] };

// Algunas observaciones documentan uno o mas sets de elecciones sin
// costo extra, con el patron "X disponibles: A, B, C." (ej. "Salsas
// disponibles: 4Q, Champiñones, Cheddar. Guarnición disponible: Mixta,
// Fritas."). Esto las convierte en grupos de chips seleccionables, uno
// por cada "X disponible(s): ..." encontrado.
export function parseChoiceGroups(observations: string | null | undefined): ChoiceGroup[] {
  if (!observations) return [];

  const matches = observations.matchAll(/(\p{L}+)\s+disponibles?:\s*([^.]+)/giu);
  const groups: ChoiceGroup[] = [];

  for (const match of matches) {
    const options = match[2]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (options.length) {
      groups.push({ label: match[1], options });
    }
  }

  return groups;
}
