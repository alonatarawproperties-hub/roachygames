import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Target, Navigation, Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, Wind, Zap, Skull, Clock, Users } from 'lucide-react';

// Check if nighttime (6pm-6am)
function isNighttime(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

// Weather icons and colors (Spec: Rainy=Mage, Sunny=Tank, Cloudy=Assassin, Foggy=Support)
const WEATHER_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  sunny: { icon: Sun, color: 'text-yellow-400', label: 'Sunny' },
  cloudy: { icon: Cloud, color: 'text-gray-400', label: 'Cloudy' },
  rainy: { icon: CloudRain, color: 'text-blue-400', label: 'Rainy' },
  foggy: { icon: Wind, color: 'text-purple-300', label: 'Foggy' },
};

// Habitat icons and colors (Spec: Park boosts Support/Mage, Urban boosts Tank/Assassin)
const HABITAT_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  urban: { emoji: '🏙️', color: 'text-gray-300', label: 'Urban' },
  park: { emoji: '🌳', color: 'text-green-400', label: 'Park' },
};

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

const CATCH_RADIUS_METERS = 50;

interface WildSpawn {
  id: string;
  latitude: string;
  longitude: string;
  templateId: string;
  name: string;
  roachyClass: string;
  rarity: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  expiresAt: string;
}

interface FlashEvent {
  id: string;
  name: string;
  description: string;
  rarity: string;
  boostedClass: string;
  spawnMultiplier: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Raid {
  id: string;
  name: string;
  rarity: string;
  class: string;
  currentHP: number;
  maxHP: number;
  participantCount: number;
  latitude: number;
  longitude: number;
  expiresAt: string;
  distanceKm: string;
}

interface MapHuntViewProps {
  spawns: WildSpawn[];
  playerPosition: { lat: number; lng: number } | null;
  onCatchAttempt: (spawn: WildSpawn, distance: number) => void;
  gpsAccuracy?: number | null;
  heading?: number | null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function createPlayerIcon(heading: number | null | undefined) {
  const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
  const rotation = hasHeading ? heading : 0;
  
  return L.divIcon({
    className: 'player-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        position: relative;
        transform: rotate(${rotation}deg);
        transition: transform 0.3s ease-out;
      ">
        ${hasHeading ? `
          <div style="
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 16px solid #3B82F6;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
        ` : ''}
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.4);
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      </div>
      <style>
        .leaflet-marker-icon {
          transition: transform 0.3s ease-out !important;
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createRoachyIcon(rarity: string, isInRange: boolean) {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const pulseAnimation = isInRange ? 'animation: pulse 1.5s ease-in-out infinite;' : '';
  const glowEffect = isInRange ? `box-shadow: 0 0 20px ${color}, 0 0 40px ${color}50;` : '';
  
  return L.divIcon({
    className: 'roachy-marker',
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      </style>
      <div style="
        width: 36px;
        height: 36px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        ${pulseAnimation}
        ${glowEffect}
        animation: bounce 2s ease-in-out infinite;
      ">
        ❓
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapController({ center, followMode }: { center: [number, number]; followMode: boolean }) {
  const map = useMap();
  const hasInitialized = useRef(false);
  const lastCenter = useRef<[number, number]>(center);
  
  useEffect(() => {
    if (!hasInitialized.current && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, 17);
      hasInitialized.current = true;
      lastCenter.current = center;
    }
  }, [center, map]);
  
  useEffect(() => {
    if (followMode && hasInitialized.current) {
      const distance = Math.sqrt(
        Math.pow(center[0] - lastCenter.current[0], 2) + 
        Math.pow(center[1] - lastCenter.current[1], 2)
      );
      if (distance > 0.000005) {
        map.panTo(center, { animate: true, duration: 0.25, easeLinearity: 0.5 });
        lastCenter.current = center;
      }
    }
  }, [center, followMode, map]);
  
  return null;
}

function RecenterButton({ position, followMode, onRecenter }: { position: { lat: number; lng: number }; followMode: boolean; onRecenter?: () => void }) {
  const map = useMap();
  
  const handleRecenter = () => {
    map.setView([position.lat, position.lng], 17, { animate: true });
    onRecenter?.();
  };
  
  return (
    <button
      onClick={handleRecenter}
      className={`absolute bottom-4 right-4 z-[1000] p-3 rounded-full shadow-lg transition-colors ${
        followMode 
          ? 'bg-[#f0c850] text-[#120a05] border-2 border-[#f0c850]' 
          : 'bg-[#1e1109] border-2 border-[#f0c850] text-[#f0c850] hover:bg-[#3b2418]'
      }`}
      data-testid="button-recenter"
      title={followMode ? 'Following your location' : 'Tap to follow your location'}
    >
      <Navigation className="w-5 h-5" />
    </button>
  );
}

function MapDragDetector({ onDrag }: { onDrag: () => void }) {
  const map = useMap();
  
  useEffect(() => {
    const handleDragStart = () => {
      onDrag();
    };
    
    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [map, onDrag]);
  
  return null;
}

function createRaidBossIcon(rarity: string) {
  const bgColor = rarity === 'legendary' ? '#F59E0B' : '#A855F7';
  const glowColor = rarity === 'legendary' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(168, 85, 247, 0.6)';
  
  return L.divIcon({
    className: 'raid-marker',
    html: `
      <div style="
        width: 48px;
        height: 48px;
        position: relative;
        animation: pulse 2s infinite;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${bgColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 20px ${glowColor}, 0 0 40px ${glowColor};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="font-size: 24px;">💀</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const DEMO_ROACHIES = [
  { id: 'demo-1', name: 'Speedy', roachyClass: 'assassin', rarity: 'common', baseHp: 80, baseAtk: 120, baseDef: 60, baseSpd: 140 },
  { id: 'demo-2', name: 'Tanko', roachyClass: 'tank', rarity: 'uncommon', baseHp: 150, baseAtk: 80, baseDef: 120, baseSpd: 70 },
  { id: 'demo-3', name: 'Mystic', roachyClass: 'mage', rarity: 'rare', baseHp: 70, baseAtk: 140, baseDef: 50, baseSpd: 100 },
  { id: 'demo-4', name: 'Healer', roachyClass: 'support', rarity: 'epic', baseHp: 90, baseAtk: 60, baseDef: 80, baseSpd: 110 },
  { id: 'demo-5', name: 'Ancient', roachyClass: 'tank', rarity: 'legendary', baseHp: 200, baseAtk: 100, baseDef: 150, baseSpd: 80 },
  { id: 'demo-6', name: 'Shadow', roachyClass: 'assassin', rarity: 'common', baseHp: 75, baseAtk: 130, baseDef: 55, baseSpd: 145 },
  { id: 'demo-7', name: 'Arcane', roachyClass: 'mage', rarity: 'uncommon', baseHp: 65, baseAtk: 145, baseDef: 45, baseSpd: 105 },
  { id: 'demo-8', name: 'Guardian', roachyClass: 'support', rarity: 'rare', baseHp: 100, baseAtk: 70, baseDef: 90, baseSpd: 95 },
];

function generateDemoSpawns(playerLat: number, playerLng: number): WildSpawn[] {
  return DEMO_ROACHIES.map((roach, index) => {
    const angle = (index * 45) * Math.PI / 180;
    const radiusMeters = 15 + (index % 4) * 12;
    const latOffset = (radiusMeters / 111320) * Math.cos(angle);
    const lngOffset = (radiusMeters / (111320 * Math.cos(playerLat * Math.PI / 180))) * Math.sin(angle);
    
    return {
      ...roach,
      templateId: `template-${index}`,
      latitude: String(playerLat + latOffset),
      longitude: String(playerLng + lngOffset),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  });
}

export default function MapHuntView({ 
  spawns, 
  playerPosition, 
  onCatchAttempt,
  gpsAccuracy,
  heading 
}: MapHuntViewProps) {
  const [selectedSpawn, setSelectedSpawn] = useState<WildSpawn | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(0);
  const [demoSpawns, setDemoSpawns] = useState<WildSpawn[]>([]);
  const [demoSpawnsGenerated, setDemoSpawnsGenerated] = useState(false);
  const [followMode, setFollowMode] = useState(true);
  const [weather, setWeather] = useState<{ weather: string; boostedClass: string } | null>(null);
  const [habitat, setHabitat] = useState<{ habitat: string; boostedClass: string } | null>(null);
  const [flashEvents, setFlashEvents] = useState<FlashEvent[]>([]);
  const [raids, setRaids] = useState<Raid[]>([]);
  const [flashTimeRemaining, setFlashTimeRemaining] = useState<string>('');
  
  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/hunt/weather');
        const data = await response.json();
        if (data.success) {
          setWeather({ weather: data.weather, boostedClass: data.boostedClass });
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 3 * 60 * 1000); // Refresh every 3 minutes
    return () => clearInterval(interval);
  }, []);
  
  // Fetch habitat based on player position
  useEffect(() => {
    if (!playerPosition) return;
    
    const fetchHabitat = async () => {
      try {
        const response = await fetch(`/api/hunt/habitat?latitude=${playerPosition.lat}&longitude=${playerPosition.lng}`);
        const data = await response.json();
        if (data.success) {
          setHabitat({ habitat: data.habitat, boostedClass: data.boostedClass });
        }
      } catch (error) {
        console.error('Failed to fetch habitat:', error);
      }
    };
    
    fetchHabitat();
  }, [playerPosition?.lat, playerPosition?.lng]);
  
  // Fetch flash events
  useEffect(() => {
    const fetchFlashEvents = async () => {
      try {
        const response = await fetch('/api/hunt/flash-events');
        const data = await response.json();
        if (data.success && data.active) {
          setFlashEvents(data.active);
        }
      } catch (error) {
        console.error('Failed to fetch flash events:', error);
      }
    };
    
    fetchFlashEvents();
    const interval = setInterval(fetchFlashEvents, 30 * 1000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  // Update flash event countdown timer
  useEffect(() => {
    if (flashEvents.length === 0) {
      setFlashTimeRemaining('');
      return;
    }
    
    const updateTimer = () => {
      const event = flashEvents[0];
      const endTime = new Date(event.endTime).getTime();
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setFlashTimeRemaining('Ending...');
        return;
      }
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setFlashTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [flashEvents]);
  
  // Fetch nearby raids
  useEffect(() => {
    if (!playerPosition) return;
    
    const fetchRaids = async () => {
      try {
        const response = await fetch(`/api/hunt/raids?latitude=${playerPosition.lat}&longitude=${playerPosition.lng}`);
        const data = await response.json();
        if (data.success && data.raids) {
          setRaids(data.raids);
        }
      } catch (error) {
        console.error('Failed to fetch raids:', error);
      }
    };
    
    fetchRaids();
    const interval = setInterval(fetchRaids, 15 * 1000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [playerPosition?.lat, playerPosition?.lng]);
  
  useEffect(() => {
    if (playerPosition && spawns.length === 0 && !demoSpawnsGenerated) {
      setDemoSpawns(generateDemoSpawns(playerPosition.lat, playerPosition.lng));
      setDemoSpawnsGenerated(true);
    }
  }, [playerPosition, spawns.length, demoSpawnsGenerated]);
  
  const displaySpawns = spawns.length === 0 ? demoSpawns : spawns;
  const isUsingDemoSpawns = spawns.length === 0 && demoSpawns.length > 0;
  
  if (!playerPosition) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#120a05]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#f0c850] border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-[#f0c850] text-lg">Getting your location...</p>
        </div>
      </div>
    );
  }

  const getSpawnPosition = (spawn: WildSpawn): [number, number] => {
    return [parseFloat(spawn.latitude), parseFloat(spawn.longitude)];
  };

  const handleSpawnClick = (spawn: WildSpawn, distance: number) => {
    setSelectedSpawn(spawn);
    setSelectedDistance(distance);
  };

  const handleCatch = () => {
    if (selectedSpawn) {
      onCatchAttempt(selectedSpawn, selectedDistance);
      setSelectedSpawn(null);
    }
  };

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[playerPosition.lat, playerPosition.lng]}
        zoom={17}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController center={[playerPosition.lat, playerPosition.lng]} followMode={followMode} />
        <MapDragDetector onDrag={() => setFollowMode(false)} />
        
        <Circle
          center={[playerPosition.lat, playerPosition.lng]}
          radius={CATCH_RADIUS_METERS}
          pathOptions={{
            color: '#f0c850',
            fillColor: '#f0c850',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 10',
          }}
        />
        
        <Marker 
          position={[playerPosition.lat, playerPosition.lng]} 
          icon={createPlayerIcon(heading)}
        >
          <Popup className="player-popup">
            <div className="text-center font-bold">You are here</div>
          </Popup>
        </Marker>
        
        {displaySpawns.slice(0, 20).map((spawn) => {
          const [lat, lng] = getSpawnPosition(spawn);
          const distance = calculateDistance(playerPosition.lat, playerPosition.lng, lat, lng);
          const isInRange = distance <= CATCH_RADIUS_METERS;
          
          return (
            <Marker
              key={spawn.id}
              position={[lat, lng]}
              icon={createRoachyIcon(spawn.rarity, isInRange)}
              eventHandlers={{
                click: () => handleSpawnClick(spawn, distance),
              }}
            >
              <Popup>
                <div className="text-center p-2">
                  <div className="text-2xl mb-1">❓</div>
                  <div className="font-bold text-sm" style={{ color: RARITY_COLORS[spawn.rarity] }}>
                    {spawn.rarity.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.round(distance)}m away
                  </div>
                  {isInRange ? (
                    <button
                      onClick={() => handleSpawnClick(spawn, distance)}
                      className="mt-2 px-3 py-1 bg-[#f0c850] text-[#120a05] rounded-full text-xs font-bold"
                      data-testid={`button-catch-${spawn.id}`}
                    >
                      Catch!
                    </button>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">
                      Get closer to catch
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Raid boss markers */}
        {raids.map((raid) => (
          <Marker
            key={raid.id}
            position={[raid.latitude, raid.longitude]}
            icon={createRaidBossIcon(raid.rarity)}
          >
            <Popup>
              <div className="text-center p-2 min-w-[160px]">
                <div className="text-3xl mb-2">💀</div>
                <div className="font-bold text-lg" style={{ color: RARITY_COLORS[raid.rarity] }}>
                  {raid.name}
                </div>
                <div className="text-xs text-gray-600 capitalize mb-2">
                  {raid.rarity} {raid.class}
                </div>
                <div className="bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${(raid.currentHP / raid.maxHP) * 100}%`,
                      backgroundColor: raid.currentHP / raid.maxHP > 0.5 ? '#22C55E' : 
                                       raid.currentHP / raid.maxHP > 0.25 ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  {raid.currentHP.toLocaleString()} / {raid.maxHP.toLocaleString()} HP
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
                  <Users className="w-3 h-3" />
                  {raid.participantCount} players
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {raid.distanceKm} km away
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Flash event banner */}
      {flashEvents.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-[1002]">
          <div className={`bg-gradient-to-r ${
            flashEvents[0].rarity === 'legendary' ? 'from-yellow-600 to-orange-600' :
            flashEvents[0].rarity === 'epic' ? 'from-purple-600 to-pink-600' :
            'from-blue-600 to-cyan-600'
          } rounded-lg p-3 shadow-lg border border-white/20`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-white animate-pulse" />
                <div>
                  <div className="font-bold text-white text-sm">{flashEvents[0].name}</div>
                  <div className="text-white/80 text-xs">{flashEvents[0].description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
                <Clock className="w-3 h-3 text-white" />
                <span className="text-white text-xs font-mono">{flashTimeRemaining}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
              <span className="capitalize">+{flashEvents[0].boostedClass} spawns</span>
              <span className="text-white/50">|</span>
              <span>{flashEvents[0].spawnMultiplier}x rate</span>
            </div>
          </div>
        </div>
      )}
      
      <div className={`absolute ${flashEvents.length > 0 ? 'top-28' : 'top-4'} left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full z-[1000]`}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#f0c850] font-bold">{displaySpawns.length}</span>
          <span className="text-white">Roachies nearby</span>
          {isUsingDemoSpawns && <span className="text-[#60A5FA] text-xs">(Demo)</span>}
        </div>
      </div>
      
      {gpsAccuracy !== null && gpsAccuracy !== undefined && (
        <div className={`absolute top-16 left-4 bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg z-[1001] border ${
          gpsAccuracy <= 10 ? 'border-green-500' : 
          gpsAccuracy <= 25 ? 'border-yellow-500' : 
          gpsAccuracy <= 50 ? 'border-orange-500' : 'border-red-500'
        }`}>
          <div className={`flex items-center gap-2 text-sm font-bold ${
            gpsAccuracy <= 10 ? 'text-green-400' : 
            gpsAccuracy <= 25 ? 'text-yellow-400' : 
            gpsAccuracy <= 50 ? 'text-orange-400' : 'text-red-400'
          }`}>
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              gpsAccuracy <= 10 ? 'bg-green-400' : 
              gpsAccuracy <= 25 ? 'bg-yellow-400' : 
              gpsAccuracy <= 50 ? 'bg-orange-400' : 'bg-red-400'
            }`}></div>
            <span>GPS ±{gpsAccuracy}m</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {gpsAccuracy <= 10 ? 'Excellent' : gpsAccuracy <= 25 ? 'Good' : gpsAccuracy <= 50 ? 'Fair' : 'Weak - go outside'}
          </div>
        </div>
      )}
      
      <div className="absolute top-16 right-4 flex flex-col gap-2 z-[1001]">
        <div className={`bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border ${
          isNighttime() ? 'border-purple-500' : 'border-yellow-500'
        }`}>
          <div className="flex items-center gap-2 text-sm font-bold">
            {isNighttime() ? (
              <>
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">Night</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">Day</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            +{isNighttime() ? 'Assassin' : 'Support'}
          </div>
        </div>
        
        {weather && WEATHER_CONFIG[weather.weather] && (
          <div className={`bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#5a3d2a]`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              {(() => {
                const WeatherIcon = WEATHER_CONFIG[weather.weather].icon;
                const colorClass = WEATHER_CONFIG[weather.weather].color;
                return (
                  <>
                    <WeatherIcon className={`w-4 h-4 ${colorClass}`} />
                    <span className={colorClass}>{WEATHER_CONFIG[weather.weather].label}</span>
                  </>
                );
              })()}
            </div>
            <div className="text-xs text-gray-400 mt-0.5 capitalize">
              +{weather.boostedClass}
            </div>
          </div>
        )}
        
        {habitat && HABITAT_CONFIG[habitat.habitat] && (
          <div className={`bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#5a3d2a]`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span>{HABITAT_CONFIG[habitat.habitat].emoji}</span>
              <span className={HABITAT_CONFIG[habitat.habitat].color}>{HABITAT_CONFIG[habitat.habitat].label}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5 capitalize">
              +{habitat.boostedClass}
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-28 left-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg z-[1000]">
        <div className="flex items-center gap-2 text-xs text-[#c4955e]">
          <div className="w-3 h-3 rounded-full border-2 border-[#f0c850] border-dashed"></div>
          <span>{CATCH_RADIUS_METERS}m catch range</span>
        </div>
      </div>
      
      <button
        onClick={() => setFollowMode(!followMode)}
        className={`absolute bottom-40 right-4 z-[1000] p-3 rounded-full shadow-lg transition-all ${
          followMode 
            ? 'bg-[#f0c850] text-[#120a05]' 
            : 'bg-[#1e1109] border-2 border-[#f0c850] text-[#f0c850]'
        }`}
        data-testid="button-follow"
      >
        <Navigation className={`w-5 h-5 ${followMode ? 'fill-current' : ''}`} />
      </button>
      
      {selectedSpawn && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4"
          onClick={() => setSelectedSpawn(null)}
          data-testid="spawn-modal"
        >
          <div 
            className="bg-[#1e1109] border-2 border-[#5a3d2a] rounded-xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div 
                className="text-6xl mb-4 animate-bounce"
                style={{ 
                  filter: selectedSpawn.rarity === 'legendary' ? 'drop-shadow(0 0 20px #F59E0B)' :
                         selectedSpawn.rarity === 'epic' ? 'drop-shadow(0 0 15px #A855F7)' : 'none'
                }}
              >
                ❓
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[#f0c850]">
                Wild Roachy!
              </h2>
              <p 
                className="font-bold capitalize mb-2"
                style={{ color: RARITY_COLORS[selectedSpawn.rarity] }}
              >
                {selectedSpawn.rarity} Rarity
              </p>
              <p className="text-sm text-[#9CA3AF] mb-4">
                {Math.round(selectedDistance)}m away
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSpawn(null)}
                  className="flex-1 px-4 py-2 border border-[#3b2418] rounded-lg text-[#c4955e] hover:bg-[#3b2418] transition-colors"
                  data-testid="button-cancel-catch"
                >
                  Run Away
                </button>
                <button
                  onClick={handleCatch}
                  disabled={selectedDistance > CATCH_RADIUS_METERS}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                    selectedDistance <= CATCH_RADIUS_METERS
                      ? 'bg-[#f0c850] text-[#120a05] hover:bg-[#d4a574]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid="button-catch"
                >
                  <Target className="w-4 h-4" />
                  {selectedDistance > CATCH_RADIUS_METERS ? 'Too Far!' : 'Catch!'}
                </button>
              </div>
              
              {selectedDistance > CATCH_RADIUS_METERS && (
                <p className="mt-3 text-xs text-[#EF4444]">
                  Move {Math.round(selectedDistance - CATCH_RADIUS_METERS)}m closer to catch
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
