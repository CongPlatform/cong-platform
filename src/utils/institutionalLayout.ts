import type {
  InstitutionalElementStyle,
  InstitutionalElementType,
  InstitutionalElementValue,
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

export function getSectionLayoutOverride(
  settings: Record<string, unknown>,
): InstitutionalLayoutNode | null {
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

  if (
    node.type === "stack" ||
    node.type === "grid" ||
    node.type === "columns"
  ) {
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
      children: node.children.map((child) =>
        updateLayoutNode(child, id, updater),
      ),
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

export function createElementNode(
  type: InstitutionalElementType,
  initialValue?: InstitutionalElementValue,
): InstitutionalLayoutNode {
  const id = nodeId();

  if (type === "heading") {
    return {
      type: "element",
      id,
      elementType: type,
      value: initialValue === "display" ? "Uma causa que transforma futuros." : initialValue === "statement" ? "Pessoas no centro de tudo." : "Novo título",
      presentation: "heading",
      style: {
        size: initialValue === "display" ? "3xl" : "2xl",
        width: "100",
        color: initialValue === "display" ? "primary.strong" : "text",
        align: "left",
        fontSize: initialValue === "display" ? 56 : initialValue === "statement" ? 42 : 34,
        fontPreset: initialValue === "display" ? "display" : "heading",
      },
    };
  }

  if (type === "text") {
    return {
      type: "element",
      id,
      elementType: type,
      value: initialValue === "lead"
        ? "Uma ideia clara, acolhedora e fácil de compreender."
        : initialValue === "caption"
          ? "Informação complementar, fonte ou legenda."
          : "Escreva seu texto aqui.",
      presentation: "body",
      style: {
        size: initialValue === "lead" ? "xl" : initialValue === "caption" ? "sm" : "md",
        width: "100",
        color: initialValue === "caption" ? "text.soft" : "text",
        align: "left",
        fontPreset: initialValue === "caption" ? "caption" : "body",
        fontSize: initialValue === "lead" ? 22 : initialValue === "caption" ? 14 : 17,
      },
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
      style: {
        width: "auto",
        backgroundColor: "accent",
        color: "text",
        radius: "pill",
      },
    };
  }

  if (type === "icon") {
    return {
      type: "element",
      id,
      elementType: type,
      value: typeof initialValue === "string" ? initialValue : "heart",
      style: {
        color: "primary",
        width: "auto",
        iconSizePx: 48,
        iconStrokeWidth: 2,
        opacity: 1,
      },
    };
  }

  if (type === "shape") {
    return {
      type: "element",
      id,
      elementType: type,
      value: typeof initialValue === "string" ? initialValue : "square",
      presentation: "shape",
      style: {
        width: "auto",
        heightPx: typeof initialValue === "string" && initialValue === "line" ? 28 : 120,
        color: "primary",
        backgroundColor: "accent",
        strokeWidth: typeof initialValue === "string" && initialValue === "line" ? 4 : 0,
        opacity: 1,
        shapeRadius: 8,
      },
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
      value: initialValue === "manifesto" ? "“Transformar é construir novos caminhos em conjunto.”" : "Uma frase de destaque ou depoimento.",
      style: {
        size: "lg",
        fontSize: initialValue === "manifesto" ? 34 : 23,
        color: initialValue === "manifesto" ? "primary.strong" : "text",
        width: "100",
        align: "left",
      },
    };
  }

  if (type === "faq") {
    return {
      type: "element", id, elementType: type,
      value: { items: [
        { id: nodeId(), question: "Como posso participar?", answer: "Entre em contato com a organização para conhecer as oportunidades." },
        { id: nodeId(), question: "Como funciona o atendimento?", answer: "A equipe orienta cada pessoa de acordo com as atividades disponíveis." },
      ] },
      style: { width: "100", color: "text" },
    };
  }
  if (type === "progress") {
    return {
      type: "element", id, elementType: type,
      value: { label: "Meta da campanha", percent: 65, detail: "Exemplo ilustrativo: atualize com dados confirmados." },
      style: { width: "100", color: "primary" },
    };
  }

  if (type === "campaign_card") return {
    type: "element", id, elementType: type,
    value: {
      kind: "campaign_card", tag: "CAMPANHA · EXEMPLO", title: "Uma comunidade mais forte começa aqui",
      description: "Apresente uma campanha real, sua meta e como a comunidade pode participar.",
      image: null, illustration: "comunidade", raised: 3750, goal: 10000, unit: "R$",
      action: { label: "Conhecer a campanha", href: "#" },
    }, style: { width: "100", color: "text" },
  };
  if (type === "media_gallery") return {
    type: "element", id, elementType: type,
    value: { kind: "media_gallery", title: "Nossa história em imagens", items: [
      { id: nodeId(), image: null, illustration: "comunidade", caption: "Ação comunitária", focalX: 50, focalY: 50 },
      { id: nodeId(), image: null, illustration: "essencial", caption: "Pessoas e encontros", focalX: 50, focalY: 50 },
      { id: nodeId(), image: null, illustration: "sereno", caption: "Resultados compartilhados", focalX: 50, focalY: 50 },
    ] }, style: { width: "100", color: "text" },
  };
  if (type === "video_embed") return {
    type: "element", id, elementType: type,
    value: { kind: "video_embed", title: "Conheça nosso trabalho", caption: "Adicione um link de vídeo do YouTube ou Vimeo.", url: "" },
    style: { width: "100", color: "text" },
  };
  if (type === "community_timeline") return {
    type: "element", id, elementType: type,
    value: { kind: "community_timeline", title: "Uma história construída juntos", eyebrow: "NOSSA TRAJETÓRIA", items: [
      { id: nodeId(), year: "2018", title: "Uma ideia ganha forma", description: "Pessoas da comunidade se unem em torno de uma necessidade comum." },
      { id: nodeId(), year: "2021", title: "Novas redes de apoio", description: "O projeto amplia sua atuação com voluntários e parceiros." },
      { id: nodeId(), year: "Hoje", title: "Seguimos aprendendo", description: "Exemplo de narrativa: substitua os marcos pelos fatos da sua organização." },
    ] }, style: { width: "100", color: "text" },
  };
  if (type === "testimonial_slider") return {
    type: "element", id, elementType: type,
    value: { kind: "testimonial_slider", title: "Vozes que nos movem", subtitle: "Depoimentos fictícios para demonstrar a composição — substitua por relatos autorizados.", items: [
      { id: nodeId(), quote: "Quando as pessoas se escutam, a comunidade inteira fica mais forte.", author: "Marina S.", role: "Relato demonstrativo" },
      { id: nodeId(), quote: "A colaboração transforma boas ideias em cuidado real.", author: "André L.", role: "Relato demonstrativo" },
    ] }, style: { width: "100", color: "text" },
  };
  if (type === "action_grid") return {
    type: "element", id, elementType: type,
    value: { kind: "action_grid", title: "Sua participação faz a diferença", subtitle: "Escolha como participar — cada opção pode levar a uma página do site.", items: [
      { id: nodeId(), eyebrow: "PARTICIPE", title: "Seja voluntário", description: "Compartilhe tempo, conhecimento e cuidado.", icon: "hand", action: { label: "Quero participar", href: "#" } },
      { id: nodeId(), eyebrow: "APOIE", title: "Faça uma doação", description: "Ajude iniciativas a atender quem mais precisa.", icon: "heart", action: { label: "Quero doar", href: "#" } },
      { id: nodeId(), eyebrow: "ACOMPANHE", title: "Conheça os projetos", description: "Veja ações e resultados da nossa atuação.", icon: "book", action: { label: "Ver ações", href: "#" } },
    ] }, style: { width: "100", color: "text" },
  };
  if (type === "donation_choices") return {
    type: "element", id, elementType: type,
    value: { kind: "donation_choices", title: "Escolha como você quer ajudar", subtitle: "Valores ilustrativos; configure um destino de doação antes de publicar.", currency: "R$", items: [
      { id: nodeId(), amount: 25, description: "Um pequeno gesto" },
      { id: nodeId(), amount: 50, description: "Fortaleça uma ação" },
      { id: nodeId(), amount: 100, description: "Amplie o cuidado" },
      { id: nodeId(), amount: 200, description: "Transforme mais histórias" },
    ], action: { label: "Continuar para doação", href: "#" }, trustNote: "A CONG não processa pagamentos neste componente. Configure um destino externo ou página interna segura." },
    style: { width: "100", color: "text" },
  };
  if (type === "data_chart") return {
    type: "element", id, elementType: type,
    value: { kind: "data_chart", title: "Nossa atuação em dados", subtitle: "Valores de exemplo — substitua pelos resultados confirmados.", format: "bar", unit: "ações", items: [
      { id: nodeId(), label: "Educação", value: 38 },
      { id: nodeId(), label: "Alimentação", value: 62 },
      { id: nodeId(), label: "Saúde", value: 26 },
    ] }, style: { width: "100", color: "text" },
  };
  if (type === "story_tabs") return {
    type: "element", id, elementType: type,
    value: { kind: "story_tabs", title: "Como fazemos a diferença", items: [
      { id: nodeId(), title: "Nossa missão", description: "Apresente o propósito da organização e quem ela atende." },
      { id: nodeId(), title: "Nossa atuação", description: "Conte como as iniciativas são desenvolvidas na prática." },
      { id: nodeId(), title: "Participe", description: "Explique como pessoas e parceiros podem colaborar." },
    ] }, style: { width: "100", color: "text" },
  };

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
        [children[directIndex], children[target]] = [
          children[target],
          children[directIndex],
        ];
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
        [children[directIndex], children[target]] = [
          children[target],
          children[directIndex],
        ];
      }
      return { ...node, children };
    }

    return {
      ...node,
      children: node.children.map((child) =>
        moveLayoutNode(child, id, direction),
      ),
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

  if (
    node.type === "columns" ||
    node.type === "grid" ||
    node.type === "stack"
  ) {
    return node.children.flatMap((child) =>
      collectInstitutionalLayers(child, depth + 1),
    );
  }

  return [];
}

/**
 * Reconnects a section to its semantic/responsive flow after free positioning.
 * Manual transforms are normalized, but grouped compositions keep their internal
 * spacing: the first member becomes the group anchor and the other members keep
 * their relative offsets instead of collapsing on top of one another.
 */
type GroupAnchor = { x: number; y: number };

function collectAutoOrganizeGroupAnchors(
  node: InstitutionalLayoutNode,
  anchors = new Map<string, GroupAnchor>(),
): Map<string, GroupAnchor> {
  if (node.type === "slot" || node.type === "element") {
    const groupId = node.style?.groupId;
    if (groupId && !anchors.has(groupId)) {
      anchors.set(groupId, {
        x: node.style?.offsetX ?? 0,
        y: node.style?.offsetY ?? 0,
      });
    }
    return anchors;
  }
  if (node.type === "repeat") {
    return collectAutoOrganizeGroupAnchors(node.item, anchors);
  }
  if (node.type === "columns" || node.type === "grid" || node.type === "stack") {
    node.children.forEach((child) => collectAutoOrganizeGroupAnchors(child, anchors));
  }
  return anchors;
}

function autoOrganizeNode(
  node: InstitutionalLayoutNode,
  groupAnchors: Map<string, GroupAnchor>,
): InstitutionalLayoutNode {
  if (node.type === "slot" || node.type === "element") {
    const current = node.style ?? {};
    const anchor = current.groupId ? groupAnchors.get(current.groupId) : undefined;
    return {
      ...node,
      style: {
        ...current,
        offsetX: anchor ? Math.round((current.offsetX ?? 0) - anchor.x) : 0,
        offsetY: anchor ? Math.round((current.offsetY ?? 0) - anchor.y) : 0,
        rotation: 0,
        zIndex: 0,
        allowOverflow: false,
        positionMode: "flow",
        offsetReferenceWidth: undefined,
        anchorSource: undefined,
        anchorIndex: undefined,
        anchorXPercent: undefined,
        anchorYPercent: undefined,
      },
    };
  }

  if (node.type === "repeat") {
    return { ...node, item: autoOrganizeNode(node.item, groupAnchors) };
  }

  if (node.type === "columns") {
    return {
      ...node,
      children: [
        autoOrganizeNode(node.children[0], groupAnchors),
        autoOrganizeNode(node.children[1], groupAnchors),
      ],
    };
  }

  return {
    ...node,
    children: node.children.map((child) => autoOrganizeNode(child, groupAnchors)),
  };
}

export function autoOrganizeInstitutionalLayout(
  node: InstitutionalLayoutNode,
): InstitutionalLayoutNode {
  return autoOrganizeNode(node, collectAutoOrganizeGroupAnchors(node));
}

export function collectGroupMemberIds(
  node: InstitutionalLayoutNode,
  groupId: string,
): string[] {
  return collectInstitutionalLayers(node)
    .filter((item) => item.node.style?.groupId === groupId)
    .map((item) => item.id);
}

export function applyStyleToLayoutNodes(
  node: InstitutionalLayoutNode,
  ids: string[],
  style: Partial<InstitutionalElementStyle>,
): InstitutionalLayoutNode {
  const idSet = new Set(ids);
  if ((node.type === "slot" || node.type === "element") && node.id && idSet.has(node.id)) {
    return mergeElementStyle(node, style);
  }
  if (node.type === "repeat") return { ...node, item: applyStyleToLayoutNodes(node.item, ids, style) };
  if (node.type === "columns") {
    return {
      ...node,
      children: [
        applyStyleToLayoutNodes(node.children[0], ids, style),
        applyStyleToLayoutNodes(node.children[1], ids, style),
      ],
    };
  }
  if (node.type === "stack" || node.type === "grid") {
    return { ...node, children: node.children.map((child) => applyStyleToLayoutNodes(child, ids, style)) };
  }
  return node;
}

export function applyOffsetDeltaToLayoutNodes(
  node: InstitutionalLayoutNode,
  ids: string[],
  deltaX: number,
  deltaY: number,
): InstitutionalLayoutNode {
  const idSet = new Set(ids);
  if ((node.type === "slot" || node.type === "element") && node.id && idSet.has(node.id)) {
    const current = node.style ?? {};
    return mergeElementStyle(node, {
      offsetX: Math.round((current.offsetX ?? 0) + deltaX),
      offsetY: Math.round((current.offsetY ?? 0) + deltaY),
    });
  }
  if (node.type === "repeat") return { ...node, item: applyOffsetDeltaToLayoutNodes(node.item, ids, deltaX, deltaY) };
  if (node.type === "columns") {
    return {
      ...node,
      children: [
        applyOffsetDeltaToLayoutNodes(node.children[0], ids, deltaX, deltaY),
        applyOffsetDeltaToLayoutNodes(node.children[1], ids, deltaX, deltaY),
      ],
    };
  }
  if (node.type === "stack" || node.type === "grid") {
    return { ...node, children: node.children.map((child) => applyOffsetDeltaToLayoutNodes(child, ids, deltaX, deltaY)) };
  }
  return node;
}

export function groupLayoutNodes(
  node: InstitutionalLayoutNode,
  ids: string[],
  kind: "manual" | "native" = "manual",
): { layout: InstitutionalLayoutNode; groupId: string } {
  const groupId = crypto.randomUUID();
  const layout = applyStyleToLayoutNodes(node, ids, { groupId, groupKind: kind });
  return { layout, groupId };
}

export function ungroupLayoutNodes(
  node: InstitutionalLayoutNode,
  groupId: string,
): InstitutionalLayoutNode {
  const ids = collectGroupMemberIds(node, groupId);
  return applyStyleToLayoutNodes(node, ids, { groupId: undefined, groupKind: undefined });
}

export function removeLayoutNodes(
  node: InstitutionalLayoutNode,
  ids: string[],
): InstitutionalLayoutNode {
  return ids.reduce((current, id) => removeLayoutNode(current, id), node);
}

/**
 * Clones a layout subtree for duplication while giving every cloned node a
 * fresh id. Leaf elements are nudged slightly so the duplicate is visible
 * immediately, and manual grouping metadata is intentionally cleared.
 */
export function cloneLayoutNodeWithFreshIds(
  node: InstitutionalLayoutNode,
): InstitutionalLayoutNode {
  const clone = structuredClone(node);

  const refresh = (current: InstitutionalLayoutNode): InstitutionalLayoutNode => {
    if (current.type === "element" || current.type === "slot") {
      return {
        ...current,
        id: nodeId(),
        style: current.style
          ? {
              ...current.style,
              offsetX: Math.round((current.style.offsetX ?? 0) + 18),
              offsetY: Math.round((current.style.offsetY ?? 0) + 18),
              groupId: undefined,
              groupKind: undefined,
            }
          : undefined,
      };
    }

    if (current.type === "repeat") {
      return { ...current, id: nodeId(), item: refresh(current.item) };
    }

    if (current.type === "columns") {
      return {
        ...current,
        id: nodeId(),
        children: [refresh(current.children[0]), refresh(current.children[1])],
      };
    }

    return {
      ...current,
      id: nodeId(),
      children: current.children.map(refresh),
    };
  };

  return refresh(clone);
}
