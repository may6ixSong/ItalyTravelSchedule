// MapLibre 지도. 마커 · 경로선 · 반경 원 · 거리 재기 선을 props로 받아 그립니다.
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { buildStyle } from '../lib/mapStyle.js';
import { CATEGORIES } from '../data/places.js';

let protocolAdded = false;
maplibregl.setWorkerUrl(workerUrl);

const ICON = {
  meal: 'M7 2v8 M5 2v4a2 2 0 0 0 4 0V2 M7 10v12 M17 2c-2 1-3 4-3 7h3v13',
  cafe: 'M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z M17 10h2a2 2 0 0 1 0 4h-2',
  gelato: 'M8 11l4 11 4-11 M7 11a5 5 0 1 1 10 0z',
  sight: 'M3 21h18 M5 21V10 M19 21V10 M10 21V10 M14 21V10 M2 10l10-7 10 7z',
  shop: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  stay: 'M3 19V8 M3 15h18v4 M21 15v-2a3 3 0 0 0-3-3h-7v5',
  transit: 'M7 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 11h14 M8 21l2-4 M16 21l-2-4',
};

function markerEl(m, onClick) {
  const c = CATEGORIES[m.cat] || CATEGORIES.sight;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `mk mk-${c.shape} ${m.kind || ''} ${m.dim ? 'dim' : ''} ${m.selected ? 'sel' : ''} ${m.big ? 'big' : ''}`;
  el.style.setProperty('--c', m.color || c.color);
  el.setAttribute('aria-label', m.title || m.caption || m.name || '');
  el.style.border = '0';
  el.style.padding = '0';
  el.style.background = 'none';
  const inner =
    m.label != null
      ? `<span>${m.label}</span>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[m.cat] || ''}"/></svg>`;
  el.innerHTML = `<span class="in">${inner}</span>${m.caption ? `<span class="mk-label"></span>` : ''}`;
  if (m.caption) el.querySelector('.mk-label').textContent = m.caption;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick?.(m);
  });
  return el;
}

function circle(center, km, n = 72) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.cos(a);
    const dLng = (km / (111.32 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(a);
    pts.push([center.lng + dLng, center.lat + dLat]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
}

const line = (coords) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
const EMPTY = { type: 'FeatureCollection', features: [] };

export default function MapView({ markers, routes = [], me, radius, measure, onMarker, onMapClick, fitKey, padding, onMove, focus }) {
  const box = useRef(null);
  const map = useRef(null);
  const live = useRef([]);
  const meMarker = useRef(null);
  const ready = useRef(false);
  const handlers = useRef({});
  handlers.current = { onMarker, onMapClick, onMove };

  useEffect(() => {
    if (!protocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      protocolAdded = true;
    }
    const m = new maplibregl.Map({
      container: box.current,
      style: buildStyle(),
      center: [12.4964, 41.9028],
      zoom: 12,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: EMPTY });
      m.addSource('radius', { type: 'geojson', data: EMPTY });
      m.addSource('measure', { type: 'geojson', data: EMPTY });
      m.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#1F5F8B', 'fill-opacity': 0.08 } });
      m.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#1F5F8B', 'line-width': 1.5, 'line-dasharray': [3, 3] } });
      m.addLayer({
        id: 'routes', type: 'line', source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['coalesce', ['get', 'width'], 3], 'line-dasharray': [2, 2], 'line-opacity': ['coalesce', ['get', 'opacity'], 1] },
      });
      m.addLayer({ id: 'measure-halo', type: 'line', source: 'measure', paint: { 'line-color': '#fff', 'line-width': 7 } });
      m.addLayer({ id: 'measure', type: 'line', source: 'measure', paint: { 'line-color': '#1B2127', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
      ready.current = true;
      m.fire('itp-ready');
    });
    m.on('click', (e) => handlers.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    m.on('moveend', () => {
      const c = m.getCenter();
      handlers.current.onMove?.({ lat: c.lat, lng: c.lng });
    });
    map.current = m;
    // 폴드를 펼치거나 화면이 돌아가면 지도 크기 다시 맞추기
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      m.remove();
    };
  }, []);

  // 마커
  useEffect(() => {
    const m = map.current;
    live.current.forEach((mk) => mk.remove());
    live.current = markers.map((d) =>
      new maplibregl.Marker({ element: markerEl(d, (x) => handlers.current.onMarker?.(x)), anchor: 'center' })
        .setLngLat([d.lng, d.lat])
        .addTo(m),
    );
  }, [markers]);

  // 선과 원
  useEffect(() => {
    const m = map.current;
    const apply = () => {
      m.getSource('routes')?.setData({
        type: 'FeatureCollection',
        features: routes.filter((r) => r.coords.length > 1).map((r) => ({ ...line(r.coords), properties: { color: r.color, width: r.width, opacity: r.opacity } })),
      });
      m.getSource('radius')?.setData(radius ? { type: 'FeatureCollection', features: [circle(radius.center, radius.km)] } : EMPTY);
      m.getSource('measure')?.setData(
        measure?.a && measure?.b ? { type: 'FeatureCollection', features: [line([[measure.a.lng, measure.a.lat], [measure.b.lng, measure.b.lat]])] } : EMPTY,
      );
    };
    if (ready.current) apply();
    else m.once('itp-ready', apply);
  }, [routes, radius, measure]);

  // 내 위치
  useEffect(() => {
    const m = map.current;
    if (!me) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!meMarker.current) {
      const el = document.createElement('div');
      el.className = 'me-dot';
      meMarker.current = new maplibregl.Marker({ element: el }).setLngLat([me.lng, me.lat]).addTo(m);
    } else meMarker.current.setLngLat([me.lng, me.lat]);
  }, [me]);

  // 화면 맞추기: fitKey가 바뀔 때만
  useEffect(() => {
    const m = map.current;
    const pts = markers.filter((d) => !d.noFit);
    if (!pts.length) return;
    const b = new maplibregl.LngLatBounds();
    pts.forEach((d) => b.extend([d.lng, d.lat]));
    // 타일이 아직 안 받아져도(오프라인 등) 화면 위치는 바로 맞출 수 있습니다.
    const pad = padding || 60;
    const fits = m.getContainer().clientHeight > pad.top + pad.bottom + 40;
    m.fitBounds(b, { padding: fits ? pad : 30, maxZoom: 15.5, duration: 400 });
  }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 특정 지점으로 이동 (focus.key가 바뀔 때)
  useEffect(() => {
    if (!focus) return;
    const m = map.current;
    m.easeTo({ center: [focus.lng, focus.lat], zoom: focus.zoom ?? Math.max(m.getZoom(), 14), padding: padding || 0, duration: 400 });
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="map" />;
}
