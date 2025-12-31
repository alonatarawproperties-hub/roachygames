import React, { useState, useEffect, useRef } from "react";
import {
  ViroARScene,
  ViroNode,
  ViroBox,
  ViroSphere,
  ViroMaterials,
  ViroAnimations,
  ViroAmbientLight,
  ViroSpotLight,
  ViroText,
  ViroFlexView,
} from "@viro-community/react-viro";
import { AR_CONFIG, RARITY_COLORS, CLASS_COLORS } from "./ARConstants";

interface ARCatchGameProps {
  creatureName: string;
  rarity: string;
  creatureClass: string;
  onCatchSuccess: (quality: "perfect" | "great" | "good") => void;
  onCatchFail: () => void;
  onEscape: () => void;
  sceneNavigator?: any;
}

ViroMaterials.createMaterials({
  catchRing: {
    diffuseColor: "#00FF00",
    lightingModel: "Constant",
  },
  catchRingPerfect: {
    diffuseColor: "#FFD700",
    lightingModel: "Constant",
  },
  catchRingGreat: {
    diffuseColor: "#00FF00",
    lightingModel: "Constant",
  },
  catchRingGood: {
    diffuseColor: "#87CEEB",
    lightingModel: "Constant",
  },
  projectile: {
    diffuseColor: "#FFD700",
    lightingModel: "Blinn",
    shininess: 1.0,
  },
  netEffect: {
    diffuseColor: "#00FFFF",
    lightingModel: "Constant",
  },
});

ViroAnimations.registerAnimations({
  shrinkRing: {
    properties: {
      scaleX: 0.3,
      scaleY: 0.3,
      scaleZ: 0.3,
    },
    duration: 2000,
    easing: "Linear",
  },
  expandRing: {
    properties: {
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    },
    duration: 100,
    easing: "EaseOut",
  },
  ringCycle: [["shrinkRing", "expandRing"]] as any,
  projectileThrow: {
    properties: {
      positionZ: "-=2",
      positionY: "+=0.5",
    },
    duration: 500,
    easing: "EaseOut",
  },
  creatureWiggle: {
    properties: {
      rotateZ: "+=15",
    },
    duration: 100,
  },
  creatureWiggleBack: {
    properties: {
      rotateZ: "-=30",
    },
    duration: 100,
  },
  creatureWiggleEnd: {
    properties: {
      rotateZ: "+=15",
    },
    duration: 100,
  },
  struggleLoop: [["creatureWiggle", "creatureWiggleBack", "creatureWiggleEnd"]] as any,
  captureSuccess: {
    properties: {
      scaleX: 0,
      scaleY: 0,
      scaleZ: 0,
      opacity: 0,
    },
    duration: 800,
    easing: "EaseIn",
  },
});

export function ARCatchGame(props: ARCatchGameProps) {
  const {
    creatureName = "Roachy",
    rarity = "common",
    creatureClass = "tank",
    onCatchSuccess,
    onCatchFail,
    onEscape,
  } = props;

  const [ringScale, setRingScale] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [throwInProgress, setThrowInProgress] = useState(false);
  const [catchResult, setCatchResult] = useState<"pending" | "success" | "fail">("pending");
  const [catchQuality, setCatchQuality] = useState<"perfect" | "great" | "good" | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;
  const ringAnimRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRingAnimation();
    return () => {
      if (ringAnimRef.current) {
        clearInterval(ringAnimRef.current);
      }
    };
  }, []);

  const startRingAnimation = () => {
    setRingScale(1.0);
    setIsAnimating(true);

    let scale = 1.0;
    const shrinkSpeed = 0.015;

    ringAnimRef.current = setInterval(() => {
      scale -= shrinkSpeed;
      if (scale <= 0.3) {
        scale = 1.0;
      }
      setRingScale(scale);
    }, 50);
  };

  const calculateCatchQuality = (): "perfect" | "great" | "good" | null => {
    if (ringScale <= 0.4) return "perfect";
    if (ringScale <= 0.6) return "great";
    if (ringScale <= 0.8) return "good";
    return null;
  };

  const getSuccessChance = (quality: "perfect" | "great" | "good" | null): number => {
    const baseChance: Record<string, number> = {
      common: 0.9,
      uncommon: 0.75,
      rare: 0.6,
      epic: 0.45,
      legendary: 0.3,
    };

    const qualityBonus: Record<string, number> = {
      perfect: 0.3,
      great: 0.15,
      good: 0.05,
    };

    const base = baseChance[rarity] || 0.5;
    const bonus = quality ? qualityBonus[quality] : 0;
    return Math.min(base + bonus, 0.95);
  };

  const handleThrow = () => {
    if (throwInProgress || catchResult !== "pending") return;

    if (ringAnimRef.current) {
      clearInterval(ringAnimRef.current);
    }
    setIsAnimating(false);
    setThrowInProgress(true);

    const quality = calculateCatchQuality();
    setCatchQuality(quality);

    setTimeout(() => {
      const successChance = getSuccessChance(quality);
      const roll = Math.random();
      const success = roll < successChance;

      if (success && quality) {
        setCatchResult("success");
        setTimeout(() => {
          onCatchSuccess(quality);
        }, 1000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
          setCatchResult("fail");
          setTimeout(() => {
            onEscape();
          }, 1000);
        } else {
          setThrowInProgress(false);
          setCatchQuality(null);
          startRingAnimation();
        }
      }
    }, 600);
  };

  const getRingMaterial = () => {
    if (ringScale <= 0.4) return "catchRingPerfect";
    if (ringScale <= 0.6) return "catchRingGreat";
    return "catchRingGood";
  };

  const getMaterialForClass = () => {
    switch (creatureClass) {
      case "assassin": return "creatureAssassin";
      case "mage": return "creatureMage";
      case "support": return "creatureSupport";
      default: return "creatureTank";
    }
  };

  const onInitialized = (state: any, reason: any) => {
    if (state === 3) {
      console.log("AR catch game initialized");
    }
  };

  return (
    <ViroARScene onTrackingUpdated={onInitialized}>
      <ViroAmbientLight color="#FFFFFF" intensity={400} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 3, 0]}
        color="#FFFFFF"
        castsShadow={true}
      />

      <ViroNode position={[0, -0.2, -1.5]}>
        <ViroNode
          animation={{
            name: catchResult === "success" ? "captureSuccess" : 
                  throwInProgress ? "struggleLoop" : undefined,
            run: catchResult === "success" || throwInProgress,
            loop: throwInProgress && catchResult !== "success",
          }}
        >
          <ViroBox
            width={0.2}
            height={0.12}
            length={0.35}
            materials={[getMaterialForClass()]}
          />
          <ViroSphere
            radius={0.08}
            position={[0, 0.08, 0.12]}
            materials={[getMaterialForClass()]}
          />
        </ViroNode>

        {isAnimating && catchResult === "pending" ? (
          <ViroNode position={[0, 0, 0.01]}>
            <ViroSphere
              radius={0.25}
              scale={[ringScale, ringScale, 0.02]}
              materials={[getRingMaterial()]}
              opacity={0.6}
            />
            <ViroSphere
              radius={0.28}
              scale={[1, 1, 0.01]}
              materials={["catchRing"]}
              opacity={0.3}
            />
          </ViroNode>
        ) : null}

        <ViroNode position={[0, 0.35, 0]}>
          <ViroText
            text={creatureName}
            scale={[0.3, 0.3, 0.3]}
            style={{
              fontSize: 14,
              color: RARITY_COLORS[rarity],
              textAlignVertical: "center",
              textAlign: "center",
              fontWeight: "bold",
            }}
          />
        </ViroNode>
      </ViroNode>

      {catchResult === "pending" ? (
        <ViroNode position={[0, -0.8, -1]}>
          <ViroText
            text={`Attempts: ${attempts}/${maxAttempts}`}
            scale={[0.3, 0.3, 0.3]}
            style={{
              fontSize: 14,
              color: "#FFFFFF",
              textAlignVertical: "center",
              textAlign: "center",
            }}
          />
          <ViroText
            text="TAP TO THROW!"
            position={[0, -0.15, 0]}
            scale={[0.4, 0.4, 0.4]}
            style={{
              fontSize: 20,
              color: "#FFD700",
              textAlignVertical: "center",
              textAlign: "center",
              fontWeight: "bold",
            }}
            onClick={handleThrow}
          />
        </ViroNode>
      ) : null}

      {catchResult === "success" ? (
        <ViroText
          text="CAUGHT!"
          position={[0, 0, -1.5]}
          scale={[0.8, 0.8, 0.8]}
          style={{
            fontSize: 32,
            color: "#00FF00",
            textAlignVertical: "center",
            textAlign: "center",
            fontWeight: "bold",
          }}
        />
      ) : null}

      {catchResult === "fail" ? (
        <ViroText
          text="ESCAPED!"
          position={[0, 0, -1.5]}
          scale={[0.8, 0.8, 0.8]}
          style={{
            fontSize: 32,
            color: "#FF0000",
            textAlignVertical: "center",
            textAlign: "center",
            fontWeight: "bold",
          }}
        />
      ) : null}

      {catchQuality && throwInProgress ? (
        <ViroText
          text={catchQuality.toUpperCase() + "!"}
          position={[0, 0.3, -1]}
          scale={[0.5, 0.5, 0.5]}
          style={{
            fontSize: 24,
            color: catchQuality === "perfect" ? "#FFD700" : 
                   catchQuality === "great" ? "#00FF00" : "#87CEEB",
            textAlignVertical: "center",
            textAlign: "center",
            fontWeight: "bold",
          }}
        />
      ) : null}
    </ViroARScene>
  );
}

export default ARCatchGame;
