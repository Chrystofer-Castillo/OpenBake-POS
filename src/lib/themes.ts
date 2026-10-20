import type { ThemeOption } from '../types';

export const AVAILABLE_THEMES: ThemeOption[] = [
  // --- Temas Pasteles Claros ---
  {
    id: 'vainilla',
    name: 'Vainilla Clásica',
    emoji: '🍦',
    isDark: false,
    colors: {
      bg: '#FDFBF7',
      sidebar: '#F4ECE1',
      accent: '#DF9832',
      text: '#2A1B12'
    }
  },
  {
    id: 'fresa',
    name: 'Fresa & Frambuesa',
    emoji: '🍓',
    isDark: false,
    colors: {
      bg: '#FFF5F6',
      sidebar: '#FCE4E8',
      accent: '#E11D48',
      text: '#3E1019'
    }
  },
  {
    id: 'arandano',
    name: 'Arándano & Mora',
    emoji: '🫐',
    isDark: false,
    colors: {
      bg: '#F8F6FF',
      sidebar: '#EBE5FA',
      accent: '#7C3AED',
      text: '#25133E'
    }
  },
  {
    id: 'chocolate',
    name: 'Chocolate & Caramelo',
    emoji: '🍫',
    isDark: false,
    colors: {
      bg: '#FBF8F4',
      sidebar: '#EFE7DE',
      accent: '#B45309',
      text: '#2A1808'
    }
  },
  {
    id: 'menta',
    name: 'Menta Glaseada',
    emoji: '🌿',
    isDark: false,
    colors: {
      bg: '#F2FAF6',
      sidebar: '#DCF0E7',
      accent: '#059669',
      text: '#0C2D20'
    }
  },
  {
    id: 'durazno',
    name: 'Durazno & Melocotón',
    emoji: '🍑',
    isDark: false,
    colors: {
      bg: '#FFF8F4',
      sidebar: '#FCECE3',
      accent: '#EA580C',
      text: '#3C1808'
    }
  },
  {
    id: 'limon',
    name: 'Limón & Maracuyá',
    emoji: '🍋',
    isDark: false,
    colors: {
      bg: '#FDFAF2',
      sidebar: '#F7F0D9',
      accent: '#CA8A04',
      text: '#332706'
    }
  },
  {
    id: 'merengue',
    name: 'Merengue Suizo',
    emoji: '☁️',
    isDark: false,
    colors: {
      bg: '#FFFFFF',
      sidebar: '#F3F4F6',
      accent: '#4F46E5',
      text: '#111827'
    }
  },
  // --- Temas Oscuros Premium ---
  {
    id: 'chocolate-negro',
    name: 'Chocolate Negro 85%',
    emoji: '🌑',
    isDark: true,
    colors: {
      bg: '#181210',
      sidebar: '#221915',
      accent: '#F59E0B',
      text: '#F5EBE6'
    }
  },
  {
    id: 'mora-nocturna',
    name: 'Mora Nocturna',
    emoji: '🍇',
    isDark: true,
    colors: {
      bg: '#120F1D',
      sidebar: '#1A162B',
      accent: '#A855F7',
      text: '#F2EDFC'
    }
  },
  {
    id: 'espresso',
    name: 'Café Espresso Barista',
    emoji: '🖤',
    isDark: true,
    colors: {
      bg: '#0F0E0D',
      sidebar: '#191715',
      accent: '#D97706',
      text: '#F4ECE6'
    }
  },
  {
    id: 'midnight-mint',
    name: 'Midnight Mint',
    emoji: '🫧',
    isDark: true,
    colors: {
      bg: '#0B1714',
      sidebar: '#11221D',
      accent: '#10B981',
      text: '#E6F5F0'
    }
  }
];
