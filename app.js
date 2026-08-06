(() => {
  'use strict';

  const STORAGE_KEY = 'living-pet-v3';
  const LEGACY_KEY = 'romantic-pet-v1';
  const MAX_PHOTOS = 6;
  const LEVELS = [100, 240, 420, 650, 930, 1260, 1640, 2080, 2580];
  const el = id => document.getElementById(id);
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  const now = () => Date.now();

  const PERSONALITIES = {
    curious: {
      name: 'Curioso', emoji: '🔎',
      description: 'Le gusta explorar y aprende un poco más rápido durante los paseos.',
      learning: 1.12, walking: 1.18, bathingStress: 1
    },
    playful: {
      name: 'Juguetón', emoji: '🎾',
      description: 'Siempre encuentra una excusa para jugar y obtiene más ánimo en los minijuegos.',
      learning: 1.06, walking: 1.05, play: 1.25, bathingStress: .8
    },
    foodie: {
      name: 'Comelón', emoji: '🦴',
      description: 'La comida lo hace muy feliz, aunque hay que cuidar que no coma de más.',
      learning: 1, walking: .95, food: 1.28, bathingStress: 1
    },
    calm: {
      name: 'Tranquilo', emoji: '🌿',
      description: 'Descansa bien, se estresa poco y disfruta especialmente que lo cepillen.',
      learning: 1.04, walking: .95, rest: 1.2, bathingStress: .55
    },
    brave: {
      name: 'Aventurero', emoji: '🧭',
      description: 'Los paseos largos le fascinan y rara vez se asusta con algo nuevo.',
      learning: 1.05, walking: 1.3, bathingStress: .85
    }
  };

  const SKILLS = {
    sit: { name: 'Sentado', icon: '🐕', unlock: 1 },
    paw: { name: 'Dar la pata', icon: '🐾', unlock: 2 },
    fetch: { name: 'Buscar pelota', icon: '🎾', unlock: 3 }
  };

  const SHOP = {
    food: { cost: 10, amount: 2, label: 'comida' },
    treat: { cost: 12, amount: 2, label: 'premios' },
    soap: { cost: 8, amount: 1, label: 'jabón' },
    medicine: { cost: 20, amount: 1, label: 'medicina' }
  };

  const WALK_ROUTES = {
    block: { level: 1, energy: 6, water: 5, coins: 6, xp: 10, bond: 2, duration: 6500, name: 'Vuelta a la cuadra', icon: '🏘️' },
    park: { level: 1, energy: 14, water: 10, coins: 12, xp: 20, bond: 4, duration: 10000, name: 'Visita al parque', icon: '🌳' },
    adventure: { level: 3, energy: 24, water: 17, coins: 22, xp: 34, bond: 7, duration: 15000, name: 'Pequeña aventura', icon: '⛰️' }
  };

  const ENERGY_COSTS = {
    training: 9,
    arcadeBall: 16,
    arcadeDodge: 9,
    arcadeMemory: 6,
    walkDodge: 3,
    trainingMemory: 2
  };

  const FULL_SLEEP_DURATION = 2 * 3_600_000;
  const SLEEP_RECOVERY_PER_HOUR = 50;
  const SLEEP_RECOVERY_STATS = ['food', 'water', 'energy', 'hygiene', 'health', 'bond'];

  const ACTIVITY_PRESETS = {
    idle: { icon: '🐾', title: 'Sentadito', description: 'Se sentó cerca de ti para hacerte compañía.', css: 'sitting' },
    drowsy: { icon: '🥱', title: 'Despierto pero soñoliento', description: 'Es de noche: está despierto contigo, aunque conserva poca energía.', css: 'sitting night-awake' },
    sitting: { icon: '🐕', title: 'Sentado junto a ti', description: 'Se acomodó y mueve la cola mientras te observa.', css: 'sitting' },
    stretching: { icon: '🧘', title: 'Estirándose', description: 'Estira las patas delanteras después de descansar.', css: 'stretching' },
    grooming: { icon: '✨', title: 'Arreglándose', description: 'Se rasca una orejita y vuelve a acomodarse.', css: 'grooming' },
    exploring: { icon: '🔎', title: 'Explorando', description: 'Está revisando cada rincón de su hogar.', css: 'walking' },
    watching: { icon: '🪟', title: 'Mirando la ventana', description: 'Observa el mundo y mueve la cola cuando pasa alguien.', css: 'sitting watching' },
    toy: { icon: '🧸', title: 'Jugando solo', description: 'Encontró su juguete y se entretiene por su cuenta.', css: 'playing' },
    guarding: { icon: '👂', title: 'Escuchando ruidos', description: 'Levantó las orejas y cuida la casa como todo un guardián.', css: 'sitting alert' },
    eating: { icon: '🍲', title: 'Comiendo', description: 'Decidió comer lo que dejaste en su cuenco.', css: 'eating' },
    drinking: { icon: '💧', title: 'Bebiendo agua', description: 'Fue a hidratarse por su cuenta.', css: 'drinking' },
    sleeping: { icon: '🌙', title: 'Durmiendo', description: 'Está recuperando todas sus necesidades. En un máximo de 2 horas estará al 100%.', css: 'sleeping' },
    walking: { icon: '🦮', title: 'De paseo', description: 'Está explorando y olfateando todo a su alrededor.', css: 'walking' },
    training: { icon: '🎓', title: 'Entrenando', description: 'Está concentrado en aprender algo nuevo.', css: 'training' },
    playing: { icon: '🎾', title: 'Jugando contigo', description: 'Corre detrás de la pelota con toda su energía.', css: 'playing' },
    bathing: { icon: '🛁', title: 'Hora del baño', description: 'No está muy convencido, pero quedará impecable.', css: 'playing' },
    brushing: { icon: '🪮', title: 'Disfrutando el cepillado', description: 'Se sentó muy quieto mientras lo cepillas.', css: 'sitting' }
  };

  const defaultState = () => ({
    version: 3,
    initialized: false,
    partnerName: '',
    petName: 'Milo',
    signature: 'Creado con amor para ti 💗',
    customNote: '',
    createdAt: now(),
    lastUpdated: now(),
    lastVisitDate: '',
    personality: 'curious',
    stats: { food: 78, water: 84, energy: 76, hygiene: 88, health: 100, bond: 18 },
    mood: 78,
    stress: 10,
    xp: 0,
    level: 1,
    coins: 25,
    traits: { trust: 10, discipline: 5 },
    inventory: { food: 3, treat: 2, soap: 2, medicine: 1 },
    bowls: { food: 0, water: 2 },
    skills: { sit: 0, paw: 0, fetch: 0 },
    arcade: { ballBest: 0, dodgeBest: 0, memoryBest: 0, played: 0 },
    habits: { care: 0, walk: 0, train: 0, play: 0, sleep: 0 },
    activity: { type: 'exploring', startedAt: now(), endsAt: now() + 18000 },
    isAsleep: false,
    sleepMode: '',
    sleepProgress: 0,
    sleepStartedAt: 0,
    sleepUntil: 0,
    manualAwakeUntil: 0,
    journal: [],
    photos: [],
    day: { key: '', actions: 0, bonusClaimed: false }
  });

  let state = loadState();
  let speechTimer = null;
  let toastTimer = null;
  let activityTimerInterval = null;
  let gameInterval = null;
  let gameActive = false;
  let gameScore = 0;
  let gameSeconds = 25;
  let gameTurn = 0;
  let gameStrikeActive = false;
  let gameStrikeFrame = null;
  let gameStrikeLastFrame = 0;
  let gameCursorPosition = 0;
  let gameCursorDirection = 1;
  let gameFocusBonus = 0;
  let gameSpeedMultiplier = 1;
  const gameUsedActions = new Set();
  let dodgeActive = false;
  let dodgeFrame = null;
  let dodgeStartedAt = 0;
  let dodgeLastFrame = 0;
  let dodgeLastSpawn = 0;
  let dodgeLives = 3;
  let dodgeScore = 0;
  let dodgePlayerPosition = { x: .5, y: .5 };
  let dodgeHazards = [];
  let dodgeInvulnerableUntil = 0;
  let dodgeContext = { source: 'arcade', bonus: 0 };
  let dodgeAct = 'play';
  let dodgeSpeedMultiplier = 1;
  let dodgeInvulnerabilityDuration = 850;
  let dodgeCurrentWave = 0;
  const dodgeDirections = new Set();
  let memoryActive = false;
  let memoryAccepting = false;
  let memorySequence = [];
  let memoryPlayerIndex = 0;
  let memoryRound = 1;
  let memoryLives = 3;
  let memoryScore = 0;
  let memoryContext = { source: 'arcade', bonus: 0 };
  let memoryTimers = [];
  let previousFocus = null;
  let petReaction = '';
  let petReactionTimer = null;
  let lastAffectionRewardAt = 0;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return Math.abs(hash);
  }

  function pick(list, seed = Math.random()) {
    return list[Math.floor(seed * list.length) % list.length];
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return normalizeState(saved);

      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (legacy) {
        const migrated = defaultState();
        migrated.initialized = !!legacy.initialized;
        migrated.partnerName = legacy.partnerName || '';
        migrated.petName = legacy.petName || 'Milo';
        migrated.signature = legacy.signature || migrated.signature;
        migrated.customNote = legacy.customNote || '';
        migrated.createdAt = legacy.createdAt || migrated.createdAt;
        migrated.lastUpdated = legacy.lastUpdated || migrated.lastUpdated;
        migrated.lastVisitDate = legacy.lastVisitDate || '';
        migrated.xp = Number(legacy.xp) || 0;
        migrated.level = Number(legacy.level) || 1;
        migrated.photos = Array.isArray(legacy.photos) ? legacy.photos.slice(0, MAX_PHOTOS) : [];
        migrated.stats.food = legacy.stats?.food ?? migrated.stats.food;
        migrated.stats.energy = legacy.stats?.energy ?? migrated.stats.energy;
        migrated.stats.hygiene = legacy.stats?.clean ?? migrated.stats.hygiene;
        migrated.stats.bond = clamp(18 + (legacy.interactions || 0) * .45);
        migrated.personality = assignPersonality(`${migrated.partnerName}-${migrated.petName}`);
        migrated.journal = [{ icon: '🏡', title: 'Una nueva etapa', text: 'Conservamos tus nombres, nivel y recuerdos de la versión anterior.', at: now() }];
        return normalizeState(migrated);
      }
    } catch (_) {}
    return defaultState();
  }

  function normalizeState(saved) {
    const base = defaultState();
    const normalized = {
      ...base,
      ...saved,
      stats: { ...base.stats, ...(saved.stats || {}) },
      traits: { ...base.traits, ...(saved.traits || {}) },
      inventory: { ...base.inventory, ...(saved.inventory || {}) },
      bowls: { ...base.bowls, ...(saved.bowls || {}) },
      skills: { ...base.skills, ...(saved.skills || {}) },
      arcade: { ...base.arcade, ...(saved.arcade || {}) },
      habits: { ...base.habits, ...(saved.habits || {}) },
      activity: { ...base.activity, ...(saved.activity || {}) },
      day: { ...base.day, ...(saved.day || {}) }
    };
    normalized.photos = Array.isArray(saved.photos) ? saved.photos.slice(0, MAX_PHOTOS) : [];
    normalized.journal = Array.isArray(saved.journal) ? saved.journal.slice(0, 30) : [];
    if (!PERSONALITIES[normalized.personality]) normalized.personality = 'curious';
    Object.keys(normalized.stats).forEach(key => normalized.stats[key] = clamp(normalized.stats[key]));
    normalized.sleepProgress = clamp(normalized.sleepProgress);
    if (normalized.isAsleep) {
      const startedAt = Number(normalized.sleepStartedAt) || now();
      const savedAt = Math.max(startedAt, Number(normalized.lastUpdated) || startedAt);
      if (saved.sleepProgress == null) {
        const elapsedAtSave = Math.max(0, Math.min(savedAt, Number(normalized.sleepUntil) || savedAt) - startedAt);
        normalized.sleepProgress = clamp(elapsedAtSave / FULL_SLEEP_DURATION * 100);
      }
      normalized.sleepStartedAt = startedAt;
      if (normalized.sleepMode !== 'nap') {
        const remainingSleep = FULL_SLEEP_DURATION * (1 - normalized.sleepProgress / 100);
        const fullSleepUntil = savedAt + remainingSleep;
        normalized.sleepUntil = Math.min(Number(normalized.sleepUntil) || fullSleepUntil, fullSleepUntil);
      }
    }
    return normalized;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      if (String(error).toLowerCase().includes('quota')) toast('No queda espacio para guardar más fotos en este dispositivo.');
      else toast('No pude guardar el progreso en este dispositivo.');
      return false;
    }
  }

  function assignPersonality(seed) {
    const keys = Object.keys(PERSONALITIES);
    return keys[hashCode(seed || String(now())) % keys.length];
  }

  function touch() {
    state.lastUpdated = now();
  }

  function modifyStats(changes) {
    Object.entries(changes).forEach(([key, amount]) => {
      if (key === 'mood') state.mood = clamp(state.mood + amount);
      else if (key === 'stress') state.stress = clamp(state.stress + amount);
      else if (key in state.stats) state.stats[key] = clamp(state.stats[key] + amount);
    });
  }

  function applyAwakeDecay(hours) {
    if (hours <= 0) return;
    state.stats.food = clamp(state.stats.food - hours * 3.1);
    state.stats.water = clamp(state.stats.water - hours * 3.7);
    state.stats.energy = clamp(state.stats.energy - hours * 2.15);
    state.stats.hygiene = clamp(state.stats.hygiene - hours * 1.25);
    state.mood = clamp(state.mood - hours * (state.stats.bond < 25 ? 1.35 : .72));

    const danger = [state.stats.food, state.stats.water, state.stats.energy, state.stats.hygiene].filter(value => value < 25).length;
    if (danger) {
      state.stats.health = clamp(state.stats.health - hours * danger * 1.45);
      state.stress = clamp(state.stress + hours * danger * 2.1);
    } else if (state.stats.health < 100 && state.stats.food > 65 && state.stats.water > 65) {
      state.stats.health = clamp(state.stats.health + hours * .75);
    }
    if (hours > 10) state.stats.bond = clamp(state.stats.bond - Math.min(4, (hours - 10) * .12));
  }

  function applySleepRecovery(hours) {
    if (hours <= 0) return;
    const recovery = hours * SLEEP_RECOVERY_PER_HOUR;
    SLEEP_RECOVERY_STATS.forEach(key => state.stats[key] = clamp(state.stats[key] + recovery));
    state.mood = clamp(state.mood + recovery);
    state.stress = clamp(state.stress - recovery);
  }

  function currentSleepProgress(current = now()) {
    const savedProgress = clamp(state.sleepProgress);
    if (!state.isAsleep) return savedProgress;
    const previous = Number(state.lastUpdated) || current;
    const endOfSleep = Math.min(current, Number(state.sleepUntil) || current);
    const elapsed = Math.max(0, endOfSleep - previous);
    return clamp(savedProgress + elapsed / FULL_SLEEP_DURATION * 100);
  }

  function sleepDurationFromProgress(progress = state.sleepProgress) {
    return Math.max(0, FULL_SLEEP_DURATION * (1 - clamp(progress) / 100));
  }

  function advanceSimulation(current = now()) {
    if (!state.initialized) return 0;
    const previous = Number(state.lastUpdated) || current;
    const elapsedHours = Math.min(72, Math.max(0, (current - previous) / 3_600_000));
    if (elapsedHours < .0002) {
      if (state.isAsleep && current >= Number(state.sleepUntil)) {
        if (state.sleepMode !== 'nap') state.sleepProgress = 100;
        wakePet(false);
      }
      return elapsedHours;
    }

    if (state.isAsleep) {
      const endOfSleep = Math.min(current, Number(state.sleepUntil) || current);
      const sleepHours = Math.max(0, (endOfSleep - previous) / 3_600_000);
      applySleepRecovery(Math.min(elapsedHours, sleepHours));
      state.sleepProgress = clamp(state.sleepProgress + sleepHours * 3_600_000 / FULL_SLEEP_DURATION * 100);
      const awakeHours = Math.max(0, elapsedHours - sleepHours);
      if (current >= state.sleepUntil && state.sleepMode !== 'nap') state.sleepProgress = 100;
      if (state.sleepProgress >= 99.999 || current >= state.sleepUntil) wakePet(false);
      applyAwakeDecay(awakeHours);
    } else {
      applyAwakeDecay(elapsedHours);
    }
    state.lastUpdated = current;
    return elapsedHours;
  }

  function runOfflineAutonomy(elapsedHours) {
    if (!state.initialized || state.isAsleep || elapsedHours < .25) return;
    let acted = false;
    if (state.stats.food < 38 && state.bowls.food > 0) {
      consumeBowlFood(false);
      acted = true;
    }
    if (state.stats.water < 42 && state.bowls.water > 0) {
      consumeBowlWater(false);
      acted = true;
    }
    if (state.stats.energy < 18 && elapsedHours > 1) {
      state.stats.energy = clamp(state.stats.energy + Math.min(28, elapsedHours * 4));
      state.mood = clamp(state.mood + 2);
      addJournal('😴', 'Tomó una siesta', `${state.petName} se acomodó en su cama mientras no estabas.`);
      acted = true;
    }
    if (elapsedHours >= 4) {
      const summaries = [
        'Pasó un rato mirando por la ventana y luego jugó con su juguete.',
        'Exploró la casa, descansó un poco y estuvo atento a la puerta.',
        'Se entretuvo solo, aunque se alegrará mucho de verte regresar.'
      ];
      addJournal('🏡', 'Mientras no estabas', pick(summaries, (hashCode(localDateKey() + Math.floor(elapsedHours)) % 100) / 100));
      acted = true;
    }
    if (acted) touch();
  }

  function addJournal(icon, title, text, timestamp = now()) {
    const latest = state.journal[0];
    if (latest && latest.title === title && timestamp - latest.at < 60_000) return;
    state.journal.unshift({ icon, title, text, at: timestamp });
    state.journal = state.journal.slice(0, 30);
  }

  function gainXp(amount) {
    const oldLevel = state.level;
    state.xp += Math.max(0, Math.round(amount));
    while (state.level <= LEVELS.length && state.xp >= LEVELS[state.level - 1]) state.level += 1;
    if (state.level > oldLevel) {
      const bonus = 8 + state.level * 2;
      state.coins += bonus;
      addJournal('⭐', `¡Nivel ${state.level}!`, `${state.petName} creció gracias a tus cuidados y recibió ${bonus} monedas.`);
      createSparkles('⭐');
      speak(`¡Ya soy nivel ${state.level}!`);
    }
  }

  function recordHabit(type) {
    if (type in state.habits) state.habits[type] += 1;
    state.day.actions += 1;
  }

  function ensureDailyVisit() {
    const today = localDateKey();
    if (state.day.key !== today) {
      const previous = state.day.key;
      state.day = { key: today, actions: 0, bonusClaimed: true };
      state.coins += 5;
      if (previous) addJournal('☀️', 'Un nuevo día', `${state.petName} te recibió con 5 monedas para empezar el día.`);
      state.lastVisitDate = today;
    }
  }

  function setActivity(type, duration = 0, custom = {}) {
    const preset = ACTIVITY_PRESETS[type] || ACTIVITY_PRESETS.idle;
    state.activity = {
      type,
      startedAt: now(),
      endsAt: duration ? now() + duration : 0,
      icon: custom.icon || preset.icon,
      title: custom.title || preset.title,
      description: custom.description || preset.description,
      css: custom.css || preset.css || ''
    };
  }

  function activityPreset() {
    return { ...(ACTIVITY_PRESETS[state.activity.type] || ACTIVITY_PRESETS.idle), ...state.activity };
  }

  function isBusy() {
    return gameActive || dodgeActive || memoryActive || state.isAsleep || (state.activity.endsAt > now() && !['idle', 'drowsy', 'sitting', 'stretching', 'grooming', 'exploring', 'watching', 'toy', 'guarding'].includes(state.activity.type));
  }

  function resolveActivity() {
    if (state.isAsleep) return;
    if (state.activity.endsAt && state.activity.endsAt <= now()) chooseIdleActivity();
  }

  function chooseIdleActivity() {
    const hour = new Date().getHours();
    const nightAwake = (hour >= 22 || hour < 6) && now() < Number(state.manualAwakeUntil || 0);
    if (nightAwake) {
      setActivity('drowsy', 14000 + Math.floor(Math.random() * 10000));
      return;
    }
    const options = ['idle', 'sitting', 'stretching', 'grooming', 'exploring', 'watching', 'guarding', 'toy'];
    if (state.stats.energy < 35) options.push('idle', 'sitting', 'sitting');
    if (state.personality === 'playful') options.push('toy', 'toy');
    if (state.personality === 'calm') options.push('sitting', 'stretching');
    if (hour >= 21 || hour < 7) options.push('idle', 'sitting', 'watching');
    const type = pick(options);
    setActivity(type, 15000 + Math.floor(Math.random() * 22000));
  }

  function consumeBowlFood(animate = true) {
    if (state.bowls.food <= 0) return false;
    state.bowls.food -= 1;
    const multiplier = PERSONALITIES[state.personality].food || 1;
    modifyStats({ food: 38, mood: 4 * multiplier, stress: -3, health: state.stats.health < 70 ? 2 : 0 });
    setActivity('eating', animate ? 4200 : 0);
    addJournal('🍲', 'Comió por su cuenta', `${state.petName} tuvo hambre y fue directo a su cuenco.`);
    if (animate) speak('¡Qué bueno que me dejaste comida!');
    return true;
  }

  function consumeBowlWater(animate = true) {
    if (state.bowls.water <= 0) return false;
    state.bowls.water -= 1;
    modifyStats({ water: 44, mood: 1, stress: -2 });
    setActivity('drinking', animate ? 3200 : 0);
    addJournal('💧', 'Fue a beber agua', `${state.petName} se hidrató sin tener que pedir ayuda.`);
    if (animate) speak('Glup, glup… ¡gracias!');
    return true;
  }

  function autonomousTick() {
    if (!state.initialized) return;
    advanceSimulation();
    resolveActivity();

    if (state.isAsleep) {
      render();
      saveState();
      return;
    }

    const hour = new Date().getHours();
    const isBedtime = hour >= 22 || hour < 6;
    if (state.stats.food < 34 && state.bowls.food > 0 && !isBusy()) consumeBowlFood(true);
    else if (state.stats.water < 39 && state.bowls.water > 0 && !isBusy()) consumeBowlWater(true);
    else if (isBedtime && state.stats.energy < 62 && now() >= Number(state.manualAwakeUntil || 0) && !isBusy()) {
      beginSleep('night', FULL_SLEEP_DURATION, true);
    }
    else if (state.stats.energy < 16 && now() >= Number(state.manualAwakeUntil || 0) && !isBusy()) {
      beginSleep('nap', 3 * 60_000, true);
    } else if (!isBusy() && Math.random() < .45) {
      chooseIdleActivity();
    }

    touch();
    saveState();
    render();
  }

  function beginSleep(mode = 'night', duration = FULL_SLEEP_DURATION, automatic = false) {
    if (state.isAsleep) return;
    if (!automatic) state.manualAwakeUntil = 0;
    if (state.sleepProgress >= 99.999) state.sleepProgress = 0;
    const resumedProgress = Math.floor(state.sleepProgress);
    duration = Math.max(1000, Math.min(duration, sleepDurationFromProgress()));
    state.isAsleep = true;
    state.sleepMode = mode;
    state.sleepStartedAt = now();
    state.sleepUntil = now() + duration;
    setActivity('sleeping');
    recordHabit('sleep');
    addJournal('🌙', mode === 'nap' ? 'Tomó una siesta' : resumedProgress ? 'Retomó su descanso' : 'Hora de dormir', automatic ? `${state.petName} estaba agotado y decidió acostarse por su cuenta.` : resumedProgress ? `Continuará desde el ${resumedProgress}% hasta completar su descanso.` : `Lo arropaste para que en dos horas recupere todas sus necesidades.`);
    if (!automatic) speak(resumedProgress ? `Seguiré desde el ${resumedProgress}%… zzz.` : 'Dormiré hasta sentirme al cien… zzz.');
    touch();
    saveState();
    render();
  }

  function wakePet(byUser = true) {
    if (!state.isAsleep) return;
    if (byUser) {
      advanceSimulation();
      if (!state.isAsleep) return;
    }
    const sleptMinutes = Math.max(0, Math.round((now() - state.sleepStartedAt) / 60000));
    const early = state.sleepUntil > now() + 60000;
    const completedFullSleep = !byUser && state.sleepProgress >= 99.999;
    if (completedFullSleep) {
      SLEEP_RECOVERY_STATS.forEach(key => state.stats[key] = 100);
      state.mood = 100;
      state.stress = 0;
      state.sleepProgress = 100;
    }
    const savedProgress = Math.min(100, Math.floor(state.sleepProgress));
    state.isAsleep = false;
    state.sleepMode = '';
    state.sleepStartedAt = 0;
    state.sleepUntil = 0;
    const wakeHour = new Date().getHours();
    const wokeAtNight = byUser && (wakeHour >= 22 || wakeHour < 6);
    if (byUser) state.manualAwakeUntil = now() + 30 * 60_000;
    if (wokeAtNight) state.stats.energy = Math.min(32, Math.max(20, state.stats.energy));
    if (byUser && early) modifyStats({ mood: -3, stress: 2 });
    if (wokeAtNight) setActivity('drowsy', 14000);
    else setActivity('idle', 9000, { title: 'Recién despierto', description: 'Está estirando las patas y mirando a su alrededor.', icon: '🥱' });
    if (byUser) {
      addJournal('🥱', wokeAtNight ? 'Se despertó de noche' : 'Se despertó', wokeAtNight ? `Se levantó para acompañarte. Su descanso quedó guardado en ${savedProgress}%.` : `Descansó ${sleptMinutes || 'unos'} minutos. Su avance quedó guardado en ${savedProgress}%.`);
      speak(savedProgress < 100 ? `Voy en ${savedProgress}%. Luego seguiré desde aquí.` : '¡Qué bien dormí!');
    } else {
      addJournal('☀️', 'Despertó descansado', `${state.petName} terminó su descanso y volvió a recorrer la casa.`);
    }
    touch();
  }

  function handleSleepButton() {
    if (state.isAsleep) {
      wakePet(true);
      saveState();
      render();
      return;
    }
    if (isBusy()) return toast(`${state.petName} está ocupado en este momento.`);
    beginSleep('night');
  }

  function handleCare(action) {
    if (isBusy()) return toast(`${state.petName} está ocupado. Espera un momento.`);
    let close = true;
    switch (action) {
      case 'serveFood':
        if (state.inventory.food <= 0) return toast('No queda comida. Puedes comprar más en la tienda.');
        if (state.bowls.food >= 3) return toast('El cuenco ya está lleno.');
        state.inventory.food -= 1;
        state.bowls.food += 1;
        recordHabit('care');
        gainXp(3);
        addJournal('🥫', 'Dejaste comida', `Serviste una porción para que ${state.petName} pueda comer cuando tenga hambre.`);
        if (state.stats.food < 50) consumeBowlFood(true);
        else speak('La guardaré para cuando tenga hambre.');
        break;
      case 'giveTreat':
        if (state.inventory.treat <= 0) return toast('No quedan premios.');
        if (state.stats.food > 95) return speak('Gracias, pero estoy demasiado lleno.'), toast('No quiso comer de más.');
        state.inventory.treat -= 1;
        modifyStats({ food: 9, mood: 8 * (PERSONALITIES[state.personality].food || 1), bond: 2, stress: -2 });
        setActivity('eating', 2800, { title: 'Comiendo un premio', description: 'Saborea su premio y mueve la cola muy rápido.', icon: '🦴' });
        recordHabit('care');
        gainXp(6);
        speak('¡Un premio! ¡Un premio!');
        createSparkles('💗');
        break;
      case 'fillWater':
        state.bowls.water = 3;
        recordHabit('care');
        gainXp(2);
        addJournal('💧', 'Agua fresca', 'Llenaste el cuenco para que pueda beber cuando lo necesite.');
        if (state.stats.water < 52) consumeBowlWater(true);
        else speak('¡Ya tengo agua fresca!');
        break;
      case 'brush':
        modifyStats({ hygiene: 13, mood: state.personality === 'calm' ? 9 : 5, bond: 2, stress: -5 });
        setActivity('brushing', 3500);
        state.traits.trust = clamp(state.traits.trust + 1.2);
        recordHabit('care');
        gainXp(7);
        speak('Mmm… eso se siente muy bonito.');
        break;
      case 'bath':
        if (state.inventory.soap <= 0) return toast('No queda jabón.');
        if (state.stats.hygiene > 94) return speak('¡Pero si ya estoy limpio!'), toast('No necesita otro baño todavía.');
        state.inventory.soap -= 1;
        modifyStats({ hygiene: 42, health: 3, mood: 2, stress: 5 * PERSONALITIES[state.personality].bathingStress, bond: 2 });
        setActivity('bathing', 4800);
        recordHabit('care');
        gainXp(11);
        addJournal('🛁', 'Baño completo', `${state.petName} quedó limpio y esponjoso.`);
        speak('¡Cuidado con mis orejas!');
        createSparkles('🫧');
        break;
      case 'medicine':
        if (state.stats.health >= 90) return toast('Está saludable; no necesita medicina.');
        if (state.inventory.medicine <= 0) return toast('No queda medicina.');
        state.inventory.medicine -= 1;
        modifyStats({ health: 30, stress: 5, mood: -2 });
        setActivity('idle', 3200, { title: 'Recuperándose', description: 'La medicina está haciendo efecto. Necesita un momento tranquilo.', icon: '🩹' });
        recordHabit('care');
        gainXp(10);
        addJournal('🩹', 'Recibió medicina', `Lo cuidaste a tiempo y ya empezó a sentirse mejor.`);
        speak('Sabe raro… pero ya me siento mejor.');
        break;
      default:
        close = false;
    }
    touch();
    saveState();
    render();
    if (close) closeModal('careModal');
  }

  function handleWalk(routeKey) {
    const route = WALK_ROUTES[routeKey];
    if (!route) return;
    if (isBusy()) return toast(`${state.petName} está ocupado.`);
    if (state.level < route.level) return toast(`Esta ruta se desbloquea en el nivel ${route.level}.`);
    if (state.stats.health < 35) return toast('Necesita recuperar salud antes de salir.');
    if (state.stats.energy < route.energy + 12) return toast('Está demasiado cansado para ese paseo.');
    if (state.stats.water < route.water + 8) return toast('Primero debería beber un poco de agua.');

    const personality = PERSONALITIES[state.personality];
    const rewardMultiplier = personality.walking || 1;
    const weather = currentWeather();
    const events = {
      block: [
        { text: 'saludó a otro perrito del vecindario', mood: 5, coins: 1, hygiene: 0 },
        { text: 'encontró una moneda junto a una banca', mood: 3, coins: 4, hygiene: 0 },
        { text: 'se detuvo a oler todas las flores', mood: 4, coins: 0, hygiene: 0 }
      ],
      park: [
        { text: 'hizo un nuevo amigo en el parque', mood: 9, coins: 2, hygiene: -2 },
        { text: 'saltó directo a un charco de lodo', mood: 12, coins: 0, hygiene: -16 },
        { text: 'encontró un palo perfecto para practicar', mood: 7, coins: 3, hygiene: -4, fetch: 5 }
      ],
      adventure: [
        { text: 'descubrió un sendero lleno de mariposas', mood: 14, coins: 5, hygiene: -6 },
        { text: 'llegó hasta un mirador y no quería regresar', mood: 16, coins: 3, hygiene: -8 },
        { text: 'encontró un pequeño tesoro entre las hojas', mood: 11, coins: 10, hygiene: -5 }
      ]
    };
    const event = pick(events[routeKey]);
    const rainPenalty = weather.key === 'rain' ? 6 : 0;

    modifyStats({
      energy: -route.energy,
      water: -route.water,
      food: -Math.round(route.energy * .32),
      hygiene: (event.hygiene || 0) - rainPenalty,
      mood: event.mood,
      bond: route.bond,
      stress: -Math.max(3, route.bond)
    });
    state.coins += Math.round(route.coins * rewardMultiplier) + (event.coins || 0);
    if (event.fetch) state.skills.fetch = clamp(state.skills.fetch + event.fetch);
    state.traits.trust = clamp(state.traits.trust + route.bond * .7);
    gainXp(Math.round(route.xp * rewardMultiplier));
    recordHabit('walk');
    setActivity('walking', route.duration, { icon: route.icon, title: route.name, description: `${state.petName} ${event.text}.` });
    addJournal(route.icon, route.name, `${state.petName} ${event.text}. El clima estaba ${weather.label.toLowerCase()}.`);
    speak(routeKey === 'adventure' ? '¡Vamos a descubrir algo nuevo!' : '¡Paseo, paseo, paseo!');
    touch();
    saveState();
    render();
    closeModal('walkModal');
    const foundEncounter = routeKey === 'adventure' || (routeKey === 'park' && Math.random() < .55);
    if (foundEncounter) {
      scheduleEncounter(() => openDodgeEncounter({
        source: 'walk',
        bonus: routeKey === 'adventure' ? 10 : 5,
        title: routeKey === 'adventure' ? '¡Cruza el sendero!' : '¡Esquiva los charcos!',
        description: routeKey === 'adventure'
          ? 'Guía la huella de Milo por el sendero sin tocar ramas ni piedras.'
          : 'El parque se llenó de charcos. Muévete con las flechas, WASD o los controles táctiles.'
      }));
    }
  }

  function handleTraining(skillKey) {
    const skill = SKILLS[skillKey];
    if (!skill) return;
    if (isBusy()) return toast(`${state.petName} está ocupado.`);
    if (state.level < skill.unlock) return toast(`Se desbloquea en el nivel ${skill.unlock}.`);
    if (state.stats.energy < 22) return toast('Está demasiado cansado para concentrarse.');
    if (state.stats.water < 18 || state.stats.food < 18) return toast('Primero necesita comer o beber.');

    const hasTreat = state.inventory.treat > 0;
    if (hasTreat) state.inventory.treat -= 1;
    const personality = PERSONALITIES[state.personality];
    const focus = (state.mood + state.traits.discipline + state.traits.trust) / 3;
    const gain = Math.round((7 + focus / 18 + (hasTreat ? 5 : 0)) * personality.learning);
    const beforeLevel = skillLevel(state.skills[skillKey]);
    state.skills[skillKey] = clamp(state.skills[skillKey] + gain);
    const afterLevel = skillLevel(state.skills[skillKey]);
    modifyStats({ energy: -ENERGY_COSTS.training, food: -3, water: -4, mood: hasTreat ? 5 : 2, bond: 3, stress: focus < 30 ? 3 : -1 });
    state.traits.discipline = clamp(state.traits.discipline + 1.8);
    state.traits.trust = clamp(state.traits.trust + 1.1);
    state.coins += 3;
    gainXp(11 + afterLevel * 2);
    recordHabit('train');
    const trickPose = skillKey === 'sit' ? 'sitting' : skillKey === 'paw' ? 'sitting pawing' : 'playing';
    setActivity('training', 4500, { title: `Practicando: ${skill.name}`, description: hasTreat ? 'El premio ayudó a mantener toda su atención.' : 'Está intentando comprender la señal.', css: trickPose });
    if (afterLevel > beforeLevel) {
      addJournal(skill.icon, `Mejoró: ${skill.name}`, `${state.petName} alcanzó el nivel ${afterLevel} de este truco.`);
      speak('¡Creo que ya entendí! ¿Viste?');
      createSparkles('⭐');
    } else {
      addJournal(skill.icon, `Practicó ${skill.name}`, `Avanzó ${gain}%${hasTreat ? ' con ayuda de un premio' : ''}.`);
      speak(hasTreat ? '¡Lo haré por ese premio!' : 'Estoy intentando concentrarme…');
    }
    touch();
    saveState();
    render();
    closeModal('trainingModal');
    const concentrationTest = afterLevel > beforeLevel || Math.random() < .38;
    if (concentrationTest) {
      scheduleEncounter(() => openMemoryEncounter({
        source: 'training',
        bonus: afterLevel > beforeLevel ? 8 : 4,
        title: 'Prueba lo aprendido',
        description: `Repite las señales para ayudar a ${state.petName} a fijar el truco en su memoria.`
      }));
    }
  }

  function handleBuy(itemKey) {
    const item = SHOP[itemKey];
    if (!item) return;
    if (state.coins < item.cost) return toast('No tienes suficientes monedas.');
    state.coins -= item.cost;
    state.inventory[itemKey] += item.amount;
    addJournal('🛍️', 'Compraste provisiones', `Agregaste ${item.amount} de ${item.label} al inventario.`);
    touch();
    saveState();
    render();
    toast(`Compraste ${item.label}.`);
  }

  function skillLevel(progress) {
    return Math.min(5, Math.floor(clamp(progress) / 20));
  }

  function energyLabel(amount) {
    return `Energía −${amount}`;
  }

  function arcadeEnergyCost(type) {
    if (type === 'ball') return ENERGY_COSTS.arcadeBall;
    if (type === 'dodge') return ENERGY_COSTS.arcadeDodge;
    if (type === 'memory') return ENERGY_COSTS.arcadeMemory;
    return 0;
  }

  function dodgeEnergyCost() {
    return dodgeContext.source === 'walk' ? ENERGY_COSTS.walkDodge : ENERGY_COSTS.arcadeDodge;
  }

  function memoryEnergyCost() {
    return memoryContext.source === 'training' ? ENERGY_COSTS.trainingMemory : ENERGY_COSTS.arcadeMemory;
  }

  function setBallActionsDisabled(disabled) {
    document.querySelectorAll('[data-ball-action]').forEach(button => {
      button.disabled = disabled || gameUsedActions.has(button.dataset.ballAction);
    });
  }

  function prepareBallEncounter() {
    gameStrikeActive = false;
    cancelAnimationFrame(gameStrikeFrame);
    gameStrikeFrame = null;
    gameUsedActions.clear();
    el('gameScore').textContent = '0';
    el('gameTurn').textContent = '0 / 5';
    el('gameTime').textContent = '25';
    el('gameDialogue').textContent = 'La pelota saltarina está lista para jugar.';
    el('gameMessage').hidden = false;
    el('gameMessage').textContent = `${state.petName} espera tu señal para comenzar.`;
    el('strikeTrack').hidden = true;
    el('ballTarget').style.display = 'none';
    el('startGameBtn').disabled = false;
    el('startGameBtn').textContent = `Empezar juego · ${energyLabel(ENERGY_COSTS.arcadeBall)}`;
    setBallActionsDisabled(true);
  }

  function startGame() {
    if (gameActive) return;
    if (state.isAsleep || isBusy()) return toast(`${state.petName} no puede jugar ahora.`);
    if (state.stats.energy < ENERGY_COSTS.arcadeBall) return toast(`Necesita ${ENERGY_COSTS.arcadeBall}% de energía para jugar.`);
    gameActive = true;
    gameScore = 0;
    gameSeconds = 25;
    gameTurn = 0;
    gameFocusBonus = 0;
    gameSpeedMultiplier = 1;
    gameUsedActions.clear();
    el('gameScore').textContent = '0';
    el('gameTurn').textContent = '0 / 5';
    el('gameTime').textContent = '25';
    el('gameDialogue').textContent = 'La pelota rebota de un lado a otro. Elige una ayuda.';
    el('gameMessage').hidden = false;
    el('gameMessage').textContent = 'Elige Lanzar cuando estés listo.';
    el('startGameBtn').disabled = true;
    el('startGameBtn').textContent = 'Juego en curso';
    setBallActionsDisabled(false);
    gameInterval = setInterval(() => {
      gameSeconds -= 1;
      el('gameTime').textContent = String(Math.max(0, gameSeconds));
      if (gameSeconds <= 0) finishGame(false);
    }, 1000);
  }

  function handleBallAction(action) {
    if (!gameActive || gameStrikeActive) return;
    if (action === 'throw') {
      startBallStrike();
      return;
    }
    if (gameUsedActions.has(action)) return;

    if (action === 'encourage') {
      gameFocusBonus += 5;
      el('gameDialogue').textContent = `Animaste a ${state.petName}. Su próxima jugada tendrá más fuerza.`;
      createSparkles('💬');
    } else if (action === 'treat') {
      if (state.inventory.treat <= 0) return toast('No tienes premios en el inventario.');
      state.inventory.treat -= 1;
      gameFocusBonus += 10;
      el('gameDialogue').textContent = `${state.petName} recibió un premio. ¡Está totalmente concentrado!`;
      touch();
      saveState();
      renderHome();
    } else if (action === 'calm') {
      gameSpeedMultiplier = .7;
      el('gameDialogue').textContent = 'Respiraron juntos. La marca irá más despacio en el próximo tiro.';
    }
    gameUsedActions.add(action);
    haptic(12);
    setBallActionsDisabled(false);
  }

  function startBallStrike() {
    if (!gameActive || gameStrikeActive) return;
    gameStrikeActive = true;
    gameCursorPosition = 0;
    gameCursorDirection = 1;
    gameStrikeLastFrame = performance.now();
    el('strikeCursor').style.left = '0%';
    el('strikeTrack').hidden = false;
    el('ballTarget').style.display = 'block';
    el('gameMessage').hidden = true;
    el('gameDialogue').textContent = 'Toca ¡Atrapa! cuando la huella esté dentro de la zona verde.';
    setBallActionsDisabled(true);
    gameStrikeFrame = requestAnimationFrame(updateBallStrike);
  }

  function updateBallStrike(timestamp) {
    if (!gameActive || !gameStrikeActive) return;
    const delta = Math.min(.04, Math.max(.001, (timestamp - gameStrikeLastFrame) / 1000));
    gameStrikeLastFrame = timestamp;
    gameCursorPosition += gameCursorDirection * 88 * gameSpeedMultiplier * delta;
    if (gameCursorPosition >= 100) {
      gameCursorPosition = 100;
      gameCursorDirection = -1;
    } else if (gameCursorPosition <= 0) {
      gameCursorPosition = 0;
      gameCursorDirection = 1;
    }
    el('strikeCursor').style.left = `${gameCursorPosition}%`;
    gameStrikeFrame = requestAnimationFrame(updateBallStrike);
  }

  function resolveBallStrike() {
    if (!gameActive || !gameStrikeActive) return;
    gameStrikeActive = false;
    cancelAnimationFrame(gameStrikeFrame);
    gameStrikeFrame = null;
    const accuracy = Math.max(0, Math.round(100 - Math.abs(gameCursorPosition - 50) * 2));
    const basePoints = accuracy >= 92 ? 18 : accuracy >= 75 ? 12 : accuracy >= 50 ? 7 : 3;
    const earned = basePoints + gameFocusBonus;
    gameScore += earned;
    gameTurn += 1;
    gameFocusBonus = 0;
    gameSpeedMultiplier = 1;
    el('gameScore').textContent = String(gameScore);
    el('gameTurn').textContent = `${gameTurn} / 5`;
    el('strikeTrack').hidden = true;
    el('ballTarget').style.display = 'none';
    el('gameMessage').hidden = false;
    const verdict = accuracy >= 92 ? '¡Centro perfecto!' : accuracy >= 75 ? '¡Gran lanzamiento!' : accuracy >= 50 ? 'Buen intento.' : 'La pelota escapó por poco.';
    el('gameMessage').textContent = `${verdict} Precisión ${accuracy}% · +${earned} puntos`;
    el('gameDialogue').textContent = accuracy >= 92 ? 'Milo atrapó la pelota con una coordinación perfecta.' : 'La pelota se prepara para la siguiente ronda.';
    haptic(accuracy >= 92 ? [14, 28, 40] : 12);
    if (gameTurn >= 5) setTimeout(() => finishGame(false), 750);
    else setTimeout(() => {
      if (!gameActive) return;
      setBallActionsDisabled(false);
      el('gameDialogue').textContent = `Ronda ${gameTurn + 1}. Elige tu siguiente ayuda.`;
    }, 620);
  }

  function finishGame(cancelled = false) {
    clearInterval(gameInterval);
    gameInterval = null;
    cancelAnimationFrame(gameStrikeFrame);
    gameStrikeFrame = null;
    gameStrikeActive = false;
    if (!gameActive) return;
    gameActive = false;
    el('ballTarget').style.display = 'none';
    el('strikeTrack').hidden = true;
    setBallActionsDisabled(true);
    el('startGameBtn').disabled = false;
    el('startGameBtn').textContent = `Jugar otra vez · ${energyLabel(ENERGY_COSTS.arcadeBall)}`;
    el('gameMessage').hidden = false;
    if (cancelled) {
      el('gameMessage').textContent = 'Juego pausado.';
      return;
    }

    const personalityBonus = PERSONALITIES[state.personality].play || 1;
    const coins = Math.max(3, Math.min(24, Math.round(gameScore * personalityBonus / 4)));
    modifyStats({ energy: -Math.min(ENERGY_COSTS.arcadeBall, 6 + gameTurn * 2), water: -5, food: -3, mood: Math.min(24, 7 + gameScore * .18 * personalityBonus), bond: 5, stress: -6 });
    state.coins += coins;
    state.arcade.ballBest = Math.max(state.arcade.ballBest, gameScore);
    state.arcade.played += 1;
    gainXp(8 + Math.floor(gameScore / 3));
    recordHabit('play');
    setActivity('playing', 5000, { description: `Completaron ${gameTurn} rondas de precisión y lograron ${gameScore} puntos.` });
    addJournal('🎾', 'Atrapa la pelota', `Completaron ${gameTurn} rondas, lograron ${gameScore} puntos y ganaron ${coins} monedas.`);
    el('gameDialogue').textContent = gameTurn >= 5 ? 'Milo terminó feliz después de tantos lanzamientos.' : 'La pelota descansa hasta la próxima partida.';
    el('gameMessage').textContent = `Juego terminado · ${gameScore} puntos · +${coins} monedas`;
    speak(gameScore >= 60 ? '¡Nuestra coordinación fue perfecta!' : '¡Cada vez lo hacemos mejor!');
    createSparkles('🎾');
    touch();
    saveState();
    render();
  }

  function openArcadeGame(type) {
    if (isBusy()) return toast(`${state.petName} está ocupado en este momento.`);
    const requiredLevel = type === 'dodge' ? 2 : type === 'memory' ? 3 : 1;
    if (state.level < requiredLevel) return toast(`Este juego se desbloquea en el nivel ${requiredLevel}.`);
    if (state.stats.energy < arcadeEnergyCost(type)) return toast(`Necesita ${arcadeEnergyCost(type)}% de energía para jugar.`);
    closeModal('arcadeModal');
    setTimeout(() => {
      if (type === 'ball') {
        prepareBallEncounter();
        openModal('gameModal');
      }
      else if (type === 'dodge') openDodgeEncounter({ source: 'arcade', bonus: 0, title: 'Pista de reflejos', description: 'Mueve la huella y evita hojas, gotitas y conos durante 15 segundos.' });
      else openMemoryEncounter({ source: 'arcade', bonus: 0, title: 'Secuencia de señales', description: 'Observa las señales y repítelas. Cada ronda será un poco más larga.' });
    }, 230);
  }

  function scheduleEncounter(callback, attempt = 0) {
    setTimeout(() => {
      if (!document.querySelector('.modal-backdrop.open')) callback();
      else if (attempt < 12) scheduleEncounter(callback, attempt + 1);
      else toast('Milo encontró un reto especial, pero estaba ocupado. Aparecerá en otro paseo.');
    }, attempt ? 500 : 420);
  }

  function openDodgeEncounter(context = {}) {
    dodgeContext = { source: 'arcade', bonus: 0, ...context };
    dodgeAct = 'play';
    dodgeCurrentWave = 0;
    el('dodgeTitle').textContent = dodgeContext.title || 'Pista de reflejos';
    el('dodgeDescription').textContent = dodgeContext.description || 'Mueve la huella y evita todos los obstáculos.';
    const isAdventure = /sendero|aventura|ramas/i.test(`${dodgeContext.title || ''} ${dodgeContext.description || ''}`);
    const isWalk = dodgeContext.source === 'walk';
    el('dodgeEnemy').textContent = isAdventure ? '🌿' : isWalk ? '💦' : '🏁';
    el('dodgeEnemyName').textContent = isAdventure ? 'Sendero inquieto' : isWalk ? 'Charcos juguetones' : 'Pista sorpresa';
    el('dodgeEnemyMood').textContent = isAdventure ? 'Las ramas se cruzan en el camino.' : isWalk ? 'Las gotas saltan sin parar.' : 'Hojas, gotas y conos se cruzan.';
    el('dodgeDialogue').textContent = isAdventure ? 'Milo mira el sendero y busca el mejor paso.' : isWalk ? 'Ayuda a Milo a encontrar un camino seco.' : 'Milo observa la pista y espera tu señal.';
    el('dodgeLives').textContent = '🐾🐾🐾';
    el('dodgeScore').textContent = '0';
    el('dodgeTime').textContent = '15';
    el('dodgeWave').textContent = 'Tramo 1 · Hojas';
    el('dodgeMessage').hidden = false;
    el('dodgeMessage').textContent = 'Elige cómo recorrer la pista.';
    el('dodgePlayer').style.display = 'none';
    el('startDodgeBtn').disabled = false;
    el('startDodgeBtn').textContent = `Empezar recorrido · ${energyLabel(dodgeEnergyCost())}`;
    document.querySelectorAll('[data-dodge-act]').forEach(button => {
      button.disabled = false;
      button.classList.toggle('selected', button.dataset.dodgeAct === 'play');
    });
    clearDodgeHazards();
    openModal('dodgeModal');
  }

  function selectDodgeAct(action) {
    if (dodgeActive) return;
    const actions = {
      play: 'A tu ritmo: velocidad normal y recompensa equilibrada.',
      encourage: `Animar: ${state.petName} comienza con un intento extra, pero la pista acelera un poco.`,
      observe: 'Mirar: después de estudiar la pista, tendrás más tiempo para recuperarte.',
      calm: 'Respirar: los obstáculos se moverán más despacio.'
    };
    if (!actions[action]) return;
    dodgeAct = action;
    document.querySelectorAll('[data-dodge-act]').forEach(button => button.classList.toggle('selected', button.dataset.dodgeAct === action));
    el('dodgeDialogue').textContent = actions[action];
    haptic(8);
  }

  function startDodge() {
    if (dodgeActive) return;
    const cost = dodgeEnergyCost();
    if (state.stats.energy < cost) return toast(`Necesita ${cost}% de energía para este reto.`);
    dodgeActive = true;
    dodgeLives = dodgeAct === 'encourage' ? 4 : 3;
    dodgeScore = dodgeAct === 'encourage' ? 6 : dodgeAct === 'observe' ? 3 : 0;
    dodgeSpeedMultiplier = dodgeAct === 'encourage' ? 1.08 : dodgeAct === 'calm' ? .76 : dodgeAct === 'observe' ? .92 : 1;
    dodgeInvulnerabilityDuration = dodgeAct === 'observe' ? 1250 : 850;
    dodgeCurrentWave = 0;
    dodgePlayerPosition = { x: .5, y: .5 };
    dodgeInvulnerableUntil = 0;
    dodgeDirections.clear();
    clearDodgeHazards();
    el('dodgeLives').textContent = '🐾'.repeat(dodgeLives);
    el('dodgeScore').textContent = String(dodgeScore);
    el('dodgeTime').textContent = '15';
    el('dodgeWave').textContent = 'Tramo 1 · Hojas';
    el('dodgeDialogue').textContent = `${state.petName} eligió ${dodgeAct === 'play' ? 'ir a su ritmo' : dodgeAct === 'encourage' ? 'recibir ánimos' : dodgeAct === 'observe' ? 'mirar la pista' : 'respirar'}. ¡Comienza el recorrido!`;
    el('dodgeMessage').hidden = true;
    el('dodgePlayer').style.display = 'flex';
    el('dodgePlayer').style.left = '50%';
    el('dodgePlayer').style.top = '50%';
    el('startDodgeBtn').disabled = true;
    el('startDodgeBtn').textContent = 'En movimiento';
    document.querySelectorAll('[data-dodge-act]').forEach(button => button.disabled = true);
    el('dodgeArena').focus({ preventScroll: true });
    dodgeStartedAt = performance.now();
    dodgeLastFrame = dodgeStartedAt;
    dodgeLastSpawn = dodgeStartedAt - 700;
    dodgeFrame = requestAnimationFrame(updateDodgeFrame);
  }

  function createDodgeHazard({ x, y, vx, vy, size = 22, style = 'purple', symbol = '' }) {
    const node = document.createElement('span');
    node.className = `hazard ${style}`;
    node.textContent = symbol;
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    el('hazardLayer').appendChild(node);
    dodgeHazards.push({ node, x, y, vx, vy, size });
  }

  function spawnDodgeHazard(elapsed) {
    const wave = Math.min(2, Math.floor(elapsed / 5));
    const baseSpeed = (.25 + Math.min(.15, elapsed * .007) + Math.random() * .045) * dodgeSpeedMultiplier;
    if (wave === 0) {
      const side = Math.floor(Math.random() * 4);
      let x;
      let y;
      let vx;
      let vy;
      if (side === 0) { x = -.08; y = .08 + Math.random() * .84; vx = baseSpeed; vy = (Math.random() - .5) * .12; }
      else if (side === 1) { x = 1.08; y = .08 + Math.random() * .84; vx = -baseSpeed; vy = (Math.random() - .5) * .12; }
      else if (side === 2) { x = .08 + Math.random() * .84; y = -.08; vx = (Math.random() - .5) * .12; vy = baseSpeed; }
      else { x = .08 + Math.random() * .84; y = 1.08; vx = (Math.random() - .5) * .12; vy = -baseSpeed; }
      createDodgeHazard({ x, y, vx, vy, size: 18 + Math.random() * 10, style: 'leaf', symbol: '🍂' });
      return;
    }
    if (wave === 1) {
      const count = Math.random() < .35 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        createDodgeHazard({ x: .06 + Math.random() * .88, y: -.08 - i * .12, vx: (Math.random() - .5) * .04, vy: baseSpeed * 1.18, size: 17 + Math.random() * 7, style: 'drop', symbol: '💧' });
      }
      return;
    }
    const fromLeft = Math.random() < .5;
    const gap = 1 + Math.floor(Math.random() * 4);
    for (let row = 0; row < 6; row++) {
      if (row === gap || row === gap + 1) continue;
      createDodgeHazard({
        x: fromLeft ? -.09 : 1.09,
        y: .1 + row * .16,
        vx: fromLeft ? baseSpeed * .94 : -baseSpeed * .94,
        vy: 0,
        size: 28,
        style: 'cone',
        symbol: '🔶'
      });
    }
  }

  function updateDodgeFrame(timestamp) {
    if (!dodgeActive) return;
    const delta = Math.min(.04, Math.max(.001, (timestamp - dodgeLastFrame) / 1000));
    const elapsed = (timestamp - dodgeStartedAt) / 1000;
    dodgeLastFrame = timestamp;
    const speed = .56;
    if (dodgeDirections.has('left')) dodgePlayerPosition.x -= speed * delta;
    if (dodgeDirections.has('right')) dodgePlayerPosition.x += speed * delta;
    if (dodgeDirections.has('up')) dodgePlayerPosition.y -= speed * delta;
    if (dodgeDirections.has('down')) dodgePlayerPosition.y += speed * delta;
    dodgePlayerPosition.x = Math.max(.045, Math.min(.955, dodgePlayerPosition.x));
    dodgePlayerPosition.y = Math.max(.06, Math.min(.94, dodgePlayerPosition.y));

    const playerNode = el('dodgePlayer');
    playerNode.style.left = `${dodgePlayerPosition.x * 100}%`;
    playerNode.style.top = `${dodgePlayerPosition.y * 100}%`;
    const wave = Math.min(2, Math.floor(elapsed / 5));
    if (wave !== dodgeCurrentWave) {
      dodgeCurrentWave = wave;
      const waveNames = ['Hojas', 'Gotitas', 'Conos'];
      el('dodgeWave').textContent = `Tramo ${wave + 1} · ${waveNames[wave]}`;
      el('dodgeDialogue').textContent = wave === 1 ? 'Ahora caen gotitas desde arriba. Busca los espacios libres.' : 'Último tramo: encuentra el hueco entre los conos.';
      haptic([10, 22, 10]);
    }
    const spawnEvery = wave === 2 ? 1120 : wave === 1 ? 360 : Math.max(300, 610 - elapsed * 13);
    if (timestamp - dodgeLastSpawn >= spawnEvery) {
      spawnDodgeHazard(elapsed);
      dodgeLastSpawn = timestamp;
    }

    const arena = el('dodgeArena');
    const width = arena.clientWidth;
    const height = arena.clientHeight;
    const playerX = dodgePlayerPosition.x * width;
    const playerY = dodgePlayerPosition.y * height;
    dodgeHazards = dodgeHazards.filter(hazard => {
      hazard.x += hazard.vx * delta;
      hazard.y += hazard.vy * delta;
      hazard.node.style.transform = `translate(${hazard.x * width - hazard.size / 2}px,${hazard.y * height - hazard.size / 2}px)`;
      const outside = hazard.x < -.14 || hazard.x > 1.14 || hazard.y < -.14 || hazard.y > 1.14;
      if (outside) {
        hazard.node.remove();
        dodgeScore += 3;
        return false;
      }
      const dx = hazard.x * width - playerX;
      const dy = hazard.y * height - playerY;
      if (timestamp > dodgeInvulnerableUntil && Math.hypot(dx, dy) < (hazard.size + 19) * .48) {
        dodgeLives -= 1;
        haptic([35, 28, 35]);
        dodgeInvulnerableUntil = timestamp + dodgeInvulnerabilityDuration;
        playerNode.classList.remove('hit');
        void playerNode.offsetWidth;
        playerNode.classList.add('hit');
        el('dodgeLives').textContent = '🐾'.repeat(Math.max(0, dodgeLives)) || '—';
        hazard.node.remove();
        if (dodgeLives <= 0) setTimeout(() => finishDodge(false, false), 0);
        return false;
      }
      return true;
    });
    dodgeScore = Math.max(dodgeScore, Math.floor(elapsed * 7));
    el('dodgeScore').textContent = String(dodgeScore);
    el('dodgeTime').textContent = String(Math.max(0, Math.ceil(15 - elapsed)));
    if (elapsed >= 15) finishDodge(false, true);
    else if (dodgeActive) dodgeFrame = requestAnimationFrame(updateDodgeFrame);
  }

  function clearDodgeHazards() {
    dodgeHazards.forEach(hazard => hazard.node.remove());
    dodgeHazards = [];
    if (el('hazardLayer')) el('hazardLayer').innerHTML = '';
  }

  function finishDodge(cancelled = false, survived = false) {
    if (!dodgeActive && cancelled) {
      clearDodgeHazards();
      return;
    }
    cancelAnimationFrame(dodgeFrame);
    dodgeFrame = null;
    dodgeDirections.clear();
    clearDodgeHazards();
    const wasActive = dodgeActive;
    dodgeActive = false;
    if (!wasActive || cancelled) {
      el('dodgePlayer').style.display = 'none';
      document.querySelectorAll('[data-dodge-act]').forEach(button => button.disabled = false);
      return;
    }
    if (survived) dodgeScore += dodgeLives * 20;
    const coins = Math.max(2, Math.floor(dodgeScore / 12) + Number(dodgeContext.bonus || 0));
    const xp = 8 + Math.floor(dodgeScore / 8);
    modifyStats({
      energy: -dodgeEnergyCost(),
      water: dodgeContext.source === 'walk' ? -2 : -4,
      mood: survived ? 13 : 5,
      bond: survived ? 5 : 2,
      stress: survived ? -7 : 1
    });
    state.coins += coins;
    state.arcade.dodgeBest = Math.max(state.arcade.dodgeBest, dodgeScore);
    state.arcade.played += 1;
    gainXp(xp);
    recordHabit('play');
    setActivity('playing', 4300, { icon: '🐾', title: survived ? 'Celebrando la pista' : 'Recuperando el aliento', description: survived ? `${state.petName} confió en tus reflejos y completó el recorrido.` : 'No llegaron al final, pero practicaron juntos.' });
    addJournal('🐾', survived ? 'Completó la Pista de reflejos' : 'Practicó en la Pista de reflejos', `${survived ? 'Completaste' : 'Intentaste'} el recorrido con ${dodgeScore} puntos y ganaste ${coins} monedas.`);
    el('dodgeMessage').hidden = false;
    el('dodgeMessage').textContent = survived ? `¡Superado! ${dodgeScore} puntos · +${coins} monedas` : `Buen intento · ${dodgeScore} puntos · +${coins} monedas`;
    el('dodgePlayer').style.display = 'none';
    el('startDodgeBtn').disabled = false;
    el('startDodgeBtn').textContent = `Jugar otra vez · ${energyLabel(dodgeEnergyCost())}`;
    document.querySelectorAll('[data-dodge-act]').forEach(button => button.disabled = false);
    el('dodgeDialogue').textContent = survived ? 'La pista quedó libre. Milo mueve la cola, orgulloso.' : 'Milo descansó un momento y ya quiere intentarlo otra vez.';
    speak(survived ? '¡Lo logramos juntos!' : '¡Casi! La próxima lo lograremos.');
    haptic(survived ? [18, 35, 55] : 25);
    if (survived) createSparkles('🐾');
    touch();
    saveState();
    render();
  }

  function moveDodgePlayerToPointer(event) {
    if (!dodgeActive) return;
    const rect = el('dodgeArena').getBoundingClientRect();
    dodgePlayerPosition.x = Math.max(.045, Math.min(.955, (event.clientX - rect.left) / rect.width));
    dodgePlayerPosition.y = Math.max(.06, Math.min(.94, (event.clientY - rect.top) / rect.height));
  }

  function openMemoryEncounter(context = {}) {
    memoryContext = { source: 'arcade', bonus: 0, ...context };
    el('memoryTitle').textContent = memoryContext.title || 'Secuencia de señales';
    el('memoryDescription').textContent = memoryContext.description || 'Observa las señales y repítelas en el mismo orden.';
    el('memoryLives').textContent = '🐾🐾🐾';
    el('memoryRound').textContent = '1 / 4';
    el('memoryScore').textContent = '0';
    el('memoryMessage').textContent = memoryContext.source === 'training' ? 'Usa la secuencia para reforzar lo aprendido durante cuatro rondas.' : 'Mira con atención la primera secuencia.';
    el('startMemoryBtn').disabled = false;
    el('startMemoryBtn').textContent = `Empezar secuencia · ${energyLabel(memoryEnergyCost())}`;
    setMemoryPadsDisabled(true);
    openModal('memoryModal');
  }

  function startMemory() {
    if (memoryActive) return;
    const cost = memoryEnergyCost();
    if (state.stats.energy < cost) return toast(`Necesita ${cost}% de energía para este reto.`);
    memoryActive = true;
    memoryAccepting = false;
    memorySequence = [randomMemoryPad(), randomMemoryPad(), randomMemoryPad()];
    memoryPlayerIndex = 0;
    memoryRound = 1;
    memoryLives = 3;
    memoryScore = 0;
    el('memoryLives').textContent = '🐾🐾🐾';
    el('memoryRound').textContent = '1 / 4';
    el('memoryScore').textContent = '0';
    el('startMemoryBtn').disabled = true;
    el('startMemoryBtn').textContent = 'En juego';
    playMemorySequence();
  }

  function randomMemoryPad() {
    return Math.floor(Math.random() * 4);
  }

  function memoryPads() {
    return [...document.querySelectorAll('[data-memory-pad]')];
  }

  function setMemoryPadsDisabled(disabled) {
    memoryPads().forEach(pad => pad.disabled = disabled);
  }

  function clearMemoryTimers() {
    memoryTimers.forEach(timer => clearTimeout(timer));
    memoryTimers = [];
    memoryPads().forEach(pad => pad.classList.remove('active'));
  }

  function memoryLater(callback, delay) {
    const timer = setTimeout(callback, delay);
    memoryTimers.push(timer);
  }

  function playMemorySequence() {
    if (!memoryActive) return;
    clearMemoryTimers();
    memoryAccepting = false;
    memoryPlayerIndex = 0;
    setMemoryPadsDisabled(true);
    el('memoryMessage').textContent = 'Mira las señales mientras se iluminan…';
    const pads = memoryPads();
    memorySequence.forEach((padIndex, index) => {
      memoryLater(() => pads[padIndex]?.classList.add('active'), 350 + index * 620);
      memoryLater(() => pads[padIndex]?.classList.remove('active'), 710 + index * 620);
    });
    memoryLater(() => {
      if (!memoryActive) return;
      setMemoryPadsDisabled(false);
      memoryAccepting = true;
      el('memoryMessage').textContent = 'Ahora tú: toca las señales en el mismo orden.';
    }, 500 + memorySequence.length * 620);
  }

  function handleMemoryPad(index) {
    if (!memoryActive || !memoryAccepting) return;
    const pad = memoryPads()[index];
    pad.classList.add('active');
    memoryLater(() => pad.classList.remove('active'), 180);
    if (index === memorySequence[memoryPlayerIndex]) {
      haptic(12);
      memoryPlayerIndex += 1;
      memoryScore += 10 + memoryRound * 2;
      el('memoryScore').textContent = String(memoryScore);
      if (memoryPlayerIndex >= memorySequence.length) {
        memoryAccepting = false;
        setMemoryPadsDisabled(true);
        if (memoryRound >= 4) {
          el('memoryMessage').textContent = '¡Secuencia completa! Milo recordó todas las señales.';
          memoryLater(() => finishMemory(false, true), 650);
        } else {
          memoryRound += 1;
          memorySequence.push(randomMemoryPad());
          el('memoryRound').textContent = `${memoryRound} / 4`;
          el('memoryMessage').textContent = '¡Muy bien! La siguiente ronda agrega una señal.';
          memoryLater(playMemorySequence, 850);
        }
      }
      return;
    }

    memoryLives -= 1;
    haptic([40, 25, 40]);
    memoryAccepting = false;
    setMemoryPadsDisabled(true);
    el('memoryLives').textContent = '🐾'.repeat(Math.max(0, memoryLives)) || '—';
    const board = el('memoryBoard');
    board.classList.remove('shake');
    void board.offsetWidth;
    board.classList.add('shake');
    if (memoryLives <= 0) {
      el('memoryMessage').textContent = 'Se terminaron los intentos de esta partida.';
      memoryLater(() => finishMemory(false, false), 650);
    } else {
      memoryPlayerIndex = 0;
      el('memoryMessage').textContent = 'Esa no era la señal. La secuencia se repetirá.';
      memoryLater(playMemorySequence, 900);
    }
  }

  function finishMemory(cancelled = false, won = false) {
    const wasActive = memoryActive;
    clearMemoryTimers();
    memoryActive = false;
    memoryAccepting = false;
    setMemoryPadsDisabled(true);
    if (!wasActive || cancelled) return;
    const coins = Math.max(2, Math.floor(memoryScore / 18) + (won ? 8 : 2) + Number(memoryContext.bonus || 0));
    modifyStats({
      energy: -memoryEnergyCost(),
      food: -2,
      mood: won ? 11 : 4,
      bond: won ? 5 : 2,
      stress: won ? -5 : 1
    });
    state.coins += coins;
    state.arcade.memoryBest = Math.max(state.arcade.memoryBest, memoryScore);
    state.arcade.played += 1;
    state.traits.discipline = clamp(state.traits.discipline + (won ? 3 : 1));
    state.traits.trust = clamp(state.traits.trust + (won ? 2 : .5));
    gainXp(8 + Math.floor(memoryScore / 9));
    recordHabit('play');
    setActivity('training', 3800, { icon: '🐾', title: won ? 'Orgulloso de su memoria' : 'Practicando otra vez', description: won ? `${state.petName} siguió todas tus señales.` : 'La secuencia fue difícil, pero no se rindió.' });
    addJournal('🎨', won ? 'Completó la Secuencia de señales' : 'Practicó la Secuencia de señales', `Llegaron a la ronda ${memoryRound} con ${memoryScore} puntos y ganaron ${coins} monedas.`);
    el('memoryMessage').textContent = won ? `Secuencia completa · ${memoryScore} puntos · +${coins} monedas` : `Partida terminada · ${memoryScore} puntos · +${coins} monedas`;
    el('startMemoryBtn').disabled = false;
    el('startMemoryBtn').textContent = `Jugar otra vez · ${energyLabel(memoryEnergyCost())}`;
    speak(won ? '¡Recordé todas las señales!' : 'Voy a practicar para la próxima.');
    haptic(won ? [18, 32, 18, 32, 60] : 24);
    if (won) createSparkles('🐾');
    touch();
    saveState();
    render();
  }

  function currentWeather() {
    const options = [
      { key: 'sun', icon: '☀️', label: 'Soleado' },
      { key: 'cloud', icon: '🌤️', label: 'Templado' },
      { key: 'rain', icon: '🌧️', label: 'Lluvioso' },
      { key: 'wind', icon: '🍃', label: 'Con viento' }
    ];
    return options[hashCode(localDateKey()) % options.length];
  }

  function dayPeriod() {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'night';
  }

  function renderClock() {
    const date = new Date();
    const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const period = dayPeriod();
    const icon = period === 'day' ? '☀️' : period === 'evening' ? '🌇' : '🌙';
    el('clockPill').textContent = `${icon} ${time}`;
    const weather = currentWeather();
    el('weatherPill').textContent = `${weather.icon} ${weather.label}`;
    const room = el('room');
    room.className = `room room-${period}`;
    el('sceneCard').classList.toggle('is-night', period === 'night');
    el('sceneCard').classList.toggle('is-sleeping', state.isAsleep);
  }

  function statColor(value) {
    if (value < 25) return '#d85f70';
    if (value < 50) return '#e5a94c';
    return '#65af7d';
  }

  function renderNeeds() {
    Object.entries(state.stats).forEach(([key, raw]) => {
      const value = Math.round(raw);
      const valueEl = el(`${key}Value`);
      const bar = el(`${key}Bar`);
      if (!valueEl || !bar) return;
      valueEl.textContent = `${value}%`;
      bar.style.width = `${value}%`;
      bar.style.background = key === 'bond' ? '#e56f9f' : statColor(value);
      valueEl.closest('.need')?.classList.toggle('urgent', key !== 'bond' && value < 25);

      const sceneNeed = document.querySelector(`[data-scene-stat="${key}"]`);
      if (sceneNeed) {
        sceneNeed.querySelector('.scene-need-value').textContent = `${value}%`;
        const sceneBar = sceneNeed.querySelector('.scene-need-meter i');
        sceneBar.style.width = `${value}%`;
        sceneBar.style.background = key === 'bond' ? '#e56f9f' : statColor(value);
        sceneNeed.classList.toggle('warning', key !== 'bond' && value < 48 && value >= 25);
        sceneNeed.classList.toggle('critical', key !== 'bond' && value < 25);
        sceneNeed.setAttribute('aria-label', `${sceneNeed.dataset.label}: ${value}%`);
      }
    });
    const minimum = Math.min(state.stats.food, state.stats.water, state.stats.energy, state.stats.hygiene, state.stats.health);
    let badgeText = 'Todo bien';
    let badgeState = '';
    if (minimum < 25) {
      badgeText = 'Necesita ayuda';
      badgeState = 'critical';
    } else if (minimum < 48) {
      badgeText = 'Ponle atención';
      badgeState = 'warning';
    }
    [el('overallBadge'), el('sceneOverallBadge')].forEach(badge => {
      badge.className = `overall-badge${badgeState ? ` ${badgeState}` : ''}`;
      badge.textContent = badgeText;
    });

    const previous = state.level > 1 ? LEVELS[state.level - 2] || 0 : 0;
    const target = LEVELS[state.level - 1] || LEVELS.at(-1) + 600;
    const progress = clamp(((state.xp - previous) / Math.max(1, target - previous)) * 100);
    el('xpLabel').textContent = `${Math.max(0, state.xp - previous)} / ${target - previous}`;
    el('xpBar').style.width = `${progress}%`;
  }

  function renderScene() {
    el('petName').textContent = state.petName || 'Milo';
    document.querySelectorAll('.game-pet-name').forEach(label => label.textContent = state.petName || 'Milo');
    el('levelPill').textContent = `Nivel ${state.level}`;
    const personality = PERSONALITIES[state.personality];
    el('personalityChip').textContent = personality.name;
    el('petStage').textContent = state.level >= 8 ? 'Tu compañero inseparable' : state.level >= 5 ? 'Un perro seguro y lleno de vida' : state.level >= 3 ? 'Un cachorro que aprende rápido' : 'Cachorro recién adoptado';

    const activity = activityPreset();
    el('activityFloat').textContent = activity.title;
    el('nowIcon').textContent = activity.icon;
    el('nowTitle').textContent = activity.title;
    el('nowDescription').textContent = activity.description;
    const wrap = el('petWrap');
    wrap.className = `pet-wrap ${activity.css || ''} ${petReaction}`.trim();
    wrap.setAttribute('aria-label', `${state.isAsleep ? 'Acariciar suavemente a' : 'Acariciar a'} ${state.petName || 'Milo'}`);
    el('petTouchHint').textContent = state.isAsleep ? 'Tócalo con suavidad' : `Acaricia a ${state.petName || 'Milo'}`;

    const dog = el('dog');
    const average = (state.stats.food + state.stats.water + state.stats.energy + state.stats.hygiene + state.stats.health + state.mood) / 6;
    const sceneHour = new Date().getHours();
    const nightAwake = (sceneHour >= 22 || sceneHour < 6) && now() < Number(state.manualAwakeUntil || 0);
    dog.className = 'dog';
    if (state.isAsleep || state.stats.energy < 22 || nightAwake) dog.classList.add('sleepy-face');
    else if (state.stats.health < 40) dog.classList.add('sick-face');
    else if (average < 44 || state.stress > 70) dog.classList.add('sad-face');
    else dog.classList.add('happy-face');
    if (state.stats.hygiene < 36) dog.classList.add('dirty');

    const savedSleepProgress = Math.floor(state.sleepProgress);
    const sleepLabel = !state.isAsleep && savedSleepProgress > 0 && savedSleepProgress < 100 ? `Dormir · ${savedSleepProgress}%` : 'Dormir';
    el('sleepActionTitle').textContent = state.isAsleep ? 'Despertar' : sleepLabel;
    el('sleepBtn').dataset.label = state.isAsleep ? 'Despertar' : sleepLabel;
    el('sleepBtn').setAttribute('aria-label', state.isAsleep ? 'Despertar' : sleepLabel);
    el('sleepActionCopy').textContent = state.isAsleep ? 'Interrumpir descanso' : nightAwake ? 'Está despierto con sueño' : 'Descanso de verdad';
    document.querySelectorAll('.action-card:not(#sleepBtn)').forEach(button => button.disabled = isBusy());
  }

  function renderHome() {
    el('coinValue').textContent = String(state.coins);
    el('shopCoinValue').textContent = String(state.coins);
    el('shopBalance').setAttribute('aria-label', `Tu saldo: ${state.coins} monedas`);
    el('foodBowlValue').textContent = state.bowls.food ? `${state.bowls.food} ${state.bowls.food === 1 ? 'porción' : 'porciones'}` : 'Vacío';
    el('waterBowlValue').textContent = state.bowls.water ? `${state.bowls.water} ${state.bowls.water === 1 ? 'porción' : 'porciones'}` : 'Vacío';
    el('sceneFoodBowl').textContent = state.bowls.food ? '🍖' : '';
    el('sceneWaterBowl').textContent = state.bowls.water ? '💧' : '';
    document.querySelector('.food-bowl')?.classList.toggle('empty', !state.bowls.food);
    document.querySelector('.water-bowl')?.classList.toggle('empty', !state.bowls.water);
    const homeMinimum = Math.min(state.bowls.food ? 100 : state.stats.food, state.bowls.water ? 100 : state.stats.water);
    const dot = el('homeStatusDot');
    dot.className = 'status-dot';
    if (homeMinimum < 25) dot.classList.add('critical');
    else if (homeMinimum < 50) dot.classList.add('warning');

    const inventory = [
      ['🥫', 'Comida', state.inventory.food],
      ['🦴', 'Premios', state.inventory.treat],
      ['🧼', 'Jabón', state.inventory.soap],
      ['🩹', 'Medicina', state.inventory.medicine]
    ];
    el('inventoryList').innerHTML = inventory.map(([icon, label, count]) => `<span class="inventory-item">${icon} ${label} ×${count}</span>`).join('');
    el('careFoodCount').textContent = `${state.inventory.food} ${state.inventory.food === 1 ? 'porción' : 'porciones'}`;
    el('careTreatCount').textContent = `${state.inventory.treat} ${state.inventory.treat === 1 ? 'premio' : 'premios'}`;
    el('careSoapCount').textContent = `${state.inventory.soap} ${state.inventory.soap === 1 ? 'jabón' : 'jabones'}`;
    el('careMedicineCount').textContent = `${state.inventory.medicine} ${state.inventory.medicine === 1 ? 'dosis' : 'dosis'}`;

    document.querySelectorAll('[data-buy]').forEach(button => {
      const item = SHOP[button.dataset.buy];
      button.disabled = state.coins < item.cost;
    });
  }

  function renderPersonality() {
    const personality = PERSONALITIES[state.personality];
    el('personalityTitle').textContent = personality.name;
    el('personalityEmoji').textContent = personality.emoji;
    el('personalityDescription').textContent = personality.description;
    el('trustBar').style.width = `${state.traits.trust}%`;
    el('disciplineBar').style.width = `${state.traits.discipline}%`;
    el('trustValue').textContent = String(Math.round(state.traits.trust));
    el('disciplineValue').textContent = String(Math.round(state.traits.discipline));
    const favorite = Object.entries(state.habits).sort((a, b) => b[1] - a[1])[0];
    const names = { care: 'Que lo cuides', walk: 'Salir a pasear', train: 'Aprender trucos', play: 'Jugar contigo', sleep: 'Dormir' };
    el('favoriteAction').textContent = favorite?.[1] ? names[favorite[0]] : 'Todavía no decide';
  }

  function renderSkills() {
    el('skillList').innerHTML = Object.entries(SKILLS).map(([key, skill]) => {
      const progress = clamp(state.skills[key]);
      const level = skillLevel(progress);
      const locked = state.level < skill.unlock;
      return `<div class="skill-row">
        <span class="skill-icon">${locked ? '🔒' : skill.icon}</span>
        <div class="skill-copy"><strong>${locked ? `Nivel ${skill.unlock}` : skill.name}</strong><span>${locked ? 'Todavía no está listo' : `${Math.round(progress)}% de dominio`}</span><div class="skill-progress"><i style="width:${locked ? 0 : progress}%"></i></div></div>
        <span class="skill-level">${locked ? '' : `Nv. ${level}`}</span>
      </div>`;
    }).join('');

    el('trainingChoices').innerHTML = Object.entries(SKILLS).map(([key, skill]) => {
      const locked = state.level < skill.unlock;
      const level = skillLevel(state.skills[key]);
      return `<button class="training-choice" type="button" data-train="${key}" ${locked || isBusy() ? 'disabled' : ''}>
        <span class="training-icon">${locked ? '🔒' : skill.icon}</span><span class="training-copy"><strong>${skill.name}</strong><small>${locked ? `Disponible en nivel ${skill.unlock}` : `Nv. ${level} · ${Math.round(state.skills[key])}% aprendido${state.inventory.treat ? ' · 1 premio' : ''}`}</small></span><b>${locked ? '' : energyLabel(ENERGY_COSTS.training)}</b>
      </button>`;
    }).join('');

    document.querySelectorAll('[data-walk]').forEach(button => {
      const route = WALK_ROUTES[button.dataset.walk];
      button.querySelector('b').textContent = energyLabel(route.energy);
      button.disabled = state.level < route.level || isBusy();
    });
  }

  function renderArcade() {
    const dodgeUnlocked = state.level >= 2;
    const memoryUnlocked = state.level >= 3;
    document.querySelector('[data-arcade="ball"] small').textContent = state.arcade.ballBest ? `Récord ${state.arcade.ballBest} · precisión` : 'Acerca la marca a la zona verde durante cinco rondas';
    document.querySelector('[data-arcade="dodge"] small').textContent = state.arcade.dodgeBest ? `Récord ${state.arcade.dodgeBest} · reflejos` : 'Guía la huella entre hojas, gotitas y conos';
    document.querySelector('[data-arcade="memory"] small').textContent = state.arcade.memoryBest ? `Récord ${state.arcade.memoryBest} · memoria` : 'Observa las señales y repítelas en el mismo orden';
    el('ballGameStatus').textContent = energyLabel(ENERGY_COSTS.arcadeBall);
    el('dodgeGameStatus').textContent = dodgeUnlocked ? energyLabel(ENERGY_COSTS.arcadeDodge) : 'Nivel 2';
    el('memoryGameStatus').textContent = memoryUnlocked ? energyLabel(ENERGY_COSTS.arcadeMemory) : 'Nivel 3';
    document.querySelector('[data-arcade="dodge"]').disabled = !dodgeUnlocked || isBusy();
    document.querySelector('[data-arcade="memory"]').disabled = !memoryUnlocked || isBusy();
    document.querySelector('[data-arcade="ball"]').disabled = isBusy();
  }

  function renderDiary() {
    if (!state.journal.length) {
      el('diaryList').innerHTML = `<div class="diary-entry"><span class="entry-icon">🐾</span><div><strong>Su historia empieza aquí</strong><p>Las decisiones y recuerdos importantes aparecerán en este diario.</p></div></div>`;
      return;
    }
    el('diaryList').innerHTML = state.journal.slice(0, 12).map(entry => {
      const date = new Date(entry.at);
      const sameDay = localDateKey(date) === localDateKey();
      const time = sameDay ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      return `<div class="diary-entry"><span class="entry-icon">${entry.icon}</span><div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.text)}</p></div><time datetime="${date.toISOString()}">${time}</time></div>`;
    }).join('');
  }

  function renderPhotos() {
    const grid = el('memoryGrid');
    grid.innerHTML = '';
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const item = document.createElement('div');
      item.className = 'memory';
      if (state.photos[i]) {
        const img = document.createElement('img');
        img.src = state.photos[i];
        img.alt = `Recuerdo ${i + 1}`;
        item.appendChild(img);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Eliminar recuerdo ${i + 1}`);
        remove.addEventListener('click', () => {
          state.photos.splice(i, 1);
          touch();
          saveState();
          renderPhotos();
        });
        item.appendChild(remove);
      } else item.textContent = '♡';
      grid.appendChild(item);
    }
  }

  function renderActivityTimer() {
    const target = state.isAsleep ? state.sleepUntil : state.activity.endsAt;
    const timer = el('activityTimer');
    const current = now();
    timer.classList.toggle('sleep-progress', state.isAsleep);
    if (!target) {
      timer.textContent = '';
      timer.style.removeProperty('--sleep-progress');
      timer.setAttribute('aria-label', 'Tiempo restante');
      return;
    }
    const remaining = Math.max(0, target - current);
    let timeText = '';
    if (remaining >= 3_600_000) {
      const totalMinutes = Math.ceil(remaining / 60_000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      timeText = `${hours}h ${minutes}m`;
    } else if (remaining >= 60_000) timeText = `${Math.ceil(remaining / 60_000)} min`;
    else timeText = `${Math.ceil(remaining / 1000)} s`;
    if (state.isAsleep) {
      const progress = currentSleepProgress(current);
      const percentage = Math.min(100, Math.floor(progress));
      timer.style.setProperty('--sleep-progress', `${progress}%`);
      timer.textContent = `${percentage}% · ${timeText}`;
      timer.setAttribute('aria-label', `Descanso ${percentage}%, faltan ${timeText}`);
    } else if (target <= current) {
      timer.textContent = '';
      timer.style.removeProperty('--sleep-progress');
      timer.setAttribute('aria-label', 'Tiempo restante');
    } else {
      timer.textContent = timeText;
      timer.style.removeProperty('--sleep-progress');
      timer.setAttribute('aria-label', `Tiempo restante: ${timeText}`);
    }
  }

  function render() {
    renderClock();
    renderNeeds();
    renderScene();
    renderHome();
    renderPersonality();
    renderSkills();
    renderArcade();
    renderDiary();
    renderPhotos();
    renderActivityTimer();
    el('signature').textContent = state.signature || 'Creado con amor para ti 💗';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function speak(message) {
    const bubble = el('speech');
    clearTimeout(speechTimer);
    bubble.textContent = message;
    bubble.classList.add('show');
    speechTimer = setTimeout(() => bubble.classList.remove('show'), 3200);
  }

  function toast(message) {
    const toastEl = el('toast');
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function haptic(pattern = 12) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function createSparkles(symbol, count = 8) {
    const container = el('sparkles');
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement('span');
      const duration = 1.2 + Math.random() * .5;
      const delay = Math.random() * .24;
      sparkle.className = 'sparkle';
      sparkle.textContent = symbol;
      sparkle.style.left = `${18 + Math.random() * 64}%`;
      sparkle.style.top = `${38 + Math.random() * 38}%`;
      sparkle.style.fontSize = `${.78 + Math.random() * .42}rem`;
      sparkle.style.animationDelay = `${delay}s`;
      sparkle.style.animationDuration = `${duration}s`;
      sparkle.style.setProperty('--sparkle-x', `${Math.round(-44 + Math.random() * 88)}px`);
      sparkle.style.setProperty('--sparkle-y', `${Math.round(-78 - Math.random() * 42)}px`);
      sparkle.style.setProperty('--sparkle-rotate', `${Math.round(-38 + Math.random() * 76)}deg`);
      sparkle.style.setProperty('--sparkle-scale', `${(.9 + Math.random() * .55).toFixed(2)}`);
      container.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), (duration + delay) * 1000 + 120);
    }
  }

  function pettingNeedMessage(pet) {
    const needs = [
      { value: pet.stats.health, threshold: 48, message: 'Gracias por acariciarme, pero no me siento bien.' },
      { value: pet.stats.food, threshold: 48, message: 'Gracias por acariciarme, pero tengo hambre.' },
      { value: pet.stats.water, threshold: 48, message: 'Gracias por acariciarme, pero tengo sed.' },
      { value: pet.stats.energy, threshold: 48, message: 'Gracias por acariciarme, pero estoy cansado.' },
      { value: pet.stats.hygiene, threshold: 48, message: 'Gracias por acariciarme, pero me siento sucio.' },
      { value: 100 - pet.stress, threshold: 35, message: 'Gracias por acariciarme, pero estoy un poco nervioso.' },
      { value: pet.mood, threshold: 44, message: 'Gracias por acariciarme, pero me siento triste.' }
    ];
    const urgentNeed = needs
      .filter(need => need.value < need.threshold)
      .sort((a, b) => (a.value / a.threshold) - (b.value / b.threshold))[0];
    return urgentNeed?.message || '';
  }

  function triggerPetReaction() {
    clearTimeout(petReactionTimer);
    const current = now();
    let reactionDuration = 1550;

    if (state.isAsleep) {
      petReaction = 'reaction-sleepy-pat';
      reactionDuration = 1450;
      speak(pick(['Gracias por la caricia… todavía tengo sueño.', 'Zzz… gracias por acariciarme.', 'Gracias… qué calientita está tu mano.']));
      createSparkles('💤', 6);
      haptic(8);
    } else {
      const needMessage = pettingNeedMessage(state);
      const reaction = needMessage
        ? { css: 'reaction-comfort', message: needMessage, symbol: '💗', haptic: [10, 38, 10], duration: 1850, sparkles: 7 }
        : pick([
          { css: 'reaction-cuddle', message: '¡Otra caricia, por favor!', symbol: '💗', haptic: [12, 30, 12], duration: 1700, sparkles: 10 },
          { css: 'reaction-boop', message: '¡Me tocaste la nariz!', symbol: '✨', haptic: 14, duration: 1150, sparkles: 7 },
          { css: 'reaction-dance', message: '¡Mira qué feliz me pongo!', symbol: '💕', haptic: [10, 25, 10, 25, 10], duration: 1900, sparkles: 12 }
        ]);
      petReaction = reaction.css;
      reactionDuration = reaction.duration;
      speak(reaction.message);
      createSparkles(reaction.symbol, reaction.sparkles);
      haptic(reaction.haptic);

      if (state.initialized && current - lastAffectionRewardAt > 30_000) {
        modifyStats({ mood: 1.5, bond: .7, stress: -1 });
        lastAffectionRewardAt = current;
        touch();
        saveState();
      }
    }

    render();
    petReactionTimer = setTimeout(() => {
      petReaction = '';
      renderScene();
    }, reactionDuration);
  }

  function openModal(id) {
    const modal = el(id);
    if (!modal) return;
    previousFocus = document.activeElement;
    document.querySelector('.app-shell').inert = true;
    modal.hidden = false;
    modal.inert = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('open');
      const focusable = modal.querySelector('input, textarea, button');
      focusable?.focus({ preventScroll: true });
    });
  }

  function closeModal(id) {
    const modal = el(id);
    if (!modal || modal.hidden) return;
    if (id === 'gameModal' && gameActive) finishGame(true);
    if (id === 'dodgeModal') finishDodge(true);
    if (id === 'memoryModal') finishMemory(true);
    modal.classList.remove('open');
    modal.inert = true;
    const returnFocus = previousFocus;
    setTimeout(() => {
      modal.hidden = true;
      if (!document.querySelector('.modal-backdrop.open')) {
        document.body.classList.remove('modal-open');
        document.querySelector('.app-shell').inert = false;
        returnFocus?.focus?.({ preventScroll: true });
      }
    }, 180);
  }

  function resizeImage(file, maxSize = 720, quality = .76) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function applyGiftParams() {
    if (state.initialized) return;
    const params = new URLSearchParams(location.search);
    state.partnerName = params.get('para')?.trim().slice(0, 24) || state.partnerName;
    state.petName = params.get('mascota')?.trim().slice(0, 18) || state.petName;
    state.signature = params.get('firma')?.trim().slice(0, 60) || state.signature;
    state.customNote = params.get('nota')?.trim().slice(0, 220) || state.customNote;
  }

  function registerEvents() {
    document.querySelectorAll('[data-modal]').forEach(button => button.addEventListener('click', () => {
      if (isBusy()) return toast(`${state.petName} está ocupado en este momento.`);
      openModal(button.dataset.modal);
    }));
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
    document.querySelectorAll('[data-care]').forEach(button => button.addEventListener('click', () => handleCare(button.dataset.care)));
    document.querySelectorAll('[data-walk]').forEach(button => button.addEventListener('click', () => handleWalk(button.dataset.walk)));
    document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => handleBuy(button.dataset.buy)));
    document.querySelectorAll('[data-arcade]').forEach(button => button.addEventListener('click', () => {
      if (!button.disabled) openArcadeGame(button.dataset.arcade);
    }));
    el('trainingChoices').addEventListener('click', event => {
      const button = event.target.closest('[data-train]');
      if (button && !button.disabled) handleTraining(button.dataset.train);
    });
    el('sleepBtn').addEventListener('click', handleSleepButton);
    el('petWrap').addEventListener('click', triggerPetReaction);
    el('petWrap').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      triggerPetReaction();
    });
    el('startGameBtn').addEventListener('click', startGame);
    el('ballTarget').addEventListener('click', resolveBallStrike);
    document.querySelectorAll('[data-ball-action]').forEach(button => button.addEventListener('click', () => handleBallAction(button.dataset.ballAction)));
    el('startDodgeBtn').addEventListener('click', startDodge);
    document.querySelectorAll('[data-dodge-act]').forEach(button => button.addEventListener('click', () => selectDodgeAct(button.dataset.dodgeAct)));
    el('startMemoryBtn').addEventListener('click', startMemory);
    document.querySelectorAll('[data-memory-pad]').forEach(button => button.addEventListener('click', () => handleMemoryPad(Number(button.dataset.memoryPad))));

    const movementKeys = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
    };
    document.addEventListener('keydown', event => {
      const direction = movementKeys[event.key];
      if (!dodgeActive || !direction) return;
      event.preventDefault();
      dodgeDirections.add(direction);
    });
    document.addEventListener('keyup', event => {
      const direction = movementKeys[event.key];
      if (direction) dodgeDirections.delete(direction);
    });
    window.addEventListener('blur', () => dodgeDirections.clear());
    document.querySelectorAll('[data-dodge-dir]').forEach(button => {
      const direction = button.dataset.dodgeDir;
      const press = event => {
        if (!dodgeActive) return;
        event.preventDefault();
        dodgeDirections.add(direction);
        button.classList.add('pressed');
      };
      const release = () => {
        dodgeDirections.delete(direction);
        button.classList.remove('pressed');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
    let dodgePointerId = null;
    el('dodgeArena').addEventListener('pointerdown', event => {
      if (!dodgeActive) return;
      dodgePointerId = event.pointerId;
      el('dodgeArena').setPointerCapture?.(event.pointerId);
      moveDodgePlayerToPointer(event);
    });
    el('dodgeArena').addEventListener('pointermove', event => {
      if (event.pointerId === dodgePointerId) moveDodgePlayerToPointer(event);
    });
    const endDodgePointer = event => {
      if (event.pointerId === dodgePointerId) dodgePointerId = null;
    };
    el('dodgeArena').addEventListener('pointerup', endDodgePointer);
    el('dodgeArena').addEventListener('pointercancel', endDodgePointer);

    el('settingsBtn').addEventListener('click', () => {
      el('settingsPartner').value = state.partnerName || '';
      el('settingsPet').value = state.petName || '';
      el('settingsSignature').value = state.signature || '';
      el('settingsNote').value = state.customNote || '';
      openModal('settingsModal');
    });
    el('saveSettingsBtn').addEventListener('click', () => {
      state.partnerName = el('settingsPartner').value.trim();
      state.petName = el('settingsPet').value.trim() || 'Milo';
      state.signature = el('settingsSignature').value.trim() || 'Creado con amor para ti 💗';
      state.customNote = el('settingsNote').value.trim();
      touch();
      saveState();
      render();
      closeModal('settingsModal');
      toast('Cambios guardados.');
    });
    el('resetBtn').addEventListener('click', () => {
      if (!confirm('¿Seguro que quieres reiniciar el progreso, inventario, diario y fotos?')) return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      state = defaultState();
      applyGiftParams();
      closeModal('settingsModal');
      render();
      openModal('welcomeModal');
    });
    el('startBtn').addEventListener('click', () => {
      const partner = el('partnerInput').value.trim();
      const pet = el('petInput').value.trim() || 'Milo';
      state.initialized = true;
      state.partnerName = partner;
      state.petName = pet;
      state.personality = assignPersonality(`${partner}-${pet}-${state.createdAt}`);
      state.lastUpdated = now();
      state.lastVisitDate = localDateKey();
      state.day = { key: localDateKey(), actions: 0, bonusClaimed: true };
      setActivity('exploring', 20000);
      addJournal('🏡', 'Llegó a casa', `${pet} empezó a explorar su nuevo hogar y a conocerte.`);
      if (state.customNote) addJournal('💌', 'Un mensaje especial', state.customNote);
      saveState();
      render();
      closeModal('welcomeModal');
      createSparkles('💗');
      speak(`¡Hola${partner ? `, ${partner}` : ''}! Soy ${pet}.`);
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
      if (event.target === backdrop && backdrop.id !== 'welcomeModal') closeModal(backdrop.id);
    }));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const open = document.querySelector('.modal-backdrop.open');
      if (open && open.id !== 'welcomeModal') closeModal(open.id);
    });

    el('uploadBtn').addEventListener('click', () => {
      if (state.photos.length >= MAX_PHOTOS) return toast('Ya llenaste los seis espacios de recuerdos.');
      el('photoInput').click();
    });
    el('photoInput').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) return toast('Selecciona una imagen válida.');
      try {
        const encoded = await resizeImage(file);
        state.photos.push(encoded);
        addJournal('📸', 'Un recuerdo nuevo', 'Guardaste una foto especial en su diario de vida.');
        touch();
        if (!saveState()) {
          state.photos.pop();
          if (state.journal[0]?.title === 'Un recuerdo nuevo') state.journal.shift();
        }
        else {
          renderPhotos();
          renderDiary();
          toast('Recuerdo guardado.');
        }
      } catch (_) {
        toast('No pude guardar esa foto. Intenta con otra.');
      }
    });
  }

  function init() {
    applyGiftParams();
    registerEvents();
    if (state.initialized) {
      const elapsed = advanceSimulation();
      runOfflineAutonomy(elapsed);
      ensureDailyVisit();
      resolveActivity();
      if (!state.activity.type) chooseIdleActivity();
      touch();
      saveState();
    }
    render();
    if (!state.initialized) {
      el('partnerInput').value = state.partnerName || '';
      el('petInput').value = state.petName || 'Milo';
      openModal('welcomeModal');
    } else {
      setTimeout(() => {
        const greetings = state.isAsleep
          ? ['Zzz…', 'Estoy descansando…']
          : [`¡Qué bueno que volviste${state.partnerName ? `, ${state.partnerName}` : ''}!`, '¡Tengo muchas cosas que contarte!', '¡Llegaste justo a tiempo!'];
        speak(pick(greetings));
      }, 650);
    }

    clearInterval(activityTimerInterval);
    activityTimerInterval = setInterval(() => {
      renderClock();
      renderActivityTimer();
      if (!state.isAsleep && state.activity.endsAt && state.activity.endsAt <= now()) {
        chooseIdleActivity();
        touch();
        saveState();
        renderScene();
      }
    }, 1000);
    setInterval(autonomousTick, 15000);
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  init();
})();
