(() => {
      'use strict';

      const STORAGE_KEY = 'romantic-pet-v1';
      const MAX_PHOTOS = 6;
      const statDecayPerHour = { food: 2.2, happy: 1.3, energy: 1.6, clean: 1.0 };
      const levels = [80, 130, 190, 260, 340, 430, 530, 640];

      const defaultState = () => ({
        initialized: false,
        partnerName: '',
        petName: 'Milo',
        signature: 'Creado con amor para ti 💗',
        customNote: '',
        stats: { food: 84, happy: 88, energy: 78, clean: 91 },
        xp: 0,
        level: 1,
        interactions: 0,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        lastVisitDate: '',
        streak: 1,
        photos: [],
        unlocked: []
      });

      const loveNotes = [
        'Contigo, incluso los días normales se vuelven recuerdos bonitos.',
        'Gracias por existir y por hacer mi vida más bonita.',
        'Mi lugar favorito siempre será donde pueda estar contigo.',
        'No quiero una vida perfecta; quiero una vida llena de momentos contigo.',
        'Eres una de las decisiones más bonitas que ha tomado mi corazón.',
        'Ojalá nunca dejemos de reírnos por cosas que solo nosotros entendemos.',
        'Quiero seguir llenando páginas, fotos y años a tu lado.',
        'Tú haces que el futuro se sienta como un lugar al que sí quiero llegar.',
        'Te elegiría una y otra vez, incluso en nuestros días más simples.',
        'Lo mejor de mis recuerdos es que muchos llevan tu sonrisa.'
      ];

      const unlockables = [
        { level: 2, icon: '💌', title: 'Primer mensaje', text: 'Una sorpresa escrita especialmente para ti.' },
        { level: 3, icon: '📸', title: 'Nuestro recuerdo', text: 'Momento perfecto para guardar una foto juntos.' },
        { level: 5, icon: '🌹', title: 'Cita desbloqueada', text: 'Vale por una salida elegida entre los dos.' },
        { level: 7, icon: '🏡', title: 'Nuestro futuro', text: 'Una promesa para seguir construyendo juntos.' }
      ];

      let state = loadState();
      const giftParams = new URLSearchParams(location.search);
      if (!state.initialized) {
        state.partnerName = giftParams.get('para')?.trim().slice(0, 24) || state.partnerName;
        state.petName = giftParams.get('mascota')?.trim().slice(0, 18) || state.petName;
        state.signature = giftParams.get('firma')?.trim().slice(0, 60) || state.signature;
        state.customNote = giftParams.get('nota')?.trim().slice(0, 220) || state.customNote;
      }
      let speechTimer = null;
      let toastTimer = null;

      const el = id => document.getElementById(id);
      const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
      const todayKey = () => new Date().toISOString().slice(0, 10);

      function loadState() {
        try {
          const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
          return { ...defaultState(), ...(parsed || {}), stats: { ...defaultState().stats, ...((parsed || {}).stats || {}) } };
        } catch (_) {
          return defaultState();
        }
      }

      function saveState() {
        state.lastUpdated = Date.now();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
          if (String(error).toLowerCase().includes('quota')) {
            toast('No queda espacio para más fotos en este dispositivo.');
          }
        }
      }

      function applyElapsedTime() {
        const now = Date.now();
        const elapsedHours = Math.min((now - (state.lastUpdated || now)) / 3_600_000, 72);
        Object.entries(statDecayPerHour).forEach(([key, rate]) => {
          state.stats[key] = clamp(state.stats[key] - elapsedHours * rate);
        });

        const today = todayKey();
        if (!state.lastVisitDate) {
          state.lastVisitDate = today;
        } else if (state.lastVisitDate !== today) {
          const previous = new Date(state.lastVisitDate + 'T12:00:00');
          const current = new Date(today + 'T12:00:00');
          const days = Math.round((current - previous) / 86_400_000);
          state.streak = days === 1 ? (state.streak || 1) + 1 : 1;
          state.lastVisitDate = today;
        }
        saveState();
      }

      function statColor(value) {
        if (value < 25) return '#d95c72';
        if (value < 50) return '#e8a14b';
        return '#70b98a';
      }

      function currentStage() {
        if (state.level >= 7) return 'Tu compañero inseparable';
        if (state.level >= 4) return 'Un perrito lleno de amor';
        return 'Un cachorro feliz de estar contigo';
      }

      function render() {
        el('petName').textContent = state.petName || 'Milo';
        el('petSubtitle').textContent = currentStage();
        el('levelPill').textContent = `Nivel ${state.level}`;
        el('signature').textContent = state.signature || 'Creado con amor para ti 💗';
        el('streakValue').textContent = `${state.streak || 1} ${(state.streak || 1) === 1 ? 'día' : 'días'}`;

        const noteIndex = Math.abs(hashCode(todayKey() + (state.partnerName || 'amor'))) % loveNotes.length;
        const note = state.customNote?.trim() || loveNotes[noteIndex];
        el('dailyNote').textContent = `“${note}”`;

        ['food', 'happy', 'energy', 'clean'].forEach(key => {
          const value = Math.round(state.stats[key]);
          el(`${key}Value`).textContent = `${value}%`;
          const bar = el(`${key}Bar`);
          bar.style.width = `${value}%`;
          bar.style.background = statColor(value);
        });

        const levelTarget = levels[state.level - 1] || 760;
        const previousTarget = state.level > 1 ? (levels[state.level - 2] || 0) : 0;
        const progress = clamp(((state.xp - previousTarget) / Math.max(1, levelTarget - previousTarget)) * 100);
        el('xpFill').style.width = `${progress}%`;
        el('xpLabel').textContent = `${Math.max(0, state.xp - previousTarget)} / ${levelTarget - previousTarget} amor`;

        updateMood();
        renderUnlocks();
        renderPhotos();
      }

      function updateMood() {
        const dog = el('dog');
        const wrap = el('petWrap');
        dog.className = 'dog';
        wrap.classList.remove('sleeping');

        const avg = Object.values(state.stats).reduce((a, b) => a + b, 0) / 4;
        if (state.stats.energy < 25) {
          dog.classList.add('sleepy-face');
          wrap.classList.add('sleeping');
        } else if (avg < 38 || state.stats.food < 20) {
          dog.classList.add('sad-face');
        } else {
          dog.classList.add('happy-face');
        }
        if (state.stats.clean < 35) dog.classList.add('dirty');
      }

      function renderUnlocks() {
        const container = el('unlockList');
        container.innerHTML = '';
        unlockables.forEach(item => {
          const open = state.level >= item.level;
          if (open && !state.unlocked.includes(item.level)) state.unlocked.push(item.level);
          const div = document.createElement('div');
          div.className = `unlock${open ? '' : ' locked'}`;
          div.innerHTML = `
            <div class="unlock-icon">${open ? item.icon : '🔒'}</div>
            <div class="unlock-copy">
              <strong>${open ? item.title : `Nivel ${item.level}`}</strong>
              <span>${open ? item.text : 'Sigue cuidándolo para descubrirlo.'}</span>
            </div>`;
          container.appendChild(div);
        });
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
            remove.setAttribute('aria-label', 'Eliminar foto');
            remove.addEventListener('click', () => {
              state.photos.splice(i, 1);
              saveState();
              renderPhotos();
            });
            item.appendChild(remove);
          } else {
            item.textContent = '♡';
          }
          grid.appendChild(item);
        }
      }

      function doAction(action) {
        const actions = {
          feed: {
            changes: { food: 22, happy: 3, clean: -3 },
            xp: 12,
            messages: ['¡Qué rico! 🍓', 'Eso estaba delicioso.', 'Gracias por cuidarme.']
          },
          play: {
            changes: { happy: 24, energy: -8, food: -4 },
            xp: 15,
            messages: ['¡Otra vez! 🎾', 'Me encanta jugar contigo.', '¡Eres mi persona favorita!']
          },
          clean: {
            changes: { clean: 30, happy: 4 },
            xp: 11,
            messages: ['¡Quedé guapísimo! 🫧', 'Ahora huelo muy bonito.', 'Gracias por el baño.']
          },
          sleep: {
            changes: { energy: 34, food: -3 },
            xp: 10,
            messages: ['Dormiré pensando en ti. 🌙', 'Zzz… te quiero.', 'Cinco minutitos más…']
          }
        };
        const data = actions[action];
        if (!data) return;

        Object.entries(data.changes).forEach(([key, change]) => {
          state.stats[key] = clamp(state.stats[key] + change);
        });
        state.xp += data.xp;
        state.interactions += 1;

        const oldLevel = state.level;
        while (state.level <= levels.length && state.xp >= levels[state.level - 1]) state.level += 1;
        if (state.level > oldLevel) {
          confetti();
          toast(`¡${state.petName} llegó al nivel ${state.level}!`);
        }

        saveState();
        render();
        animatePet(action);
        speak(data.messages[Math.floor(Math.random() * data.messages.length)]);
      }

      function animatePet(action) {
        const wrap = el('petWrap');
        wrap.classList.remove('bounce');
        void wrap.offsetWidth;
        wrap.classList.add('bounce');
        createSparkles(action === 'clean' ? '🫧' : action === 'feed' ? '💗' : action === 'sleep' ? '✨' : '⭐');
      }

      function createSparkles(symbol) {
        const container = el('sparkles');
        for (let i = 0; i < 7; i++) {
          const s = document.createElement('span');
          s.className = 'sparkle';
          s.textContent = symbol;
          s.style.left = `${26 + Math.random() * 50}%`;
          s.style.top = `${42 + Math.random() * 28}%`;
          s.style.animationDelay = `${Math.random() * .18}s`;
          container.appendChild(s);
          setTimeout(() => s.remove(), 1300);
        }
      }

      function speak(message) {
        const speech = el('speech');
        clearTimeout(speechTimer);
        speech.textContent = message;
        speech.classList.add('show');
        speechTimer = setTimeout(() => speech.classList.remove('show'), 2200);
      }

      function toast(message) {
        const t = el('toast');
        clearTimeout(toastTimer);
        t.textContent = message;
        t.classList.add('show');
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
      }

      function confetti() {
        const colors = ['#e77da7','#f2bd56','#9f8ce6','#70b98a','#6ab8d9'];
        for (let i = 0; i < 34; i++) {
          const piece = document.createElement('i');
          piece.className = 'confetti-piece';
          piece.style.left = `${Math.random() * 100}vw`;
          piece.style.background = colors[i % colors.length];
          piece.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
          piece.style.animationDelay = `${Math.random() * .45}s`;
          document.body.appendChild(piece);
          setTimeout(() => piece.remove(), 3200);
        }
      }

      function openModal(id) { el(id).classList.add('open'); }
      function closeModal(id) { el(id).classList.remove('open'); }

      function resizeImage(file, maxSize = 720, quality = .78) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
              let { width, height } = img;
              const scale = Math.min(1, maxSize / Math.max(width, height));
              width = Math.round(width * scale);
              height = Math.round(height * scale);
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        });
      }

      function hashCode(value) {
        let hash = 0;
        for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash) + value.charCodeAt(i) | 0;
        return hash;
      }

      document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => doAction(button.dataset.action));
      });

      el('settingsBtn').addEventListener('click', () => {
        el('settingsPartner').value = state.partnerName || '';
        el('settingsPet').value = state.petName || '';
        el('settingsSignature').value = state.signature || '';
        el('settingsNote').value = state.customNote || '';
        openModal('settingsModal');
      });

      el('closeSettingsBtn').addEventListener('click', () => closeModal('settingsModal'));
      el('saveSettingsBtn').addEventListener('click', () => {
        state.partnerName = el('settingsPartner').value.trim();
        state.petName = el('settingsPet').value.trim() || 'Milo';
        state.signature = el('settingsSignature').value.trim() || 'Creado con amor para ti 💗';
        state.customNote = el('settingsNote').value.trim();
        saveState();
        render();
        closeModal('settingsModal');
        toast('Personalización guardada 💗');
      });

      el('resetBtn').addEventListener('click', () => {
        const okay = confirm('¿Seguro que quieres reiniciar todo el progreso y las fotos?');
        if (!okay) return;
        state = defaultState();
        localStorage.removeItem(STORAGE_KEY);
        closeModal('settingsModal');
        render();
        openModal('welcomeModal');
      });

      el('startBtn').addEventListener('click', () => {
        const partner = el('partnerInput').value.trim();
        const pet = el('petInput').value.trim();
        state.initialized = true;
        state.partnerName = partner;
        state.petName = pet || 'Milo';
        state.createdAt = Date.now();
        state.lastUpdated = Date.now();
        state.lastVisitDate = todayKey();
        saveState();
        render();
        closeModal('welcomeModal');
        confetti();
        speak(`¡Hola${partner ? ', ' + partner : ''}! Soy ${state.petName}.`);
      });

      el('uploadBtn').addEventListener('click', () => {
        if (state.photos.length >= MAX_PHOTOS) {
          toast('Ya llenaste los seis espacios de recuerdos.');
          return;
        }
        el('photoInput').click();
      });

      el('photoInput').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          toast('Selecciona una imagen válida.');
          return;
        }
        try {
          const encoded = await resizeImage(file);
          state.photos.push(encoded);
          saveState();
          renderPhotos();
          toast('Recuerdo guardado 📸');
        } catch (_) {
          toast('No pude guardar esa foto. Intenta con otra.');
        }
      });

      [el('welcomeModal'), el('settingsModal')].forEach(backdrop => {
        backdrop.addEventListener('click', event => {
          if (event.target === backdrop && backdrop.id !== 'welcomeModal') closeModal(backdrop.id);
        });
      });

      applyElapsedTime();
      render();
      if (!state.initialized) {
        el('partnerInput').value = state.partnerName || '';
        el('petInput').value = state.petName || '';
        openModal('welcomeModal');
      }
      else setTimeout(() => speak(`¡Qué bueno que volviste${state.partnerName ? ', ' + state.partnerName : ''}!`), 450);

      setInterval(() => {
        Object.entries(statDecayPerHour).forEach(([key, rate]) => {
          state.stats[key] = clamp(state.stats[key] - rate / 60);
        });
        saveState();
        render();
      }, 60_000);

      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
      }
    })();
