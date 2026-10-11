import type { InstitutionalFieldDefinition } from "../data/institutional/sectionCatalog";

export type InstitutionalCollectionItemType = NonNullable<
  InstitutionalFieldDefinition["itemType"]
>;

export function createInstitutionalCollectionItem(
  itemType: InstitutionalCollectionItemType,
): Record<string, unknown> {
  if (itemType === "project") {
    return {
      id: crypto.randomUUID(),
      title: "Nome da iniciativa",
      description:
        "Conte para quem esta ação existe, o que acontece e qual mudança ela busca gerar.",
      category: "",
      image: null,
      action: null,
    };
  }

  if (itemType === "impact") {
    return {
      id: crypto.randomUUID(),
      value: "1.200+",
      label: "pessoas alcançadas",
      period: "Troque por um dado real",
      source: "",
    };
  }

  if (itemType === "support") {
    return {
      id: crypto.randomUUID(),
      kind: "other",
      title: "Nova forma de ajudar",
      description: "Explique como a pessoa pode participar.",
      action: null,
    };
  }

  if (itemType === "navigation") {
    return {
      id: crypto.randomUUID(),
      label: "Novo link",
      href: "#",
    };
  }

  if (itemType === "transparency") {
    return {
      id: crypto.randomUUID(),
      category: "other",
      title: "Novo documento",
      description: "",
      period: "",
      url: "",
    };
  }

  return {
    id: crypto.randomUUID(),
    label: "Rede social",
    url: "",
  };
}

export function collectionItemLabel(
  itemType: InstitutionalCollectionItemType,
): string {
  if (itemType === "project") return "projeto";
  if (itemType === "impact") return "resultado";
  if (itemType === "support") return "forma de ajudar";
  if (itemType === "transparency") return "documento";
  if (itemType === "navigation") return "link do menu";
  return "rede social";
}
