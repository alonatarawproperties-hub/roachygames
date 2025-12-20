import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, RadialGradient, Stop, Ellipse } from 'react-native-svg';

interface PieceProps {
  size: number;
  uniqueId: string;
}

const ICE_PRIMARY = '#4FC3F7';
const ICE_LIGHT = '#E1F5FE';
const ICE_DARK = '#0288D1';
const ICE_GLOW = '#00E5FF';
const ICE_STROKE = '#01579B';

const FIRE_PRIMARY = '#FF6B00';
const FIRE_LIGHT = '#FFEB3B';
const FIRE_DARK = '#D32F2F';
const FIRE_GLOW = '#FF9800';
const FIRE_STROKE = '#BF360C';

export const IceKingSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `iceKingGrad_${uniqueId}`;
  const glowId = `iceKingGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="18" ry="16" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={ICE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22.5 11.63V6M20 8h5" strokeWidth="1.5" />
        <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <Path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" />
        <Path d="M11.5 30c5.5-3 15.5-3 21 0" stroke={ICE_LIGHT} />
        <Path d="M11.5 33.5c5.5-3 15.5-3 21 0" stroke={ICE_LIGHT} />
        <Path d="M11.5 37c5.5-3 15.5-3 21 0" stroke={ICE_LIGHT} />
      </G>
    </Svg>
  );
};

export const FireKingSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `fireKingGrad_${uniqueId}`;
  const glowId = `fireKingGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="18" ry="16" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={FIRE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22.5 11.63V6M20 8h5" strokeWidth="1.5" />
        <Path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <Path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" />
        <Path d="M11.5 30c5.5-3 15.5-3 21 0" stroke={FIRE_LIGHT} />
        <Path d="M11.5 33.5c5.5-3 15.5-3 21 0" stroke={FIRE_LIGHT} />
        <Path d="M11.5 37c5.5-3 15.5-3 21 0" stroke={FIRE_LIGHT} />
      </G>
    </Svg>
  );
};

export const IceQueenSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `iceQueenGrad_${uniqueId}`;
  const glowId = `iceQueenGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="18" ry="16" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={ICE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="6" cy="12" r="2.75" />
        <Circle cx="14" cy="9" r="2.75" />
        <Circle cx="22.5" cy="8" r="2.75" />
        <Circle cx="31" cy="9" r="2.75" />
        <Circle cx="39" cy="12" r="2.75" />
        <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-7-5.5 9-5.5-9-3.5 7-7.5-12.5L9 26z" />
        <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <Path d="M11.5 30c3.5-1 18.5-1 22 0" stroke={ICE_LIGHT} />
        <Path d="M12 33.5c6-1 15-1 21 0" stroke={ICE_LIGHT} />
      </G>
    </Svg>
  );
};

export const FireQueenSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `fireQueenGrad_${uniqueId}`;
  const glowId = `fireQueenGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="18" ry="16" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={FIRE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="6" cy="12" r="2.75" />
        <Circle cx="14" cy="9" r="2.75" />
        <Circle cx="22.5" cy="8" r="2.75" />
        <Circle cx="31" cy="9" r="2.75" />
        <Circle cx="39" cy="12" r="2.75" />
        <Path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-7-5.5 9-5.5-9-3.5 7-7.5-12.5L9 26z" />
        <Path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <Path d="M11.5 30c3.5-1 18.5-1 22 0" stroke={FIRE_LIGHT} />
        <Path d="M12 33.5c6-1 15-1 21 0" stroke={FIRE_LIGHT} />
      </G>
    </Svg>
  );
};

export const IceRookSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `iceRookGrad_${uniqueId}`;
  const glowId = `iceRookGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="16" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={ICE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <Path d="M34 14l-3 3H14l-3-3" />
        <Path d="M31 17v12.5H14V17" />
        <Path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <Path d="M11 14h23" stroke={ICE_LIGHT} />
      </G>
    </Svg>
  );
};

export const FireRookSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `fireRookGrad_${uniqueId}`;
  const glowId = `fireRookGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="16" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={FIRE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
        <Path d="M34 14l-3 3H14l-3-3" />
        <Path d="M31 17v12.5H14V17" />
        <Path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
        <Path d="M11 14h23" stroke={FIRE_LIGHT} />
      </G>
    </Svg>
  );
};

export const IceBishopSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `iceBishopGrad_${uniqueId}`;
  const glowId = `iceBishopGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="14" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={ICE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <G strokeLinecap="butt">
          <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
          <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <Path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </G>
        <Path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={ICE_LIGHT} strokeLinejoin="miter" />
      </G>
    </Svg>
  );
};

export const FireBishopSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `fireBishopGrad_${uniqueId}`;
  const glowId = `fireBishopGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="14" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={FIRE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <G strokeLinecap="butt">
          <Path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
          <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <Path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </G>
        <Path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={FIRE_LIGHT} strokeLinejoin="miter" />
      </G>
    </Svg>
  );
};

export const IceKnightSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `iceKnightGrad_${uniqueId}`;
  const glowId = `iceKnightGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="14" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={ICE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <Path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <Path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={ICE_LIGHT} />
        <Path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill={ICE_LIGHT} />
      </G>
    </Svg>
  );
};

export const FireKnightSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `fireKnightGrad_${uniqueId}`;
  const glowId = `fireKnightGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="14" ry="14" fill={`url(#${glowId})`} />
      <G fill={`url(#${gradId})`} stroke={FIRE_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <Path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <Path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={FIRE_LIGHT} />
        <Path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill={FIRE_LIGHT} />
      </G>
    </Svg>
  );
};

export const IcePawnSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `icePawnGrad_${uniqueId}`;
  const glowId = `icePawnGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={ICE_LIGHT} />
          <Stop offset="40%" stopColor={ICE_PRIMARY} />
          <Stop offset="100%" stopColor={ICE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={ICE_GLOW} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={ICE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="12" ry="12" fill={`url(#${glowId})`} />
      <Path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={`url(#${gradId})`}
        stroke={ICE_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const FirePawnSvg: React.FC<PieceProps> = ({ size, uniqueId }) => {
  const gradId = `firePawnGrad_${uniqueId}`;
  const glowId = `firePawnGlow_${uniqueId}`;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={FIRE_LIGHT} />
          <Stop offset="40%" stopColor={FIRE_PRIMARY} />
          <Stop offset="100%" stopColor={FIRE_DARK} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={FIRE_GLOW} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={FIRE_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="22.5" cy="22" rx="12" ry="12" fill={`url(#${glowId})`} />
      <Path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={`url(#${gradId})`}
        stroke={FIRE_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};
