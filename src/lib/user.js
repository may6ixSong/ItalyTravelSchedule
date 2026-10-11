// 이 기기의 사용자. 최초 접속 때 한 번 만들고 localStorage에 저장해서 다시 묻지 않습니다.
import { createContext, useContext } from 'react';
import { IS_DEV, JOIN_CODE, hasFirebase } from '../config.js';
import { ensureAuth, getPref, put, setPref } from './store.js';

export const COLORS = ['#A24463', '#0B7285', '#9C7318', '#2E5C7A', '#4F6B2E', '#6741D9'];

export function loadMe() {
  const me = getPref('me', null);
  if (me) return me;
  // 개발 서버(npm run dev)에서는 코드 입력 없이 admin 사용자로 바로 들어갑니다.
  if (IS_DEV && !hasFirebase) return { uid: 'admin', name: 'admin', color: '#6741D9', photo: '', dev: true };
  return null;
}

export async function register({ code, name, color, photo }) {
  if (code !== JOIN_CODE) throw new Error('코드가 맞지 않아요');
  const uid = hasFirebase ? await ensureAuth() : `local-${Date.now().toString(36)}`;
  const me = { uid, name: name.trim(), color, photo: photo || '' };
  // joinCode는 firestore.rules가 확인합니다.
  await put('users', uid, { name: me.name, color, photo: me.photo, joinCode: code });
  setPref('me', me);
  return me;
}

// Firebase 연결 전에 만든(이 폰에만 저장된) 사용자를 Firebase 익명 사용자로 옮깁니다.
// 입장 코드는 이미 통과했으니 다시 묻지 않습니다.
export async function linkToFirebase(me) {
  if (!hasFirebase || !me || me.dev) return me;
  const uid = await ensureAuth();
  if (uid === me.uid) return me;
  const next = { ...me, uid };
  await put('users', uid, { name: next.name, color: next.color, photo: next.photo || '', joinCode: JOIN_CODE });
  setPref('me', next);
  return next;
}

export async function updateMe(me, patchData) {
  const next = { ...me, ...patchData };
  setPref('me', next);
  if (!me.dev) await put('users', me.uid, { name: next.name, color: next.color, photo: next.photo, joinCode: JOIN_CODE });
  return next;
}

export const MeContext = createContext(null);
export const useMe = () => useContext(MeContext);
