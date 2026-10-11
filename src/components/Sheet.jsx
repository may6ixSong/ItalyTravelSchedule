// 지도 위 하단 시트. 손잡이를 끌어 낮게 / 중간 / 높게 세 단계로 멈춥니다. 높이는 화면 비율로 정해서 폰마다 맞습니다.
import { useRef, useState } from 'react';

const SNAPS = { peek: 0.26, half: 0.52, full: 0.9 };

export default function Sheet({ snap, onSnap, children, header }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [h, setH] = useState(null);

  const parentH = () => ref.current?.parentElement?.clientHeight || window.innerHeight;

  const down = (e) => {
    drag.current = { y: e.clientY, start: ref.current.getBoundingClientRect().height, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    setH(Math.max(80, Math.min(parentH() * 0.94, drag.current.start + dy)));
  };
  const up = () => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    if (!moved) {
      onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek');
      setH(null);
      return;
    }
    const ratio = (h ?? 0) / parentH();
    const best = Object.entries(SNAPS).sort((a, b) => Math.abs(a[1] - ratio) - Math.abs(b[1] - ratio))[0][0];
    onSnap(best);
    setH(null);
  };

  const height = h != null ? `${h}px` : `${SNAPS[snap] * 100}%`;
  return (
    <section ref={ref} className={`sheet${h != null ? ' dragging' : ''}`} style={{ height }}>
      <div className="sheet-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="grab" />
        {header}
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  );
}

export const SHEET_RATIO = SNAPS;
