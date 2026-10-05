import type {
  InstitutionalElementStyle,
  InstitutionalElementType,
  InstitutionalLayoutNode,
  InstitutionalSectionStyle,
} from "../services/institutionalService";

function nodeId(): string {
  return crypto.randomUUID();
}

export function ensureLayoutNodeIds(
  node: InstitutionalLayoutNode,
  path: number[] = [],
): InstitutionalLayoutNode {
  const stableId = `layout-${path.length > 0 ? path.join("-") : "root"}`;

  if (node.type === "element") {
    return {
      ...node,
      id: node.id || stableId,
    };
  }

  if (node.type === "slot") {
    return {
      ...node,
      id: node.id ?? stableId,
    };
  }

  if (node.type === "repeat") {
    return {
      ...node,
      id: node.id ?? stableId,
      item: ensureLayoutNodeIds(node.item, [...path, 0]),
    };
  }

  if (node.type === "columns") {
    return {
      ...node,
      id: node.id ?? stableId,
      children: [
        ensureLayoutNodeIds(node.children[0], [...path, 0]),
        ensureLayoutNodeIds(node.children[1], [...path, 1]),
      ],
    };
  }

  return {
    ...node,
    id: node.id ?? stableId,
    children: node.children.map((child, index) =>
      ensureLayoutNodeIds(child, [...path, index]),
    ),
  };
}

export function getSectionLayoutOverride(settings: Record<string, unknown>): InstitutionalLayoutNode | null {
  const value = settings.layoutOverride;
  return value && typeof value === "object" && "type" in value
    ? (value as InstitutionalLayoutNode)
    : null;
}

export function effectiveSectionLayout(
  baseLayout: InstitutionalLayoutNode,
  settings: Record<string, unknown>,
): InstitutionalLayoutNode {
  return getSectionLayoutOverride(settings) ?? baseLayout;
}

export function getSectionStyle(
  settings: Record<string, unknown>,
): InstitutionalSectionStyle {
  const value = settings.sectionStyle;
  if (!value || typeof value !== "object") return {};
  return value as InstitutionalSectionStyle;
}

export function findLayoutNode(
  node: InstitutionalLayoutNode,
  id: string,
): InstitutionalLayoutNode | null {
  if (node.id === id) return node;

  if (node.type === "repeat") {
    return findLayoutNode(node.item, id);
  }

  if (node.type === "stack" || node.type === "grid" || node.type === "columns") {
    for (const child of node.children) {
      const found = findLayoutNode(child, id);
      if (found) return found;
    }
  }

  return null;
}

export function updateLayoutNode(
  node: InstitutionalLayoutNode,
  id: string,
  updater: (current: InstitutionalLayoutNode) => InstitutionalLayoutNode,
): InstitutionalLayoutNode {
  if (node.id === id) return updater(node);

  if (node.type === "repeat") {
    return {
      ...node,
      item: updateLayoutNode(node.item, id, updater),
    };
  }

  if (node.type === "columns") {
    return {
      ...node,
      children: [
        updateLayoutNode(node.children[0], id, updater),
        updateLayoutNode(node.children[1], id, updater),
      ],
    };
  }

  if (node.type === "stack" || node.type === "grid") {
    return {
      ...node,
      children: node.children.map((child) => updateLayoutNode(child, id, updater)),
    };
  }

  return node;
}

function removeFromChildren(
  children: InstitutionalLayoutNode[],
  id: string,
): InstitutionalLayoutNode[] {
  return children
    .filter((child) => child.id !== id)
    .map((child) => removeLayoutNode(child, id))
    .filter(Boolean) as InstitutionalLayoutNode[];
}

export function removeLayoutNode(
  node: InstitutionalLayoutNode,
  id: string,
): InstitutionalLayoutNode {
  if (node.id === id) {
    return createElementNode("spacer");
  }

  if (node.type === "repeat") {
    return {
      ...node,
      item: removeLayoutNode(node.item, id),
    };
  }

  if (node.type === "columns") {
    return {
      ...node,
      children: [
        removeLayoutNode(node.children[0], id),
        removeLayoutNode(node.children[1], id),
      ],
    };
  }

  if (node.type === "stack" || node.type === "grid") {
    const children = removeFromChildren(node.children, id);
    return {
      ...node,
      children: children.length > 0 ? children : [createElementNode("text")],
    };
  }

  return node;
}

export function appendElement(
  node: InstitutionalLayoutNode,
  element: InstitutionalLayoutNode,
): InstitutionalLayoutNode {
  if (node.type === "stack") {
    return {
      ...node,
      children: [...node.children, element],
    };
  }

  return {
    type: "stack",
    id: nodeId(),
    gap: "medium",
    align: "stretch",
    children: [node, element],
  };
}

export function createElementNode(type: InstitutionalElementType): InstitutionalLayoutNode {
  const id = nodeId();

  if (type === "heading") {
    return {
      type: "element",
      id,
      elementType: type,
      value: "Novo título",
      presentation: "heading",
      style: { size: "2xl", width: "100", color: "text", align: "left" },
    };
  }

  if (type === "text") {
    return {
      type: "element",
      id,
      elementType: type,
      value: "Escreva seu texto aqui.",
      presentation: "body",
      style: { size: "md", width: "100", color: "text", align: "left" },
    };
  }

  if (type === "image") {
    return {
      type: "element",
      id,
      elementType: type,
      value: null,
      presentation: "image",
      style: {
        width: "100",
        radius: "large",
        imageFit: "cover",
        imageZoom: 1,
        focalX: 50,
        focalY: 50,
        imageFrame: "rounded",
        imageAspect: "auto",
        overlayOpacity: 0,
      },
    };
  }

  if (type === "button") {
    return {
      type: "element",
      id,
      elementType: type,
      value: { label: "Saiba mais", href: "#" },
      presentation: "primaryAction",
      style: { width: "auto", backgroundColor: "accent", color: "text", radius: "pill" },
    };
  }

  if (type === "icon") {
    return {
      type: "element",
      id,
      elementType: type,
      value: "heart",
      style: { size: "xl", color: "primary", width: "auto" },
    };
  }

  if (type === "metric") {
    return {
      type: "element",
      id,
      elementType: type,
      value: { value: "0", label: "Indicador" },
      style: { size: "2xl", color: "primary", width: "auto", align: "left" },
    };
  }

  if (type === "quote") {
    return {
      type: "element",
      id,
      elementType: type,
      value: "Uma frase de destaque ou depoimento.",
      style: { size: "lg", color: "text", width: "100", align: "left" },
    };
  }

  if (type === "divider") {
    return {
      type: "element",
      id,
      elementType: type,
      value: null,
      style: { width: "100", color: "primary" },
    };
  }

  return {
    type: "element",
    id,
    elementType: type,
    value: null,
    style: { size: "md", width: "100" },
  };
}


export function moveLayoutNode(
  node: InstitutionalLayoutNode,
  id: string,
  direction: -1 | 1,
): InstitutionalLayoutNode {
  if (node.type === "repeat") {
    return {
      ...node,
      item: moveLayoutNode(node.item, id, direction),
    };
  }

  if (node.type === "columns") {
    const children: [InstitutionalLayoutNode, InstitutionalLayoutNode] = [
      node.children[0],
      node.children[1],
    ];
    const directIndex = children.findIndex((child) => child.id === id);
    if (directIndex >= 0) {
      const target = directIndex + direction;
      if (target >= 0 && target < children.length) {
        [children[directIndex], children[target]] = [children[target], children[directIndex]];
      }
      return { ...node, children };
    }

    return {
      ...node,
      children: [
        moveLayoutNode(children[0], id, direction),
        moveLayoutNode(children[1], id, direction),
      ],
    };
  }

  if (node.type === "stack" || node.type === "grid") {
    const directIndex = node.children.findIndex((child) => child.id === id);
    if (directIndex >= 0) {
      const children = [...node.children];
      const target = directIndex + direction;
      if (target >= 0 && target < children.length) {
        [children[directIndex], children[target]] = [children[target], children[directIndex]];
      }
      return { ...node, children };
    }

    return {
      ...node,
      children: node.children.map((child) => moveLayoutNode(child, id, direction)),
    };
  }

  return node;
}

export function mergeElementStyle(
  node: InstitutionalLayoutNode,
  style: Partial<InstitutionalElementStyle>,
): InstitutionalLayoutNode {
  if (node.type !== "element" && node.type !== "slot") return node;

  return {
    ...node,
    style: {
      ...(node.style ?? {}),
      ...style,
    },
  };
}


export interface InstitutionalLayerItem {
  id: string;
  node: Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>;
  depth: number;
}

export function collectInstitutionalLayers(
  node: InstitutionalLayoutNode,
  depth = 0,
): InstitutionalLayerItem[] {
  if (node.type === "slot" || node.type === "element") {
    return node.id ? [{ id: node.id, node, depth }] : [];
  }

  if (node.type === "repeat") {
    return collectInstitutionalLayers(node.item, depth + 1);
  }

  if (node.type === "columns" || node.type === "grid" || node.type === "stack") {
    return node.children.flatMap((child) => collectInstitutionalLayers(child, depth + 1));
  }

  return [];
}
