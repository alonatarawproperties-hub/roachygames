import React, { useState, useEffect, useRef } from "react";
import {
  ViroARScene,
  ViroNode,
  ViroSphere,
  ViroMaterials,
  ViroAnimations,
  ViroAmbientLight,
  ViroSpotLight,
  ViroQuad,
  ViroARPlaneSelector,
  Viro3DObject,
  ViroText,
  ViroParticleEmitter,
} from "@viro-community/react-viro";
import { AR_CONFIG, RARITY_COLORS, PLACEHOLDER_MODELS } from "./ARConstants";

interface AREggSceneProps {
  rarity: string;
  onEggTapped: () => void;
  onPlaneDetected: () => void;
  sceneNavigator?: any;
}

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
  collectBurst: {
    properties: {
      scaleX: 2.0,
      scaleY: 2.0,
      scaleZ: 2.0,
      opacity: 0,
    },
    duration: 300,
    easing: "EaseOut",
  },
});

export function AREggScene(props: AREggSceneProps) {
  const { rarity = "common", onEggTapped, onPlaneDetected } = props;
  const [planeSelected, setPlaneSelected] = useState(false);
  const [eggPosition, setEggPosition] = useState<[number, number, number]>([0, 0, -2]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showParticles, setShowParticles] = useState(true);

  const getMaterialForRarity = () => {
    switch (rarity) {
      case "uncommon": return "eggUncommon";
      case "rare": return "eggRare";
      case "epic": return "eggEpic";
      case "legendary": return "eggLegendary";
      default: return "eggCommon";
    }
  };

  const handlePlaneSelected = (anchor: any) => {
    const position = anchor.position;
    setEggPosition([position[0], position[1] + 0.15, position[2]]);
    setPlaneSelected(true);
    onPlaneDetected?.();
  };

  const handleEggClick = () => {
    if (isCollecting) return;
    setIsCollecting(true);
    setShowParticles(true);
    setTimeout(() => {
      onEggTapped?.();
    }, 500);
  };

  const onInitialized = (state: any, reason: any) => {
    if (state === 3) {
      console.log("AR tracking initialized");
    }
  };

  return (
    <ViroARScene onTrackingUpdated={onInitialized}>
      <ViroAmbientLight color="#FFFFFF" intensity={500} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 3, 1]}
        color="#FFFFFF"
        castsShadow={true}
        shadowMapSize={2048}
        shadowNearZ={2}
        shadowFarZ={7}
        shadowOpacity={0.7}
      />

      {!planeSelected ? (
        <ViroARPlaneSelector
          minHeight={0.1}
          minWidth={0.1}
          onPlaneSelected={handlePlaneSelected}
        />
      ) : (
        <ViroNode position={eggPosition}>
          <ViroSphere
            radius={0.12}
            heightSegmentCount={20}
            widthSegmentCount={20}
            materials={[getMaterialForRarity()]}
            scale={isCollecting ? [2, 2, 2] : [1, 1.3, 1]}
            opacity={isCollecting ? 0 : 1}
            animation={{
              name: isCollecting ? "collectBurst" : "floatLoop",
              run: true,
              loop: !isCollecting,
            }}
            onClick={handleEggClick}
            physicsBody={{
              type: "Static",
              restitution: 0.8,
            }}
          />

          <ViroQuad
            position={[0, -0.1, 0]}
            rotation={[-90, 0, 0]}
            width={0.3}
            height={0.3}
            materials={["groundShadow"]}
          />

          {/* Particle effects - TODO: Add particle glow asset */}

          {rarity === "legendary" || rarity === "epic" ? (
            <ViroNode
              animation={{
                name: "pulseLoop",
                run: true,
                loop: true,
              }}
            >
              <ViroSphere
                radius={0.18}
                materials={["glowParticle"]}
                opacity={0.2}
              />
            </ViroNode>
          ) : null}
        </ViroNode>
      )}

      <ViroText
        text={planeSelected ? "Tap the egg to collect!" : "Point at a flat surface"}
        position={[0, -0.5, -2]}
        scale={[0.5, 0.5, 0.5]}
        style={{
          fontSize: 20,
          color: "#FFFFFF",
          textAlignVertical: "center",
          textAlign: "center",
          fontWeight: "bold",
        }}
      />
    </ViroARScene>
  );
}

export default AREggScene;
