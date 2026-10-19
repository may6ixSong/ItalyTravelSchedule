// 여행 준비물은 사람마다 따로: 목록과 체크 상태를 이 폰에만 저장해요 (동행 폰에는 안 보여요).
//
// 처음 한 번 옮기기 (예전엔 공유 DB의 checklist 컬렉션에 group 'pack'으로 같이 쓰던 목록):
//  1) 공유 DB의 준비물 항목(기본 + 그동안 추가한 것)을 settings/meta.packDefaults에 기본 목록으로 저장하고
//     공유 항목은 지워요. 체크 상태는 '체크한 사람'의 폰에만 옮겨져요.
//  2) 이미 옮겨졌으면 packDefaults로, 둘 다 없으면 코드의 기본 목록으로 내 목록을 만들어요.
import { useEffect, useState } from 'react';
import { checklistSeed } from '../data/checklistSeed.js';
import { getPref, patch, remove, setPref } from './store.js';

const bus = new EventTarget();
const prefKey = (uid) => `pack:${uid}`;
const newId = () => 'my-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function save(uid, items) {
  setPref(prefKey(uid), items);
  bus.dispatchEvent(new Event('change'));
}

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const clean = (d) => ({ id: d.id, title: d.title, recommended: !!d.recommended, order: d.order ?? 999, memo: d.memo || '', link: d.link || '', linkKind: d.linkKind || '', doneBy: d.doneBy || '' });

// sharedRows: checklist 컬렉션 전체(불러오는 중이면 null), meta: settings/meta(불러오는 중이면 undefined)
export function usePackList(me, sharedRows, meta) {
  const uid = me.uid;
  const [items, setItems] = useState(() => getPref(prefKey(uid), null));

  useEffect(() => {
    const on = () => setItems(getPref(prefKey(uid), null));
    on();
    bus.addEventListener('change', on);
    return () => bus.removeEventListener('change', on);
  }, [uid]);

  useEffect(() => {
    if (items || !sharedRows || meta === undefined) return;
    const shared = sharedRows.filter((r) => r.group === 'pack');
    let defaults;
    const fromShared = [...shared].sort(byOrder).map((r) => clean({ ...r, doneBy: r.done ? r.doneBy : '' }));
    if (meta?.packDefaults?.length) {
      // 이미 옮겨졌으면 그 목록 + (예전 버전 앱이 그 뒤에 공유 DB에 더한 항목)
      const known = new Set(meta.packDefaults.map((d) => d.id));
      defaults = [...meta.packDefaults, ...fromShared.filter((d) => !known.has(d.id))];
    } else if (fromShared.length) {
      defaults = fromShared;
      patch('settings', 'meta', { packDefaults: defaults });
    } else {
      defaults = checklistSeed().filter((i) => i.group === 'pack').map(clean);
    }
    // 공유 DB의 준비물 항목은 기본 목록으로 옮겼으니 지워요
    shared.forEach((r) => remove('checklist', r.id));
    save(uid, defaults.map(({ doneBy, ...d }) => ({ ...d, done: !!doneBy && doneBy === uid })));
  }, [items, sharedRows, meta, uid]);

  const set = (fn) => save(uid, fn(getPref(prefKey(uid), []) || []));
  const ops = {
    toggle: (id) => set((l) => l.map((i) => (i.id === id ? { ...i, done: !i.done, doneAt: i.done ? 0 : Date.now() } : i))),
    add: (title) => set((l) => [...l, { id: newId(), title, order: Date.now(), done: false, memo: '', link: '' }]),
    update: (id, data) => set((l) => l.map((i) => (i.id === id ? { ...i, ...data } : i))),
    remove: (id) => set((l) => l.filter((i) => i.id !== id)),
  };
  return { items: items && [...items].sort(byOrder), ops };
}
