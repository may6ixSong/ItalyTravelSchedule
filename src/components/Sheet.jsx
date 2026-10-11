// 지도 위 하단 시트. 손잡이를 끌어 낮게 / 중간 / 높게 세 단계로 멈춥니다. 높이는 화면 비율로 정해서 폰마다 맞습니다.
// 손잡이를 정확히 잡기 어려워서: 오른쪽 '목록 크게' 버튼, 목록 안에서 위로 쓸면 커지고 맨 위에서 아래로 쓸면 작아져요.
import { useRef, useState } from 'react';
import { Icon } from './ui.jsx';

const SNAPS = { peek: 0.26, half: 0.52, full: 0.9 };

export default function Sheet({ snap, onSnap, children, header, panel }) {
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

  // 넓은 화면(폴드 펼침): 왼쪽 가장자리를 끌어서 패널 너비 조절
  const rs = useRef(null);
  const rDown = (e) => {
    rs.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const rMove = (e) => {
    if (!rs.current || !panel) return;
    const right = ref.current.getBoundingClientRect().right;
    panel.onWidth(right - e.clientX);
  };
  const rUp = () => {
    if (rs.current) panel?.onWidthEnd?.();
    rs.current = null;
  };

  // 목록 안에서 쓸어 올리기 / 내리기
  const swipe = useRef(null);
  const tStart = (e) => {
    swipe.current = { y: e.touches[0].clientY, top: e.currentTarget.scrollTop, done: false };
  };
  const tMove = (e) => {
    const sw = swipe.current;
    if (!sw || sw.done) return;
    const dy = e.touches[0].clientY - sw.y;
    if (dy < -36 && snap !== 'full') {
      sw.done = true;
      onSnap('full');
    } else if (dy > 48 && sw.top <= 0 && e.currentTarget.scrollTop <= 0 && snap !== 'peek') {
      sw.done = true;
      onSnap(snap === 'full' ? 'half' : 'peek');
    }
  };

  const height = h != null ? `${h}px` : `${SNAPS[snap] * 100}%`;
  return (
    <section ref={ref} className={`sheet${h != null ? ' dragging' : ''}`} style={{ height }}>
      <div className="sheet-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="grab" />
        <button className="sheet-toggle" onPointerDown={(e) => e.stopPropagation()} onClick={() => onSnap(snap === 'full' ? 'peek' : 'full')}
          aria-label={snap === 'full' ? '지도 크게 보기' : '목록 크게 보기'}>
          <Icon name={snap === 'full' ? 'down' : 'up'} size={14} />{snap === 'full' ? '지도 보기' : '목록 크게'}
        </button>
        {header}
      </div>
      {panel && (
        <>
          <div className="panel-resizer" role="separator" aria-orientation="vertical" aria-label="패널 너비 조절" onPointerDown={rDown} onPointerMove={rMove} onPointerUp={rUp} onPointerCancel={rUp}>
            <i />
          </div>
          <button className="panel-collapse" onClick={panel.onToggle} aria-label="일정 패널 접기"><Icon name="next" size={14} />접기</button>
        </>
      )}
      <div className="sheet-body" onTouchStart={tStart} onTouchMove={tMove}>{children}</div>
    </section>
  );
}

export const SHEET_RATIO = SNAPS;
