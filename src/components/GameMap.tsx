import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Rectangle,
  Polyline,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLng, AmenityResult, ComparisonResult, GamePhase } from '../types';
import { getBoundingBox } from '../services/poi';
import { performanceColor, confidenceLabel } from '../services/scoring';

import 'leaflet/dist/leaflet.css';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function createEmojiIcon(emoji: string, color?: string) {
  const bg = color || '#6b7280';
  return L.divIcon({
    className: 'emoji-marker',
    html: `<div style="
      background:${bg};
      border-radius:50%;
      width:28px;height:28px;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
    ">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const centerIcon = L.divIcon({
  className: 'center-marker',
  html: `<div style="
    background:#dc2626;
    border-radius:50%;
    width:14px;height:14px;
    border:2px solid white;
    box-shadow:0 0 0 2px #dc2626, 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -12],
});

interface MapClickHandlerProps {
  onClick: (latlng: LatLng) => void;
  disabled: boolean;
}

function MapClickHandler({ onClick, disabled }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function FlyToCenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], 15, { duration: 1.2 });
  }, [center, map]);
  return null;
}

interface Props {
  phase: GamePhase;
  center: LatLng | null;
  amenities: AmenityResult[];
  results: ComparisonResult[];
  onMapClick: (latlng: LatLng) => void;
  interactionDisabled: boolean;
  showRoutes: boolean;
}

export default function GameMap({
  phase,
  center,
  amenities,
  results,
  onMapClick,
  interactionDisabled,
  showRoutes,
}: Props) {
  const isRevealed = phase === 'revealed';

  const bbox = useMemo(
    () => (center ? getBoundingBox(center) : null),
    [center]
  );

  const resultMap = useMemo(() => {
    const m: Record<string, ComparisonResult> = {};
    for (const r of results) m[r.categoryId] = r;
    return m;
  }, [results]);

  const rectangleBounds = bbox
    ? ([[bbox[0], bbox[1]], [bbox[2], bbox[3]]] as L.LatLngBoundsExpression)
    : null;

  const showStudyArea = phase !== 'idle';

  return (
    <MapContainer
      center={[40.4168, -3.7038]}
      zoom={3}
      className="game-map"
      zoomControl={true}
    >
      {/* CartoDB Positron — light neutral basemap for analytical overlays */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapClickHandler onClick={onMapClick} disabled={interactionDisabled} />

      {center && <FlyToCenter center={center} />}

      {center && (
        <Marker position={[center.lat, center.lng]} icon={centerIcon}>
          <Popup>
            <strong>Selected point</strong>
          </Popup>
        </Marker>
      )}

      {showStudyArea && rectangleBounds && (
        <Rectangle
          bounds={rectangleBounds}
          pathOptions={{
            color: '#2563eb',
            weight: 1.5,
            fillOpacity: 0.03,
            dashArray: '6 4',
          }}
        />
      )}

      {isRevealed &&
        amenities
          .filter((a) => a.poi)
          .map((a) => {
            const r = resultMap[a.categoryId];
            const perf = r?.performanceVsReal ?? r?.performanceVsBaseline;
            const color = perf ? performanceColor(perf) : '#6b7280';
            const poi = a.poi!;

            return (
              <Marker
                key={a.categoryId}
                position={[poi.location.lat, poi.location.lng]}
                icon={createEmojiIcon(a.icon, color)}
              >
                <Popup>
                  <div className="poi-popup">
                    <strong>{poi.name}</strong>
                    <br />
                    <span className="popup-label">Type</span> {a.label}
                    <br />
                    <span className="popup-label">Straight-line</span>{' '}
                    {Math.round(poi.distanceMeters)} m
                    {a.routeDistanceMeters !== null && (
                      <>
                        <br />
                        <span className="popup-label">Network</span>{' '}
                        {Math.round(a.routeDistanceMeters)} m
                      </>
                    )}
                    {a.realWalkingMinutes !== null && (
                      <>
                        <br />
                        <span className="popup-label">Walk time</span>{' '}
                        {a.realWalkingMinutes.toFixed(1)} min
                      </>
                    )}
                    <br />
                    <span className="popup-label">Thesis ref.</span>{' '}
                    {a.baselineMinutes !== null ? (
                      <>
                        {a.baselineMinutes.toFixed(1)} min
                        {a.baselineDistanceKm !== null && (
                          <> ({a.baselineDistanceKm.toFixed(3)} km)</>
                        )}
                      </>
                    ) : (
                      <em>N/A</em>
                    )}
                    <br />
                    <span className="popup-label">Source</span>{' '}
                    <span className="popup-bl-source">
                      {a.baselineSourceLabel}
                    </span>
                    <br />
                    <span className="popup-label">Confidence</span>{' '}
                    {confidenceLabel(a.confidence)}
                    {r && (
                      <>
                        <br />
                        <span className="popup-label">Your guess</span>{' '}
                        {r.guessMinutes} min
                        {r.deltaGuessVsReal !== null && (
                          <>
                            <br />
                            <span className="popup-label">Δ real</span>{' '}
                            <span style={{ color, fontWeight: 600 }}>
                              {r.deltaGuessVsReal > 0 ? '+' : ''}
                              {r.deltaGuessVsReal.toFixed(1)} min
                            </span>
                          </>
                        )}
                      </>
                    )}
                    <br />
                    <span className="popup-source">{a.source}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

      {isRevealed &&
        showRoutes &&
        amenities
          .filter((a) => a.routeGeometry && a.routeGeometry.length > 0)
          .map((a) => {
            const r = resultMap[a.categoryId];
            const perf = r?.performanceVsReal ?? r?.performanceVsBaseline;
            const color = perf ? performanceColor(perf) : '#6b7280';
            return (
              <Polyline
                key={`route-${a.categoryId}`}
                positions={a.routeGeometry!}
                pathOptions={{
                  color,
                  weight: 2,
                  opacity: 0.5,
                  dashArray: '6 4',
                }}
              />
            );
          })}
    </MapContainer>
  );
}
