const defaults = { gravity: 1700, jump: 600, speed: 250, airControl: 60, coyote: 100 };
const ranges = {
  gravity: [500, 3000], jump: [300, 900], speed: [80, 500], airControl: [0, 100], coyote: [0, 220],
};
const labels = {
  gravity: ['Gravity', ''], jump: ['Jump force', ''], speed: ['Run speed', ''],
  airControl: ['Air control', '%'], coyote: ['Coyote time', 'ms'],
};
const settings = { ...defaults };
const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const keys = { left: false, right: false, jumpQueued: false };
const playerSize = { w: 34, h: 44 };
const platforms = [
  { x: 0, y: 408, w: 330, h: 72 },
  { x: 425, y: 408, w: 275, h: 72 },
  { x: 785, y: 408, w: 175, h: 72 },
  { x: 535, y: 318, w: 105, h: 18 },
];
let player;
let previous = performance.now();

function restart() {
  player = { x: 110, y: 408 - playerSize.h, vx: 0, vy: 0, grounded: true, lastGrounded: performance.now() };
}

function updateOutputs() {
  Object.entries(labels).forEach(([key, [, unit]]) => {
    const input = document.querySelector(`#${key}`);
    input.value = settings[key];
    document.querySelector(`output[for="${key}"]`).textContent = `${settings[key]}${unit}`;
  });
}

Object.keys(settings).forEach((key) => {
  document.querySelector(`#${key}`).addEventListener('input', (event) => {
    settings[key] = Number(event.target.value);
    updateOutputs();
  });
});

document.querySelector('#restart').addEventListener('click', restart);
document.querySelector('#reset-settings').addEventListener('click', () => {
  Object.assign(settings, defaults);
  updateOutputs();
});
document.querySelector('#copy-settings').addEventListener('click', async () => {
  const summary = Object.entries(labels).map(([key, [label, unit]]) => `${label}: ${settings[key]}${unit}`).join('\n');
  await navigator.clipboard.writeText(summary);
  const text = document.querySelector('#copy-settings span');
  text.textContent = 'Copied';
  window.setTimeout(() => { text.textContent = 'Copy settings'; }, 1600);
});

function keyboard(event, down) {
  if (event.target.matches('input,button,textarea,select')) return;
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = down;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = down;
  if (event.code === 'Space') {
    event.preventDefault();
    if (down && !event.repeat) keys.jumpQueued = true;
  }
}
window.addEventListener('keydown', (event) => keyboard(event, true));
window.addEventListener('keyup', (event) => keyboard(event, false));

document.querySelectorAll('[data-move]').forEach((button) => {
  const direction = button.dataset.move;
  button.addEventListener('pointerdown', () => { keys[direction] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((name) => button.addEventListener(name, () => { keys[direction] = false; }));
});
document.querySelector('#touch-jump').addEventListener('pointerdown', () => { keys.jumpQueued = true; });

function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.024);
  previous = now;
  const direction = Number(keys.right) - Number(keys.left);
  const acceleration = player.grounded ? 2600 : 2600 * settings.airControl / 100;
  player.vx += direction * acceleration * dt;
  if (direction === 0 && player.grounded) player.vx *= Math.pow(0.0008, dt);
  player.vx = Math.max(-settings.speed, Math.min(settings.speed, player.vx));

  if (keys.jumpQueued) {
    if (player.grounded || now - player.lastGrounded <= settings.coyote) {
      player.vy = -settings.jump;
      player.grounded = false;
      player.lastGrounded = -Infinity;
    }
    keys.jumpQueued = false;
  }

  const oldBottom = player.y + playerSize.h;
  player.vy += settings.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(canvas.width - playerSize.w, player.x));
  player.grounded = false;

  if (player.vy >= 0) {
    const newBottom = player.y + playerSize.h;
    for (const platform of platforms) {
      const overlapsX = player.x + playerSize.w > platform.x && player.x < platform.x + platform.w;
      if (overlapsX && oldBottom <= platform.y + 2 && newBottom >= platform.y) {
        player.y = platform.y - playerSize.h;
        player.vy = 0;
        player.grounded = true;
        player.lastGrounded = now;
        break;
      }
    }
  }
  if (player.y > canvas.height + 80) restart();
  draw();
  requestAnimationFrame(frame);
}

function draw() {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#111522');
  sky.addColorStop(1, '#202838');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 28; i += 1) {
    const x = (i * 173) % canvas.width;
    const y = 40 + ((i * 71) % 250);
    context.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }
  context.fillStyle = '#f6c945';
  context.fillRect(42, 78, 58, 8);
  context.font = '600 18px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText('FEEL LAB', 42, 66);
  platforms.forEach((platform) => {
    context.fillStyle = '#ecf0f3';
    context.fillRect(platform.x, platform.y, platform.w, platform.h);
    context.fillStyle = '#aeb9c6';
    context.fillRect(platform.x, platform.y, platform.w, 7);
  });
  context.fillStyle = '#67d3b2';
  context.fillRect(player.x, player.y, playerSize.w, playerSize.h);
  context.fillStyle = '#111522';
  context.fillRect(player.x + 20, player.y + 10, 5, 5);
  context.fillStyle = '#f6c945';
  context.fillRect(player.x + 5, player.y + playerSize.h - 7, 24, 5);
}

function registerWebMcp() {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  document.modelContext.registerTool({
    name: 'configure_jump_feel',
    title: 'Configure jump feel',
    description: 'Set one or more visible jump-feel sliders to test a combination.',
    inputSchema: {
      type: 'object',
      properties: Object.fromEntries(Object.entries(ranges).map(([key, [minimum, maximum]]) => [key, { type: 'number', minimum, maximum }])),
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== 'object') throw new Error('Settings must be an object.');
      Object.entries(input).forEach(([key, value]) => {
        if (!ranges[key] || typeof value !== 'number' || value < ranges[key][0] || value > ranges[key][1]) throw new Error(`Invalid ${key}.`);
      });
      Object.assign(settings, input);
      updateOutputs();
      return { status: 'updated', settings: input };
    },
  }, { signal: lifecycle.signal });
  document.modelContext.registerTool({
    name: 'reset_jump_experiment',
    title: 'Reset jump experiment',
    description: 'Restore the default sliders and return the character to the start.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute() {
      Object.assign(settings, defaults);
      updateOutputs();
      restart();
      return { status: 'reset', settings: defaults };
    },
  }, { signal: lifecycle.signal });
}

restart();
updateOutputs();
registerWebMcp();
requestAnimationFrame(frame);
