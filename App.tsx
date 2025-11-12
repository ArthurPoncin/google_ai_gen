// App.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { indexedDbService } from './services/indexedDbService';
import { pokemonApiService } from './services/pokemonApiService';
import { Pokemon, AppMessage, PokemonStatus, PokemonRarity, Achievement, PlayerSettings } from './types';
import Button from './components/Button';
import Modal from './components/Modal';
import { Coins, Loader2, XCircle, Bot, Sparkles, Layers, ShieldCheck, ShoppingBag, Store, Star, Trophy, Gift, CheckCircle, Lock, Moon, Sun, Volume2, VolumeX, BarChart3, User } from 'lucide-react';

const GENERATION_COST = 10;
const INITIAL_TOKENS = 100;

type View = 'studio' | 'collection' | 'market' | 'achievements' | 'leaderboard';

const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'FIRST_FORGE', name: 'Première Forge', description: 'Générer votre premier Pokémon.' },
  { id: 'TEN_FORGES', name: 'Forgeron Amateur', description: 'Générer 10 Pokémon.' },
  { id: 'FIRST_SALE', name: 'Premier Profit', description: 'Revendre un Pokémon sur le marché.' },
  { id: 'LEGENDARY_FORGE', name: 'Main de Midas', description: 'Générer un Pokémon Légendaire ou Mythique.' },
];

const NavLink = ({ children, onClick, isActive }: { children: React.ReactNode; onClick: () => void; isActive: boolean; }) => (
  <button onClick={onClick} className={`font-medium transition-colors relative py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${isActive ? 'text-gray-900 dark:text-white' : ''}`}>
    {children}
    {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 rounded-full"></span>}
  </button>
);

const Header = ({ tokenBalance, onGenerateClick, currentView, onNavigate, theme, onToggleTheme, isMuted, onToggleMute }: { tokenBalance: number; onGenerateClick: () => void; currentView: View; onNavigate: (view: View) => void; theme: 'light' | 'dark'; onToggleTheme: () => void; isMuted: boolean; onToggleMute: () => void; }) => (
  <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/30 backdrop-blur-lg border-b border-gray-200/50 dark:border-white/10">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('studio')}>
        <div className="bg-yellow-400 h-8 w-8 rounded-full shadow-[0_0_10px_theme(colors.yellow.400)]"></div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">PokéForge</span>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        <NavLink onClick={() => onNavigate('studio')} isActive={currentView === 'studio'}>Studio</NavLink>
        <NavLink onClick={() => onNavigate('collection')} isActive={currentView === 'collection'}>Collection</NavLink>
        <NavLink onClick={() => onNavigate('market')} isActive={currentView === 'market'}>Marché</NavLink>
        <NavLink onClick={() => onNavigate('achievements')} isActive={currentView === 'achievements'}>Succès</NavLink>
        <NavLink onClick={() => onNavigate('leaderboard')} isActive={currentView === 'leaderboard'}>Classement</NavLink>
      </nav>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2 shadow-sm text-gray-900 dark:text-white">
          <Coins className="h-5 w-5 text-yellow-400" />
          <span className="font-semibold">{tokenBalance} jetons</span>
        </div>
        <Button variant="primary" size="sm" className="hidden sm:flex" onClick={onGenerateClick}>Générer</Button>
        <button onClick={onToggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={onToggleMute} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400">
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  </header>
);

const ForgeEffect = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = 50 + Math.random() * 150;
      const x = Math.cos(angle * Math.PI / 180) * distance + 'px';
      const y = Math.sin(angle * Math.PI / 180) * distance + 'px';
      const color = `hsl(${Math.random() * 60 + 20}, 100%, 70%)`; // Yellow/Orange/Red hues
      const delay = Math.random() * 0.5 + 's';
      return <div key={i} className="particle" style={{ '--x': x, '--y': y, '--color': color, animationDelay: delay } as React.CSSProperties}></div>;
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="forge-glow"></div>
      <div>{particles}</div>
    </div>
  );
};

const App: React.FC = () => {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingPokemon, setIsGeneratingPokemon] = useState<boolean>(false);
  const [message, setMessage] = useState<AppMessage | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [modalOnConfirm, setModalOnConfirm] = useState<(() => void) | undefined>(undefined);
  const [modalConfirmButtonText, setModalConfirmButtonText] = useState<string>('Confirm');
  const [modalConfirmButtonVariant, setModalConfirmButtonVariant] = useState<'primary' | 'danger'>('primary');
  const [isModalConfirmLoading, setIsModalConfirmLoading] = useState<boolean>(false);
  
  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState(false);
  const [dailyBonusAmount, setDailyBonusAmount] = useState(0);

  const [currentView, setCurrentView] = useState<View>('studio');
  const [collectionFilter, setCollectionFilter] = useState<PokemonStatus | 'ALL' | 'FAVORITES'>(PokemonStatus.OWNED);
  const [marketRarityFilter, setMarketRarityFilter] = useState<PokemonRarity | 'ALL'>('ALL');

  useEffect(() => {
    // FIX: Use a more robust method to add/remove the 'dark' class
    // to ensure theme changes are applied correctly.
    if (settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings?.theme]);

  const showMessage = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const checkAndUnlockAchievements = useCallback(async (currentPokemons: Pokemon[], currentAchievements: Achievement[]) => {
    const unlockedAchievements: Achievement[] = [];

    for (const achievementDef of ALL_ACHIEVEMENTS) {
      const existingAchievement = currentAchievements.find(a => a.id === achievementDef.id);
      if (existingAchievement && existingAchievement.unlocked) continue;

      let shouldUnlock = false;
      switch (achievementDef.id) {
        case 'FIRST_FORGE':
          shouldUnlock = currentPokemons.length >= 1;
          break;
        case 'TEN_FORGES':
          shouldUnlock = currentPokemons.length >= 10;
          break;
        case 'FIRST_SALE':
          shouldUnlock = currentPokemons.some(p => p.status === PokemonStatus.RESOLD);
          break;
        case 'LEGENDARY_FORGE':
          shouldUnlock = currentPokemons.some(p => p.rarity === PokemonRarity.LEGENDARY || p.rarity === PokemonRarity.MYTHIC);
          break;
      }

      if (shouldUnlock) {
        const newAchievement: Achievement = {
          ...achievementDef,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
        };
        await indexedDbService.updateAchievement(newAchievement);
        unlockedAchievements.push(newAchievement);
        showMessage('success', `Succès débloqué : ${newAchievement.name} !`);
      }
    }
    
    if (unlockedAchievements.length > 0) {
      setAchievements(prev => {
        const updated = [...prev];
        unlockedAchievements.forEach(unlocked => {
          const index = updated.findIndex(a => a.id === unlocked.id);
          if (index > -1) {
            updated[index] = unlocked;
          } else {
            updated.push(unlocked);
          }
        });
        return updated;
      });
    }
  }, [showMessage]);

  const fetchAppData = useCallback(async () => {
    setIsLoading(true);
    try {
      await indexedDbService.openDatabase();
      const [fetchedPokemons, balance, fetchedAchievements, bonusStatus, playerSettings] = await Promise.all([
        indexedDbService.getPokemons(),
        indexedDbService.getTokenBalance(),
        indexedDbService.getAchievements(),
        indexedDbService.getDailyBonusStatus(),
        indexedDbService.getPlayerSettings(),
      ]);

      setPokemons(fetchedPokemons.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
      setTokenBalance(balance.amount);
      setSettings(playerSettings);

      const today = new Date().toDateString();
      if (!bonusStatus || new Date(bonusStatus.lastClaimed).toDateString() !== today) {
        setDailyBonusAmount(Math.floor(Math.random() * 6) + 5); // 5 to 10 tokens
        setIsDailyBonusModalOpen(true);
      }

      const achievementsMap = new Map(fetchedAchievements.map(a => [a.id, a]));
      const allAchievements = ALL_ACHIEVEMENTS.map(def => 
        achievementsMap.has(def.id) 
          ? achievementsMap.get(def.id)! 
          : { ...def, unlocked: false, unlockedAt: null }
      );
      setAchievements(allAchievements);
      
      await checkAndUnlockAchievements(fetchedPokemons, allAchievements);

    } catch (error) {
      console.error("Failed to fetch app data:", error);
      showMessage('error', 'Failed to load app data.');
    } finally {
      setIsLoading(false);
    }
  }, [showMessage, checkAndUnlockAchievements]);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);
  
  const handleClaimDailyBonus = async () => {
    const newBalance = tokenBalance + dailyBonusAmount;
    await indexedDbService.updateTokenBalance(newBalance);
    await indexedDbService.updateDailyBonusStatus({ id: 'dailyBonus', lastClaimed: new Date().toISOString() });
    setTokenBalance(newBalance);
    setIsDailyBonusModalOpen(false);
    showMessage('success', `Vous avez reçu ${dailyBonusAmount} jetons !`);
  };
  
  const handleToggleTheme = async () => {
    if (!settings) return;
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const newSettings: PlayerSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);
    await indexedDbService.updatePlayerSettings(newSettings);
  };
  
  const handleToggleMute = async () => {
    if (!settings) return;
    const newSettings = { ...settings, isMuted: !settings.isMuted };
    setSettings(newSettings);
    await indexedDbService.updatePlayerSettings(newSettings);
  };


  const getResellValue = useCallback((rarity: PokemonRarity): number => {
    switch (rarity) {
      case PokemonRarity.COMMON: return 5;
      case PokemonRarity.RARE: return 10;
      case PokemonRarity.EPIC: return 20;
      case PokemonRarity.LEGENDARY: return 40;
      case PokemonRarity.MYTHIC: return 80;
      default: return 0;
    }
  }, []);

  const getBuyPrice = useCallback((rarity: PokemonRarity): number => getResellValue(rarity) * 2, [getResellValue]);

  const handleGeneratePokemon = async () => {
    if (tokenBalance < GENERATION_COST) {
      showMessage('warning', `Il faut ${GENERATION_COST} jetons pour générer.`);
      return;
    }
    setIsGeneratingPokemon(true);
    let originalTokenBalance = tokenBalance;
    try {
      const newBalanceAfterDeduction = originalTokenBalance - GENERATION_COST;
      setTokenBalance(newBalanceAfterDeduction);
      await indexedDbService.updateTokenBalance(newBalanceAfterDeduction);
      const newPokemon = await pokemonApiService.generatePokemon();
      await indexedDbService.addPokemon(newPokemon);
      const updatedPokemons = [newPokemon, ...pokemons].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      setPokemons(updatedPokemons);
      await checkAndUnlockAchievements(updatedPokemons, achievements);
      showMessage('success', `Nouveau Pokémon généré : ${newPokemon.name} !`);
    } catch (error) {
      console.error("Error generating Pokémon:", error);
      setTokenBalance(originalTokenBalance);
      await indexedDbService.updateTokenBalance(originalTokenBalance);
      showMessage('error', (error as Error).message || `Échec de la génération. Jetons remboursés.`);
    } finally {
      setIsGeneratingPokemon(false);
    }
  };

  const handleResellConfirmation = (pokemon: Pokemon) => {
    const resellValue = getResellValue(pokemon.rarity);
    setModalTitle('Revendre le Pokémon');
    setModalContent(
      <>
        <p className="text-gray-600 dark:text-gray-300 mb-2">Êtes-vous sûr de vouloir revendre <span className="font-semibold text-orange-400">{pokemon.name}</span> ?</p>
        <p className="text-gray-500 dark:text-gray-400">Vous recevrez <span className="font-bold text-green-400">{resellValue} jetons</span> et la carte sera mise en vente sur le marché.</p>
      </>
    );
    setModalConfirmButtonVariant('danger');
    setModalConfirmButtonText("Confirmer la revente");
    setModalOnConfirm(() => async () => {
      setIsModalConfirmLoading(true);
      try {
        const updatedPokemon = { ...pokemon, status: PokemonStatus.RESOLD };
        await indexedDbService.updatePokemon(updatedPokemon);
        const newBalance = tokenBalance + resellValue;
        await indexedDbService.updateTokenBalance(newBalance);
        const updatedPokemons = pokemons.map(p => (p.id === updatedPokemon.id ? updatedPokemon : p));
        setPokemons(updatedPokemons);
        setTokenBalance(newBalance);
        await checkAndUnlockAchievements(updatedPokemons, achievements);
        showMessage('success', `${pokemon.name} revendu ! +${resellValue} jetons.`);
      } catch (error) {
        showMessage('error', `Échec de la revente.`);
      } finally {
        setIsModalConfirmLoading(false);
        closeModal();
      }
    });
    setIsModalOpen(true);
  };
  
  const handleToggleFavorite = async (pokemonId: string) => {
    const pokemon = pokemons.find(p => p.id === pokemonId);
    if (!pokemon) return;

    const updatedPokemon = { ...pokemon, isFavorite: !pokemon.isFavorite };
    try {
      await indexedDbService.updatePokemon(updatedPokemon);
      setPokemons(pokemons.map(p => p.id === pokemonId ? updatedPokemon : p));
    } catch (error) {
      showMessage('error', 'Failed to update favorite status.');
    }
  };

  const handleBuyPokemon = async (pokemon: Pokemon) => {
    const buyPrice = getBuyPrice(pokemon.rarity);
    if (tokenBalance < buyPrice) {
      showMessage('warning', `Pas assez de jetons. Il vous faut ${buyPrice} jetons.`);
      return;
    }

    try {
      const updatedPokemon = { ...pokemon, status: PokemonStatus.OWNED };
      await indexedDbService.updatePokemon(updatedPokemon);
      const newBalance = tokenBalance - buyPrice;
      await indexedDbService.updateTokenBalance(newBalance);
      setPokemons(prev => prev.map(p => (p.id === updatedPokemon.id ? updatedPokemon : p)));
      setTokenBalance(newBalance);
      showMessage('success', `${pokemon.name} acheté ! -${buyPrice} jetons.`);
    } catch (error) {
      showMessage('error', `Échec de l'achat.`);
    }
  };

  const closeModal = () => setIsModalOpen(false);

  const getRarityStyles = useCallback((rarity: PokemonRarity) => ({
      [PokemonRarity.COMMON]: { tag: 'bg-gray-500/50 text-gray-200', border: 'border-gray-500/50', glow: '', shimmer: 'from-transparent via-black/10 dark:via-white/10 to-transparent' },
      [PokemonRarity.RARE]: { tag: 'bg-blue-500/50 text-blue-200', border: 'border-blue-500/60', glow: 'shadow-[0_0_8px_theme(colors.blue.500/0.5)]', shimmer: 'from-transparent via-cyan-400/20 to-transparent' },
      [PokemonRarity.EPIC]: { tag: 'bg-purple-500/50 text-purple-200', border: 'border-purple-500/60', glow: 'shadow-[0_0_12px_theme(colors.purple.500/0.6)]', shimmer: 'from-transparent via-purple-400/20 to-transparent' },
      [PokemonRarity.LEGENDARY]: { tag: 'bg-yellow-500/50 text-yellow-200', border: 'border-yellow-500/60', glow: 'shadow-[0_0_15px_theme(colors.yellow.500/0.7)]', shimmer: 'from-transparent via-yellow-300/20 to-transparent' },
      [PokemonRarity.MYTHIC]: { tag: 'bg-gradient-to-r from-fuchsia-500/60 to-cyan-500/60 text-white font-bold', border: 'p-0.5 bg-gradient-to-br from-fuchsia-500 to-cyan-500', glow: 'shadow-[0_0_20px_theme(colors.fuchsia.500/0.8)]', shimmer: 'from-transparent via-fuchsia-400/30 to-transparent' },
  }[rarity]), []);

  const PokemonCard = ({ pokemon, context }: { pokemon: Pokemon; context: View | 'studio' }) => {
    const { tag, border, glow, shimmer } = getRarityStyles(pokemon.rarity);
    const resellValue = getResellValue(pokemon.rarity);
    const buyPrice = getBuyPrice(pokemon.rarity);
    
    const cardContent = (
      <div className="w-full h-full bg-gray-200/50 dark:bg-gray-900/80 rounded-2xl flex flex-col aspect-[3/4] relative group transition-all duration-300 overflow-hidden hover:-translate-y-1">
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r ${shimmer} transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out`}></div>
        
        <div className="relative w-full flex-grow mb-2 rounded-lg overflow-hidden bg-black/5 dark:bg-black/20 p-2">
          <img src={`data:image/png;base64,${pokemon.imageBase64}`} alt={pokemon.name} className="object-contain w-full h-full rounded-md" loading="lazy" />
          {pokemon.status === PokemonStatus.RESOLD && context === 'collection' && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-sm font-bold uppercase tracking-widest">REVENDU</div>}
          <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-bold backdrop-blur-sm ${tag}`}>{pokemon.rarity}</span>
          {pokemon.status === PokemonStatus.OWNED && context !== 'studio' && (
            <button onClick={() => handleToggleFavorite(pokemon.id)} className="absolute top-2 left-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-gray-300 hover:text-yellow-400 transition-colors z-10">
              <Star className={`h-4 w-4 ${pokemon.isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
            </button>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate px-2 pb-2">{pokemon.name}</h3>
        {pokemon.status === PokemonStatus.OWNED && context === 'collection' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
            <Button variant="secondary" size="sm" className="px-3 py-1 text-xs" onClick={() => handleResellConfirmation(pokemon)}><Coins className="h-4 w-4 mr-1" /> Revendre (+{resellValue})</Button>
          </div>
        )}
        {context === 'market' && (
           <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
             <Button variant="primary" size="sm" className="px-3 py-1 text-xs" onClick={() => handleBuyPokemon(pokemon)} disabled={tokenBalance < buyPrice}><ShoppingBag className="h-4 w-4 mr-1" /> Acheter ({buyPrice})</Button>
           </div>
        )}
      </div>
    );

    return (
      <div className={`rounded-3xl shadow-lg transition-all duration-300 ${pokemon.rarity === PokemonRarity.MYTHIC ? border : `bg-white/50 dark:bg-white/10 backdrop-blur-md border ${border} ${glow}`} ${pokemon.rarity !== PokemonRarity.MYTHIC ? 'group-hover:' + glow : 'group-hover:shadow-[0_0_30px_theme(colors.fuchsia.500/0.5)]'}`}>
        {cardContent}
      </div>
    );
  };
  
  const collectionPokemons = useMemo(() => pokemons.filter(p => {
    if (collectionFilter === 'ALL') return true;
    if (collectionFilter === 'FAVORITES') return p.isFavorite && p.status === PokemonStatus.OWNED;
    return p.status === collectionFilter;
  }), [pokemons, collectionFilter]);
  
  const marketPokemons = useMemo(() => pokemons.filter(p => p.status === PokemonStatus.RESOLD && (marketRarityFilter === 'ALL' || p.rarity === marketRarityFilter)), [pokemons, marketRarityFilter]);
  
  const rarityScore: Record<PokemonRarity, number> = {
    [PokemonRarity.COMMON]: 1,
    [PokemonRarity.RARE]: 2,
    [PokemonRarity.EPIC]: 3,
    [PokemonRarity.LEGENDARY]: 4,
    [PokemonRarity.MYTHIC]: 5,
  };
  
  const userLeaderboardStats = useMemo(() => {
    const totalPokemons = pokemons.length;
    if (totalPokemons === 0) return { name: settings?.playerName || 'Vous', pokemons: 0, avgRarity: 0, avgRarityName: 'N/A' };
    const totalRarityScore = pokemons.reduce((sum, p) => sum + rarityScore[p.rarity], 0);
    const avgRarity = totalRarityScore / totalPokemons;
    const avgRarityName = Object.keys(rarityScore).find(key => rarityScore[key as PokemonRarity] >= Math.round(avgRarity)) || 'Commun';
    return { name: settings?.playerName || 'Vous', pokemons: totalPokemons, avgRarity, avgRarityName };
  }, [pokemons, settings?.playerName, rarityScore]);
  
  const leaderboardData = useMemo(() => {
      const mockData = [
        { name: 'Red', pokemons: 152, avgRarity: 4.8, avgRarityName: 'Mythique' },
        { name: 'Blue', pokemons: 131, avgRarity: 4.5, avgRarityName: 'Légendaire' },
        { name: 'Cynthia', pokemons: 98, avgRarity: 4.9, avgRarityName: 'Mythique' },
        { name: 'Lance', pokemons: 78, avgRarity: 4.2, avgRarityName: 'Légendaire' },
      ];
      return [...mockData, userLeaderboardStats].sort((a, b) => b.avgRarity - a.avgRarity || b.pokemons - a.pokemons);
  }, [userLeaderboardStats]);


  return (
    <div className="bg-transparent">
      <Header tokenBalance={tokenBalance} onGenerateClick={handleGeneratePokemon} currentView={currentView} onNavigate={setCurrentView} theme={settings?.theme || 'dark'} onToggleTheme={handleToggleTheme} isMuted={settings?.isMuted || true} onToggleMute={handleToggleMute} />
      <main>
        {isGeneratingPokemon && <ForgeEffect />}
        {message && (
          <div role="alert" className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-full shadow-lg flex items-center justify-between transition-all duration-300 backdrop-blur-md border border-white/10 ${
              message.type === 'success' ? 'bg-green-500/30 text-white' : message.type === 'error' ? 'bg-red-500/30 text-white' : 'bg-yellow-400/30 text-white'
            }`}
          >
            <p className="font-semibold mx-4 text-sm">{message.text}</p>
            <button onClick={() => setMessage(null)} className="p-1 rounded-full hover:bg-white/20"><XCircle className="h-5 w-5" /></button>
          </div>
        )}

        {currentView === 'studio' && (
          <>
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="bg-white/50 dark:bg-black/20 rounded-3xl p-8 md:p-12 lg:p-16 border border-gray-200/50 dark:border-white/10 backdrop-blur-lg">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <span className="inline-block bg-yellow-400/20 text-yellow-500 dark:text-yellow-300 text-sm font-bold px-3 py-1 rounded-full mb-4 border border-yellow-400/30">STUDIO POKÉMON</span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">Forge tes Pokémon uniques</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">Lance une génération, observe la carte prendre forme et enrichis ta collection. Les meilleurs forgerons savent quand conserver une carte ou la revendre pour recharger leurs jetons.</p>
                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                      <Button variant="primary" size="md" onClick={handleGeneratePokemon} disabled={isGeneratingPokemon || isLoading || tokenBalance < GENERATION_COST}>
                        {isGeneratingPokemon ? <span className="flex items-center"><Loader2 className="animate-spin mr-2 h-5 w-5" />Génération...</span> : 'Générer un Pokémon'}
                      </Button>
                      <Button variant="secondary" size="md" onClick={() => setCurrentView('collection')}>Explorer la collection</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-gray-200 dark:border-white/10"><p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">Jetons offerts</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{INITIAL_TOKENS}</p></div>
                      <div className="bg-gray-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-gray-200 dark:border-white/10"><p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">Coût génération</p><p className="text-2xl font-bold text-gray-900 dark:text-white">-{GENERATION_COST}</p></div>
                      <div className="bg-gray-200/50 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-gray-200 dark:border-white/10"><p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">Revente carte</p><p className="text-xl font-bold text-green-500 dark:text-green-400">Selon rareté</p></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-gray-200/50 dark:bg-white/5 rounded-3xl aspect-[3/4] animate-pulse border border-gray-200 dark:border-white/10"></div>) : (
                      <>
                        {pokemons.filter(p => p.status === PokemonStatus.OWNED).slice(0, 4).map((pokemon) => <PokemonCard key={pokemon.id} pokemon={pokemon} context="studio" />)}
                        {Array.from({ length: Math.max(0, 4 - pokemons.filter(p => p.status === PokemonStatus.OWNED).length) }).map((_, i) => <div key={`placeholder-${i}`} className="bg-black/5 dark:bg-black/20 rounded-3xl aspect-[3/4] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/20"><Bot className="h-12 w-12 text-gray-400 dark:text-white/30" /></div>)}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentView === 'collection' && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Ma Collection</h1>
              <div className="flex items-center gap-2 bg-gray-200/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full p-1">
                <Button onClick={() => setCollectionFilter(PokemonStatus.OWNED)} size="sm" variant={collectionFilter === PokemonStatus.OWNED ? 'secondary' : 'ghost'} className="!rounded-full !px-4 !py-1 text-sm flex items-center"><ShieldCheck className="h-4 w-4 mr-2" /> Possédées</Button>
                <Button onClick={() => setCollectionFilter('FAVORITES')} size="sm" variant={collectionFilter === 'FAVORITES' ? 'secondary' : 'ghost'} className="!rounded-full !px-4 !py-1 text-sm flex items-center"><Star className="h-4 w-4 mr-2" /> Favorites</Button>
                <Button onClick={() => setCollectionFilter('ALL')} size="sm" variant={collectionFilter === 'ALL' ? 'secondary' : 'ghost'} className="!rounded-full !px-4 !py-1 text-sm flex items-center"><Layers className="h-4 w-4 mr-2" /> Toutes</Button>
              </div>
            </div>
            {isLoading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse border border-white/10"></div>)}</div>
            : collectionPokemons.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{collectionPokemons.map(pokemon => <PokemonCard key={pokemon.id} pokemon={pokemon} context="collection" />)}</div>
            : <div className="text-center py-20 bg-gray-200/50 dark:bg-black/20 rounded-3xl border-2 border-dashed border-gray-300 dark:border-white/20"><Bot className="h-16 w-16 text-gray-400 dark:text-white/30 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Collection vide</h2><p className="text-gray-500 dark:text-gray-400 mt-2">Générez des Pokémon pour commencer votre collection !</p></div>}
          </section>
        )}
        
        {currentView === 'market' && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Marché des Cartes</h1>
              <div className="flex items-center flex-wrap gap-2 bg-gray-200/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full p-1">
                <Button onClick={() => setMarketRarityFilter('ALL')} size="sm" variant={marketRarityFilter === 'ALL' ? 'secondary' : 'ghost'} className="!rounded-full !px-4 !py-1 text-sm flex items-center"><Sparkles className="h-4 w-4 mr-2" />Toutes</Button>
                {Object.values(PokemonRarity).map(rarity => (<Button key={rarity} onClick={() => setMarketRarityFilter(rarity)} size="sm" variant={marketRarityFilter === rarity ? 'secondary' : 'ghost'} className="!rounded-full !px-4 !py-1 text-sm">{rarity}</Button>))}
              </div>
            </div>
            {isLoading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-white/5 rounded-3xl aspect-[3/4] animate-pulse border border-white/10"></div>)}</div>
            : marketPokemons.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{marketPokemons.map(pokemon => <PokemonCard key={pokemon.id} pokemon={pokemon} context="market" />)}</div>
            : <div className="text-center py-20 bg-gray-200/50 dark:bg-black/20 rounded-3xl border-2 border-dashed border-gray-300 dark:border-white/20"><Store className="h-16 w-16 text-gray-400 dark:text-white/30 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Le marché est vide</h2><p className="text-gray-500 dark:text-gray-400 mt-2">Revendez des Pokémon de votre collection pour les voir apparaître ici.</p></div>}
          </section>
        )}
        
        {currentView === 'achievements' && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">Mes Succès</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map(ach => (
                <div key={ach.id} className={`p-6 rounded-2xl border transition-all duration-300 flex items-start gap-5 ${ach.unlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-200/50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                  <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${ach.unlocked ? 'bg-green-500/20 text-green-400' : 'bg-gray-300/50 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                    {ach.unlocked ? <CheckCircle className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${ach.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{ach.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{ach.description}</p>
                    {ach.unlocked && ach.unlockedAt && <p className="text-xs text-green-500/70 dark:text-green-400/70 mt-2">Débloqué le {new Date(ach.unlockedAt).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {currentView === 'leaderboard' && (
           <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">Classement des Forgerons</h1>
             <div className="bg-white/50 dark:bg-black/20 rounded-2xl border border-gray-200/50 dark:border-white/10 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-200/50 dark:bg-white/5">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-16 text-center">Rang</th>
                      <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Forgeron</th>
                      <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-48 text-center">Pokémon Créés</th>
                      <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-48 text-center">Rareté Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((player, index) => (
                      <tr key={player.name} className={`border-t border-gray-200/50 dark:border-white/10 ${player.name === userLeaderboardStats.name ? 'bg-yellow-400/20' : ''}`}>
                        <td className="p-4 font-bold text-lg text-center">{index + 1}</td>
                        <td className="p-4 font-semibold flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${player.name === userLeaderboardStats.name ? 'bg-yellow-400/30' : 'bg-gray-300/50 dark:bg-white/10'}`}>
                            <User className="h-6 w-6" />
                          </div>
                          {player.name}
                        </td>
                        <td className="p-4 font-mono text-center text-lg">{player.pokemons}</td>
                        <td className="p-4 text-center font-semibold">{player.avgRarityName} <span className="text-sm font-normal text-gray-500">({player.avgRarity.toFixed(2)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>
        )}

      </main>

      <footer className="border-t border-gray-200/50 dark:border-white/10 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="sm:flex sm:items-center sm:justify-between"><div><p className="text-base font-bold text-gray-900 dark:text-white">© 2025 PokéForge</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Atelier de génération Pokémon.</p></div><div className="flex items-center gap-6 mt-4 sm:mt-0 text-sm font-medium"><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Mentions légales</a><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Contact</a></div></div></div>
      </footer>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle} onConfirm={modalOnConfirm} confirmButtonText={modalConfirmButtonText} cancelButtonText="Annuler" confirmButtonVariant={modalConfirmButtonVariant} isLoading={isModalConfirmLoading}>{modalContent}</Modal>
      
      <Modal isOpen={isDailyBonusModalOpen} onClose={() => setIsDailyBonusModalOpen(false)} title="Bonus Quotidien !" onConfirm={handleClaimDailyBonus} confirmButtonText={`Réclamer (+${dailyBonusAmount} jetons)`}>
        <div className="text-center">
          <Gift className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Bienvenue ! Voici votre coffre du jour pour vous récompenser de votre fidélité.</p>
        </div>
      </Modal>
    </div>
  );
};

export default App;