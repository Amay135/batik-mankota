import { useId } from "react";

import { WARNA_HEX } from "@/lib/format";

type Jenis = "depan" | "detail" | "belakang" | "model";

const GARIS: Record<string, string> = { indigo: "#D5DCEC", soga: "#EBC999", krem: "#8A6A3E", hitam: "#C9A56B" };
const DINDING: Record<Jenis, [string, string]> = {
  depan: ["#E3D8C5", "#CDBFA6"],
  belakang: ["#DCCFB8", "#BFAE92"],
  detail: ["#D8CBB3", "#BBA98B"],
  model: ["#8E9A7B", "#56614A"],
};

function Motif({ id, motif, dasar, garis }: { id: string; motif: string; dasar: string; garis: string }) {
  switch (motif) {
    case "parang":
      return (
        <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <rect width="36" height="36" fill={dasar} />
          <path d="M-4 40 L40 -4" stroke={garis} strokeWidth="5" />
          <path d="M-4 24 L24 -4M12 40 L40 12" stroke={garis} strokeWidth="1.6" opacity=".8" />
          <circle cx="9" cy="9" r="1.8" fill={garis} />
          <circle cx="27" cy="27" r="1.8" fill={garis} />
        </pattern>
      );
    case "kawung":
      return (
        <pattern id={id} width="34" height="34" patternUnits="userSpaceOnUse">
          <rect width="34" height="34" fill={dasar} />
          {[[8.5, 8.5], [25.5, 8.5], [8.5, 25.5], [25.5, 25.5]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="7" ry="7" fill="none" stroke={garis} strokeWidth="1.3" />
          ))}
          <circle cx="17" cy="17" r="2.2" fill={garis} />
        </pattern>
      );
    case "truntum":
      return (
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill={dasar} />
          {[[6.5, 6.5], [19.5, 19.5]].map(([x, y]) => (
            <g key={`${x}`} transform={`translate(${x} ${y})`} fill={garis}>
              <circle r="1.6" />
              <ellipse cx="0" cy="-4.5" rx="1" ry="2.2" />
              <ellipse cx="0" cy="4.5" rx="1" ry="2.2" />
              <ellipse cx="-4.5" cy="0" rx="2.2" ry="1" />
              <ellipse cx="4.5" cy="0" rx="2.2" ry="1" />
            </g>
          ))}
        </pattern>
      );
    case "sekar-jagad":
      return (
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="64" fill={dasar} />
          <circle cx="14" cy="14" r="9" fill="none" stroke={garis} strokeWidth="1.4" />
          <circle cx="14" cy="14" r="3" fill={garis} />
          <path d="M44 6 54 16 44 26 34 16Z" fill="none" stroke={garis} strokeWidth="1.4" />
          <path d="M10 44c8-10 18-2 14 8s-14 6-14-8Z" fill={garis} opacity=".85" />
          <path d="M42 40c10 0 14 10 6 16-8 4-14-4-6-16Z" fill="none" stroke={garis} strokeWidth="1.4" />
          <circle cx="56" cy="40" r="1.8" fill={garis} />
          <circle cx="28" cy="34" r="1.8" fill={garis} />
        </pattern>
      );
    default: // mega-mendung
      return (
        <pattern id={id} width="56" height="34" patternUnits="userSpaceOnUse">
          <rect width="56" height="34" fill={dasar} />
          {[30, 22, 14].map((y, i) => (
            <path key={y} d={`M-2 ${y + 4} Q14 ${y - 16 + i * 2} 28 ${y + 4} Q42 ${y - 16 + i * 2} 58 ${y + 4}`} fill="none" stroke={garis} strokeWidth={1.6 - i * 0.25} />
          ))}
        </pattern>
      );
  }
}

const SIL: Record<string, string> = {
  kemeja: "M150 78 200 98 250 78 322 108 352 330 304 336 288 196 288 442 112 442 112 196 96 336 48 330 78 108Z",
  outer: "M150 78 200 98 250 78 322 108 352 340 304 346 288 196 288 452 112 452 112 196 96 346 48 340 78 108Z",
  blus: "M140 82 200 100 260 82 330 112 340 250 296 252 290 190 296 380 104 380 110 190 104 252 60 250 70 112Z",
  dress: "M160 78 200 96 240 78 270 100 258 210 330 470 70 470 142 210 130 100Z",
  rok: "M130 150 270 150 340 470 60 470Z",
  pouch: "M90 190h220l12 230H78Z",
};

export function SeniProduk({
  motif, bentuk, warna, jenis = "depan", className = "", foto,
}: {
  motif: string; bentuk: string; warna: string; jenis?: Jenis; className?: string; foto?: string | null;
}) {
  const uid = useId().replace(/:/g, "");
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className={`h-full w-full object-cover ${className}`} />;
  }
  const dasar = WARNA_HEX[warna] ?? "#2C3E6B";
  const garis = GARIS[warna] ?? "#D5DCEC";
  const [a, b] = DINDING[jenis];
  const pat = `p${uid}`;
  const grad = `g${uid}`;
  const bayang = `s${uid}`;
  const kain = bentuk === "kain";
  const selendang = bentuk === "selendang";

  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`} role="img" aria-label={`${bentuk} motif ${motif}`}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <linearGradient id={bayang} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <Motif id={pat} motif={motif} dasar={dasar} garis={garis} />
      </defs>
      <rect width="400" height="500" fill={`url(#${grad})`} />

      {jenis === "detail" ? (
        <g>
          <rect width="400" height="500" fill={`url(#${pat})`} transform="scale(1.9) translate(-40 -50)" />
          <rect width="400" height="500" fill={`url(#${bayang})`} />
          <path d="M0 360 Q200 330 400 372" fill="none" stroke={garis} strokeWidth="2" strokeDasharray="6 5" opacity=".7" />
        </g>
      ) : kain ? (
        <g>
          <ellipse cx="200" cy="420" rx="170" ry="16" fill="#000" opacity=".14" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 6 - 6} ${-i * 62})`}>
              <rect x="50" y="300" width="300" height="64" rx="4" fill={`url(#${pat})`} />
              <rect x="50" y="300" width="300" height="64" rx="4" fill={`url(#${bayang})`} />
              <rect x="50" y="356" width="300" height="8" rx="3" fill="#000" opacity=".18" />
            </g>
          ))}
        </g>
      ) : selendang ? (
        <g>
          <rect x="60" y="360" width="280" height="120" fill="#8D8272" />
          <rect x="60" y="360" width="280" height="18" fill="#A89C89" />
          <path d="M70 120C150 70 230 190 330 110L350 300C260 380 170 270 80 360Z" fill={`url(#${pat})`} stroke="#00000030" strokeWidth="1.5" />
          <path d="M70 120C150 70 230 190 330 110L350 300C260 380 170 270 80 360Z" fill={`url(#${bayang})`} />
        </g>
      ) : (
        <g transform={jenis === "model" ? "translate(-30 -10) scale(1.15)" : undefined}>
          {jenis !== "model" && (
            <>
              <path d="M200 40v22" stroke="#6B5A45" strokeWidth="3" />
              <path d="M200 62c10 0 12-12 4-14M200 62 140 90M200 62l60 28" stroke="#6B5A45" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          )}
          <ellipse cx="200" cy="468" rx="130" ry="9" fill="#000" opacity=".1" />
          <path d={SIL[bentuk] ?? SIL.kemeja} fill={`url(#${pat})`} stroke="#00000040" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={SIL[bentuk] ?? SIL.kemeja} fill={`url(#${bayang})`} />
          {["kemeja", "outer"].includes(bentuk) && (
            <>
              <path d="M150 78 200 128 250 78 232 72 200 100 168 72Z" fill={dasar} stroke="#00000040" />
              <path d="M200 128V440" stroke="#00000035" strokeWidth="1.5" />
              {[170, 230, 290, 350].map((y) => <circle key={y} cx="206" cy={y} r="2.4" fill="#F5EFE3" opacity=".9" />)}
            </>
          )}
          {bentuk === "blus" && <path d="M170 82 200 112 230 82" fill="none" stroke="#00000040" strokeWidth="1.5" />}
          {bentuk === "dress" && <path d="M142 210h116" stroke="#00000030" strokeWidth="2" />}
          {bentuk === "pouch" && <path d="M90 190h220" stroke="#00000045" strokeWidth="3" />}
        </g>
      )}
    </svg>
  );
}
