import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { useTheme } from '../../context/ThemeContext';

let _counter = 0;

const MERMAID_DARK = {
  theme: 'dark' as const,
  themeVariables: {
    primaryColor: '#4f46e5',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#6366f1',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#030712',
    mainBkg: '#1e1b4b',
    nodeBorder: '#6366f1',
    clusterBkg: '#1e293b',
    titleColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b',
    textColor: '#e2e8f0',
  },
};

const MERMAID_LIGHT = {
  theme: 'default' as const,
  themeVariables: {
    primaryColor: '#eef2ff',
    primaryTextColor: '#1e1b4b',
    primaryBorderColor: '#6366f1',
    lineColor: '#6366f1',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#f1f5f9',
    background: '#ffffff',
    mainBkg: '#eef2ff',
    nodeBorder: '#6366f1',
    clusterBkg: '#f1f5f9',
    titleColor: '#0f172a',
    edgeLabelBackground: '#f8fafc',
    textColor: '#0f172a',
  },
};

interface Props {
  diagram?: string;
}

export function FlowDiagram({ diagram }: Props) {
  const { theme } = useTheme();
  const idRef = useRef(`mermaid_${++_counter}`);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!diagram?.trim()) return;

    // Re-initialize Mermaid with the current theme before each render
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'antiscript',
      ...(theme === 'dark' ? MERMAID_DARK : MERMAID_LIGHT),
    });

    setError(false);
    setSvg('');

    // Generate a unique ID for this render to avoid Mermaid cache collisions
    idRef.current = `mermaid_${++_counter}`;

    mermaid
      .render(idRef.current, diagram)
      .then(({ svg: rendered }) => {
        // Mermaid v10+ renders node labels inside <foreignObject><div>…</div></foreignObject>.
        // DOMPurify's SVG-only profile strips <foreignObject> (XSS risk), making nodes appear
        // empty. Using html:true in the profile allows HTML inside SVG while FORBID_TAGS
        // blocks genuinely dangerous elements.
        const clean = DOMPurify.sanitize(rendered, {
          USE_PROFILES: { svg: true, svgFilters: true, html: true },
          ADD_TAGS: ['style', 'foreignObject'],
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'select', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
        });
        setSvg(clean);
      })
      .catch(() => setError(true));
  }, [diagram, theme]);

  if (!diagram?.trim()) {
    return <p className="text-center py-8 text-gray-500 text-sm">Diagrama no disponible</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-red-400 text-sm">No se pudo renderizar el diagrama.</p>
        <details className="text-left">
          <summary className="text-gray-600 text-xs cursor-pointer">Ver sintaxis</summary>
          <pre className="text-gray-500 text-xs mt-2 bg-gray-900 p-3 rounded-xl overflow-auto whitespace-pre-wrap">{diagram}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex justify-center gap-1.5 py-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="mermaid-container overflow-auto rounded-xl bg-gray-950 p-4 transition-colors">
      {/* SVG from Mermaid — sanitized with DOMPurify before injection */}
      <div className="mx-auto max-w-full [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
