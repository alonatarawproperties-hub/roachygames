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
  ViroQuad,
  ViroText,
  ViroParticleEmitter,
} from "@viro-community/react-viro";
import { AR_CONFIG, RARITY_COLORS, CLASS_COLORS } from "./ARConstants";

interface ARCreatureSceneProps {
  creatureName: string;
  rarity: string;
  creatureClass: string;
  onCreatureTapped: () => void;
  onCatchStarted: () => void;
  sceneNavigator?: any;
}

ViroMaterials.createMaterials({
  creatureBody: {
    diffuseColor: "#8B4513",
    lightingModel: "Blinn",
    shininess: 0.6,
  },
  creatureTank: {
    diffuseColor: CLASS_COLORS.tank,
    lightingModel: "Blinn",
    shininess: 0.7,
  },
  creatureAssassin: {
    diffuseColor: CLASS_COLORS.assassin,
    lightingModel: "Blinn",
    shininess: 0.7,
  },
  creatureMage: {
    diffuseColor: CLASS_COLORS.mage,
    lightingModel: "Blinn",
    shininess: 0.8,
  },
  creatureSupport: {
    diffuseColor: CLASS_COLORS.support,
    lightingModel: "Blinn",
    shininess: 0.7,
  },
  antennae: {
    diffuseColor: "#5C4033",
    lightingModel: "Blinn",
  },
  eye: {
    diffuseColor: "#FF0000",
    lightingModel: "Constant",
  },
  groundShadow: {
    diffuseColor: "rgba(0,0,0,0.4)",
  },
  catchBall: {
    diffuseColor: "#FFD700",
    lightingModel: "Blinn",
    shininess: 1.0,
  },
});

ViroAnimations.registerAnimations({
  idle: {
    properties: {
      rotateY: "+=10",
    },
    duration: 2000,
    easing: "Linear",
  },
  idleLoop: [["idle"]] as any,
  dodge: {
    properties: {
      positionX: "+=0.3",
    },
    duration: 200,
    easing: "EaseOut",
  },
  dodgeBack: {
    properties: {
      positionX: "-=0.3",
    },
    duration: 200,
    easing: "EaseOut",
  },
  dodgeSequence: [["dodge", "dodgeBack"]] as any,
  jump: {
    properties: {
      positionY: "+=0.2",
    },
    duration: 150,
    easing: "EaseOut",
  },
  land: {
    properties: {
      positionY: "-=0.2",
    },
    duration: 150,
    easing: "EaseIn",
  },
  jumpSequence: [["jump", "land"]] as any,
  wiggle: {
    properties: {
      rotateZ: "+=8",
    },
    duration: 100,
    easing: "Linear",
  },
  wiggleBack: {
    properties: {
      rotateZ: "-=16",
    },
    duration: 100,
    easing: "Linear",
  },
  wiggleEnd: {
    properties: {
      rotateZ: "+=8",
    },
    duration: 100,
    easing: "Linear",
  },
  wiggleLoop: [["wiggle", "wiggleBack", "wiggleEnd"]] as any,
  captured: {
    properties: {
      scaleX: 0,
      scaleY: 0,
      scaleZ: 0,
      opacity: 0,
    },
    duration: 500,
    easing: "EaseIn",
  },
  approach: {
    properties: {
      positionZ: "+=0.3",
    },
    duration: 1500,
    easing: "EaseInEaseOut",
  },
});

export function ARCreatureScene(props: ARCreatureSceneProps) {
  const {
    creatureName = "Roachy",
    rarity = "common",
    creatureClass = "tank",
    onCreatureTapped,
    onCatchStarted,
  } = props;

  const [creaturePosition, setCreaturePosition] = useState<[number, number, number]>([0, -0.3, -1.5]);
  const [currentAnimation, setCurrentAnimation] = useState("idleLoop");
  const [isDodging, setIsDodging] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [showCatchPrompt, setShowCatchPrompt] = useState(true);
  const dodgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getMaterialForClass = () => {
    switch (creatureClass) {
      case "assassin": return "creatureAssassin";
      case "mage": return "creatureMage";
      case "support": return "creatureSupport";
      default: return "creatureTank";
    }
  };

  useEffect(() => {
    const scheduleRandomDodge = () => {
      const delay = 3000 + Math.random() * 5000;
      dodgeTimerRef.current = setTimeout(() => {
        if (!isCaptured) {
          triggerDodge();
          scheduleRandomDodge();
        }
      }, delay);
    };

    scheduleRandomDodge();

    return () => {
      if (dodgeTimerRef.current) {
        clearTimeout(dodgeTimerRef.current);
      }
    };
  }, [isCaptured]);

  const triggerDodge = () => {
    if (isDodging || isCaptured) return;
    setIsDodging(true);
    setCurrentAnimation(Math.random() > 0.5 ? "dodgeSequence" : "jumpSequence");
    setTimeout(() => {
      setIsDodging(false);
      setCurrentAnimation("idleLoop");
    }, 400);
  };

  const handleCreatureClick = () => {
    if (isCaptured) return;
    setShowCatchPrompt(false);
    onCreatureTapped?.();
    onCatchStarted?.();
  };

  const handleCapture = () => {
    setIsCaptured(true);
    setCurrentAnimation("captured");
  };

  const onInitialized = (state: any, reason: any) => {
    if (state === 3) {
      console.log("AR creature scene initialized");
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
        shadowMapSize={2048}
        shadowNearZ={2}
        shadowFarZ={7}
        shadowOpacity={0.6}
      />

      <ViroNode
        position={creaturePosition}
        animation={{
          name: currentAnimation,
          run: true,
          loop: currentAnimation === "idleLoop",
        }}
      >
        <ViroNode
          animation={{
            name: "wiggleLoop",
            run: !isDodging && !isCaptured,
            loop: true,
          }}
        >
          <ViroBox
            width={0.2}
            height={0.12}
            length={0.35}
            materials={[getMaterialForClass()]}
            onClick={handleCreatureClick}
          />

          <ViroSphere
            radius={0.08}
            position={[0, 0.08, 0.12]}
            materials={[getMaterialForClass()]}
          />

          <ViroBox
            width={0.01}
            height={0.12}
            length={0.01}
            position={[0.03, 0.15, 0.15]}
            rotation={[0, 0, -20]}
            materials={["antennae"]}
          />
          <ViroBox
            width={0.01}
            height={0.12}
            length={0.01}
            position={[-0.03, 0.15, 0.15]}
            rotation={[0, 0, 20]}
            materials={["antennae"]}
          />

          <ViroSphere
            radius={0.02}
            position={[0.04, 0.1, 0.18]}
            materials={["eye"]}
          />
          <ViroSphere
            radius={0.02}
            position={[-0.04, 0.1, 0.18]}
            materials={["eye"]}
          />

          {[0, 1, 2].map((i) => (
            <React.Fragment key={`leg-${i}`}>
              <ViroBox
                width={0.015}
                height={0.08}
                length={0.015}
                position={[0.12, -0.08, 0.1 - i * 0.12]}
                rotation={[0, 0, 30]}
                materials={["antennae"]}
              />
              <ViroBox
                width={0.015}
                height={0.08}
                length={0.015}
                position={[-0.12, -0.08, 0.1 - i * 0.12]}
                rotation={[0, 0, -30]}
                materials={["antennae"]}
              />
            </React.Fragment>
          ))}

          <ViroNode position={[0, 0.25, 0]}>
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
            <ViroText
              text={rarity.toUpperCase()}
              position={[0, -0.08, 0]}
              scale={[0.2, 0.2, 0.2]}
              style={{
                fontSize: 10,
                color: "#FFFFFF",
                textAlignVertical: "center",
                textAlign: "center",
              }}
            />
          </ViroNode>
        </ViroNode>

        <ViroQuad
          position={[0, -0.15, 0]}
          rotation={[-90, 0, 0]}
          width={0.5}
          height={0.5}
          materials={["groundShadow"]}
        />

        {/* Particle effects for epic/legendary - TODO: Add particle asset */}
      </ViroNode>

      {showCatchPrompt ? (
        <ViroText
          text="Tap the Roachy to start catching!"
          position={[0, -0.7, -1.5]}
          scale={[0.4, 0.4, 0.4]}
          style={{
            fontSize: 18,
            color: "#FFFFFF",
            textAlignVertical: "center",
            textAlign: "center",
            fontWeight: "bold",
          }}
        />
      ) : null}
    </ViroARScene>
  );
}

export default ARCreatureScene;
