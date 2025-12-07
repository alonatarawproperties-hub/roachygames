import React, { useRef, useEffect, useCallback, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import type { Spawn, Raid } from "@/context/HuntContext";
import { GameColors, Spacing, BorderRadius } from "@/constants/theme";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

export interface PlayerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface LeafletMapViewProps {
  playerLocation: PlayerLocation | null;
  spawns: Spawn[];
  raids: Raid[];
  onSpawnTap: (spawn: Spawn) => void;
  onRaidTap: (raid: Raid) => void;
  onRefresh: () => void;
}

export interface LeafletMapViewRef {
  centerOnPlayer: () => void;
}

const STABLE_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; background: #1A0F08; }
    
    .player-marker-wrapper {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .player-marker {
      width: 20px;
      height: 20px;
      background: #FF9500;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255, 149, 0, 0.8), 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
      z-index: 2;
    }
    
    .direction-arrow {
      position: absolute;
      width: 48px;
      height: 48px;
      transition: transform 0.3s ease-out;
      z-index: 1;
    }
    
    .direction-arrow svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    
    .direction-arrow.hidden {
      opacity: 0;
    }
    
    .direction-arrow.visible {
      opacity: 1;
    }
    
    .spawn-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    
    .spawn-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-size: 16px;
    }
    
    .spawn-label {
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      margin-top: 4px;
      white-space: nowrap;
      text-align: center;
    }
    
    .spawn-distance {
      font-size: 9px;
      color: rgba(255,255,255,0.7);
    }
    
    .mystery-ping-icon {
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ping-circle {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #FF9500;
      animation: ping-pulse 2s ease-out infinite;
    }
    
    .ping-dot {
      width: 16px;
      height: 16px;
      background: #FF9500;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 12px rgba(255, 149, 0, 0.8), 0 0 24px rgba(255, 149, 0, 0.4);
      z-index: 2;
    }
    
    @keyframes ping-pulse {
      0% { transform: scale(0.8); opacity: 1; }
      70% { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(0.8); opacity: 0; }
    }
    
    .raid-marker .spawn-icon {
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    .controls {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .control-btn {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: rgba(0,0,0,0.7);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    
    .control-btn:active {
      background: rgba(255,149,0,0.8);
    }
    
    .location-info {
      position: absolute;
      bottom: 10px;
      left: 10px;
      z-index: 1000;
      background: rgba(0,0,0,0.7);
      color: #D4A574;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-family: monospace;
    }
    
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(0,0,0,0.5) !important;
      color: rgba(255,255,255,0.6) !important;
    }
    .leaflet-control-attribution a {
      color: rgba(255,255,255,0.8) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="controls">
    <button class="control-btn" onclick="centerOnPlayer()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>
    <button class="control-btn" onclick="requestRefresh()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </button>
  </div>
  <div class="location-info" id="location-info">Loading...</div>
  
  <script>
    // State
    let playerLat = 37.7749;
    let playerLng = -122.4194;
    let playerHeading = null;
    let prevLat = null;
    let prevLng = null;
    let spawns = [];
    let raids = [];
    let spawnMarkers = [];
    let raidMarkers = [];
    let playerMarker = null;
    let catchRadius = null;
    let mapInitialized = false;
    let map = null;
    
    // Calculate bearing between two points
    function calculateBearing(lat1, lng1, lat2, lng2) {
      const toRad = (deg) => deg * Math.PI / 180;
      const toDeg = (rad) => rad * 180 / Math.PI;
      
      const dLng = toRad(lng2 - lng1);
      const lat1Rad = toRad(lat1);
      const lat2Rad = toRad(lat2);
      
      const y = Math.sin(dLng) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
      
      let bearing = toDeg(Math.atan2(y, x));
      return (bearing + 360) % 360;
    }
    
    // Calculate distance between two points (meters)
    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371000;
      const toRad = (deg) => deg * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    
    // Update direction arrow rotation
    function updateDirectionArrow(heading) {
      const arrow = document.getElementById('direction-arrow');
      if (arrow && heading !== null) {
        arrow.classList.remove('hidden');
        arrow.classList.add('visible');
        arrow.style.transform = 'rotate(' + heading + 'deg)';
      }
    }

    // Initialize map
    function initMap() {
      if (mapInitialized) return;
      
      map = L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([playerLat, playerLng], 17);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);
      
      // Player marker with direction arrow
      const playerIcon = L.divIcon({
        className: 'player-marker-container',
        html: \`
          <div class="player-marker-wrapper">
            <div id="direction-arrow" class="direction-arrow hidden">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 4L32 20H16L24 4Z" fill="#FF9500" stroke="white" stroke-width="2"/>
              </svg>
            </div>
            <div class="player-marker"></div>
          </div>
        \`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
      
      playerMarker = L.marker([playerLat, playerLng], { icon: playerIcon }).addTo(map);
      
      // 100m catch radius
      catchRadius = L.circle([playerLat, playerLng], {
        radius: 100,
        stroke: true,
        color: 'rgba(255, 149, 0, 0.6)',
        weight: 2,
        fill: true,
        fillColor: 'rgba(255, 149, 0, 0.15)',
        fillOpacity: 0.15
      }).addTo(map);
      
      mapInitialized = true;
      updateLocationDisplay();
    }

    function updateLocationDisplay() {
      document.getElementById('location-info').textContent = 
        playerLat.toFixed(4) + ', ' + playerLng.toFixed(4);
    }

    function updatePlayerLocation(lat, lng, heading) {
      // Calculate heading from movement if not provided
      if (heading === undefined || heading === null) {
        if (prevLat !== null && prevLng !== null) {
          const distance = calculateDistance(prevLat, prevLng, lat, lng);
          // Only update heading if moved more than 3 meters (filter GPS jitter)
          if (distance > 3) {
            playerHeading = calculateBearing(prevLat, prevLng, lat, lng);
            prevLat = lat;
            prevLng = lng;
          }
        } else {
          prevLat = lat;
          prevLng = lng;
        }
      } else {
        playerHeading = heading;
        prevLat = lat;
        prevLng = lng;
      }
      
      playerLat = lat;
      playerLng = lng;
      
      if (playerMarker) {
        playerMarker.setLatLng([lat, lng]);
      }
      if (catchRadius) {
        catchRadius.setLatLng([lat, lng]);
      }
      
      // Update the direction arrow
      if (playerHeading !== null) {
        updateDirectionArrow(playerHeading);
      }
      
      updateLocationDisplay();
    }

    function centerOnPlayer() {
      if (map) {
        map.setView([playerLat, playerLng], 17, { animate: true });
      }
    }

    function requestRefresh() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'refresh' }));
    }

    function clearSpawnMarkers() {
      spawnMarkers.forEach(marker => map.removeLayer(marker));
      spawnMarkers = [];
    }

    function clearRaidMarkers() {
      raidMarkers.forEach(marker => map.removeLayer(marker));
      raidMarkers = [];
    }

    function updateSpawns(newSpawns) {
      if (!map) return;
      clearSpawnMarkers();
      spawns = newSpawns;
      
      spawns.forEach(spawn => {
        const icon = L.divIcon({
          className: 'spawn-marker mystery-ping',
          html: \`
            <div class="mystery-ping-icon">
              <div class="ping-circle"></div>
              <div class="ping-dot"></div>
            </div>
            <div class="spawn-label">
              <div>???</div>
              <div class="spawn-distance">\${spawn.distance}m</div>
            </div>
          \`,
          iconSize: [80, 60],
          iconAnchor: [40, 30]
        });
        
        const marker = L.marker([spawn.lat, spawn.lng], { icon }).addTo(map);
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'spawnTap',
            spawnId: spawn.id
          }));
        });
        spawnMarkers.push(marker);
      });
    }

    function updateRaids(newRaids) {
      if (!map) return;
      clearRaidMarkers();
      raids = newRaids;
      
      raids.forEach(raid => {
        const icon = L.divIcon({
          className: 'spawn-marker raid-marker',
          html: \`
            <div class="spawn-icon" style="background: \${raid.color};">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              </svg>
            </div>
            <div class="spawn-label">\${raid.name}</div>
          \`,
          iconSize: [80, 50],
          iconAnchor: [40, 20]
        });
        
        const marker = L.marker([raid.lat, raid.lng], { icon }).addTo(map);
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'raidTap',
            raidId: raid.id
          }));
        });
        raidMarkers.push(marker);
      });
    }

    // Listen for messages from React Native
    function handleMessage(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        switch (data.type) {
          case 'init':
            playerLat = data.lat || playerLat;
            playerLng = data.lng || playerLng;
            initMap();
            if (data.spawns) updateSpawns(data.spawns);
            if (data.raids) updateRaids(data.raids);
            break;
          case 'updateLocation':
            updatePlayerLocation(data.lat, data.lng, data.heading);
            break;
          case 'updateSpawns':
            updateSpawns(data.spawns || []);
            break;
          case 'updateRaids':
            updateRaids(data.raids || []);
            break;
          case 'centerOnPlayer':
            centerOnPlayer();
            break;
        }
      } catch (e) {
        console.error('Message parse error:', e);
      }
    }

    // iOS uses window.addEventListener, Android uses document
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    
    // Signal ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;

export const LeafletMapView = React.forwardRef<LeafletMapViewRef, LeafletMapViewProps>(
  ({ playerLocation, spawns, raids, onSpawnTap, onRaidTap, onRefresh }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const lastLocationRef = useRef<PlayerLocation | null>(null);
    const lastSpawnsRef = useRef<string>("");
    const lastRaidsRef = useRef<string>("");

    const sendMessage = useCallback((message: object) => {
      if (webViewRef.current && isReady) {
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, [isReady]);

    const formatSpawnsForWebView = useCallback((spawns: Spawn[]) => {
      return spawns.map(spawn => {
        const lat = parseFloat(String(spawn.latitude));
        const lng = parseFloat(String(spawn.longitude));
        if (isNaN(lat) || isNaN(lng)) return null;
        return {
          id: spawn.id,
          lat,
          lng,
          name: spawn.name,
          rarity: spawn.rarity,
          distance: spawn.distance || 0,
          color: RARITY_COLORS[spawn.rarity] || RARITY_COLORS.common
        };
      }).filter(Boolean);
    }, []);

    const formatRaidsForWebView = useCallback((raids: Raid[]) => {
      return raids.map(raid => {
        const lat = parseFloat(String(raid.latitude));
        const lng = parseFloat(String(raid.longitude));
        if (isNaN(lat) || isNaN(lng)) return null;
        return {
          id: raid.id,
          lat,
          lng,
          name: raid.bossName,
          rarity: raid.rarity,
          color: RARITY_COLORS[raid.rarity] || RARITY_COLORS.rare
        };
      }).filter(Boolean);
    }, []);

    const handleMessage = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          
          if (data.type === "ready") {
            setIsReady(true);
            const formattedSpawns = formatSpawnsForWebView(spawns);
            const formattedRaids = formatRaidsForWebView(raids);
            webViewRef.current?.postMessage(JSON.stringify({
              type: 'init',
              lat: playerLocation?.latitude ?? 37.7749,
              lng: playerLocation?.longitude ?? -122.4194,
              spawns: formattedSpawns,
              raids: formattedRaids
            }));
          } else if (data.type === "spawnTap") {
            const spawn = spawns.find((s) => s.id === data.spawnId);
            if (spawn) onSpawnTap(spawn);
          } else if (data.type === "raidTap") {
            const raid = raids.find((r) => r.id === data.raidId);
            if (raid) onRaidTap(raid);
          } else if (data.type === "refresh") {
            onRefresh();
          }
        } catch (e) {
          console.error("WebView message error:", e);
        }
      },
      [spawns, raids, onSpawnTap, onRaidTap, onRefresh, playerLocation, formatSpawnsForWebView, formatRaidsForWebView]
    );

    React.useImperativeHandle(ref, () => ({
      centerOnPlayer: () => {
        sendMessage({ type: "centerOnPlayer" });
      },
    }));

    useEffect(() => {
      if (!isReady || !playerLocation) return;
      
      const locChanged = !lastLocationRef.current || 
        lastLocationRef.current.latitude !== playerLocation.latitude ||
        lastLocationRef.current.longitude !== playerLocation.longitude;
      
      if (locChanged) {
        sendMessage({
          type: "updateLocation",
          lat: playerLocation.latitude,
          lng: playerLocation.longitude,
          heading: playerLocation.heading,
        });
        lastLocationRef.current = { ...playerLocation };
      }
    }, [playerLocation, isReady, sendMessage]);

    useEffect(() => {
      if (!isReady) return;
      
      const formattedSpawns = formatSpawnsForWebView(spawns);
      const spawnsJson = JSON.stringify(formattedSpawns);
      
      if (spawnsJson !== lastSpawnsRef.current) {
        sendMessage({
          type: "updateSpawns",
          spawns: formattedSpawns,
        });
        lastSpawnsRef.current = spawnsJson;
      }
    }, [spawns, isReady, sendMessage, formatSpawnsForWebView]);

    useEffect(() => {
      if (!isReady) return;
      
      const formattedRaids = formatRaidsForWebView(raids);
      const raidsJson = JSON.stringify(formattedRaids);
      
      if (raidsJson !== lastRaidsRef.current) {
        sendMessage({
          type: "updateRaids",
          raids: formattedRaids,
        });
        lastRaidsRef.current = raidsJson;
      }
    }, [raids, isReady, sendMessage, formatRaidsForWebView]);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: STABLE_MAP_HTML }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  webview: {
    flex: 1,
    backgroundColor: GameColors.surface,
  },
});

export default LeafletMapView;
