import React, { useState, useEffect, useRef } from "react";
import { View, Platform } from "react-native";

// Only import ViroReact on native platforms
let ViroARScene: any = null;
let ViroNode: any = null;
let ViroSphere: any = null;
let ViroMaterials: any = null;
let ViroAnimations: any = null;
let ViroAmbientLight: any = null;
let ViroSpotLight: any = null;
let ViroQuad: any = null;
let ViroARPlaneSelector: any = null;
let Viro3DObject: any = null;
let ViroText: any = null;
let ViroParticleEmitter: any = null;

let viroAvailable = false;

if (Platform.OS !== "web") {
  try {
    const viro = require("@viro-community/react-viro");
    ViroARScene = viro.ViroARScene;
    ViroNode = viro.ViroNode;
    ViroSphere = viro.ViroSphere;
    ViroMaterials = viro.ViroMaterials;
    ViroAnimations = viro.ViroAnimations;
    ViroAmbientLight = viro.ViroAmbientLight;
    ViroSpotLight = viro.ViroSpotLight;
    ViroQuad = viro.ViroQuad;
    ViroARPlaneSelector = viro.ViroARPlaneSelector;
    Viro3DObject = viro.Viro3DObject;
    ViroText = viro.ViroText;
    ViroParticleEmitter = viro.ViroParticleEmitter;
    viroAvailable = true;
  } catch (e) {
    console.log("ViroReact not available in AREggScene:", e);
  }
}

import { AR_CONFIG, RARITY_COLORS, PLACEHOLDER_MODELS } from "./ARConstants";

interface AREggSceneProps {
  rarity: string;
  onEggTapped: () => void;
  onPlaneDetected: () => void;
  sceneNavigator?: any;
}

// Register materials only if ViroReact is available
if (viroAvailable && ViroMaterials) {
  try {
    ViroMaterials.createMaterials({
      eggCommon: {
        diffuseColor: RARITY_COLORS.common,
        lightingModel: "Blinn",
        shininess: 0.8,
      },
      eggUncommon: {
        diffuseColor: RARITY_COLORS.uncommon,
        lightingModel: "Blinn",
        shininess: 0.8,
      },
      eggRare: {
        diffuseColor: RARITY_COLORS.rare,
        lightingModel: "Blinn",
        shininess: 0.9,
      },
      eggEpic: {
        diffuseColor: RARITY_COLORS.epic,
        lightingModel: "Blinn",
        shininess: 1.0,
      },
      eggLegendary: {
        diffuseColor: RARITY_COLORS.legendary,
        lightingModel: "Blinn",
        shininess: 1.0,
      },
      groundShadow: {
        diffuseColor: "rgba(0,0,0,0.3)",
      },
      glowParticle: {
        diffuseColor: "#FFD700",
        bloomThreshold: 0.5,
      },
    });
  } catch (e) {
    console.log("Failed to create Viro materials:", e);
  }
}

// Register animations only if ViroReact is available
if (viroAvailable && ViroAnimations) {
  try {
    ViroAnimations.registerAnimations({
      wobble: {
        properties: {
          rotateZ: "+=5",
        },
        duration: 500,
        easing: "EaseInEaseOut",
      },
      wobbleBack: {
        properties: {
          rotateZ: "-=5",
        },
        duration: 500,
        easing: "EaseInEaseOut",
      },
      wobbleLoop: [["wobble", "wobbleBack"]] as any,
      float: {
        properties: {
          positionY: "+=0.05",
        },
        duration: 1000,
        easing: "EaseInEaseOut",
      },
      floatBack: {
        properties: {
          positionY: "-=0.05",
        },
        duration: 1000,
        easing: "EaseInEaseOut",
      },
      floatLoop: [["float", "floatBack"]] as any,
      pulse: {
        properties: {
          scaleX: 1.1,
          scaleY: 1.1,
          scaleZ: 1.1,
        },
        duration: 500,
        easing: "EaseInEaseOut",
      },
      pulseBack: {
        properties: {
          scaleX: 1.0,
          scaleY: 1.0,
          scaleZ: 1.0,
        },
        duration: 500,
        easing: "EaseInEaseOut",
      },
      pulseLoop: [["pulse", "pulseBack"]] as any,
      hatch: {
        properties: {
          scaleX: 0,
          scaleY: 0,
          scaleZ: 0,
          opacity: 0,
        },
        duration: 500,
        easing: "EaseIn",
      },
    });
  } catch (e) {
    console.log("Failed to register Viro animations:", e);
  }
}

export function AREggScene({
  rarity,
  onEggTapped,
  onPlaneDetected,
  sceneNavigator,
}: AREggSceneProps) {
  const [planeDetected, setPlaneDetected] = useState(false);
  const [eggPosition, setEggPosition] = useState<[number, number, number]>([0, -0.5, -1]);
  const [isHatching, setIsHatching] = useState(false);
  const tapCountRef = useRef(0);

  if (!viroAvailable || !ViroARScene) {
    return <View style={{ flex: 1 }} />;
  }

  const getMaterial = () => {
    switch (rarity) {
      case "legendary": return "eggLegendary";
      case "epic": return "eggEpic";
      case "rare": return "eggRare";
      case "uncommon": return "eggUncommon";
      default: return "eggCommon";
    }
  };

  const handlePlaneSelected = (anchor: any) => {
    if (!planeDetected) {
      setPlaneDetected(true);
      const pos = anchor.position || [0, 0, -1];
      setEggPosition([pos[0], pos[1] + 0.15, pos[2]]);
      onPlaneDetected();
    }
  };

  const handleEggTap = () => {
    tapCountRef.current += 1;
    
    if (tapCountRef.current >= 3) {
      setIsHatching(true);
      setTimeout(() => {
        onEggTapped();
      }, 600);
    }
  };

  const getEggScale = (): [number, number, number] => {
    const baseScale = PLACEHOLDER_MODELS.egg.scale;
    const rarityMultiplier = rarity === "legendary" ? 1.3 : 
                            rarity === "epic" ? 1.2 : 
                            rarity === "rare" ? 1.1 : 1.0;
    return [
      baseScale[0] * rarityMultiplier,
      baseScale[1] * rarityMultiplier,
      baseScale[2] * rarityMultiplier,
    ];
  };

  const showParticles = rarity === "epic" || rarity === "legendary";

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={200} />
      <ViroSpotLight
        position={[0, 3, 0]}
        direction={[0, -1, 0]}
        color="#FFFFFF"
        intensity={400}
        castsShadow={true}
        shadowMapSize={2048}
        shadowNearZ={0.1}
        shadowFarZ={5}
        shadowOpacity={0.5}
      />

      {!planeDetected ? (
        <ViroARPlaneSelector
          alignment="Horizontal"
          onPlaneSelected={handlePlaneSelected}
        />
      ) : (
        <ViroNode position={eggPosition}>
          <ViroQuad
            position={[0, -0.01, 0]}
            rotation={[-90, 0, 0]}
            width={0.4}
            height={0.4}
            materials={["groundShadow"]}
          />

          <ViroNode
            onClick={handleEggTap}
            animation={{
              name: isHatching ? "hatch" : "floatLoop",
              run: true,
              loop: !isHatching,
            }}
          >
            <ViroSphere
              radius={0.1}
              scale={getEggScale()}
              materials={[getMaterial()]}
              animation={{
                name: "wobbleLoop",
                run: true,
                loop: true,
              }}
            />

            <ViroText
              text="?"
              position={[0, 0, 0.12]}
              scale={[0.3, 0.3, 0.3]}
              style={{
                fontFamily: "Arial",
                fontSize: 40,
                fontWeight: "bold",
                color: "#FFFFFF",
                textAlign: "center",
              }}
            />
          </ViroNode>

          {showParticles && (
            <ViroParticleEmitter
              position={[0, 0.2, 0]}
              duration={-1}
              run={true}
              image={{
                source: require("@/assets/images/particle-glow.png"),
                height: 0.02,
                width: 0.02,
                bloomThreshold: 0.5,
              }}
              spawnBehavior={{
                particleLifetime: [1500, 2000],
                emissionRatePerSecond: [10, 15],
                spawnVolume: {
                  shape: "sphere",
                  params: [0.2],
                  spawnOnSurface: true,
                },
              }}
              particleAppearance={{
                opacity: {
                  initialRange: [0.5, 0.8],
                  factor: "time",
                  interpolation: [
                    { endValue: 0.0, interval: [0, 1000] },
                  ],
                },
                scale: {
                  initialRange: [[0.5, 0.5, 0.5], [1, 1, 1]],
                },
                color: {
                  initialRange: [RARITY_COLORS[rarity] || "#FFD700", "#FFFFFF"],
                },
              }}
              particlePhysics={{
                velocity: {
                  initialRange: [[0, 0.02, 0], [0, 0.05, 0]],
                },
              }}
            />
          )}
        </ViroNode>
      )}
    </ViroARScene>
  );
}
