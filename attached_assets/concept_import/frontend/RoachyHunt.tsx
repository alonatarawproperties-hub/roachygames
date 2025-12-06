import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Target, Trophy, Bug, Crosshair, Users, RefreshCw, Map, Plus, Zap, Flame, Star, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '../game/WalletConnect';
import { useToast } from '@/hooks/use-toast';
import MapHuntView from '@/components/MapHuntView';
import CatchMiniGame from '@/components/CatchMiniGame';
import EggReveal from '@/components/EggReveal';
import RaidBattleMiniGame from '@/components/RaidBattleMiniGame';

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E', 
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

const CATCH_RADIUS_METERS = 50;

const CLASS_ICONS: Record<string, string> = {
  tank: '🛡️',
  assassin: '🗡️',
  mage: '🔮',
  support: '💚',
};

const ROACHY_IMAGES: Record<string, Record<string, string>> = {
  tank: {
    common: '/assets/roachies/crown-common.jpg',
    uncommon: '/assets/roachies/viking-tank.jpg',
    rare: '/assets/roachies/viking-tank.jpg',
    epic: '/assets/roachies/viking-tank.jpg',
    legendary: '/assets/roachies/cosmic-king.jpg',
  },
  assassin: {
    common: '/assets/roachies/aviator-support.jpg',
    uncommon: '/assets/roachies/aviator-support.jpg',
    rare: '/assets/roachies/aviator-support.jpg',
    epic: '/assets/roachies/royal-mage.jpg',
    legendary: '/assets/roachies/royal-mage.jpg',
  },
  mage: {
    common: '/assets/roachies/frost-mage.jpg',
    uncommon: '/assets/roachies/frost-mage.jpg',
    rare: '/assets/roachies/frost-mage.jpg',
    epic: '/assets/roachies/royal-mage.jpg',
    legendary: '/assets/roachies/royal-mage.jpg',
  },
  support: {
    common: '/assets/roachies/crown-common.jpg',
    uncommon: '/assets/roachies/aviator-support.jpg',
    rare: '/assets/roachies/aviator-support.jpg',
    epic: '/assets/roachies/frost-mage.jpg',
    legendary: '/assets/roachies/cosmic-king.jpg',
  },
};

const getRoachyImage = (roachyClass: string, rarity: string): string => {
  return ROACHY_IMAGES[roachyClass]?.[rarity] || '/assets/roachies/crown-common.jpg';
};

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

interface NearbyPlayer {
  wallet: string;
  latitude: number;
  longitude: number;
  displayName?: string;
}

interface CaughtRoachy {
  id: string;
  name: string;
  roachyClass: string;
  rarity: string;
  level: number;
  xp: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
}

interface HuntStats {
  totalCaught: number;
  commonCaught: number;
  uncommonCaught: number;
  rareCaught: number;
  epicCaught: number;
  legendaryCaught: number;
}

interface EconomyStats {
  energy: number;
  maxEnergy: number;
  catchesToday: number;
  maxCatchesPerDay: number;
  catchesThisWeek: number;
  maxCatchesPerWeek: number;
  pityRare: number;
  pityRareThreshold: number;
  pityEpic: number;
  pityEpicThreshold: number;
  lastLegendaryCatch: string | null;
  legendaryCooldownDays: number;
  currentStreak: number;
  longestStreak: number;
  lastCatchDate: string | null;
  streakBonusAvailable: boolean;
  streakBonusThreshold: number;
}

interface Raid {
  id: string;
  name: string;
  rarity: string;
  class: string;
  currentHP: number;
  maxHP: number;
  participantCount: number;
  expiresAt: string;
}

export default function RoachyHunt() {
  const [, setLocation] = useLocation();
  const { wallet } = useWallet();
  const isConnected = !!wallet;
  const { toast } = useToast();
  
  const [playerPosition, setPlayerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [spawns, setSpawns] = useState<WildSpawn[]>([]);
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [collection, setCollection] = useState<CaughtRoachy[]>([]);
  const [stats, setStats] = useState<HuntStats | null>(null);
  const [selectedSpawn, setSelectedSpawn] = useState<WildSpawn | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(0);
  const [isCatching, setIsCatching] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCatchGame, setShowCatchGame] = useState(false);
  const [catchQuality, setCatchQuality] = useState<'perfect' | 'great' | 'good' | 'miss' | null>(null);
  const [showEggReveal, setShowEggReveal] = useState(false);
  const [pendingCaughtRoachy, setPendingCaughtRoachy] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [arError, setARError] = useState<string | null>(null);
  const [isGeneratingSpawns, setIsGeneratingSpawns] = useState(false);
  const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null);
  const [showEconomyPanel, setShowEconomyPanel] = useState(false);
  const [activeRaid, setActiveRaid] = useState<Raid | null>(null);
  const [showRaidBattle, setShowRaidBattle] = useState(false);
  
  // Debug mode - enable with ?debug=1 in URL
  const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (!wallet || !playerPosition) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/hunt`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('Hunt WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join',
        walletAddress: wallet,
        latitude: playerPosition.lat,
        longitude: playerPosition.lng,
        displayName: `Hunter ${wallet.substring(0, 6)}`,
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'nearby_players':
            setNearbyPlayers(message.players || []);
            break;
          case 'nearby_spawns':
            setSpawns(message.spawns || []);
            break;
          case 'new_spawns':
            setSpawns(prev => [...prev, ...(message.spawns || [])]);
            break;
          case 'spawn_caught':
            setSpawns(prev => prev.filter(s => s.id !== message.spawnId));
            if (message.caughtBy !== wallet?.substring(0, 8)) {
              toast({
                title: 'Spawn Caught!',
                description: `${message.caughtBy} caught a ${message.rarity} ${message.roachyName}!`,
              });
            }
            break;
          case 'catch_success':
            setSpawns(prev => prev.filter(s => s.id !== message.spawnId));
            setIsCatching(false);
            setPendingCaughtRoachy(message.caught);
            if (!catchQuality) setCatchQuality('good');
            setShowEggReveal(true);
            break;
          case 'catch_failed':
            setIsCatching(false);
            toast({
              title: 'Catch Failed',
              description: message.error,
              variant: 'destructive',
            });
            break;
          case 'player_joined':
          case 'player_moved':
            if (message.wallet !== wallet?.substring(0, 8)) {
              setNearbyPlayers(prev => {
                const existing = prev.findIndex(p => p.wallet === message.wallet);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = {
                    wallet: message.wallet,
                    latitude: message.latitude,
                    longitude: message.longitude,
                    displayName: message.displayName,
                  };
                  return updated;
                }
                return [...prev, {
                  wallet: message.wallet,
                  latitude: message.latitude,
                  longitude: message.longitude,
                  displayName: message.displayName,
                }];
              });
            }
            break;
          case 'player_left':
            setNearbyPlayers(prev => prev.filter(p => p.wallet !== message.wallet));
            break;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('Hunt WebSocket disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, [wallet, playerPosition, toast]);

  useEffect(() => {
    if (wallet && playerPosition) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [wallet, playerPosition, connectWebSocket]);

  // Polling fallback for guest/demo mode (no WebSocket)
  useEffect(() => {
    if (!wallet && playerPosition) {
      const pollSpawns = () => {
        fetch(`/api/hunt/nearby-spawns?latitude=${playerPosition.lat}&longitude=${playerPosition.lng}&radiusKm=10`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.spawns) {
              setSpawns(data.spawns);
            }
          })
          .catch(err => console.error('Spawn poll error:', err));
      };
      
      // Poll every 15 seconds for guest mode
      const pollInterval = setInterval(pollSpawns, 15000);
      return () => clearInterval(pollInterval);
    }
  }, [wallet, playerPosition]);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Tap the button to enable GPS');
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  
  const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const calculateHeading = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const x = Math.sin(dLng) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };
  
  const processGpsPosition = useCallback((lat: number, lng: number, accuracy: number, gpsHeading?: number | null) => {
    setGpsAccuracy(Math.round(accuracy));
    
    const now = Date.now();
    const lastPos = lastPositionRef.current;
    
    if (!lastPos) {
      lastPositionRef.current = { lat, lng, timestamp: now };
      return { lat, lng };
    }
    
    const distance = calculateDistanceMeters(lastPos.lat, lastPos.lng, lat, lng);
    
    if (distance > 200) {
      console.log(`GPS jump rejected: ${distance.toFixed(0)}m`);
      return { lat: lastPos.lat, lng: lastPos.lng };
    }
    
    if (distance < 2 && accuracy > 20) {
      return { lat: lastPos.lat, lng: lastPos.lng };
    }
    
    if (gpsHeading !== null && gpsHeading !== undefined && !isNaN(gpsHeading)) {
      setHeading(gpsHeading);
    } else if (distance > 5) {
      const calculatedHeading = calculateHeading(lastPos.lat, lastPos.lng, lat, lng);
      setHeading(calculatedHeading);
    }
    
    lastPositionRef.current = { lat, lng, timestamp: now };
    return { lat, lng };
  }, []);
  
  const enableDemoMode = useCallback(() => {
    setUseDemoMode(true);
    setPlayerPosition({ lat: 37.7749, lng: -122.4194 });
    setLocationError(null);
    setIsGettingLocation(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Try demo mode!');
      return;
    }
    
    setIsGettingLocation(true);
    setHasRequestedLocation(true);
    setLocationStatus('Acquiring GPS signal...');
    
    let gotFirstFix = false;
    let bestPosition: { lat: number; lng: number; accuracy: number } | null = null;
    
    const timeoutId = setTimeout(() => {
      if (!gotFirstFix) {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsGettingLocation(false);
        setLocationError(
          'Location permission not received. On iPhone:\n\n' +
          '1. Open Settings → Privacy & Security → Location Services → ON\n' +
          '2. Scroll down and tap Safari Websites → set to "While Using"\n' +
          '3. Return here and try again\n\n' +
          'Or tap the "aA" button in the address bar → Website Settings → Location → Allow'
        );
      }
    }, 10000);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading: gpsHeading } = pos.coords;
        console.log(`GPS update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`);
        
        if (!gotFirstFix) {
          if (!bestPosition || accuracy < bestPosition.accuracy) {
            bestPosition = { lat: latitude, lng: longitude, accuracy };
            setLocationStatus(`Improving accuracy... (±${Math.round(accuracy)}m)`);
          }
          
          if (accuracy <= 30 || (bestPosition && Date.now() > 3000)) {
            gotFirstFix = true;
            clearTimeout(timeoutId);
            
            lastPositionRef.current = { lat: bestPosition.lat, lng: bestPosition.lng, timestamp: Date.now() };
            setPlayerPosition({ lat: bestPosition.lat, lng: bestPosition.lng });
            setGpsAccuracy(Math.round(bestPosition.accuracy));
            setLocationError(null);
            setIsGettingLocation(false);
            setLocationStatus('Location found!');
            console.log(`First fix accepted: ±${bestPosition.accuracy.toFixed(0)}m`);
          }
        } else {
          const processed = processGpsPosition(latitude, longitude, accuracy, gpsHeading);
          if (processed) {
            setPlayerPosition(processed);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'location_update',
                latitude: processed.lat,
                longitude: processed.lng,
              }));
            }
          }
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Geolocation error:', error.code, error.message);
        setIsGettingLocation(false);
        
        if (error.code === 1) {
          setLocationError(
            'Location access denied.\n\n' +
            'On iPhone: Tap the "aA" button in the address bar → Website Settings → Location → Allow\n\n' +
            'Or go to: Settings → Privacy & Security → Location Services → Safari Websites → While Using'
          );
        } else if (error.code === 2) {
          setLocationError(
            'Location unavailable.\n\n' +
            'Please check:\n' +
            '1. Settings → Privacy & Security → Location Services is ON\n' +
            '2. Safari Websites is set to "While Using"\n' +
            '3. GPS signal is available (try going outside)'
          );
        } else if (error.code === 3) {
          setLocationError(
            'Location request timed out.\n\n' +
            'Please ensure GPS is enabled and try again. If the problem persists, try demo mode.'
          );
        } else {
          setLocationError('Unable to get your location. Please check your phone settings or try demo mode.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [processGpsPosition]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (wallet) {
      fetch(`/api/hunt/collection/${wallet}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCollection(data.roachies || []);
            setStats(data.stats);
          }
        })
        .catch(console.error);
    }
  }, [wallet]);

  // Fetch economy stats (energy, pity, limits)
  const fetchEconomyStats = useCallback(() => {
    if (!wallet) return;
    fetch(`/api/hunt/economy/${wallet}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEconomyStats(data);
        }
      })
      .catch(console.error);
  }, [wallet]);

  useEffect(() => {
    fetchEconomyStats();
  }, [fetchEconomyStats]);

  useEffect(() => {
    fetch('/api/hunt/leaderboard?limit=20')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeaderboard(data.leaderboard || []);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (playerPosition) {
      fetch(`/api/hunt/nearby-spawns?latitude=${playerPosition.lat}&longitude=${playerPosition.lng}&radiusKm=10`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.spawns) {
            setSpawns(data.spawns);
          }
        })
        .catch(err => console.error('Spawn fetch error:', err));
    }
  }, [playerPosition]);

  const requestSpawns = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && playerPosition) {
      wsRef.current.send(JSON.stringify({
        type: 'request_spawns',
        latitude: playerPosition.lat,
        longitude: playerPosition.lng,
      }));
    }
  }, [playerPosition]);

  const handleCatchAttempt = useCallback((spawn: WildSpawn, distance: number) => {
    if (distance > CATCH_RADIUS_METERS) {
      toast({
        title: 'Too Far Away!',
        description: `Move ${Math.round(distance - CATCH_RADIUS_METERS)}m closer to catch this Roachy.`,
        variant: 'destructive',
      });
      return;
    }
    setSelectedSpawn(spawn);
    setSelectedDistance(distance);
    setShowCatchGame(true);
  }, [toast]);
  
  const handleCatchGameComplete = useCallback((success: boolean, quality: 'perfect' | 'great' | 'good' | 'miss') => {
    setShowCatchGame(false);
    setCatchQuality(quality);
    
    if (!success || !selectedSpawn) {
      toast({
        title: 'It Escaped!',
        description: 'The Roachy got away! Try again.',
        variant: 'destructive',
      });
      setSelectedSpawn(null);
      return;
    }
    
    setIsCatching(true);
    
    const walletToUse = wallet || 'guest';
    
    fetch('/api/hunt/catch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        walletAddress: walletToUse, 
        spawnId: selectedSpawn.id,
        distance: Math.round(selectedDistance),
        catchQuality: quality,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const caughtData = {
            ...data.caught,
            templateId: selectedSpawn.templateId,
          };
          setPendingCaughtRoachy(caughtData);
          setSpawns(prev => prev.filter(s => s.id !== selectedSpawn.id));
          setShowEggReveal(true);
        } else {
          toast({
            title: 'Catch Failed',
            description: data.error || 'Something went wrong',
            variant: 'destructive',
          });
          setSelectedSpawn(null);
        }
      })
      .catch((err) => {
        console.error('Catch error:', err);
        toast({
          title: 'Connection Error',
          description: 'Failed to register catch. Please try again.',
          variant: 'destructive',
        });
        setSelectedSpawn(null);
      })
      .finally(() => {
        setIsCatching(false);
      });
  }, [selectedSpawn, selectedDistance, wallet, toast]);

  const handleCatchGameCancel = useCallback(() => {
    setShowCatchGame(false);
    setSelectedSpawn(null);
  }, []);

  const handleGenerateDebugSpawns = useCallback(async () => {
    if (!playerPosition || isGeneratingSpawns) return;
    
    setIsGeneratingSpawns(true);
    try {
      const response = await fetch('/api/hunt/generate-spawns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: playerPosition.lat,
          longitude: playerPosition.lng,
          count: 5,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSpawns(prev => [...prev, ...data.spawns]);
        toast({
          title: 'Spawns Generated!',
          description: `Created ${data.spawns.length} Roachies near you`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate spawns',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Failed to generate spawns',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSpawns(false);
    }
  }, [playerPosition, isGeneratingSpawns, toast]);

  const handleSpawnTestRaid = useCallback(async () => {
    if (!playerPosition) return;
    
    // Use dev wallet for debug mode spawning (bypasses admin check)
    const debugWallet = wallet || 'GMNPUo78w4agUiHx9QhkGonCTKzDA8xMogeVRicjgiT9';
    
    try {
      const response = await fetch('/api/hunt/raids/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: debugWallet,
          latitude: playerPosition.lat,
          longitude: playerPosition.lng,
          templateIndex: Math.floor(Math.random() * 4),
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setActiveRaid(data.raid);
        setShowRaidBattle(true);
        toast({
          title: 'Raid Boss Spawned!',
          description: `${data.raid.name} appeared nearby!`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to spawn raid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Failed to spawn raid boss',
        variant: 'destructive',
      });
    }
  }, [playerPosition, wallet, toast]);

  const handleRaidComplete = useCallback((rewards: any) => {
    setShowRaidBattle(false);
    setActiveRaid(null);
    if (rewards) {
      toast({
        title: 'Raid Victory!',
        description: `Earned ${rewards.chyCoins} CHY and ${rewards.xp} XP!`,
      });
      fetchEconomyStats();
    }
  }, [toast, fetchEconomyStats]);

  const handleRaidCancel = useCallback(() => {
    setShowRaidBattle(false);
    setActiveRaid(null);
  }, []);

  const handleEggRevealComplete = useCallback(() => {
    setShowEggReveal(false);
    if (pendingCaughtRoachy) {
      setCollection(prev => [...prev, pendingCaughtRoachy]);
      toast({
        title: `${pendingCaughtRoachy.name} Caught!`,
        description: `Added to your collection!`,
      });
      // Refresh economy stats after successful catch
      fetchEconomyStats();
    }
    setPendingCaughtRoachy(null);
    setSelectedSpawn(null);
    setCatchQuality(null);
  }, [pendingCaughtRoachy, toast, fetchEconomyStats]);

  const [guestMode, setGuestMode] = useState(false);
  
  if (!isConnected && !guestMode) {
    return (
      <div className="min-h-screen arcade-bg flex flex-col items-center justify-center p-4" data-testid="hunt-connect-wallet">
        <Bug className="w-20 h-20 text-[#f0c850] mb-6" />
        <h1 className="text-3xl font-bold text-[#f0c850] mb-4">Roachy Hunt</h1>
        <p className="text-[#c4955e] text-center mb-6 max-w-md">
          Hunt wild Roachies using your real GPS location!
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => setLocation('/')}
            className="gold-button w-full"
            data-testid="button-back-home"
          >
            Connect Wallet to Play
          </Button>
          <Button 
            onClick={() => setGuestMode(true)}
            className="bg-[#3b2418] border border-[#5a3d2a] text-[#c4955e] hover:bg-[#5a3d2a] w-full"
            data-testid="button-guest-mode"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Try as Guest (Test GPS)
          </Button>
        </div>
        <p className="text-[#9CA3AF] text-xs text-center mt-4 max-w-xs">
          Guest mode lets you test GPS hunting. Connect wallet to save catches!
        </p>
      </div>
    );
  }

  if (!hasRequestedLocation && !playerPosition && !useDemoMode) {
    const isWalletBrowser = /Trust|MetaMask|Coinbase|TokenPocket|imToken/i.test(navigator.userAgent);
    
    return (
      <div className="min-h-screen arcade-bg flex flex-col items-center justify-center p-4" data-testid="hunt-enable-location">
        <MapPin className="w-20 h-20 text-[#f0c850] mb-6" />
        <h1 className="text-2xl font-bold text-[#f0c850] mb-4">Enable GPS to Hunt</h1>
        <p className="text-[#c4955e] text-center mb-4 max-w-md">
          Roachy Hunt uses your real location to find wild Roachies nearby.
        </p>
        
        {isWalletBrowser && (
          <div className="bg-[#3b2418] border border-[#f0c850] rounded-lg p-3 mb-4 max-w-xs">
            <p className="text-[#f0c850] text-xs text-center">
              ⚠️ Wallet browsers have limited GPS support. For best experience, open this site in Safari or Chrome, then connect via WalletConnect.
            </p>
          </div>
        )}
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={requestLocation}
            className="gold-button w-full"
            data-testid="button-enable-gps"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Try Enable GPS
          </Button>
          <Button 
            onClick={enableDemoMode}
            className="bg-[#3b2418] border border-[#5a3d2a] text-[#c4955e] hover:bg-[#5a3d2a] w-full"
            data-testid="button-demo-mode"
          >
            <Map className="w-4 h-4 mr-2" />
            Use Demo Mode
          </Button>
        </div>
      </div>
    );
  }

  if (isGettingLocation && !playerPosition) {
    return (
      <div className="min-h-screen arcade-bg flex flex-col items-center justify-center p-4" data-testid="hunt-loading-location">
        <div className="w-20 h-20 border-4 border-[#f0c850] border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="text-2xl font-bold text-[#f0c850] mb-4">Finding Your Location...</h1>
        <p className="text-[#c4955e] text-center mb-2 max-w-md">
          {locationStatus}
        </p>
        <p className="text-[#9CA3AF] text-center mb-6 max-w-md text-sm">
          Please tap "Allow" when your phone asks for location permission.
        </p>
        <Button 
          onClick={enableDemoMode}
          className="bg-[#3b2418] border border-[#5a3d2a] text-[#c4955e] hover:bg-[#5a3d2a]"
          data-testid="button-demo-mode"
        >
          <Map className="w-4 h-4 mr-2" />
          Skip - Use Demo Mode
        </Button>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="min-h-screen arcade-bg flex flex-col items-center justify-center p-4" data-testid="hunt-location-error">
        <MapPin className="w-20 h-20 text-[#EF4444] mb-6" />
        <h1 className="text-2xl font-bold text-[#f0c850] mb-4">Location Issue</h1>
        <div className="text-[#c4955e] text-center mb-6 max-w-md whitespace-pre-line text-sm">
          {locationError}
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => {
              setHasRequestedLocation(false);
              setLocationError(null);
            }}
            className="gold-button w-full"
            data-testid="button-retry-location"
          >
            Try Again
          </Button>
          <Button 
            onClick={enableDemoMode}
            className="bg-[#3b2418] border border-[#5a3d2a] text-[#c4955e] hover:bg-[#5a3d2a] w-full"
            data-testid="button-demo-mode-error"
          >
            <Map className="w-4 h-4 mr-2" />
            Use Demo Mode Instead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen arcade-bg flex flex-col relative" data-testid="hunt-page">
      <header className="header-bar flex items-center justify-between p-3 z-50 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent" data-testid="hunt-header">
        <button 
          onClick={() => setLocation('/arcade')}
          className="icon-button bg-black/50"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-xl font-bold text-[#f0c850] flex items-center gap-2">
          <Map className="w-5 h-5" />
          Roachy Hunt
        </h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="icon-button bg-black/50"
            data-testid="button-leaderboard"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCollection(true)}
            className="icon-button bg-black/50 relative"
            data-testid="button-collection"
          >
            <Target className="w-5 h-5" />
            {collection.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#f0c850] text-[#120a05] text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {collection.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 relative pt-14">
        <MapHuntView
          spawns={spawns}
          playerPosition={playerPosition}
          onCatchAttempt={handleCatchAttempt}
          gpsAccuracy={gpsAccuracy}
          heading={heading}
        />

        <div className="absolute bottom-28 right-4 z-[1001] flex flex-col gap-2">
          {debugMode && (
            <>
              <button
                onClick={handleSpawnTestRaid}
                disabled={!playerPosition}
                className="bg-[#A855F7] text-white p-3 rounded-full shadow-lg hover:bg-[#9333EA] transition-colors disabled:opacity-50"
                data-testid="button-spawn-raid"
                title="Spawn test raid boss"
              >
                <Skull className="w-5 h-5" />
              </button>
              <button
                onClick={handleGenerateDebugSpawns}
                disabled={isGeneratingSpawns || !playerPosition}
                className="bg-[#22C55E] text-white p-3 rounded-full shadow-lg hover:bg-[#16A34A] transition-colors disabled:opacity-50"
                data-testid="button-debug-spawn"
                title="Generate test spawns"
              >
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={requestSpawns}
            className="bg-[#f0c850] text-[#120a05] p-3 rounded-full shadow-lg hover:bg-[#d4a574] transition-colors"
            data-testid="button-refresh-spawns"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Stats Bar - Safe area aware for mobile browsers */}
        <div 
          className="absolute left-3 right-3 bg-[#1e1109]/95 backdrop-blur-sm border border-[#3b2418] rounded-xl px-3 py-2 z-[999]"
          style={{ 
            bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 56px), 56px)',
          }}
          data-testid="hunt-stats"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Energy + Spawns + Streak */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {economyStats && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#FACC15] flex-shrink-0" />
                  <div className="w-12 h-1.5 bg-[#3b2418] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FACC15] to-[#F59E0B] transition-all duration-300"
                      style={{ width: `${(economyStats.energy / economyStats.maxEnergy) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#c4955e]">{economyStats.energy}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Bug className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-[10px] text-[#c4955e]">{spawns.length}</span>
              </div>
              {economyStats && economyStats.currentStreak > 0 && (
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px]">🔥</span>
                  <span className="text-[10px] text-[#f0c850] font-bold">{economyStats.currentStreak}</span>
                </div>
              )}
            </div>

            {/* Center: Compact Pity Bars */}
            {economyStats && (
              <div className="flex-1 flex gap-2 max-w-[180px]">
                <div className="flex-1">
                  <div className="h-1.5 bg-[#3b2418] rounded-full overflow-hidden" title={`Rare Pity: ${economyStats.pityRare}/${economyStats.pityRareThreshold}`}>
                    <div 
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${(economyStats.pityRare / economyStats.pityRareThreshold) * 100}%`,
                        backgroundColor: RARITY_COLORS.rare,
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-center mt-0.5" style={{ color: RARITY_COLORS.rare }}>R</div>
                </div>
                <div className="flex-1">
                  <div className="h-1.5 bg-[#3b2418] rounded-full overflow-hidden" title={`Epic Pity: ${economyStats.pityEpic}/${economyStats.pityEpicThreshold}`}>
                    <div 
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${(economyStats.pityEpic / economyStats.pityEpicThreshold) * 100}%`,
                        backgroundColor: RARITY_COLORS.epic,
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-center mt-0.5" style={{ color: RARITY_COLORS.epic }}>E</div>
                </div>
              </div>
            )}

            {/* Right: Stats Button */}
            <button 
              onClick={() => setShowEconomyPanel(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#3b2418]/50 hover:bg-[#3b2418] transition-colors flex-shrink-0"
              data-testid="button-economy-panel"
            >
              <Star className="w-3 h-3 text-[#f0c850]" />
              <span className="text-[10px] text-[#f0c850]">Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Economy Stats Modal */}
      {showEconomyPanel && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4"
          onClick={() => setShowEconomyPanel(false)}
          data-testid="economy-modal"
        >
          <div 
            className="bg-[#1e1109] border border-[#3b2418] rounded-xl p-4 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#f0c850] mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Hunt Stats
            </h2>
            
            {economyStats ? (
              <div className="space-y-4">
                {/* Energy Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#c4955e] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FACC15]" /> Energy
                    </span>
                    <span className="text-[#f0c850] font-bold">{economyStats.energy}/{economyStats.maxEnergy}</span>
                  </div>
                  <div className="h-3 bg-[#3b2418] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FACC15] to-[#F59E0B] transition-all duration-300"
                      style={{ width: `${(economyStats.energy / economyStats.maxEnergy) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#c4955e] mt-1">Refills daily at midnight</p>
                </div>

                {/* Daily/Weekly Catches */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#120a05] rounded-lg p-2">
                    <div className="text-xs text-[#c4955e]">Today</div>
                    <div className="text-[#f0c850] font-bold">{economyStats.catchesToday}/{economyStats.maxCatchesPerDay}</div>
                  </div>
                  <div className="bg-[#120a05] rounded-lg p-2">
                    <div className="text-xs text-[#c4955e]">This Week</div>
                    <div className="text-[#f0c850] font-bold">{economyStats.catchesThisWeek}/{economyStats.maxCatchesPerWeek}</div>
                  </div>
                </div>

                {/* Pity Progress */}
                <div>
                  <h3 className="text-sm text-[#c4955e] mb-2 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-[#F59E0B]" /> Pity System
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: RARITY_COLORS.rare }}>Guaranteed Rare</span>
                        <span className="text-[#c4955e]">{economyStats.pityRare}/{economyStats.pityRareThreshold}</span>
                      </div>
                      <div className="h-2 bg-[#3b2418] rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${(economyStats.pityRare / economyStats.pityRareThreshold) * 100}%`,
                            backgroundColor: RARITY_COLORS.rare,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: RARITY_COLORS.epic }}>Guaranteed Epic</span>
                        <span className="text-[#c4955e]">{economyStats.pityEpic}/{economyStats.pityEpicThreshold}</span>
                      </div>
                      <div className="h-2 bg-[#3b2418] rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${(economyStats.pityEpic / economyStats.pityEpicThreshold) * 100}%`,
                            backgroundColor: RARITY_COLORS.epic,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#c4955e] mt-2">
                    If you don't catch a Rare in {economyStats.pityRareThreshold} catches, the next one is guaranteed!
                  </p>
                </div>

                {/* Catch Streak */}
                <div className="bg-[#120a05] rounded-lg p-2 border border-[#22C55E]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#22C55E]" />
                      <span className="text-sm font-bold text-[#22C55E]">Daily Streak</span>
                    </div>
                    <span className="text-lg font-bold text-[#f0c850]">{economyStats.currentStreak} 🔥</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#c4955e]">Next bonus</span>
                      <span className="text-[#c4955e]">
                        {economyStats.currentStreak % 7 === 0 && economyStats.currentStreak > 0
                          ? 'Available now!'
                          : `${7 - (economyStats.currentStreak % 7)} days`}
                      </span>
                    </div>
                    <div className="h-2 bg-[#3b2418] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] transition-all duration-300"
                        style={{ width: `${((economyStats.currentStreak % 7) / 7) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#c4955e] mt-2">
                    Catch at least 1 Roachy daily to maintain your streak. At day 7, get a guaranteed Rare!
                  </p>
                  {economyStats.longestStreak > 0 && (
                    <p className="text-[10px] text-[#f0c850] mt-1">
                      Best streak: {economyStats.longestStreak} days
                    </p>
                  )}
                </div>

                {/* Legendary Info */}
                <div className="bg-[#120a05] rounded-lg p-2 border border-[#F59E0B]/30">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#F59E0B]" />
                    <span style={{ color: RARITY_COLORS.legendary }} className="text-sm font-bold">Legendary</span>
                  </div>
                  <p className="text-[10px] text-[#c4955e] mt-1">
                    {economyStats.lastLegendaryCatch 
                      ? `Last caught: ${new Date(economyStats.lastLegendaryCatch).toLocaleDateString()}`
                      : 'No legendary caught yet - go find one!'}
                  </p>
                  <p className="text-[10px] text-[#c4955e]">
                    Limit: 1 every {economyStats.legendaryCooldownDays} days
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[#c4955e] text-center py-4">Loading stats...</p>
            )}

            <button 
              onClick={() => setShowEconomyPanel(false)}
              className="w-full mt-4 gold-button py-2"
              data-testid="button-close-economy"
            >
              Close
            </button>
          </div>
        </div>
      )}



      {showCollection && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4"
          onClick={() => setShowCollection(false)}
          data-testid="collection-modal"
        >
          <div 
            className="bg-[#1e1109] border border-[#3b2418] rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#f0c850] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Your Collection
            </h2>
            
            {stats && (
              <div className="grid grid-cols-5 gap-1 mb-4 text-xs text-center">
                <div className="bg-[#9CA3AF]/20 rounded p-1">
                  <div style={{ color: RARITY_COLORS.common }}>{stats.commonCaught}</div>
                  <div className="text-[#c4955e]">C</div>
                </div>
                <div className="bg-[#22C55E]/20 rounded p-1">
                  <div style={{ color: RARITY_COLORS.uncommon }}>{stats.uncommonCaught}</div>
                  <div className="text-[#c4955e]">U</div>
                </div>
                <div className="bg-[#3B82F6]/20 rounded p-1">
                  <div style={{ color: RARITY_COLORS.rare }}>{stats.rareCaught}</div>
                  <div className="text-[#c4955e]">R</div>
                </div>
                <div className="bg-[#A855F7]/20 rounded p-1">
                  <div style={{ color: RARITY_COLORS.epic }}>{stats.epicCaught}</div>
                  <div className="text-[#c4955e]">E</div>
                </div>
                <div className="bg-[#F59E0B]/20 rounded p-1">
                  <div style={{ color: RARITY_COLORS.legendary }}>{stats.legendaryCaught}</div>
                  <div className="text-[#c4955e]">L</div>
                </div>
              </div>
            )}
            
            {collection.length === 0 ? (
              <p className="text-[#c4955e] text-center py-8">
                No Roachies caught yet! Start hunting!
              </p>
            ) : (
              <div className="space-y-2">
                {collection.map(roachy => (
                  <div 
                    key={roachy.id}
                    className="bg-[#120a05] rounded-lg p-3 flex items-center gap-3"
                    style={{ borderLeft: `3px solid ${RARITY_COLORS[roachy.rarity]}` }}
                    data-testid={`collection-roachy-${roachy.id}`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ border: `2px solid ${RARITY_COLORS[roachy.rarity]}` }}>
                      <img 
                        src={getRoachyImage(roachy.roachyClass, roachy.rarity)} 
                        alt={roachy.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold" style={{ color: RARITY_COLORS[roachy.rarity] }}>
                        {roachy.name}
                      </div>
                      <div className="text-xs text-[#c4955e]">
                        Lv.{roachy.level} {roachy.roachyClass} | XP: {roachy.xp}
                      </div>
                    </div>
                    <div className="text-xs text-right text-[#c4955e]">
                      <div>HP:{roachy.baseHp}</div>
                      <div>ATK:{roachy.baseAtk}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              onClick={() => setShowCollection(false)}
              className="w-full mt-4 gold-button"
              data-testid="button-close-collection"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4"
          onClick={() => setShowLeaderboard(false)}
          data-testid="leaderboard-modal"
        >
          <div 
            className="bg-[#1e1109] border border-[#3b2418] rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#f0c850] mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Hunt Leaderboard
            </h2>
            
            {leaderboard.length === 0 ? (
              <p className="text-[#c4955e] text-center py-8">
                No hunters on the leaderboard yet!
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.walletAddress}
                    className={`bg-[#120a05] rounded-lg p-3 flex items-center gap-3 ${
                      index < 3 ? 'border-l-4' : ''
                    }`}
                    style={{ 
                      borderLeftColor: index === 0 ? '#F59E0B' : index === 1 ? '#9CA3AF' : index === 2 ? '#CD7F32' : undefined 
                    }}
                    data-testid={`leaderboard-entry-${index}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#3b2418] flex items-center justify-center font-bold text-[#f0c850]">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[#f0c850]">
                        {entry.displayName || entry.walletAddress.substring(0, 8) + '...'}
                      </div>
                      <div className="text-xs text-[#c4955e] flex gap-2">
                        <span style={{ color: RARITY_COLORS.legendary }}>L:{entry.legendaryCaught}</span>
                        <span style={{ color: RARITY_COLORS.epic }}>E:{entry.epicCaught}</span>
                        <span style={{ color: RARITY_COLORS.rare }}>R:{entry.rareCaught}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#f0c850] font-bold">{entry.totalCaught}</div>
                      <div className="text-xs text-[#c4955e]">caught</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              onClick={() => setShowLeaderboard(false)}
              className="w-full mt-4 gold-button"
              data-testid="button-close-leaderboard"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {showCatchGame && selectedSpawn && (
        <CatchMiniGame
          rarity={selectedSpawn.rarity}
          onComplete={handleCatchGameComplete}
          onCancel={handleCatchGameCancel}
        />
      )}

      {showEggReveal && pendingCaughtRoachy && catchQuality && catchQuality !== 'miss' && (
        <EggReveal
          roachy={pendingCaughtRoachy}
          catchQuality={catchQuality}
          onComplete={handleEggRevealComplete}
        />
      )}

      {showRaidBattle && activeRaid && (
        <RaidBattleMiniGame
          raid={activeRaid}
          walletAddress={wallet || 'GMNPUo78w4agUiHx9QhkGonCTKzDA8xMogeVRicjgiT9'}
          onComplete={handleRaidComplete}
          onCancel={handleRaidCancel}
        />
      )}
    </div>
  );
}
