import { useMemo } from "react";
import { qrMatrix } from "../../utils/qrMatrix.js";

/** QR gerado no dispositivo, sem enviar URLs públicas para serviços de terceiros. */
export default function PublicSiteQr({ url }: { url: string }) {
  const path = useMemo(() => {
    const matrix = qrMatrix(url);
    const n = matrix.length;
    const squares: string[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (matrix[y][x]) squares.push(`M${x + 4} ${y + 4}h1v1h-1z`);
      }
    }
    return { d: squares.join(""), size: n + 8 };
  }, [url]);
  return <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
    <svg role="img" aria-label="QR Code do site publicado" viewBox={`0 0 ${path.size} ${path.size}`} width="172" height="172" style={{ background: "white", borderRadius: 10, padding: 8, maxWidth: "100%" }} shapeRendering="crispEdges">
      <rect width={path.size} height={path.size} fill="#fff" />
      <path d={path.d} fill="#111827" />
    </svg>
    <small style={{ textAlign: "center" }}>Aponte a câmera do celular</small>
  </div>;
}
