import type { InstitutionalFieldDefinition } from "../data/institutional/sectionCatalog";

export type InstitutionalCollectionItemType = NonNullable<InstitutionalFieldDefinition["itemType"]>;

export function createInstitutionalCollectionItem(
  itemType: InstitutionalCollectionItemType,
): Record<string, unknown> {
  if (itemType === "project") {
    return {
      id: crypto.randomUUID(),
      title: "Novo projeto",
      description: "Explique em poucas palavras o que acontece nesta iniciativa.",
      category: "",
      image: null,
      action: null,
    };
  }

  if (itemType === "impact") {
    return {
      id: crypto.randomUUID(),
      value: "0",
      label: "Novo indicador",
      period: "",
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

export function collectionItemLabel(itemType: InstitutionalCollectionItemType): string {
  if (itemType === "project") return "projeto";
  if (itemType === "impact") return "indicador";
  if (itemType === "support") return "forma de ajudar";
  if (itemType === "transparency") return "documento";
  return "rede social";
}
