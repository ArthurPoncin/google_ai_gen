// services/pokemonApiService.ts

import { Pokemon, PokemonStatus, PokemonRarity, ApiErrorResponse } from '../types';

const API_BASE_URL = 'https://epsi.journeesdecouverte.fr:22222/v1'; // Changed to HTTPS
const AUTH_TOKEN = 'EPSI'; // Statically defined Bearer token as per docs/03-authentication.md
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for the API request

/**
 * Maps the old rarity strings from the API to the new PokemonRarity enum.
 * @param apiRarity The rarity string from the API (e.g., 'F', 'A', 'S+').
 * @returns The corresponding PokemonRarity enum value.
 */
const mapApiRarityToEnum = (apiRarity: string): PokemonRarity => {
  switch (apiRarity) {
    case 'F':
    case 'E':
      return PokemonRarity.COMMON;
    case 'D':
    case 'C':
      return PokemonRarity.RARE;
    case 'B':
      return PokemonRarity.EPIC;
    case 'A':
    case 'S':
      return PokemonRarity.LEGENDARY;
    case 'S+':
      return PokemonRarity.MYTHIC;
    default:
      console.warn(`Unknown rarity received from API: "${apiRarity}". Defaulting to Common.`);
      return PokemonRarity.COMMON;
  }
};

/**
 * Service for interacting with the external Pokémon generation API.
 */
export class PokemonApiService {

  /**
   * Generates a new Pokémon by calling the external API.
   * Handles authentication, timeouts, and error responses.
   * @returns A promise that resolves with the generated Pokemon object.
   * @throws {Error} if the API call fails or returns an error.
   */
  public async generatePokemon(): Promise<Pokemon> {
    const url = `${API_BASE_URL}/generate`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        mode: 'cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData: ApiErrorResponse = await res.json().catch(() => ({
          error: {
            code: 'UNKNOWN_ERROR',
            message: `HTTP error! Status: ${res.status}`,
            timestamp: new Date().toISOString()
          }
        }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData?.error?.message || `Failed to generate Pokémon (HTTP ${res.status})`);
      }

      const data = await res.json();

      if (!data || !data.imageBase64 || !data.metadata || !data.metadata.id || !data.metadata.name || !data.metadata.rarity || !data.generatedAt) {
        throw new Error('Invalid API response format received: missing expected fields.');
      }

      const pokemon: Pokemon = {
        id: data.metadata.id,
        name: data.metadata.name,
        rarity: mapApiRarityToEnum(data.metadata.rarity), // Map old rarity to new enum
        imageBase64: data.imageBase64,
        generatedAt: data.generatedAt,
        status: PokemonStatus.OWNED,
        isFavorite: false, // Initialize as not favorite
      };

      return pokemon;

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Network or API processing error:', error);
      
      if ((error as Error).name === 'AbortError') {
        throw new Error(`The Pokémon generation request timed out after ${REQUEST_TIMEOUT / 1000} seconds. The API might be busy, please try again later.`);
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'Could not connect to the Pokémon API. This might be a network issue, the API server being down, or a self-signed HTTPS certificate. If the API uses a self-signed certificate, please try opening ' +
          API_BASE_URL + '/generate' + 
          ' in a new browser tab and accepting the security warning, then refresh this page. Also, verify the API server has correct CORS configuration for your client application\'s origin.'
        );
      }
      throw error;
    }
  }
}

export const pokemonApiService = new PokemonApiService();