import { useEffect, useRef } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import type { ConceptMapData } from '../../types/course';

const transformer = new Transformer();

interface Props {
  markmapContent?: string;
  data?: ConceptMapData;
}

// ── Markmap interactive mind map ─────────────────────────────────────────────

function MarkmapView({ content }: { content: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    mmRef.current = Markmap.create(svgRef.current);
    return () => { mmRef.current?.destroy(); };
  }, []);

  useEffect(() => {
    if (!mmRef.current || !content) return;
    const { root } = transformer.transform(content);
    mmRef.current.setData(root);
    void mmRef.current.fit();
  }, [content]);

  return (
    <div className="markmap-container rounded-xl overflow-hidden bg-gray-950 transition-colors">
      <p className="text-gray-600 text-xs text-center pt-2">Scroll para zoom · Arrastra para mover</p>
      <svg
        ref={svgRef}
        className="w-full"
        style={{ minHeight: '400px', background: 'transparent' }}
      />
    </div>
  );
}

// ── Legacy SVG mind map (backward compat with saved courses) ─────────────────

function LegacyMap({ data }: { data: ConceptMapData }) {
  const { central, branches = [] } = data;
  const bl = branches.slice(0, 6);
  const W = 680, H = 480, cx = W / 2, cy = H / 2;
  const tr = (s: string | undefined, n: number) =>
    s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');

  return (
    <div className="markmap-container overflow-auto rounded-xl bg-gray-950 p-2 transition-colors">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto max-w-full">
        {bl.map((b, i) => {
          const ang = (i / bl.length) * 2 * Math.PI - Math.PI / 2;
          const bx = cx + 150 * Math.cos(ang), by = cy + 150 * Math.sin(ang);
          const kids = (b.children || []).slice(0, 3);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#4f46e5" strokeWidth="2" opacity="0.5" />
              {kids.map((ch, j) => {
                const ca = ang + (j - (kids.length - 1) / 2) * 0.42;
                const kx = Math.max(46, Math.min(W - 46, bx + 90 * Math.cos(ca)));
                const ky = Math.max(18, Math.min(H - 18, by + 90 * Math.sin(ca)));
                return (
                  <g key={j}>
                    <line x1={bx} y1={by} x2={kx} y2={ky} stroke="#334155" strokeWidth="1.4" strokeDasharray="4,3" />
                    <rect x={kx - 44} y={ky - 14} width={88} height={28} rx="6" fill="#1e293b" stroke="#334155" />
                    <text x={kx} y={ky} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="9.5">{tr(ch, 14)}</text>
                  </g>
                );
              })}
              <ellipse cx={bx} cy={by} rx={58} ry={24} fill="#1d4ed8" />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10.5" fontWeight="600">{tr(b.concept, 16)}</text>
            </g>
          );
        })}
        <ellipse cx={cx} cy={cy} rx={88} ry={37} fill="#4f46e5" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold">{tr(central, 20)}</text>
      </svg>
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

export function ConceptMap({ markmapContent, data }: Props) {
  if (markmapContent?.trim()) return <MarkmapView content={markmapContent} />;
  if (data?.central) return <LegacyMap data={data} />;
  return <p className="text-center py-8 text-gray-500 text-sm">Mapa no disponible</p>;
}
