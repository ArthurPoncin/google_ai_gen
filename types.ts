// types.ts

/**
 * Enum for Pokémon rarity levels.
 */
export enum PokemonRarity {
  COMMON = 'Commun',
  RARE = 'Rare',
  EPIC = 'Épique',
  LEGENDARY = 'Légendaire',
  MYTHIC = 'Mythique',
}

/**
 * Enum for Pokémon status (owned or resold).
 */
export enum PokemonStatus {
  OWNED = 'OWNED',
  RESOLD = 'RESOLD',
}

/**
 * Interface for a generated Pokémon item.
 */
export interface Pokemon {
  id: string; // Unique ID from the API
  name: string;
  rarity: PokemonRarity;
  imageBase64: string; // Base64 encoded image data (without prefix)
  generatedAt: string; // ISO 8601 string from API
  status: PokemonStatus; // OWNED or RESOLD
  isFavorite: boolean; // True if the user marked it as a favorite
}

/**
 * Interface for the user's token balance.
 */
export interface TokenBalance {
  id: 'tokenBalance'; // Fixed ID for single token balance entry
  amount: number;
}

/**
 * Interface for the daily bonus status.
 */
export interface DailyBonusStatus {
  id: 'dailyBonus';
  lastClaimed: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Interface for user-configurable settings.
 */
export interface PlayerSettings {
  id: 'playerSettings'; // Fixed ID for single settings entry
  theme: 'light' | 'dark';
  isMuted: boolean;
  playerName: string;
}

/**
 * Interface for an achievement.
 */
export interface Achievement {
  id: string; // e.g., 'FIRST_FORGE'
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null; // ISO 8601 string when unlocked
}

/**
 * Enum for IndexedDB object store names.
 */
export enum StoreNames {
  Pokemons = 'pokemons',
  Settings = 'settings', // For storing global settings like token balance
  Achievements = 'achievements', // For storing user achievements
}

/**
 * Database name for IndexedDB.
 */
export const DB_NAME = 'PokemonGeneratorDB';

/**
 * Database version for IndexedDB. Increment this number when making schema changes.
 */
export const DB_VERSION = 3; // Version 3: Added achievements store

/**
 * Interface for a general application message (e.g., success, error).
 */
export interface AppMessage {
  type: 'success' | 'error' | 'warning';
  text: string;
}

/**
 * Interface for API error responses.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
  };
}