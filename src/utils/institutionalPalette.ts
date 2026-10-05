function componentToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
}

function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex).replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function distance(
  first: [number, number, number],
  second: [number, number, number],
): number {
  return Math.sqrt(
    (first[0] - second[0]) ** 2 +
      (first[1] - second[1]) ** 2 +
      (first[2] - second[2]) ** 2,
  );
}

function channelLuminance(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const [fr, fg, fb] = hexToRgb(foreground);
  const [br, bg, bb] = hexToRgb(background);
  const first = 0.2126 * channelLuminance(fr) + 0.7152 * channelLuminance(fg) + 0.0722 * channelLuminance(fb);
  const second = 0.2126 * channelLuminance(br) + 0.7152 * channelLuminance(bg) + 0.0722 * channelLuminance(bb);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function saturation(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max === 0) return 0;
  return (max - min) / max;
}

function luminanceScore(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}


function hueDegrees(hex: string): number | null {
  const [red, green, blue] = hexToRgb(hex).map((value) => value / 255) as [number, number, number];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta < 0.04) return null;

  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  const degrees = hue * 60;
  return degrees < 0 ? degrees + 360 : degrees;
}

function hueDistance(first: string, second: string): number | null {
  const firstHue = hueDegrees(first);
  const secondHue = hueDegrees(second);
  if (firstHue === null || secondHue === null) return null;
  const difference = Math.abs(firstHue - secondHue);
  return Math.min(difference, 360 - difference);
}

export function analyzeBrandHarmony(input: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): { pass: boolean; message: string } {
  const pairs = [
    hueDistance(input.primaryColor, input.secondaryColor),
    hueDistance(input.primaryColor, input.accentColor),
    hueDistance(input.secondaryColor, input.accentColor),
  ].filter((value): value is number => value !== null);

  if (pairs.length <= 1) {
    return {
      pass: true,
      message: "A paleta usa tons neutros ou próximos; a CONG preserva contraste e usa o destaque com moderação.",
    };
  }

  const tooClose = pairs.filter((difference) => difference < 14).length;
  if (tooClose >= 2) {
    return {
      pass: false,
      message: "As cores principais estão muito próximas entre si. Considere um destaque mais distinto para criar hierarquia visual.",
    };
  }

  const veryCompeting = pairs.filter((difference) => difference > 145 && difference < 215).length;
  if (veryCompeting >= 2) {
    return {
      pass: true,
      message: "A paleta tem contraste cromático forte. Use a cor de destaque em áreas menores para manter equilíbrio visual.",
    };
  }

  return {
    pass: true,
    message: "As cores têm separação suficiente para criar hierarquia sem competir excessivamente.",
  };
}

export interface BrandPaletteSuggestion {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  notes: string[];
}

export function buildBrandPaletteSuggestion(colors: string[]): BrandPaletteSuggestion {
  const normalized = [...new Set(colors.map((color) => color.toLowerCase()))];
  const fallback = ["#1366c4", "#04523c", "#f7b534"];
  const ranked = normalized
    .map((color) => {
      const [r, g, b] = hexToRgb(color);
      return { color, saturation: saturation(r, g, b), lightness: luminanceScore(color) };
    })
    .filter((item) => item.lightness > 0.08 && item.lightness < 0.94)
    .sort((a, b) => b.saturation - a.saturation);

  const primary = ranked[0]?.color ?? fallback[0];
  const secondary = ranked.find((item) => item.color !== primary && distance(hexToRgb(item.color), hexToRgb(primary)) > 70)?.color ?? fallback[1];
  const accent = ranked.find((item) => item.color !== primary && item.color !== secondary)?.color ?? fallback[2];
  const backgroundColor = "#ffffff";
  let textColor = "#091c30";
  const notes: string[] = [];

  if (contrastRatio(primary, backgroundColor) < 3) {
    const adjusted = darken(primary, 0.68);
    notes.push(`A cor principal foi escurecida de ${primary} para ${adjusted} para melhorar a leitura em fundos claros.`);
  }

  if (contrastRatio(textColor, backgroundColor) < 4.5) {
    textColor = "#091c30";
  }

  return {
    primaryColor: contrastRatio(primary, backgroundColor) >= 3 ? primary : darken(primary, 0.68),
    secondaryColor: secondary,
    accentColor: accent,
    backgroundColor,
    textColor,
    notes,
  };
}

export function analyzeBrandContrast(input: {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}): Array<{ label: string; ratio: number; pass: boolean; message: string }> {
  const textRatio = contrastRatio(input.textColor, input.backgroundColor);
  const primaryRatio = contrastRatio(input.primaryColor, input.backgroundColor);
  const accentTextRatio = contrastRatio(input.textColor, input.accentColor);

  return [
    {
      label: "Texto sobre fundo",
      ratio: textRatio,
      pass: textRatio >= 4.5,
      message: textRatio >= 4.5 ? "Boa legibilidade para textos comuns." : "Aumente o contraste entre texto e fundo.",
    },
    {
      label: "Cor principal sobre fundo",
      ratio: primaryRatio,
      pass: primaryRatio >= 3,
      message: primaryRatio >= 3 ? "Adequada para elementos gráficos e textos maiores." : "Use uma variação mais escura para elementos importantes.",
    },
    {
      label: "Texto sobre destaque",
      ratio: accentTextRatio,
      pass: accentTextRatio >= 4.5,
      message: accentTextRatio >= 4.5 ? "O destaque mantém boa leitura." : "O destaque precisa de texto mais claro ou mais escuro.",
    },
  ];
}

export async function extractLogoPalette(file: File): Promise<string[]> {
  const image = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const size = 80;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    image.close();
    return [];
  }

  context.drawImage(image, 0, 0, size, size);
  image.close();

  const pixels = context.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { count: number; rgb: [number, number, number] }>();

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha < 180) continue;

    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const brightness = (red + green + blue) / 3;
    if (brightness > 244 || brightness < 18) continue;

    const quantized: [number, number, number] = [
      Math.min(255, Math.round(red / 32) * 32),
      Math.min(255, Math.round(green / 32) * 32),
      Math.min(255, Math.round(blue / 32) * 32),
    ];
    const key = quantized.join("-");
    const current = buckets.get(key);
    buckets.set(key, {
      count: (current?.count ?? 0) + 1,
      rgb: current?.rgb ?? quantized,
    });
  }

  const selected: [number, number, number][] = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.count - a.count)) {
    if (selected.every((color) => distance(color, bucket.rgb) > 70)) {
      selected.push(bucket.rgb);
    }
    if (selected.length === 5) break;
  }

  return selected.map(([red, green, blue]) => rgbToHex(red, green, blue));
}
