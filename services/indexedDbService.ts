// services/indexedDbService.ts

import { Pokemon, TokenBalance, DB_NAME, DB_VERSION, StoreNames, DailyBonusStatus, Achievement, PlayerSettings } from '../types';

/**
 * A service for interacting with IndexedDB.
 */
export class IndexedDbService {
  private db: IDBDatabase | null = null;

  /**
   * Opens the IndexedDB database and initializes object stores if necessary.
   * @returns A promise that resolves with the IDBDatabase instance.
   */
  public async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (event.oldVersion < 2) {
          if (!db.objectStoreNames.contains(StoreNames.Pokemons)) {
            db.createObjectStore(StoreNames.Pokemons, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(StoreNames.Settings)) {
            db.createObjectStore(StoreNames.Settings, { keyPath: 'id' });
          }
        }
        
        if (event.oldVersion < 3) {
          if (!db.objectStoreNames.contains(StoreNames.Achievements)) {
             db.createObjectStore(StoreNames.Achievements, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('IndexedDB error:', error);
        reject(error);
      };
    });
  }

  /**
   * Helper to perform a transaction on the database.
   * @param storeNames The name(s) of the object store(s) to transact on.
   * @param mode The transaction mode ('readonly' or 'readwrite').
   * @param callback A function that performs operations within the transaction.
   * @returns A promise that resolves with the result of the callback.
   */
  private async withTransaction<T>(
    storeNames: StoreNames | StoreNames[],
    mode: IDBTransactionMode,
    callback: (stores: IDBObjectStore[]) => Promise<T>,
  ): Promise<T> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);
      const stores = Array.isArray(storeNames) 
        ? storeNames.map(name => transaction.objectStore(name))
        : [transaction.objectStore(storeNames)];

      transaction.oncomplete = () => {
        // Transaction committed successfully.
      };

      transaction.onerror = (event: Event) => {
        const error = (event.target as IDBTransaction).error;
        console.error(`Transaction error for stores ${storeNames}:`, error);
        reject(error);
      };

      transaction.onabort = (event: Event) => {
        const error = (event.target as IDBTransaction).error;
        console.error(`Transaction aborted for stores ${storeNames}:`, error);
        reject(error);
      };

      // Execute the callback within the transaction and handle its resolution/rejection
      callback(stores)
        .then(resolve)
        .catch(reject);
    });
  }

  // --- Pokémon Operations ---

  public async addPokemon(pokemon: Pokemon): Promise<Pokemon> {
    return this.withTransaction<Pokemon>(StoreNames.Pokemons, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.add(pokemon);
        request.onsuccess = () => resolve(pokemon);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async getPokemons(): Promise<Pokemon[]> {
    return this.withTransaction<Pokemon[]>(StoreNames.Pokemons, 'readonly', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = (e) => resolve((e.target as IDBRequest).result as Pokemon[]);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async updatePokemon(pokemon: Pokemon): Promise<Pokemon> {
    return this.withTransaction<Pokemon>(StoreNames.Pokemons, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.put(pokemon);
        request.onsuccess = () => resolve(pokemon);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  // --- Token Balance Operations ---

  public async getTokenBalance(): Promise<TokenBalance> {
    return this.withTransaction<TokenBalance>(StoreNames.Settings, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.get('tokenBalance');
        request.onsuccess = (event: Event) => {
          let balance = (event.target as IDBRequest).result as TokenBalance | undefined;
          if (!balance) {
            const initialBalance: TokenBalance = { id: 'tokenBalance', amount: 100 };
            const putRequest = store.add(initialBalance);
            putRequest.onsuccess = () => resolve(initialBalance);
            putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
          } else {
            resolve(balance);
          }
        };
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async updateTokenBalance(newAmount: number): Promise<TokenBalance> {
    const newBalance: TokenBalance = { id: 'tokenBalance', amount: newAmount };
    return this.withTransaction<TokenBalance>(StoreNames.Settings, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.put(newBalance);
        request.onsuccess = () => resolve(newBalance);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  // --- Daily Bonus Operations ---

  public async getDailyBonusStatus(): Promise<DailyBonusStatus | undefined> {
    return this.withTransaction<DailyBonusStatus | undefined>(StoreNames.Settings, 'readonly', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.get('dailyBonus');
        request.onsuccess = (e) => resolve((e.target as IDBRequest).result);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async updateDailyBonusStatus(status: DailyBonusStatus): Promise<DailyBonusStatus> {
    return this.withTransaction<DailyBonusStatus>(StoreNames.Settings, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.put(status);
        request.onsuccess = () => resolve(status);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }
  
  // --- Player Settings Operations ---

  public async getPlayerSettings(): Promise<PlayerSettings> {
    return this.withTransaction<PlayerSettings>(StoreNames.Settings, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.get('playerSettings');
        request.onsuccess = (event: Event) => {
          let settings = (event.target as IDBRequest).result as PlayerSettings | undefined;
          if (!settings) {
            const defaultSettings: PlayerSettings = {
              id: 'playerSettings',
              theme: 'dark',
              isMuted: true,
              playerName: 'Ash',
            };
            const putRequest = store.add(defaultSettings);
            putRequest.onsuccess = () => resolve(defaultSettings);
            putRequest.onerror = (e) => reject((e.target as IDBRequest).error);
          } else {
            resolve(settings);
          }
        };
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async updatePlayerSettings(settings: PlayerSettings): Promise<PlayerSettings> {
    return this.withTransaction<PlayerSettings>(StoreNames.Settings, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.put(settings);
        request.onsuccess = () => resolve(settings);
        request.onerror = e => reject((e.target as IDBRequest).error);
      });
    });
  }


  // --- Achievements Operations ---

  public async getAchievements(): Promise<Achievement[]> {
    return this.withTransaction<Achievement[]>(StoreNames.Achievements, 'readonly', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = (e) => resolve((e.target as IDBRequest).result as Achievement[]);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }

  public async updateAchievement(achievement: Achievement): Promise<Achievement> {
    return this.withTransaction<Achievement>(StoreNames.Achievements, 'readwrite', ([store]) => {
      return new Promise((resolve, reject) => {
        const request = store.put(achievement);
        request.onsuccess = () => resolve(achievement);
        request.onerror = (e) => reject((e.target as IDBRequest).error);
      });
    });
  }
}

export const indexedDbService = new IndexedDbService();