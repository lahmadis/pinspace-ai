export type AnyElement = {
  id: string;
  type: "image" | "text" | "sticky" | "shape";
  src?: string;        // image
  text?: string;       // text / sticky
  shapeType?: string;  // rect/ellipse/star/triangle/etc.
  width?: number;
  height?: number;
};

// normalize string for robust compare
export function norm(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

// make a content fingerprint that remains stable across sessions
export function makeElementKey(el: AnyElement): string {
  const t = norm(el.type);
  if (t === "image") {
    // prefer filename; if data URL, hash the first 64 chars
    const src = norm(el.src);
    const file = src.split(/[/?#]/).pop() ?? src;
    const key = file && file.includes(".") ? file : src.slice(0, 64);
    return `img|${key}`;
  }
  if (t === "text" || t === "sticky") {
    // limit to avoid gigantic keys
    return `txt|${norm(el.text).slice(0, 80)}`;
  }
  // shapes: type + rounded size signature
  const shape = norm(el.shapeType);
  const w = Math.round((el.width ?? 0) / 10) * 10;
  const h = Math.round((el.height ?? 0) / 10) * 10;
  return `shp|${shape}|${w}x${h}`;
}

// simple id normalizer to ignore prefixes like e_, img_, etc.
export function normalizeId(v: unknown) {
  const s = norm(v);
  const prefixes = ["e_", "el_", "img_", "t_", "shape_"];
  for (const p of prefixes) if (s.startsWith(p)) return s.slice(p.length);
  return s;
}



