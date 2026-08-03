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

  const ACTIVITY_PRESETS = {
    idle: { icon: '🐾', title: 'Descansando', description: 'Está tranquilo, observando lo que ocurre en casa.', css: '' },
    exploring: { icon: '🔎', title: 'Explorando', description: 'Está revisando cada rincón de su hogar.', css: 'walking' },
    watching: { icon: '🪟', title: 'Mirando la ventana', description: 'Observa el mundo y mueve la cola cuando pasa alguien.', css: '' },
    toy: { icon: '🧸', title: 'Jugando solo', description: 'Encontró su juguete y se entretiene por su cuenta.', css: 'playing' },
    guarding: { icon: '👂', title: 'Escuchando ruidos', description: 'Está atento, cuidando la casa como todo un guardián.', css: '' },
    eating: { icon: '🍲', title: 'Comiendo', description: 'Decidió comer lo que dejaste en su cuenco.', css: 'eating' },
    drinking: { icon: '💧', title: 'Bebiendo agua', description: 'Fue a hidratarse por su cuenta.', css: 'drinking' },
    sleeping: { icon: '🌙', title: 'Durmiendo', description: 'Está recuperando energía. Puedes dejarlo descansar o despertarlo.', css: 'sleeping' },
    walking: { icon: '🦮', title: 'De paseo', description: 'Está explorando y olfateando todo a su alrededor.', css: 'walking' },
    training: { icon: '🎓', title: 'Entrenando', description: 'Está concentrado en aprender algo nuevo.', css: 'training' },
    playing: { icon: '🎾', title: 'Jugando contigo', description: 'Corre detrás de la pelota con toda su energía.', css: 'playing' },
    bathing: { icon: '🛁', title: 'Hora del baño', description: 'No está muy convencido, pero quedará impecable.', css: 'playing' },
    brushing: { icon: '🪮', title: 'Disfrutando el cepillado', description: 'Se está relajando mientras lo cepillas.', css: '' }
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
    habits: { care: 0, walk: 0, train: 0, play: 0, sleep: 0 },
    activity: { type: 'exploring', startedAt: now(), endsAt: now() + 18000 },
    isAsleep: false,
    sleepMode: '',
    sleepStartedAt: 0,
    sleepUntil: 0,
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
  let gameSeconds = 15;
  let previousFocus = null;

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
      habits: { ...base.habits, ...(saved.habits || {}) },
      activity: { ...base.activity, ...(saved.activity || {}) },
      day: { ...base.day, ...(saved.day || {}) }
    };
    normalized.photos = Array.isArray(saved.photos) ? saved.photos.slice(0, MAX_PHOTOS) : [];
    normalized.journal = Array.isArray(saved.journal) ? saved.journal.slice(0, 30) : [];
    if (!PERSONALITIES[normalized.personality]) normalized.personality = 'curious';
    Object.keys(normalized.stats).forEach(key => normalized.stats[key] = clamp(normalized.stats[key]));
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
    const personality = PERSONALITIES[state.personality];
    state.stats.energy = clamp(state.stats.energy + hours * 12 * (personality.rest || 1));
    state.stats.food = clamp(state.stats.food - hours * 1.5);
    state.stats.water = clamp(state.stats.water - hours * 1.8);
    state.stats.hygiene = clamp(state.stats.hygiene - hours * .35);
    state.stress = clamp(state.stress - hours * 4.2);
    if (state.stats.health < 100) state.stats.health = clamp(state.stats.health + hours * .65);
  }

  function advanceSimulation(current = now()) {
    if (!state.initialized) return 0;
    const previous = Number(state.lastUpdated) || current;
    const elapsedHours = Math.min(72, Math.max(0, (current - previous) / 3_600_000));
    if (elapsedHours < .0002) return elapsedHours;

    if (state.isAsleep) {
      const endOfSleep = Math.min(current, Number(state.sleepUntil) || current);
      const sleepHours = Math.max(0, (endOfSleep - previous) / 3_600_000);
      applySleepRecovery(Math.min(elapsedHours, sleepHours));
      const awakeHours = Math.max(0, elapsedHours - sleepHours);
      if (current >= state.sleepUntil) wakePet(false);
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
      description: custom.description || preset.description
    };
  }

  function activityPreset() {
    return { ...(ACTIVITY_PRESETS[state.activity.type] || ACTIVITY_PRESETS.idle), ...state.activity };
  }

  function isBusy() {
    return gameActive || state.isAsleep || (state.activity.endsAt > now() && !['idle', 'exploring', 'watching', 'toy', 'guarding'].includes(state.activity.type));
  }

  function resolveActivity() {
    if (state.isAsleep) return;
    if (state.activity.endsAt && state.activity.endsAt <= now()) chooseIdleActivity();
  }

  function chooseIdleActivity() {
    const hour = new Date().getHours();
    const options = ['idle', 'exploring', 'watching', 'guarding', 'toy'];
    if (state.stats.energy < 35) options.push('idle', 'idle');
    if (state.personality === 'playful') options.push('toy', 'toy');
    if (hour >= 21 || hour < 7) options.push('idle', 'watching');
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
    else if (isBedtime && state.stats.energy < 62 && !isBusy()) {
      beginSleep('night', 8 * 3_600_000, true);
    }
    else if (state.stats.energy < 16 && !isBusy()) {
      beginSleep('nap', 3 * 60_000, true);
    } else if (!isBusy() && Math.random() < .45) {
      chooseIdleActivity();
    }

    touch();
    saveState();
    render();
  }

  function beginSleep(mode = 'night', duration = 8 * 3_600_000, automatic = false) {
    if (state.isAsleep) return;
    state.isAsleep = true;
    state.sleepMode = mode;
    state.sleepStartedAt = now();
    state.sleepUntil = now() + duration;
    setActivity('sleeping');
    recordHabit('sleep');
    addJournal('🌙', mode === 'nap' ? 'Tomó una siesta' : 'Hora de dormir', automatic ? `${state.petName} estaba agotado y decidió acostarse por su cuenta.` : `Lo arropaste para que recupere toda su energía.`);
    if (!automatic) speak('Dormiré un rato… zzz.');
    touch();
    saveState();
    render();
  }

  function wakePet(byUser = true) {
    if (!state.isAsleep) return;
    if (byUser) advanceSimulation();
    const sleptMinutes = Math.max(0, Math.round((now() - state.sleepStartedAt) / 60000));
    const early = state.sleepUntil > now() + 60000;
    state.isAsleep = false;
    state.sleepMode = '';
    state.sleepUntil = 0;
    if (byUser && early) modifyStats({ mood: -3, stress: 2 });
    setActivity('idle', 9000, { title: 'Recién despierto', description: 'Está estirando las patas y mirando a su alrededor.', icon: '🥱' });
    if (byUser) {
      addJournal('🥱', 'Se despertó', `Descansó ${sleptMinutes || 'unos'} minutos${early ? ', aunque todavía tenía un poco de sueño.' : '.'}`);
      speak(early ? '¿Ya es hora de levantarse?' : '¡Qué bien dormí!');
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
    modifyStats({ energy: -9, food: -3, water: -4, mood: hasTreat ? 5 : 2, bond: 3, stress: focus < 30 ? 3 : -1 });
    state.traits.discipline = clamp(state.traits.discipline + 1.8);
    state.traits.trust = clamp(state.traits.trust + 1.1);
    state.coins += 3;
    gainXp(11 + afterLevel * 2);
    recordHabit('train');
    setActivity('training', 4500, { title: `Practicando: ${skill.name}`, description: hasTreat ? 'El premio ayudó a mantener toda su atención.' : 'Está intentando comprender la señal.' });
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

  function startGame() {
    if (gameActive) return;
    if (state.isAsleep || isBusy()) return toast(`${state.petName} no puede jugar ahora.`);
    if (state.stats.energy < 18) return toast('Está demasiado cansado para jugar.');
    gameActive = true;
    gameScore = 0;
    gameSeconds = 15;
    el('gameScore').textContent = '0';
    el('gameTime').textContent = '15';
    el('gameMessage').hidden = true;
    el('ballTarget').style.display = 'block';
    el('startGameBtn').disabled = true;
    el('startGameBtn').textContent = '¡Atrápala!';
    moveBall();
    gameInterval = setInterval(() => {
      gameSeconds -= 1;
      el('gameTime').textContent = String(gameSeconds);
      if (gameSeconds <= 0) finishGame(false);
    }, 1000);
  }

  function moveBall() {
    const ball = el('ballTarget');
    ball.style.left = `${7 + Math.random() * 76}%`;
    ball.style.top = `${8 + Math.random() * 70}%`;
  }

  function catchBall() {
    if (!gameActive) return;
    gameScore += 1;
    el('gameScore').textContent = String(gameScore);
    moveBall();
  }

  function finishGame(cancelled = false) {
    clearInterval(gameInterval);
    gameInterval = null;
    if (!gameActive) return;
    gameActive = false;
    el('ballTarget').style.display = 'none';
    el('startGameBtn').disabled = false;
    el('startGameBtn').textContent = 'Jugar otra vez';
    el('gameMessage').hidden = false;
    if (cancelled) {
      el('gameMessage').textContent = 'Partida pausada.';
      return;
    }

    const personalityBonus = PERSONALITIES[state.personality].play || 1;
    const coins = Math.max(2, Math.min(22, Math.round(gameScore * personalityBonus)));
    modifyStats({ energy: -Math.min(20, 6 + gameScore * .55), water: -5, food: -3, mood: Math.min(25, gameScore * 1.8 * personalityBonus), bond: 5, stress: -6 });
    state.coins += coins;
    gainXp(8 + gameScore);
    recordHabit('play');
    setActivity('playing', 5000, { description: `Atrapaste la pelota ${gameScore} veces. ${state.petName} está feliz y agotado.` });
    addJournal('🎾', 'Jugaron a la pelota', `Atrapaste ${gameScore} pelotas y ganaron ${coins} monedas.`);
    el('gameMessage').textContent = `${gameScore} atrapadas · +${coins} monedas`;
    speak(gameScore >= 10 ? '¡Eres increíble! ¡Otra vez!' : '¡Esa casi se me escapa!');
    createSparkles('🎾');
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
      valueEl.closest('.need')?.classList.toggle('urgent', value < 25);
    });
    const minimum = Math.min(state.stats.food, state.stats.water, state.stats.energy, state.stats.hygiene, state.stats.health);
    const badge = el('overallBadge');
    badge.className = 'overall-badge';
    if (minimum < 25) {
      badge.textContent = 'Necesita ayuda';
      badge.classList.add('critical');
    } else if (minimum < 48) {
      badge.textContent = 'Ponle atención';
      badge.classList.add('warning');
    } else badge.textContent = 'Todo bien';

    const previous = state.level > 1 ? LEVELS[state.level - 2] || 0 : 0;
    const target = LEVELS[state.level - 1] || LEVELS.at(-1) + 600;
    const progress = clamp(((state.xp - previous) / Math.max(1, target - previous)) * 100);
    el('xpLabel').textContent = `${Math.max(0, state.xp - previous)} / ${target - previous}`;
    el('xpBar').style.width = `${progress}%`;
  }

  function renderScene() {
    el('petName').textContent = state.petName || 'Milo';
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
    wrap.className = `pet-wrap ${activity.css || ''}`.trim();

    const dog = el('dog');
    const average = (state.stats.food + state.stats.water + state.stats.energy + state.stats.hygiene + state.stats.health + state.mood) / 6;
    dog.className = 'dog';
    if (state.isAsleep || state.stats.energy < 22) dog.classList.add('sleepy-face');
    else if (state.stats.health < 40) dog.classList.add('sick-face');
    else if (average < 44 || state.stress > 70) dog.classList.add('sad-face');
    else dog.classList.add('happy-face');
    if (state.stats.hygiene < 36) dog.classList.add('dirty');

    el('sleepActionTitle').textContent = state.isAsleep ? 'Despertar' : 'Dormir';
    el('sleepActionCopy').textContent = state.isAsleep ? 'Interrumpir descanso' : 'Descanso de verdad';
    document.querySelectorAll('.action-card:not(#sleepBtn)').forEach(button => button.disabled = isBusy());
  }

  function renderHome() {
    el('coinValue').textContent = String(state.coins);
    el('shopCoinValue').textContent = String(state.coins);
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
        <span>${locked ? '🔒' : skill.icon}</span><span><strong>${skill.name}</strong><small>${locked ? `Disponible en nivel ${skill.unlock}` : `${Math.round(state.skills[key])}% aprendido · consume energía${state.inventory.treat ? ' y 1 premio' : ''}`}</small></span><b>${locked ? '' : `Nv. ${level}`}</b>
      </button>`;
    }).join('');

    document.querySelectorAll('[data-walk]').forEach(button => {
      const route = WALK_ROUTES[button.dataset.walk];
      button.disabled = state.level < route.level || isBusy();
    });
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
    if (!target || target <= now()) {
      timer.textContent = '';
      return;
    }
    const remaining = Math.max(0, target - now());
    if (remaining >= 3_600_000) {
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      timer.textContent = `${hours}h ${minutes}m`;
    } else if (remaining >= 60_000) timer.textContent = `${Math.ceil(remaining / 60_000)} min`;
    else timer.textContent = `${Math.ceil(remaining / 1000)} s`;
  }

  function render() {
    renderClock();
    renderNeeds();
    renderScene();
    renderHome();
    renderPersonality();
    renderSkills();
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

  function createSparkles(symbol) {
    const container = el('sparkles');
    for (let i = 0; i < 8; i++) {
      const sparkle = document.createElement('span');
      sparkle.className = 'sparkle';
      sparkle.textContent = symbol;
      sparkle.style.left = `${14 + Math.random() * 72}%`;
      sparkle.style.top = `${34 + Math.random() * 45}%`;
      sparkle.style.animationDelay = `${Math.random() * .22}s`;
      container.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 1500);
    }
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
    el('trainingChoices').addEventListener('click', event => {
      const button = event.target.closest('[data-train]');
      if (button && !button.disabled) handleTraining(button.dataset.train);
    });
    el('sleepBtn').addEventListener('click', handleSleepButton);
    el('startGameBtn').addEventListener('click', startGame);
    el('ballTarget').addEventListener('click', catchBall);

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
