export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function makeRegionKey(lat: number, lng: number, sizeKm: number = 5): string {
  const latStep = sizeKm / 111.32;
  const lngStep = sizeKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const latIndex = Math.floor(lat / latStep);
  const lngIndex = Math.floor(lng / lngStep);
  return `R${latIndex}_${lngIndex}`;
}

export function makeCellKey(lat: number, lng: number, sizeKm: number = 0.5): string {
  const latStep = sizeKm / 111.32;
  const lngStep = sizeKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const latIndex = Math.floor(lat / latStep);
  const lngIndex = Math.floor(lng / lngStep);
  return `C${latIndex}_${lngIndex}`;
}

export function randomOffsetMeters(
  lat: number,
  lng: number,
  distanceM: number,
  bearingDeg: number
): { lat: number; lng: number } {
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const distanceKm = distanceM / 1000;
  
  const latOffset = (distanceKm / 111.32) * Math.cos(bearingRad);
  const lngOffset = (distanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(bearingRad);
  
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

export function randomPointInRadius(
  lat: number,
  lng: number,
  minM: number,
  maxM: number
): { lat: number; lng: number } {
  const bearing = Math.random() * 360;
  const distance = minM + Math.random() * (maxM - minM);
  return randomOffsetMeters(lat, lng, distance, bearing);
}

export function randomPointInCone(
  lat: number,
  lng: number,
  headingDeg: number,
  coneDeg: number,
  minM: number,
  maxM: number
): { lat: number; lng: number } {
  const halfCone = coneDeg / 2;
  const bearingOffset = (Math.random() * coneDeg) - halfCone;
  const bearing = headingDeg + bearingOffset;
  const distance = minM + Math.random() * (maxM - minM);
  return randomOffsetMeters(lat, lng, distance, bearing);
}

interface LocationSample {
  lat: number;
  lng: number;
  createdAt: Date;
  headingDeg?: number | null;
  speedMps?: number | null;
}

export function headingFromLastSamples(samples: LocationSample[]): number | null {
  if (samples.length < 2) return null;
  
  const sorted = [...samples].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const latest = sorted[0];
  const prev = sorted[1];
  
  const dLat = latest.lat - prev.lat;
  const dLng = latest.lng - prev.lng;
  
  if (Math.abs(dLat) < 0.00001 && Math.abs(dLng) < 0.00001) {
    return null;
  }
  
  const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (heading + 360) % 360;
}

export function detectTeleport(samples: LocationSample[], thresholdM: number = 500, thresholdS: number = 15): boolean {
  if (samples.length < 2) return false;
  
  const sorted = [...samples].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const latest = sorted[0];
  const prev = sorted[1];
  
  const timeDiffS = (new Date(latest.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000;
  if (timeDiffS > thresholdS) return false;
  
  const distance = haversineMeters(latest.lat, latest.lng, prev.lat, prev.lng);
  return distance > thresholdM;
}

export function averageSpeed(samples: LocationSample[]): number {
  if (samples.length < 2) return 0;
  
  const sorted = [...samples].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  let totalDistance = 0;
  let totalTime = 0;
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    totalDistance += haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    totalTime += (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000;
  }
  
  return totalTime > 0 ? totalDistance / totalTime : 0;
}
