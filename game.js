'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 800, H = 300;
const GROUND_Y = 240;
const GRAVITY = 1400;
const JUMP_VEL = -580;
const PLAYER_X = 80;

const STATE = { MENU: 0, ALERT: 1, PLAYING: 2, LEVEL_COMPLETE: 3, GAME_OVER: 4, VICTORY: 5, CRASH_ANIM: 6 };

const LEVELS = [
  { time: 60, speed: 1.0, spawnMult: 1.0  },
  { time: 45, speed: 1.3, spawnMult: 0.80 },
  { time: 30, speed: 1.7, spawnMult: 0.60 },
  { time: 15, speed: 2.2, spawnMult: 0.40 },
];

const BASE_SPEED = 312;
const BASE_SPAWN_INTERVAL = 1.76;

// ─── ArtRenderer (8-bit B&W) ──────────────────────────────────────────────────
const Art = {
  drawPlayer(ctx, state, frame, x, y, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    if (state === 'duck') {
      ctx.fillStyle = '#000';
      ctx.fillRect(-14, -20, 28, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-12, -18, 24, 12);
      ctx.fillStyle = '#000';
      ctx.fillRect(4, -30, 14, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(6, -28, 10, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(12, -26, 2, 2);
      ctx.fillRect(-8, -4, 7, 8);
      ctx.fillRect(2, -4, 7, 8);
    } else {
      // Upper-body bob: dips down on contact frames, returns to neutral on mid-stride
      const bob = state === 'run' ? [2, 0, 2, 0][frame % 4] : 0;
      ctx.save();
      ctx.translate(0, bob);

      // Per-frame arm swing (near arm / far arm offsets)
      const ARM = state === 'jump'
        ? { nY: -7, fY: 5 }
        : [{ nY: -5, fY: 5 }, { nY: -2, fY: 2 }, { nY: 5, fY: -5 }, { nY: 2, fY: -2 }][frame % 4];

      // ── FAR ARM (behind body, drawn first) ─────────────────────────────────
      ctx.fillStyle = '#8c1e10';              // dark sleeve back
      ctx.fillRect(-7, -46 + ARM.fY, 6, 8);
      ctx.fillStyle = '#c07840';              // far forearm skin
      ctx.fillRect(-8, -39 + ARM.fY, 5, 7);
      ctx.fillStyle = '#b06030';              // far hand
      ctx.fillRect(-7, -33 + ARM.fY, 4, 4);

      // ── T-SHIRT BODY ───────────────────────────────────────────────────────
      ctx.fillStyle = '#c03020';              // red shirt
      ctx.fillRect(-4, -50, 15, 24);
      ctx.fillStyle = '#8c1e10';              // back/shadow side
      ctx.fillRect(-4, -50, 5, 24);
      ctx.fillStyle = '#d84030';              // chest highlight
      ctx.fillRect(3, -49, 5, 15);
      // Collar
      ctx.fillStyle = '#f0d0b8';              // skin at collar
      ctx.fillRect(1, -50, 7, 5);
      // Outlines
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -51, 17, 2);           // shoulder top
      ctx.fillRect(-5, -51, 2, 26);           // back outline
      ctx.fillRect(11, -51, 2, 26);           // front outline
      ctx.fillRect(-5, -26, 17, 2);           // hem

      // ── NEAR ARM (front, full detail) ──────────────────────────────────────
      ctx.fillStyle = '#c03020';              // near sleeve
      ctx.fillRect(10, -47 + ARM.nY, 7, 9);
      ctx.fillStyle = '#111';                 // sleeve outline
      ctx.fillRect(10, -47 + ARM.nY, 7, 2);
      ctx.fillRect(16, -47 + ARM.nY, 2, 9);
      ctx.fillStyle = '#f5c090';              // near forearm skin
      ctx.fillRect(11, -39 + ARM.nY, 6, 8);
      ctx.fillStyle = '#111';
      ctx.fillRect(16, -39 + ARM.nY, 2, 8);  // forearm front edge
      ctx.fillStyle = '#e5a870';              // near hand
      ctx.fillRect(11, -32 + ARM.nY, 6, 4);

      // ── FACE (side profile, facing right) ──────────────────────────────────
      ctx.fillStyle = '#f5c090';              // skin
      ctx.fillRect(-2, -65, 13, 14);
      // Ear
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -62, 5, 8);
      ctx.fillStyle = '#e0a060';
      ctx.fillRect(-4, -61, 3, 6);
      // Face outline
      ctx.fillStyle = '#333';
      ctx.fillRect(-3, -66, 15, 2);           // forehead top
      ctx.fillRect(-3, -66, 2, 17);           // back of head
      ctx.fillRect(11, -65, 2, 15);           // face/nose front
      ctx.fillRect(-3, -50, 15, 2);           // chin
      // Nose bump
      ctx.fillStyle = '#e0a060';
      ctx.fillRect(12, -58, 2, 4);
      // Eye
      ctx.fillStyle = '#fff';
      ctx.fillRect(6, -61, 4, 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(7, -61, 3, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(9, -61, 1, 1);             // eye highlight

      // ── BASEBALL CAP ───────────────────────────────────────────────────────
      ctx.fillStyle = '#1a2244';              // navy dome
      ctx.fillRect(-3, -75, 15, 11);
      ctx.fillStyle = '#2a3566';              // dome highlight
      ctx.fillRect(0, -74, 7, 5);
      ctx.fillStyle = '#111';                 // outline
      ctx.fillRect(-4, -76, 17, 2);           // top edge
      ctx.fillRect(-4, -76, 2, 14);           // back edge
      ctx.fillRect(12, -76, 2, 12);           // front edge above brim
      // Brim (extends right / forward)
      ctx.fillStyle = '#1a2244';
      ctx.fillRect(11, -67, 12, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(11, -63, 12, 2);           // brim underside
      ctx.fillRect(22, -67, 2, 6);            // brim tip
      // Sweatband stripe
      ctx.fillStyle = '#111';
      ctx.fillRect(-3, -66, 15, 2);

      ctx.restore();
      // legs
      if (state === 'jump') {
        ctx.fillRect(-6, -26, 6, 18);
        ctx.fillRect(1,  -26, 6, 18);
      } else {
        // 4-frame articulated run cycle
        // Thigh: (thX, -26, 5, 12) hip→knee; Shin: (shX, -14, 5, 10) knee→ankle; Foot: (ftX, -4+ftY, 8, 4)
        // [lThX, lShX, lFtX, lFtY,  rThX, rShX, rFtX, rFtY]
        const RUN = [
          [-7, -5, -7, -8,   2,  1,  0,  0],  // f0: L raised+back,  R planted+fwd
          [-5, -5, -7, -3,   0,  0, -2,  0],  // f1: L swings fwd,   R under body
          [-3, -3, -5,  0,   0, -2, -1, -8],  // f2: L planted+fwd,  R raised+back
          [-4, -4, -6,  0,   1,  2,  0, -3],  // f3: L under body,   R swings fwd
        ];
        const f = frame % 4;
        const [lTh, lSh, lFt, lFY, rTh, rSh, rFt, rFY] = RUN[f];
        const drawLeg = (thX, shX, ftX, ftYoff) => {
          ctx.fillStyle = '#000';
          ctx.fillRect(thX, -26, 5, 12);   // thigh
          ctx.fillRect(shX, -14, 5, 10);   // shin
          ctx.fillStyle = '#555';
          ctx.fillRect(ftX, -4 + ftYoff, 8, 4); // shoe
        };
        if (f < 2) {
          drawLeg(lTh, lSh, lFt, lFY); // back leg first (L)
          drawLeg(rTh, rSh, rFt, rFY); // front leg (R)
        } else {
          drawLeg(rTh, rSh, rFt, rFY); // back leg first (R)
          drawLeg(lTh, lSh, lFt, lFY); // front leg (L)
        }
      }
    }
    ctx.restore();
  },

  drawTrashCan(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    // Dark stroke outline (drawn first, 1px larger on each side)
    ctx.fillStyle = '#222';
    ctx.fillRect(-15, -45, 30, 10);  // lid outline
    ctx.fillRect(-13, -39, 26, 40);  // body outline
    // Lid
    ctx.fillStyle = '#1a4';
    ctx.fillRect(-14, -44, 28, 8);
    ctx.fillStyle = '#4c8';
    ctx.fillRect(-12, -42, 24, 4);
    // Body
    ctx.fillStyle = '#1a4';
    ctx.fillRect(-12, -38, 24, 38);
    ctx.fillStyle = '#4c8';
    ctx.fillRect(-10, -36, 20, 34);
    // Stripes
    ctx.fillStyle = '#1a4';
    ctx.fillRect(-10, -28, 20, 4);
    ctx.fillRect(-10, -18, 20, 4);
    ctx.restore();
  },

  drawScooter(ctx, x, y) {
    // Electric kick scooter (Bird/Lime style): rear wheel left, front right, stem on right
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    const OUT  = '#333';    // dark gray outline
    const GRN  = '#1e7a30'; // deep green body
    const LGRN = '#34b84e'; // lighter green highlight
    const TIRE = '#222';
    const RIM  = '#c0c0c0';

    // --- Wheels (r=10, center at y=-10 so bottom touches ground) ---
    const drawWheel = (cx, cy) => {
      ctx.fillStyle = OUT;
      ctx.fillRect(cx - 11, cy - 11, 22, 22); // outline square
      ctx.fillStyle = TIRE;
      ctx.fillRect(cx - 10, cy - 10, 20, 20); // tire
      ctx.fillStyle = RIM;
      ctx.fillRect(cx - 6,  cy - 6,  12, 12); // rim
      ctx.fillStyle = OUT;
      ctx.fillRect(cx - 2,  cy - 2,  4,  4);  // hub
    };
    drawWheel(-22, -10); // rear wheel (left)
    drawWheel( 20, -10); // front wheel (right)

    // --- Footboard / deck (spans between wheels, sits just above axles) ---
    ctx.fillStyle = OUT;
    ctx.fillRect(-24, -23, 46, 11);   // outline
    ctx.fillStyle = GRN;
    ctx.fillRect(-23, -22, 44,  9);   // body
    ctx.fillStyle = LGRN;
    ctx.fillRect(-23, -22, 44,  3);   // top highlight strip
    // Grip-tape dots
    ctx.fillStyle = OUT;
    for (let tx = -19; tx < 16; tx += 6) ctx.fillRect(tx, -18, 2, 2);

    // --- Fender over rear wheel ---
    ctx.fillStyle = OUT;
    ctx.fillRect(-26, -24, 10, 4);
    ctx.fillStyle = GRN;
    ctx.fillRect(-25, -23, 8, 2);

    // --- Steering column: two-section angled stem rising from front axle area ---
    // Bottom section: near-vertical above front wheel
    ctx.fillStyle = OUT;
    ctx.fillRect(16, -42, 8, 21);
    ctx.fillStyle = GRN;
    ctx.fillRect(17, -41, 6, 19);
    // Top section: leaned back (shifted ~6px left)
    ctx.fillStyle = OUT;
    ctx.fillRect(10, -58, 8, 18);
    ctx.fillStyle = GRN;
    ctx.fillRect(11, -57, 6, 16);
    // Joint / hinge between sections
    ctx.fillStyle = OUT;
    ctx.fillRect(10, -43, 16, 5);
    ctx.fillStyle = '#555';
    ctx.fillRect(11, -42, 14, 3);

    // --- Handlebar crossbar (T-bar at top of stem) ---
    ctx.fillStyle = OUT;
    ctx.fillRect(2, -61, 22, 6);    // outline
    ctx.fillStyle = GRN;
    ctx.fillRect(3, -60, 20, 4);    // bar
    ctx.fillStyle = LGRN;
    ctx.fillRect(3, -60, 20, 2);    // top highlight
    // Rubber grips
    ctx.fillStyle = '#222';
    ctx.fillRect(2,  -60, 5, 4);    // left grip
    ctx.fillRect(19, -60, 5, 4);    // right grip
    // Brake lever (small tab under right grip)
    ctx.fillStyle = OUT;
    ctx.fillRect(15, -60, 3, 7);

    // --- Headlight (front of stem, small yellow rect) ---
    ctx.fillStyle = '#ffe87a';
    ctx.fillRect(14, -58, 4, 3);

    ctx.restore();
  },

  drawPedestrian(ctx, x, y, frame, gender = 0, scheme = 0) {
    // 5 clothing schemes: top, bottom, hair
    const clothes = [
      { top: '#f72', btm: '#530', hair: '#222' },  // vivid orange / brown
      { top: '#1bc', btm: '#047', hair: '#111' },  // bright cyan / navy
      { top: '#e22', btm: '#333', hair: '#000' },  // red / charcoal
      { top: '#8c2', btm: '#363', hair: '#543' },  // lime green / dark green
      { top: '#83c', btm: '#416', hair: '#222' },  // purple / dark purple
    ];
    const c = clothes[scheme];
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    if (gender === 0) {
      // ── MALE ──
      // Head
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-8, -70, 16, 14);
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -70, 16, 2);
      ctx.fillRect(-8, -70, 2, 14);
      ctx.fillRect(6,  -70, 2, 14);
      ctx.fillRect(-8, -58, 16, 2);
      // Hair
      ctx.fillStyle = c.hair;
      ctx.fillRect(-8, -70, 16, 5);
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(2, -63, 3, 3);
      // Shirt
      ctx.fillStyle = c.top;
      ctx.fillRect(-7, -56, 14, 24);
      // Arms — 4-frame swing
      const armOff = [-4, -2, 4, 2][frame % 4];
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-15, -54 + armOff, 8, 5);
      ctx.fillRect(7,   -54 - armOff, 8, 5);
      // Legs — 4-frame articulated run cycle
      // Thigh: (thX, -32, 5, 14) hip→knee; Shin: (shX, -18, 5, 14) knee→ankle; Shoe: (ftX, -4+ftY, 8, 4)
      const PEDRUN = [
        [-7, -5, -7, -8,   2,  1,  0,  0],  // f0: L raised+back, R planted+fwd
        [-5, -5, -7, -3,   0,  0, -2,  0],  // f1: L swings fwd,  R under body
        [-3, -3, -5,  0,   0, -2, -1, -8],  // f2: L planted+fwd, R raised+back
        [-4, -4, -6,  0,   1,  2,  0, -3],  // f3: L under body,  R swings fwd
      ];
      const fp = frame % 4;
      const [lTh, lSh, lFt, lFY, rTh, rSh, rFt, rFY] = PEDRUN[fp];
      const drawPedLeg = (thX, shX, ftX, ftYoff) => {
        ctx.fillStyle = c.btm;
        ctx.fillRect(thX, -32, 5, 14);   // thigh
        ctx.fillRect(shX, -18, 5, 14);   // shin
        ctx.fillStyle = '#111';
        ctx.fillRect(ftX, -4 + ftYoff, 8, 4); // shoe
      };
      if (fp < 2) {
        drawPedLeg(lTh, lSh, lFt, lFY);
        drawPedLeg(rTh, rSh, rFt, rFY);
      } else {
        drawPedLeg(rTh, rSh, rFt, rFY);
        drawPedLeg(lTh, lSh, lFt, lFY);
      }
    } else {
      // ── FEMALE ──
      // Hair (wider, above head)
      ctx.fillStyle = c.hair;
      ctx.fillRect(-10, -74, 20, 6);
      ctx.fillRect(-10, -70, 3, 14);
      ctx.fillRect(8,   -70, 3, 12);
      const hairBounce = frame === 0 ? 2 : 0;
      ctx.fillRect(8, -60 + hairBounce, 3, 8);  // bouncing ponytail tail
      // Head
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-8, -70, 16, 14);
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -70, 16, 2);
      ctx.fillRect(-8, -70, 2, 14);
      ctx.fillRect(6,  -70, 2, 14);
      ctx.fillRect(-8, -58, 16, 2);
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(2, -63, 3, 3);
      // Blouse
      ctx.fillStyle = c.top;
      ctx.fillRect(-7, -56, 14, 18);
      // Arms — 4-frame swing
      const armOffF = [-4, -2, 4, 2][frame % 4];
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-13, -54 + armOffF, 6, 5);
      ctx.fillRect(7,   -54 - armOffF, 6, 5);
      // Skirt body + flared hem
      ctx.fillStyle = c.btm;
      ctx.fillRect(-9, -38, 18, 16);
      ctx.fillRect(-11, -26, 22, 6);
      // Legs (skin below skirt) + shoes — 4-frame
      const legAF = [6, 3, -6, -3][frame % 4];
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-5, -20, 4, 20);
      ctx.fillRect(1,  -20, 4, 20);
      ctx.fillStyle = '#111';
      ctx.fillRect(-5 + legAF, -4, 6, 4);
      ctx.fillRect(1  - legAF, -4, 6, 4);
    }
    ctx.restore();
  },

  drawCat(ctx, x, y, frame, catScheme = 0) {
    // catScheme: 0=black, 1=white, 2=ginger
    const schemes = [
      { body: '#222', outline: '#000', detail: '#555', eye: '#aaa' },
      { body: '#eee', outline: '#aaa', detail: '#fff', eye: '#555' },
      { body: '#c73', outline: '#853', detail: '#e94', eye: '#222' },
    ];
    const c = schemes[catScheme];
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    // Body
    ctx.fillStyle = c.body;
    ctx.fillRect(-16, -18, 32, 14);
    ctx.fillStyle = c.outline;
    ctx.fillRect(-16, -18, 32, 2);
    ctx.fillRect(-16, -6,  32, 2);
    ctx.fillRect(-16, -18, 2, 14);
    ctx.fillRect(14,  -18, 2, 14);
    // Head
    ctx.fillStyle = c.body;
    ctx.fillRect(10, -22, 14, 12);
    ctx.fillStyle = c.outline;
    ctx.fillRect(10, -22, 14, 2);
    ctx.fillRect(10, -22, 2, 12);
    ctx.fillRect(22, -22, 2, 12);
    ctx.fillRect(10, -12, 14, 2);
    // Ears
    ctx.fillStyle = c.detail;
    ctx.fillRect(11, -26, 4, 4);
    ctx.fillRect(19, -26, 4, 4);
    // Eye
    ctx.fillStyle = c.eye;
    ctx.fillRect(17, -19, 3, 3);
    // Tail and legs
    const tailWag = frame === 0 ? 4 : -4;
    ctx.fillStyle = c.outline;
    ctx.fillRect(-18, -14, 4, 8);
    ctx.fillRect(-22, -14 + tailWag, 4, 4);
    ctx.fillRect(-8, -4, 4, 8);
    ctx.fillRect( 0, -4, 4, 8);
    ctx.fillRect( 8, -4, 4, 8);
    ctx.restore();
  },

  drawBird(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(-14, -8, 28, 14);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(-12, -6, 24, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(10, -12, 12, 10);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(12, -10, 8, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(17, -9, 2, 2);
    ctx.fillRect(20, -8, 6, 4);
    const wingY = frame === 0 ? -12 : 4;
    ctx.fillRect(-22, wingY, 10, 4);
    ctx.fillRect(-14, wingY + 4, 8, 4);
    ctx.restore();
  },

  drawDrone(ctx, x, y, frame) {
    // Side-view DJI Mavic-style quadcopter
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.8, 0.8);
    ctx.imageSmoothingEnabled = false;

    const spin = frame % 2 === 0;

    // ── Rotor blur discs (faint, behind everything) ──
    ctx.fillStyle = 'rgba(160,160,160,0.10)';
    ctx.fillRect(-46, -16, 26, 8);   // left disc
    ctx.fillRect(20,  -16, 26, 8);   // right disc

    // ── Horizontal arm booms ──
    ctx.fillStyle = '#383838';
    ctx.fillRect(-36, -8, 72, 5);    // full-width boom

    // ── Motor pods at arm tips ──
    ctx.fillStyle = '#222';
    ctx.fillRect(-38, -11, 10, 10);  // left pod
    ctx.fillRect(28,  -11, 10, 10);  // right pod
    ctx.fillStyle = '#484848';
    ctx.fillRect(-36, -10, 6, 5);    // left pod top sheen
    ctx.fillRect(30,  -10, 6, 5);    // right pod top sheen

    // ── Rotor blades (animated) ──
    if (spin) {
      // Full horizontal span visible
      ctx.fillStyle = '#777';
      ctx.fillRect(-50, -13, 24, 3); // left blade pair
      ctx.fillRect(26,  -13, 24, 3); // right blade pair
    } else {
      // Blades rotated 45° — appear as shorter thicker bar
      ctx.fillStyle = '#666';
      ctx.fillRect(-46, -15, 16, 7); // left
      ctx.fillRect(30,  -15, 16, 7); // right
    }

    // ── Main body shell ──
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(-12, -8, 24, 18);   // body

    // Top panel / seam
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(-10, -6, 20, 8);
    ctx.fillStyle = '#404040';
    ctx.fillRect(-10, -6, 20, 2);    // highlight edge

    // Battery latch area
    ctx.fillStyle = '#282828';
    ctx.fillRect(-6, 0, 12, 5);
    ctx.fillStyle = '#363636';
    ctx.fillRect(-5, 1, 10, 3);

    // ── Camera gimbal (hangs below front of body) ──
    ctx.fillStyle = '#111';
    ctx.fillRect(-7, 10, 11, 9);     // gimbal housing
    ctx.fillStyle = '#555';
    ctx.fillRect(-5, 11, 7, 7);      // camera body
    ctx.fillStyle = '#888';
    ctx.fillRect(-4, 12, 5, 5);      // lens outer
    ctx.fillStyle = '#bbb';
    ctx.fillRect(-3, 13, 3, 3);      // lens inner
    ctx.fillStyle = '#ddd';
    ctx.fillRect(-2, 13, 2, 2);      // lens highlight

    // ── Landing gear ──
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-8, 19, 3, 6);      // left strut
    ctx.fillRect(5,  19, 3, 6);      // right strut
    ctx.fillRect(-11, 24, 8, 2);     // left skid
    ctx.fillRect(4,   24, 8, 2);     // right skid

    // ── Status LED (blinks green) ──
    ctx.fillStyle = frame % 4 < 2 ? '#00ee00' : '#004400';
    ctx.fillRect(7, 3, 3, 3);

    ctx.restore();
  },

  drawBuilding(ctx, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    const cols = Math.max(1, Math.floor(w / 16));
    const rows = Math.max(1, Math.floor(h / 22));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 6 + c * 16;
        const wy = y + 8 + r * 22;
        if (wx + 8 < x + w - 2 && wy + 12 < y + h - 2) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#ddd' : '#eee';
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }
    ctx.restore();
  },

  drawPalmTree(ctx, x, y, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#bbb';
    for (let i = 0; i < h; i += 4) {
      const off = Math.round(Math.sin(i * 0.06) * 2);
      ctx.fillRect(x + off, y - i - 4, 4, 4);
    }
    const tx = x + Math.round(Math.sin(h * 0.06) * 2), ty = y - h;
    const fronds = [[-24,-10],[-14,-18],[0,-20],[14,-18],[24,-8],[16,2],[-12,2]];
    ctx.fillStyle = '#aaa';
    fronds.forEach(([dx, dy]) => {
      const steps = Math.max(Math.abs(dx), Math.abs(dy)) / 4;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = Math.round(tx + dx * t);
        const py = Math.round(ty + dy * t - Math.sin(t * Math.PI) * 6);
        ctx.fillRect(px, py, 4, 3);
      }
    });
    ctx.restore();
  },

  drawMakolet(ctx, x, y) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y - 60, 80, 60);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 2, y - 58, 76, 56);
    // Roof outline (dark stroke)
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 6, y - 70, 92, 14);
    // Black-and-white striped roof
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 4, y - 68, 88, 12);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) ctx.fillRect(x - 4 + i * 11, y - 68, 11, 12);
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 28, y - 36, 24, 36);
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 30, y - 34, 20, 32);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 46, y - 18, 4, 4);
    ctx.fillRect(x + 6, y - 56, 22, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 7, y - 55, 20, 10);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('MKLT', x + 44, y - 44);
    ctx.fillRect(x + 50, y - 56, 22, 14);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 52, y - 54, 18, 10);
    ctx.restore();
  },

  drawBuildingBauhaus(ctx, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // White body
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);
    // Thin outline
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    // Horizontal ribbon windows (Bauhaus hallmark)
    const bandH = 5;
    const bandGap = 13;
    for (let by = y + 9; by + bandH < y + h - 5; by += bandH + bandGap) {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(x + 3, by, w - 6, bandH);
      // Vertical mullions dividing ribbon
      ctx.fillStyle = '#eee';
      const divs = Math.max(2, Math.floor(w / 14));
      const divStep = Math.floor((w - 6) / divs);
      for (let d = 1; d < divs; d++) {
        ctx.fillRect(x + 3 + d * divStep, by, 1, bandH);
      }
    }
    // Flat roof cap
    ctx.fillStyle = '#eee';
    ctx.fillRect(x - 2, y - 3, w + 4, 4);
    ctx.restore();
  },

  drawBuildingBrutal(ctx, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Light concrete body
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // Horizontal floor slabs protruding
    const floorH = 18;
    for (let fy = y + floorH; fy < y + h; fy += floorH) {
      ctx.fillStyle = '#bbb';
      ctx.fillRect(x - 4, fy - 2, w + 8, 3);
      // Balcony openings above each slab
      const cols = Math.max(1, Math.floor((w - 4) / 14));
      const colStep = Math.floor((w - 4) / cols);
      ctx.fillStyle = '#bbb';
      for (let c = 0; c < cols; c++) {
        const bx = x + 3 + c * colStep;
        if (bx + 8 <= x + w - 2) {
          ctx.fillRect(bx, fy - floorH + 4, 8, 8);
          ctx.fillStyle = '#ccc';
          ctx.fillRect(bx + 1, fy - floorH + 5, 6, 6);
          ctx.fillStyle = '#bbb';
        }
      }
    }
    ctx.restore();
  },

  drawBuildingGlass(ctx, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Light glass body
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x, y, w, h);
    // Window grid — deterministic lit pattern
    const winW = 5, winH = 4, gapX = 3, gapY = 5;
    const cols = Math.floor((w - 6) / (winW + gapX));
    const rows = Math.floor((h - 8) / (winH + gapY));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = (r * 3 + c * 2) % 5 !== 0;
        ctx.fillStyle = lit ? '#fff' : '#ddd';
        const wx = x + 4 + c * (winW + gapX);
        const wy = y + 5 + r * (winH + gapY);
        ctx.fillRect(wx, wy, winW, winH);
      }
    }
    // Antenna
    const ax = x + Math.floor(w / 2) - 1;
    ctx.fillStyle = '#ccc';
    ctx.fillRect(ax, y - 14, 2, 14);
    ctx.fillRect(ax - 5, y - 12, 12, 2);
    ctx.restore();
  },

  drawBuildingOldCity(ctx, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Bright Jerusalem stone body
    ctx.fillStyle = '#eee';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    // Arched windows (rect body + stepped arch top)
    const winW = 8, spacing = 14;
    const cols = Math.max(1, Math.floor((w - 8) / spacing));
    const rows = Math.max(1, Math.floor(h / 26));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 5 + c * spacing;
        const wy = y + 8 + r * 26;
        if (wx + winW > x + w - 3 || wy + 18 > y + h - 3) continue;
        ctx.fillStyle = '#ccc';
        ctx.fillRect(wx, wy + 6, winW, 10);
        ctx.fillRect(wx + 1, wy + 3, winW - 2, 4);
        ctx.fillRect(wx + 2, wy, winW - 4, 4);
      }
    }
    // Dome on top if building is wide enough
    if (w >= 38) {
      const dc = x + Math.floor(w / 2);
      ctx.fillStyle = '#eee';
      ctx.fillRect(dc - 10, y - 12, 20, 12);
      ctx.fillRect(dc - 8,  y - 16, 16, 6);
      ctx.fillRect(dc - 5,  y - 19, 10, 4);
      ctx.fillRect(dc - 2,  y - 21, 4,  3);
      ctx.fillStyle = '#ddd';
      ctx.fillRect(dc - 1,  y - 22, 2,  2);
    }
    ctx.restore();
  },

  drawFicusTree(ctx, x, y) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Thick short trunk
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x - 7, y - 28, 14, 28);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x - 5, y - 26, 10, 24);
    // Root spread
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x - 13, y - 8, 8, 8);
    ctx.fillRect(x + 5,  y - 8, 8, 8);
    // Canopy — wide and bushy, 3 layers
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x - 34, y - 54, 68, 30);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 32, y - 52, 64, 26);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x - 24, y - 76, 48, 26);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 22, y - 74, 44, 22);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x - 14, y - 92, 28, 20);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 12, y - 90, 24, 16);
    // Leaf texture hints
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x - 28, y - 56, 10, 6);
    ctx.fillRect(x + 18,  y - 52, 10, 6);
    ctx.fillRect(x - 8,   y - 78, 10, 6);
    ctx.restore();
  },

  drawBusStop(ctx, x, y) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Roof
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y - 68, 54, 5);
    ctx.fillStyle = '#444';
    ctx.fillRect(x,     y - 66, 52, 3);
    // Left post
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2, y - 63, 4, 63);
    // Right post
    ctx.fillRect(x + 44, y - 63, 4, 63);
    // Back glass panel (light gray)
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x + 6, y - 62, 2, 55);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x + 8, y - 62, 2, 55);
    // Bench
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 6, y - 24, 36, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 8,  y - 20, 3, 20);
    ctx.fillRect(x + 37, y - 20, 3, 20);
    // Route sign on pole
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 52, y - 80, 3, 80);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 48, y - 92, 18, 16);
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 49, y - 91, 16, 14);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 5px monospace';
    ctx.fillText('BUS', x + 50, y - 82);
    ctx.restore();
  },

  drawBillboard(ctx, x, y) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Support poles
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 10, y - 110, 5, 110);
    ctx.fillRect(x + 65, y - 110, 5, 110);
    // Cross brace
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 13, y - 80, 54, 3);
    // Sign backing
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 122, 84, 50);
    // Sign face
    ctx.fillStyle = '#eee';
    ctx.fillRect(x,     y - 120, 80, 46);
    // Abstract ad content
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 4, y - 116, 44, 7);  // headline
    ctx.fillRect(x + 4, y - 106, 28, 4);  // subline
    ctx.fillRect(x + 4, y - 98,  34, 4);  // subline 2
    ctx.fillRect(x + 4, y - 88,  20, 4);  // subline 3
    // Right side image block
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 52, y - 116, 24, 38);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 54, y - 114, 20, 34);
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 56, y - 108, 12, 16);
    ctx.restore();
  },

  drawCrashedPlayer(ctx, x, angle) {
    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.rotate(angle); // pivots around feet; π/2 = lying flat on ground
    ctx.imageSmoothingEnabled = false;
    // Head with X eyes (knocked out)
    ctx.fillStyle = '#fff';
    ctx.fillRect(-8, -64, 16, 14);
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, -64, 16, 2);
    ctx.fillRect(-8, -64, 2, 14);
    ctx.fillRect(6,  -64, 2, 14);
    ctx.fillRect(-8, -52, 16, 2);
    // X eyes
    ctx.fillRect(-5, -61, 2, 2); ctx.fillRect(-3, -59, 2, 2); ctx.fillRect(-5, -57, 2, 2);
    ctx.fillRect(1,  -61, 2, 2); ctx.fillRect(3,  -59, 2, 2); ctx.fillRect(1,  -57, 2, 2);
    // Body
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, -50, 16, 24);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-5, -48, 10, 8);
    // Arms spread
    ctx.fillStyle = '#000';
    ctx.fillRect(-20, -46, 12, 6);
    ctx.fillRect(8,   -46, 12, 6);
    // Legs
    ctx.fillRect(-6, -26, 6, 26);
    ctx.fillRect(1,  -26, 6, 26);
    ctx.restore();
  },

  drawExplosion(ctx, cx, cy, progress) {
    // Filled pixel sphere — color zones radiate from white-hot center outward
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = progress < 0.65 ? 1 : (1 - progress) / 0.35;

    const maxR = 42;
    const curR = progress * maxR;
    const pix = 4; // pixel block size
    const r = Math.ceil(curR);

    for (let dy = -r; dy <= r; dy += pix) {
      for (let dx = -r; dx <= r; dx += pix) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Jagged edge: angular noise makes the sphere look like a fireball
        const angle = Math.atan2(dy, dx);
        const edgeMod = 1 + 0.14 * Math.sin(angle * 7 + progress * 4);
        if (dist > curR * edgeMod) continue;

        const t = dist / curR; // 0 = center, 1 = edge
        let color;
        if      (t < 0.18) color = '#fff';
        else if (t < 0.34) color = '#ff0';
        else if (t < 0.52) color = '#fa0';
        else if (t < 0.68) color = '#f60';
        else if (t < 0.82) color = '#f00';
        else               color = '#900';

        ctx.fillStyle = color;
        ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), pix, pix);
      }
    }

    ctx.restore();
  },

  drawRocketTrail(ctx, baseX, fromY, toY, progress) {
    // S-curved trail: tip rises from fromY to toY, path follows sin(vt * 2π)
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const totalDist = fromY - toY; // positive — rising upward
    const amplitude  = 40;         // horizontal S-curve swing ±px

    // Current tip position (follows the S-curve)
    const tipY   = fromY - totalDist * progress;
    const xAtVt  = vt => Math.round(baseX + amplitude * Math.sin(vt * Math.PI * 2));

    // Trail segments descend from tip toward launch point
    const PALETTE = ['#fff','#ff0','#ff0','#fa0','#fa0','#f60','#f60','#f00','#c00','#900','#600','#300'];
    const STEP = 4;

    for (let i = 0; i < PALETTE.length; i++) {
      const sy = Math.round(tipY + i * STEP);
      if (sy >= fromY) break;                          // don't draw below launch
      const vt = (fromY - sy) / totalDist;             // 0 at launch, 1 at target
      const sx = xAtVt(vt);
      const w  = Math.max(2, 5 - Math.floor(i / 3));  // narrows toward back
      ctx.fillStyle = PALETTE[i];
      ctx.fillRect(sx - Math.floor(w / 2), sy, w, STEP);
    }

    ctx.restore();
  },

  drawAmbulance(ctx, x, y, flashOn) {
    // MDA Israeli ambulance — yellow Sprinter-style van, 150px wide
    // Faces right (rear on left, front/cab on right). x = left edge, y = GROUND_Y
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    const YEL = '#f2c200';  // MDA bright yellow
    const YDK = '#c9a000';  // darker yellow panel lines
    const RED = '#cc0000';  // MDA red

    // ── Rear wheel ───────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(10, -22, 36, 22);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(14, -20, 28, 18);
    ctx.fillStyle = '#888';
    ctx.fillRect(18, -18, 20, 14);   // hub face
    ctx.fillStyle = '#555';
    ctx.fillRect(20, -16, 4, 10);    // spoke L
    ctx.fillRect(28, -16, 4, 10);    // spoke R
    ctx.fillRect(24, -16, 4, 3);     // spoke T
    ctx.fillRect(24, -9,  4, 3);     // spoke B
    ctx.fillStyle = '#333';
    ctx.fillRect(24, -14, 6, 6);     // center cap

    // ── Front wheel ──────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(108, -22, 34, 22);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(112, -20, 26, 18);
    ctx.fillStyle = '#888';
    ctx.fillRect(116, -18, 18, 14);
    ctx.fillStyle = '#555';
    ctx.fillRect(118, -16, 4, 10);
    ctx.fillRect(126, -16, 4, 10);
    ctx.fillRect(122, -16, 4, 3);
    ctx.fillRect(122, -9,  4, 3);
    ctx.fillStyle = '#333';
    ctx.fillRect(122, -14, 4, 6);

    // ── Undercarriage / bumpers ───────────────────────────────────────────
    ctx.fillStyle = '#222';
    ctx.fillRect(0,   -22, 150, 4);  // sill
    ctx.fillRect(0,   -14,  10, 14); // rear bumper
    ctx.fillRect(140, -14,  10, 14); // front bumper

    // ── Box body (yellow) ────────────────────────────────────────────────
    ctx.fillStyle = YEL;
    ctx.fillRect(0, -84, 106, 62);

    // ── Cab (yellow, tall roofline same as body) ──────────────────────────
    ctx.fillStyle = YEL;
    ctx.fillRect(104, -84, 46, 62);

    // ── Rear side window ─────────────────────────────────────────────────
    ctx.fillStyle = '#222';
    ctx.fillRect(2, -80, 26, 2);     // top frame
    ctx.fillRect(2, -80, 2, 22);     // left frame
    ctx.fillRect(26, -80, 2, 22);    // right frame
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(4, -78, 22, 20);
    ctx.fillStyle = '#555';
    ctx.fillRect(5, -77, 20, 18);

    // ── Cab windshield (tall, large — Sprinter style) ─────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(106, -84, 42, 2);   // roof rail over cab
    ctx.fillRect(106, -84, 4, 62);   // B-pillar
    ctx.fillRect(144, -82, 4, 60);   // A-pillar
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(110, -82, 34, 48);  // main glass area
    ctx.fillStyle = '#505050';
    ctx.fillRect(112, -80, 28, 44);
    ctx.fillStyle = '#686868';
    ctx.fillRect(114, -78, 18, 22);  // highlight

    // ── Body outlines ────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(0,  -84, 106, 2);   // body top edge
    ctx.fillRect(0,  -84,   2, 62);  // rear edge
    // Panel seam lines
    ctx.fillStyle = YDK;
    ctx.fillRect(2,  -82,   1, 58);  // rear door vertical seam
    ctx.fillRect(2,  -50, 102,  1);  // mid-body horizontal seam
    ctx.fillRect(58, -82,   1, 30);  // centre vertical panel seam

    // ── Thick red MDA stripe (full width) ─────────────────────────────────
    ctx.fillStyle = RED;
    ctx.fillRect(0, -42, 150, 12);

    // ── Star of David — red, centred on body above stripe ─────────────────
    const u = 5, scx = 52, scy = -65;
    ctx.fillStyle = RED;
    ctx.fillRect(scx - 2,  scy - 20,  5, u);   // top spike
    ctx.fillRect(scx - 8,  scy - 15, 18, u);
    ctx.fillRect(scx - 13, scy - 10, 28, u);
    ctx.fillRect(scx - 18, scy -  5, 11, u);   // left wing
    ctx.fillRect(scx +  8, scy -  5, 11, u);   // right wing
    ctx.fillRect(scx - 18, scy,      37, u);   // centre full row
    ctx.fillRect(scx - 18, scy +  5, 11, u);
    ctx.fillRect(scx +  8, scy +  5, 11, u);
    ctx.fillRect(scx - 13, scy + 10, 28, u);
    ctx.fillRect(scx -  8, scy + 15, 18, u);
    ctx.fillRect(scx -  2, scy + 20,  5, u);   // bottom spike

    // ── Rear tail lights ─────────────────────────────────────────────────
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(0, -34, 4, 8);
    ctx.fillStyle = '#cc2200';
    ctx.fillRect(0, -26, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, -22, 4, 4);      // reverse light

    // ── Front headlight ──────────────────────────────────────────────────
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(146, -34, 4, 8);
    ctx.fillStyle = '#ffff88';
    ctx.fillRect(147, -33, 3, 6);

    // ── Siren dome on roof (flashing red) ────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(64, -88, 16, 4);    // dome base
    ctx.fillStyle = flashOn ? '#ff3333' : '#881111';
    ctx.fillRect(66, -94, 12, 6);    // dome light

    ctx.restore();
  },

  drawShawarmaKioskBack(ctx, x, y) {
    // Interior layer. Door opening left (x to x+30). Window gap in front reveals interior.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const kW = 168, kH = 102;

    // Rear wall
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - kH, kW, kH);
    // Interior bright back wall (full width — visible through door + window)
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x + 4, y - kH + 4, kW - 8, kH - 42);
    // Interior floor/counter base
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 4, y - 38, kW - 8, 8);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 4, y - 30, kW - 8, 30);

    // Shawarma spit pole — centered in the window opening (window x+38..x+116, center x+77)
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 74, y - kH + 8, 4, 66);  // pole
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 72, y - kH + 6, 8, 4);   // cap

    // Meat stack tapered toward top, centered on spit (x+76)
    const meatWidths = [28, 26, 24, 22, 20, 18, 14];
    for (let i = 0; i < meatWidths.length; i++) {
      const mw = meatWidths[i];
      const mx = x + 76 - Math.floor(mw / 2);
      const my = y - kH + 14 + i * 8;
      ctx.fillStyle = i % 2 === 0 ? '#5a3a2a' : '#7a5040';
      ctx.fillRect(mx, my, mw, 7);
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(mx, my, mw, 1);
      // Shiny edge
      ctx.fillStyle = '#c87040';
      ctx.fillRect(mx, my + 2, 3, 3);
    }

    ctx.restore();
  },

  drawShawarmaKioskFront(ctx, x, y) {
    // Front layer drawn on top of player. Door opening x..x+30. Window gap x+38..x+116.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const kW = 168, kH = 102;
    const doorEnd = 30;

    // Window opening boundaries (back layer shows through this gap)
    const WX = x + 38, WY = y - kH + 28, WW = 78, WH = 36;

    // Front wall drawn in 4 pieces — skipping the window gap
    ctx.fillStyle = '#222';
    ctx.fillRect(x + doorEnd, y - kH, kW - doorEnd, WY - (y - kH));   // top strip (sign area)
    ctx.fillRect(x + doorEnd, WY, WX - (x + doorEnd), WH);             // left of window
    ctx.fillRect(WX + WW, WY, (x + kW) - (WX + WW), WH);              // right of window
    ctx.fillRect(x + doorEnd, WY + WH, kW - doorEnd, y - (WY + WH));   // bottom (counter)

    // ── Big sign across the full top strip ───────────────────────────────────
    const signX = x + doorEnd + 4;
    const signW = kW - doorEnd - 8;                // ~134px
    const signTop = y - kH + 4;
    const signH = WY - (y - kH) - 8;              // fills the top strip minus margin
    ctx.fillStyle = '#111';
    ctx.fillRect(signX, signTop, signW, signH);    // outer border
    ctx.fillStyle = '#e84800';
    ctx.fillRect(signX + 2, signTop + 2, signW - 4, signH - 4); // orange bg
    // Highlight stripe at top of sign
    ctx.fillStyle = '#ff7030';
    ctx.fillRect(signX + 2, signTop + 2, signW - 4, 3);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillText('שאווארמה פיצוץ', x + doorEnd + signW / 2 + 4, signTop + signH - 5);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';

    // ── Window frame ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(WX - 3, WY - 3, WW + 6, 4);         // top frame
    ctx.fillRect(WX - 3, WY + WH, WW + 6, 4);         // bottom frame
    ctx.fillRect(WX - 3, WY - 3, 4, WH + 6);          // left frame
    ctx.fillRect(WX + WW - 1, WY - 3, 4, WH + 6);     // right frame
    // Dividing bars (grid pattern)
    ctx.fillRect(WX, WY + Math.floor(WH / 2), WW, 2); // horizontal
    ctx.fillRect(WX + Math.floor(WW / 2), WY, 2, WH); // vertical
    // Glass glint
    ctx.fillStyle = '#e8f0f8';
    ctx.fillRect(WX + 3, WY + 3, WW / 2 - 6, 2);
    ctx.fillRect(WX + 3, WY + 6, 2, WH / 2 - 6);

    // ── Counter front ────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(x + doorEnd, y - 38, kW - doorEnd, 38);
    ctx.fillStyle = '#555';
    ctx.fillRect(x + doorEnd + 2, y - 36, kW - doorEnd - 4, 34);
    // Counter top ledge
    ctx.fillStyle = '#333';
    ctx.fillRect(x + doorEnd - 2, y - 40, kW - doorEnd + 4, 4);

    // ── Posts ────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2,            y - kH, 6, kH + 2);  // left
    ctx.fillRect(x + doorEnd - 2,  y - kH, 6, kH + 2);  // door-wall divider
    ctx.fillRect(x + kW - 2,       y - kH, 6, kH + 2);  // right

    // ── Striped awning (full width) ──────────────────────────────────────────
    const awW = kW + 12, awH = 14, awX = x - 6, awY = y - kH - 10;
    ctx.fillStyle = '#000';
    ctx.fillRect(awX, awY, awW, awH);
    const stripeW = 13;
    for (let i = 0; i * stripeW < awW; i += 2) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(awX + i * stripeW + 1, awY + 2, stripeW - 1, awH - 4);
    }
    for (let fi = 0; fi < awW; fi += 8) {
      ctx.fillStyle = '#000';
      ctx.fillRect(awX + fi, awY + awH, 4, 5);
    }

    ctx.restore();
  },

  drawShelterDoor(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;

    // ── Shelter building structure ───────────────────────────────────────────
    // Main concrete body (extends left of door)
    ctx.fillStyle = '#c4c4c4';
    ctx.fillRect(-132, -96, 126, 96);   // left building body

    // Left pilaster / thick outer wall
    ctx.fillStyle = '#aaa';
    ctx.fillRect(-132, -96, 16, 96);

    // Horizontal concrete panel seams
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(-132, -64, 126, 3);
    ctx.fillRect(-132, -34, 126, 3);

    // Ventilation grilles (low on the wall — shelters need air)
    ctx.fillStyle = '#777';
    ctx.fillRect(-112, -28, 28, 10);    // left vent
    ctx.fillRect(-72,  -28, 28, 10);    // centre vent
    ctx.fillStyle = '#999';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-112 + i * 7, -28, 3, 10);   // left vent slats
      ctx.fillRect(-72  + i * 7, -28, 3, 10);   // centre vent slats
    }

    // Civil defence orange stripe across full building (Israeli standard)
    ctx.fillStyle = '#e07800';
    ctx.fillRect(-132, -48, 126, 8);

    // Civil defence triangle (downward) on stripe
    ctx.fillStyle = '#fff';
    ctx.fillRect(-90, -47, 2, 6);   // pixel triangle: top row
    ctx.fillRect(-92, -45, 6, 2);
    ctx.fillRect(-93, -43, 8, 2);
    ctx.fillRect(-94, -41, 10, 2);

    // Roof slab (overhangs building and door)
    ctx.fillStyle = '#888';
    ctx.fillRect(-136, -104, 212, 10);  // top slab
    ctx.fillStyle = '#aaa';
    ctx.fillRect(-136, -104, 212, 4);   // slab top highlight
    ctx.fillStyle = '#666';
    ctx.fillRect(-136, -95, 212, 2);    // slab underside shadow

    // Building outline
    ctx.fillStyle = '#555';
    ctx.fillRect(-136, -104, 2, 104);   // left edge
    ctx.fillRect(-132, -96, 2, 96);     // inner left wall edge
    ctx.fillRect(-136, -104, 212, 2);   // top

    // ── Reinforced door frame ────────────────────────────────────────────────
    ctx.fillStyle = '#555';
    ctx.fillRect(-8, -96, 76, 96);

    // ── Door panel (heavy steel) ─────────────────────────────────────────────
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(-4, -93, 68, 93);

    // Door rivet/panel lines
    ctx.fillStyle = '#bbb';
    for (let i = 1; i < 5; i++) {
      ctx.fillRect(-4, -93 + i * 18, 68, 3);
    }
    ctx.fillRect(28, -93, 3, 93);       // vertical centre seam

    // Door handle
    ctx.fillStyle = '#444';
    ctx.fillRect(48, -52, 10, 20);
    ctx.fillStyle = '#888';
    ctx.fillRect(50, -50, 6, 16);

    // ── Door sign ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(4, -89, 44, 32);
    ctx.fillStyle = '#f5a800';
    ctx.fillRect(6, -87, 40, 28);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('מקלט',   26, -75);
    ctx.fillText('ציבורי', 26, -63);
    ctx.textAlign = 'left';

    ctx.restore();
  },
};

// ─── Background (smooth parallax) ─────────────────────────────────────────────
class Background {
  constructor() {
    this.farX = 0;
    this.midX = 0;
    this.groundX = 0;
    this.farObjects = this._genFar();
    this.midObjects = this._genMid();
  }

  _genFar() {
    const GAP = 14;
    const objs = [];
    let x = 0;
    while (x < W * 2) {
      const w = 32 + Math.floor(Math.random() * 68);
      const h = 60 + Math.floor(Math.random() * 100);
      objs.push({ x, w, h, bType: Math.floor(Math.random() * 5) });
      x += w + GAP;
    }
    this.farTileW = x;
    return objs;
  }

  _genMid() {
    const GAP = 90;
    const objs = [];
    let x = 0;
    while (x < W * 2) {
      const MID_TYPES = ['palm', 'makolet', 'ficus', 'busstop', 'billboard'];
      const type = MID_TYPES[Math.floor(Math.random() * MID_TYPES.length)];
      const h = type === 'palm' ? 40 + Math.floor(Math.random() * 30) : 0;
      objs.push({ x, type, h });
      x += GAP + Math.floor(Math.random() * 80);
    }
    this.midTileW = x;
    return objs;
  }

  update(dt, speed) {
    this.farX    -= speed * 0.2 * dt;
    this.midX    -= speed * 0.5 * dt;
    this.groundX -= speed * dt;
    if (this.farX < -this.farTileW) this.farX += this.farTileW;
    if (this.midX < -this.midTileW) this.midX += this.midTileW;
    if (this.groundX < -40) this.groundX += 40;
  }

  draw(ctx, behindFarCallback = null) {
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, GROUND_Y);
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, GROUND_Y - 8, W, 4);

    if (behindFarCallback) behindFarCallback();

    for (let copy = 0; copy < 2; copy++) {
      const cx = Math.round(this.farX) + copy * this.farTileW;
      if (cx + this.farTileW < 0 || cx > W) continue;
      for (const o of this.farObjects) {
        const ox = cx + o.x;
        if (ox + o.w < 0 || ox > W) continue;
        switch (o.bType) {
          case 1: Art.drawBuildingBauhaus(ctx, ox, GROUND_Y - o.h, o.w, o.h); break;
          case 2: Art.drawBuildingBrutal(ctx, ox, GROUND_Y - o.h, o.w, o.h); break;
          case 3: Art.drawBuildingGlass(ctx, ox, GROUND_Y - o.h, o.w, o.h); break;
          case 4: Art.drawBuildingOldCity(ctx, ox, GROUND_Y - o.h, o.w, o.h); break;
          default: Art.drawBuilding(ctx, ox, GROUND_Y - o.h, o.w, o.h); break;
        }
      }
    }

    for (let copy = 0; copy < 2; copy++) {
      const cx = Math.round(this.midX) + copy * this.midTileW;
      if (cx + this.midTileW < 0 || cx > W) continue;
      for (const o of this.midObjects) {
        const ox = cx + o.x;
        if (o.type === 'palm') {
          if (ox + 40 < 0 || ox > W) continue;
          Art.drawPalmTree(ctx, ox, GROUND_Y, o.h);
        } else if (o.type === 'ficus') {
          if (ox + 70 < 0 || ox > W) continue;
          Art.drawFicusTree(ctx, ox, GROUND_Y);
        } else if (o.type === 'busstop') {
          if (ox + 75 < 0 || ox > W) continue;
          Art.drawBusStop(ctx, ox, GROUND_Y);
        } else if (o.type === 'billboard') {
          if (ox + 90 < 0 || ox > W) continue;
          Art.drawBillboard(ctx, ox, GROUND_Y);
        } else {
          if (ox + 80 < 0 || ox > W) continue;
          Art.drawMakolet(ctx, ox, GROUND_Y);
        }
      }
    }

    ctx.fillStyle = '#333';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, GROUND_Y, W, 2);

    ctx.fillStyle = '#555';
    const dashY = GROUND_Y + 12;
    const dashOff = ((Math.round(this.groundX) % 40) + 40) % 40;
    for (let dx = -40 + dashOff; dx < W + 40; dx += 40) {
      ctx.fillRect(dx, dashY, 20, 3);
    }

    ctx.fillStyle = '#444';
    for (let gx = 0; gx < W; gx += 8) {
      if ((gx / 8) % 3 === 0) ctx.fillRect(gx, GROUND_Y + 24, 4, 2);
    }
  }
}

// ─── Player ───────────────────────────────────────────────────────────────────
class Player {
  constructor() { this.reset(); }

  reset() {
    this.x = PLAYER_X;
    this.y = GROUND_Y;
    this.vy = 0;
    this.onGround = true;
    this.ducking = false;
    this.animFrame = 0;
    this.animTimer = 0;
    this.state = 'run';
  }

  get hitbox() {
    if (this.ducking) return { x: this.x - 10, y: this.y - 22, w: 26, h: 22 };
    return { x: this.x - 10, y: this.y - 64, w: 26, h: 64 };
  }

  jump() {
    if (this.onGround && !this.ducking) {
      this.vy = JUMP_VEL; this.onGround = false; this.state = 'jump';
    }
  }

  duck(on) {
    if (on && this.onGround) { this.ducking = true; this.state = 'duck'; }
    else if (!on) { this.ducking = false; if (this.onGround) this.state = 'run'; }
  }

  update(dt) {
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y; this.vy = 0; this.onGround = true;
        this.state = this.ducking ? 'duck' : 'run';
      }
    }
    this.animTimer += dt;
    if (this.animTimer > 0.1) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
  }

  draw(ctx, alpha = 1) {
    Art.drawPlayer(ctx, this.state, this.animFrame, this.x, this.y, alpha);
  }
}

// ─── Obstacle ────────────────────────────────────────────────────────────────
const OBSTACLE_TYPES = [
  { type: 'trashcan',   w: 28, h: 44, minLevel: 1, aerial: false },
  { type: 'scooter',    w: 56, h: 40, minLevel: 1, aerial: false },
  { type: 'pedestrian', w: 22, h: 66, minLevel: 1, aerial: false },
  { type: 'cat',        w: 36, h: 20, minLevel: 1, aerial: false },
  { type: 'bird',       w: 44, h: 18, minLevel: 2, aerial: true, airY: GROUND_Y - 50 },
  { type: 'drone',      w: 58, h: 22, minLevel: 2, aerial: true, airY: GROUND_Y - 55 },
];

class Obstacle {
  constructor(level) {
    const available = OBSTACLE_TYPES.filter(t => t.minLevel <= level);
    const def = available[Math.floor(Math.random() * available.length)];
    this.type = def.type;
    this.w = def.w;
    this.h = def.h;
    this.x = W + 20;
    this.animFrame = 0;
    this.animTimer = 0;
    this.y = def.aerial ? def.airY : GROUND_Y;
    // Pedestrian: random speed 20%-40% of scroll (runs right, net moves left slower)
    this.speedFactor = this.type === 'pedestrian' ? (0.1 + Math.random() * 0.15) : 1.0;
    // Pedestrian: random gender (0=male, 1=female) and clothing scheme (0-4)
    this.pedGender = this.type === 'pedestrian' ? Math.floor(Math.random() * 2) : 0;
    this.pedScheme = this.type === 'pedestrian' ? Math.floor(Math.random() * 5) : 0;
    // Cat gets a random color scheme: 0=black, 1=white, 2=ginger
    this.catScheme = this.type === 'cat' ? Math.floor(Math.random() * 3) : 0;
  }

  get hitbox() {
    const inset = 5;
    return {
      x: this.x - this.w / 2 + inset,
      y: this.y - this.h + inset,
      w: this.w - inset * 2,
      h: this.h - inset * 2,
    };
  }

  update(dt, speed) {
    this.x -= (this.pedAbsSpeed !== undefined ? speed - this.pedAbsSpeed : speed * this.speedFactor) * dt;
    this.animTimer += dt;
    if (this.animTimer > 0.12) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
  }

  draw(ctx) {
    switch (this.type) {
      case 'trashcan':   Art.drawTrashCan(ctx, this.x, this.y); break;
      case 'scooter':    Art.drawScooter(ctx, this.x, this.y); break;
      case 'pedestrian': Art.drawPedestrian(ctx, this.x, this.y, this.animFrame, this.pedGender, this.pedScheme); break;
      case 'cat':        Art.drawCat(ctx, this.x, this.y, this.animFrame, this.catScheme); break;
      case 'bird':       Art.drawBird(ctx, this.x, this.y, this.animFrame); break;
      case 'drone':      Art.drawDrone(ctx, this.x, this.y, this.animFrame); break;
    }
  }
}

// ─── Shelter Door ─────────────────────────────────────────────────────────────
class ShelterDoor {
  constructor() {
    this.x = W + 80;
    this.targetX = W - 120;
    this.active = false;
  }

  activate() { this.active = true; }

  get hitbox() { return { x: this.x - 4, y: GROUND_Y - 96, w: 68, h: 96 }; }

  update(dt) {
    if (!this.active) return;
    if (this.x > this.targetX) {
      this.x -= 300 * dt;
      if (this.x < this.targetX) this.x = this.targetX;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    Art.drawShelterDoor(ctx, this.x, GROUND_Y);
  }
}

// ─── Particles ───────────────────────────────────────────────────────────────
class ParticleSystem {
  constructor() { this.particles = []; }

  burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        r: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.2, maxLife: 1.2,
      });
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt; p.life -= dt;
    });
  }

  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      const s = Math.round(p.r);
      ctx.fillRect(Math.round(p.x) - s, Math.round(p.y) - s, s * 2, s * 2);
    });
    ctx.globalAlpha = 1;
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
const HUD = {
  draw(ctx, level, timeLeft, distToShelter, shelterActive) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LVL ${level}`, 14, 24);

    // Timer: SS:cc (centiseconds)
    const ss = Math.floor(timeLeft);
    const cc = Math.floor((timeLeft % 1) * 100);
    const timeStr = `${String(ss).padStart(2, '0')}:${String(cc).padStart(2, '0')}`;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    if (ss <= 10 && Math.floor(Date.now() / 250) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.fillText(timeStr, W / 2 + 1, 28);
      ctx.fillStyle = '#000';
    }
    ctx.fillStyle = '#000';
    ctx.fillText(timeStr, W / 2, 28);

    // Right: distance to shelter counting down, then "RUN!" when shelter visible
    const distLabel = shelterActive ? 'RUN!' : `${distToShelter}m`;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(distLabel, W - 14, 24);
    ctx.textAlign = 'left';
  },
};

// ─── AABB collision ───────────────────────────────────────────────────────────
function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─── Game ─────────────────────────────────────────────────────────────────────
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.state = STATE.MENU;
    this.currentLevel = 0;
    this.distanceToShelter = 0;

    this.player = new Player();
    this.background = new Background();
    this.obstacles = [];
    this.shelter = new ShelterDoor();
    this.particles = new ParticleSystem();

    this.timeLeft = 0;
    this.spawnTimer = 0;
    this.alertTimer = 0;
    this.alertFlash = 0;
    this.alertCountdown = 3;

    this.shelterEntering = false;
    this.shelterEntryTimer = 0;
    this.levelIntro = false;
    this.introZoom = 1;
    this.kioskScreenX = 0;
    this.kioskVisible = false;

    this._keys = {};
    this._touchStartY = null;

    this._setupInput();
    this.canvas.width = W;
    this.canvas.height = H;
    requestAnimationFrame(t => this._loop(t));
  }

  _setupInput() {
    window.addEventListener('keydown', e => {
      const k = e.code;
      if (!this._keys[k]) { this._keys[k] = true; this._onKeyDown(k); }
      if (['Space','ArrowUp','ArrowDown'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this._keys[e.code] = false;
      if (e.code === 'ArrowDown') this.player.duck(false);
    });
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this._touchStartY = e.touches[0].clientY;
      this._onKeyDown('Space');
    }, { passive: false });
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault(); this.player.duck(false);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this._touchStartY !== null && e.touches[0].clientY - this._touchStartY > 30)
        this._onKeyDown('ArrowDown');
    }, { passive: false });
  }

  _onKeyDown(k) {
    if (this.state === STATE.MENU || this.state === STATE.VICTORY) {
      if (k === 'Space' || k === 'ArrowUp') {
        if (this.state === STATE.VICTORY) { this.currentLevel = 0; }
        this._startAlert();
      }
      return;
    }
    if (this.state === STATE.GAME_OVER) {
      if (k === 'Space' || k === 'ArrowUp') this._startAlert();
      return;
    }
    if (this.state === STATE.PLAYING && !this.shelterEntering && !this.shelter.active && !this.levelIntro) {
      if (k === 'Space' || k === 'ArrowUp') this.player.jump();
      if (k === 'ArrowDown') this.player.duck(true);
    }
  }

  _startAlert() {
    this.state = STATE.ALERT;
    this.alertTimer = 0; this.alertFlash = 0; this.alertCountdown = 3;
  }

  _startLevel() {
    const def = LEVELS[this.currentLevel];
    this.timeLeft = def.time;
    this.levelTotalTime = def.time;
    this.speed = BASE_SPEED * def.speed * 0.90;  // starts slow, ramps up during play
    this.levelBaseSpeed = BASE_SPEED * def.speed;
    this.spawnInterval = BASE_SPAWN_INTERVAL * def.spawnMult;
    this.spawnTimer = this.spawnInterval * 0.5;
    this.obstacles = [];
    this.shelter = new ShelterDoor();
    this.player.reset();
    this.kioskScreenX = Math.round(W / 2) - 84;  // kiosk centered on screen (kW/2=84)
    this.player.x = this.kioskScreenX + 55;      // player starts inside (right of door)
    this.introZoom = 2.0;                         // zoom starts at 200%, pulls back to 100%
    this.kioskVisible = true;
    this.distanceToShelter = Math.ceil(def.time * this.speed / 40);
    this.shelterEntering = false;
    this.shelterEntryTimer = 0;
    this.levelIntro = true;
    this.state = STATE.PLAYING;
    // Ambient missiles during gameplay
    this.ambientTrails = [];
    this.ambientExplosions = [];
    this.ambientMissileTimer = 1.5 + Math.random() * 2;
  }

  _completeLevel() {
    this.shelterEntering = false;
    this.particles.burst(W / 2, H / 2, 40, ['#fff','#aaa','#555','#000']);
    this.currentLevel++;
    if (this.currentLevel >= LEVELS.length) {
      this.state = STATE.VICTORY;
    } else {
      this.state = STATE.LEVEL_COMPLETE;
      setTimeout(() => { this._startAlert(); }, 1800);
    }
  }

  _loop(ts) {
    if (!this._lastTs) this._lastTs = ts;
    let dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    this._update(dt);
    this._draw();
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    switch (this.state) {
      case STATE.ALERT:      this._updateAlert(dt);      break;
      case STATE.PLAYING:    this._updatePlaying(dt);    break;
      case STATE.CRASH_ANIM: this._updateCrashAnim(dt);  break;
    }
    this.particles.update(dt);
  }

  _updateAlert(dt) {
    this.alertTimer += dt;
    this.alertFlash += dt;
    if (this.alertTimer >= 2.0) this._startLevel();
  }

  _updatePlaying(dt) {
    // ── Phase 0: Level intro — zoom out + player exits kiosk left toward PLAYER_X ──
    if (this.levelIntro) {
      // Zoom 2x → 1x over ~2s (cinematic pull-back)
      this.introZoom = Math.max(1, this.introZoom - 0.5 * dt);
      // Player walks left out through the left-side door
      this.player.update(dt);
      this.player.state = 'run';
      this.player.x -= 140 * dt;
      if (this.player.x <= PLAYER_X && this.introZoom <= 1) {
        this.player.x = PLAYER_X;
        this.levelIntro = false;
      }
      return;
    }

    // ── Phase 3: Entry animation — background frozen, player fades into door ──
    if (this.shelterEntering) {
      this.shelter.update(dt);
      this.player.update(dt);
      this.player.state = 'run';
      this.player.x += 80 * dt;
      this.shelterEntryTimer += dt;
      if (this.shelterEntryTimer >= 1.4) this._completeLevel();
      return;
    }

    // ── Phase 2: Shelter visible — background frozen, player walks to door ──
    if (this.shelter.active) {
      this.shelter.update(dt);
      this.player.update(dt);
      this.player.state = 'run';
      this.player.duck(false);
      this.player.x += this.speed * dt; // player physically runs toward shelter
      if (aabbOverlap(this.player.hitbox, this.shelter.hitbox)) {
        this.shelterEntering = true;
        this.shelterEntryTimer = 0;
      }
      return;
    }

    // ── Phase 1: Normal gameplay — background scrolls, obstacles spawn ──
    // Speed ramps from 65% → 135% of the level's base speed over the full level duration
    const elapsed = this.levelTotalTime - this.timeLeft;
    const ramp = Math.min(1, elapsed / this.levelTotalTime);
    this.speed = BASE_SPEED * LEVELS[this.currentLevel].speed * (0.90 + 0.60 * ramp);

    if (this.kioskVisible) {
      this.kioskScreenX -= this.speed * 0.5 * dt;  // scroll with mid-layer
      if (this.kioskScreenX + 174 < 0) this.kioskVisible = false;
    }
    this.background.update(dt, this.speed);
    this.player.update(dt);

    if (this._keys['ArrowDown']) this.player.duck(true);

    // Countdown timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.distanceToShelter = 0;
      this.obstacles = []; // clear obstacles when shelter appears
      this.shelter.activate();
      return;
    }

    // Distance to shelter (counts down with time)
    this.distanceToShelter = Math.ceil(this.timeLeft * this.speed / 40);

    // Spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const candidate = new Obstacle(this.currentLevel + 1);
      if (candidate.type === 'pedestrian')
        candidate.pedAbsSpeed = (0.10 + Math.random() * 0.10) * this.levelBaseSpeed;
      const tooClose = candidate.type === 'pedestrian' &&
        this.obstacles.some(o => o.type === 'pedestrian' && Math.abs(o.x - candidate.x) < 120);
      const skipDrone = candidate.type === 'drone' && Math.random() < 0.5;
      if (!tooClose && !skipDrone) this.obstacles.push(candidate);
      this.spawnTimer = this.spawnInterval * (0.7 + Math.random() * 0.6);
    }

    this.obstacles.forEach(o => o.update(dt, this.speed));

    // Cat scare: player clears a cat → cat jumps and bolts rightward off screen
    for (const o of this.obstacles) {
      if (o.type === 'cat' && !o.ranAway && o.x + o.w / 2 < this.player.x - 10) {
        o.ranAway = true;
        o.vy = -260;  // jump upward
      }
    }
    for (const o of this.obstacles) {
      if (o.ranAway) {
        o.x += 320 * dt;
        o.vy = (o.vy || 0) + 480 * dt;  // gravity
        o.y += o.vy * dt;
      }
    }
    this.obstacles = this.obstacles.filter(o => o.ranAway ? o.x < W + 80 && o.y < GROUND_Y + 60 : o.x > -100);

    // Obstacle collision (skip cats that already ran away)
    const phb = this.player.hitbox;
    for (const o of this.obstacles) {
      if (o.ranAway) continue;
      if (aabbOverlap(phb, o.hitbox)) {
        this._startCrashAnim(o);
        return;
      }
    }

    // Ambient missiles
    const TRAIL_DUR = 0.57;
    this.ambientMissileTimer -= dt;
    if (this.ambientMissileTimer <= 0) {
      const tx = 40 + Math.floor(Math.random() * (W - 80));
      const ty = 10 + Math.floor(Math.random() * 52);
      this.ambientTrails.push({ x: tx, fromY: GROUND_Y - 4, toY: ty, t: 0, duration: TRAIL_DUR });
      // schedule explosion to spawn when trail arrives
      this.ambientTrails[this.ambientTrails.length - 1].explodeAt = TRAIL_DUR;
      this.ambientTrails[this.ambientTrails.length - 1].exploded = false;
      const progress = Math.max(0, 1 - this.timeLeft / this.levelTotalTime);
      this.ambientMissileTimer = (2.5 + Math.random() * 3.0) * (1 - progress) + (0.25 + Math.random() * 0.35) * progress;
    }
    for (const tr of this.ambientTrails) {
      tr.t += dt;
      if (!tr.exploded && tr.t >= tr.explodeAt) {
        tr.exploded = true;
        this.ambientExplosions.push({ x: tr.x, y: tr.toY, t: 0, duration: 0.6 });
      }
    }
    for (const ex of this.ambientExplosions) ex.t += dt;
    this.ambientTrails      = this.ambientTrails.filter(tr => tr.t < tr.duration + 0.1);
    this.ambientExplosions  = this.ambientExplosions.filter(ex => ex.t < ex.duration);
  }

  _draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    switch (this.state) {
      case STATE.MENU:           this._drawMenu(); break;
      case STATE.ALERT:          this._drawAlert(); break;
      case STATE.PLAYING:        this._drawPlaying(); break;
      case STATE.LEVEL_COMPLETE: this._drawLevelComplete(); break;
      case STATE.GAME_OVER:      this._drawGameOver(); break;
      case STATE.VICTORY:        this._drawVictory(); break;
      case STATE.CRASH_ANIM:     this._drawCrashAnim(); break;
    }
  }

  _drawMenu() {
    const ctx = this.ctx;
    this.background.draw(ctx);
    this.player.draw(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('SHELTER RUN', W / 2, 88);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('TEL AVIV', W / 2, 114);
    ctx.fillStyle = '#555';
    ctx.fillRect(W / 2 - 80, 122, 160, 2);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('SPACE / UP  Jump     DOWN  Duck', W / 2, 154);
    ctx.fillText('Reach the shelter before time runs out', W / 2, 174);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('[ PRESS SPACE TO START ]', W / 2, 220);
    }
    ctx.textAlign = 'left';
  }

  _drawAlert() {
    const ctx = this.ctx;
    const flashOn = Math.floor(this.alertFlash / 0.18) % 2 === 0;
    ctx.fillStyle = flashOn ? '#000' : '#222';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`🚀 צבע אדום 🚀`, W / 2, H / 2 - 20);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`LEVEL ${this.currentLevel + 1}/${LEVELS.length}`, W / 2, H / 2 + 20);
    ctx.textAlign = 'left';
  }

  _drawPlaying() {
    const ctx = this.ctx;

    if (this.levelIntro) {
      // Zoom entire scene (background + midground + kiosk + player) 2x → 1x
      const zoom = this.introZoom;
      const zCX = this.kioskScreenX + 84;  // kiosk center x (kW/2)
      const zCY = GROUND_Y - 50;           // kiosk center y
      ctx.save();
      ctx.translate(zCX, zCY);
      ctx.scale(zoom, zoom);
      ctx.translate(-zCX, -zCY);
      this.background.draw(ctx);
      // 2-pass: back wall → player → front wall (depth illusion as player exits door)
      Art.drawShawarmaKioskBack(ctx, this.kioskScreenX, GROUND_Y);
      this.player.draw(ctx);
      Art.drawShawarmaKioskFront(ctx, this.kioskScreenX, GROUND_Y);
      ctx.restore();
    } else {
      this.background.draw(ctx, () => {
        for (const tr of this.ambientTrails) {
          if (tr.t < tr.duration)
            Art.drawRocketTrail(ctx, tr.x, tr.fromY, tr.toY, tr.t / tr.duration);
        }
      });
      // Kiosk scrolls away as a background element after intro
      if (this.kioskVisible) {
        Art.drawShawarmaKioskBack(ctx, this.kioskScreenX, GROUND_Y);
        Art.drawShawarmaKioskFront(ctx, this.kioskScreenX, GROUND_Y);
      }
      this.obstacles.forEach(o => o.draw(ctx));
      this.shelter.draw(ctx);
      for (const ex of this.ambientExplosions) {
        Art.drawExplosion(ctx, ex.x, ex.y, ex.t / ex.duration);
      }

      if (this.shelterEntering) {
        const entryDepth = Math.max(0, this.player.x - this.shelter.x);
        const alpha = Math.max(0, 1 - entryDepth / 50);
        this.player.draw(ctx, alpha);
      } else {
        this.player.draw(ctx);
      }
    }

    this.particles.draw(ctx);
    HUD.draw(ctx, this.currentLevel + 1, this.timeLeft, this.distanceToShelter, this.shelter.active);

    if (this.timeLeft <= 10 && this.timeLeft > 0 && !this.shelter.active) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, 4);
        ctx.fillRect(0, H - 4, W, 4);
        ctx.fillRect(0, 0, 4, H);
        ctx.fillRect(W - 4, 0, 4, H);
      }
    }
  }

  _drawLevelComplete() {
    const ctx = this.ctx;
    this.background.draw(ctx);
    this.shelter.draw(ctx);
    this.particles.draw(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('SHELTER REACHED!', W / 2, 108);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Level ${this.currentLevel} Complete`, W / 2, 146);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Next level incoming...', W / 2, 178);
    ctx.textAlign = 'left';
  }

  _startCrashAnim(hitObstacle) {
    this.crashTimer = 0;
    this.crashPlayerX = this.player.x;
    this.crashAngle = 0;
    this.crashExplosions = [];
    this.crashTrails = [];

    // Capture hit obstacle reaction, then remove it from the active list
    this.hitReaction = null;
    if (hitObstacle) {
      this.hitReaction = {
        type: hitObstacle.type,
        x: hitObstacle.x,
        y: hitObstacle.y,
        animFrame: hitObstacle.animFrame,
        animTimer: 0,
        catScheme: hitObstacle.catScheme,
        pedGender: hitObstacle.pedGender,
        pedScheme: hitObstacle.pedScheme,
        angle: 0,
        spinAngle: 0,
        smoke: [],
        smokeTimer: 0,
      };
      this.obstacles = this.obstacles.filter(o => o !== hitObstacle);
    }
    const TRAIL_DUR = 0.57; // seconds for rocket to rise before exploding
    // Each entry: trail launches TRAIL_DUR seconds before the explosion
    const raw = [
      { spawnT: 0.45, x: 80  + Math.floor(Math.random() * 160), y: 18 + Math.floor(Math.random() * 46), dur: 0.60 },
      { spawnT: 0.85, x: 300 + Math.floor(Math.random() * 160), y: 14 + Math.floor(Math.random() * 50), dur: 0.55 },
      { spawnT: 1.25, x: 140 + Math.floor(Math.random() * 260), y: 20 + Math.floor(Math.random() * 44), dur: 0.60 },
      { spawnT: 1.65, x: 430 + Math.floor(Math.random() * 160), y: 12 + Math.floor(Math.random() * 54), dur: 0.55 },
      { spawnT: 2.05, x: 210 + Math.floor(Math.random() * 260), y: 18 + Math.floor(Math.random() * 46), dur: 0.60 },
    ];
    this.crashExplosionSchedule = raw.map(e => ({
      spawnT: e.spawnT, x: e.x, y: e.y, duration: e.dur, spawned: false,
      trailStart: e.spawnT - TRAIL_DUR, trailDuration: TRAIL_DUR, trailSpawned: false,
    }));
    this.crashAmbulanceX = -160;       // 150px wide — starts fully off-screen
    this.crashAmbulanceTarget = W / 2 - 75; // stops centered on screen
    this.particles.burst(this.player.x, this.player.y - 30, 20, ['#f00','#f60','#fa0','#ff0','#fff']);
    this.state = STATE.CRASH_ANIM;
  }

  _updateCrashAnim(dt) {
    this.crashTimer += dt;

    // Player tips over: rotate 0 → π/2 over 0.45s
    this.crashAngle = Math.min(Math.PI / 2, (this.crashTimer / 0.45) * (Math.PI / 2));

    // Hit obstacle reaction
    const hr = this.hitReaction;
    if (hr) {
      if (hr.type === 'cat') {
        // Cat runs away to the right at high speed
        hr.x += 340 * dt;
        hr.animTimer += dt;
        if (hr.animTimer >= 0.08) { hr.animTimer = 0; hr.animFrame = (hr.animFrame + 1) % 4; }
      } else if (hr.type === 'pedestrian') {
        // Pedestrian falls to the left (counter-clockwise, negative angle)
        hr.angle = Math.min(Math.PI / 2, (this.crashTimer / 0.4) * (Math.PI / 2));
      } else if (hr.type === 'trashcan') {
        // Trash can tips to the right (clockwise, positive angle)
        hr.angle = Math.min(Math.PI / 2, (this.crashTimer / 0.4) * (Math.PI / 2));
      } else if (hr.type === 'scooter') {
        // Scooter falls to the left (counter-clockwise, negative angle)
        hr.angle = Math.min(Math.PI / 2, (this.crashTimer / 0.5) * (Math.PI / 2));
      } else if (hr.type === 'drone') {
        // One full spin (2π) while falling
        hr.spinAngle = Math.min(Math.PI * 2, hr.spinAngle + 9 * dt);
        hr.x += Math.sin(hr.spinAngle * 0.9) * 55 * dt;
        hr.y = Math.min(GROUND_Y - 14, hr.y + 220 * dt);
        // Smoke puffs trail from drone while falling
        hr.smokeTimer += dt;
        if (hr.smokeTimer > 0.12) {
          hr.smokeTimer = 0;
          hr.smoke.push({ x: hr.x + (Math.random() - 0.5) * 16, y: hr.y, t: 0, dur: 0.9, r: 3 + Math.random() * 5 });
        }
        for (const s of hr.smoke) { s.t += dt; s.y -= 28 * dt; s.r += 9 * dt; }
        hr.smoke = hr.smoke.filter(s => s.t < s.dur);
      }
    }

    for (const sch of this.crashExplosionSchedule) {
      // Spawn rising rocket trail
      if (!sch.trailSpawned && this.crashTimer >= sch.trailStart) {
        sch.trailSpawned = true;
        this.crashTrails.push({ x: sch.x, fromY: GROUND_Y - 4, toY: sch.y, t: 0, duration: sch.trailDuration });
      }
      // Spawn explosion when trail arrives
      if (!sch.spawned && this.crashTimer >= sch.spawnT) {
        sch.spawned = true;
        this.crashExplosions.push({ x: sch.x, y: sch.y, t: 0, duration: sch.duration });
      }
    }

    for (const tr of this.crashTrails)    tr.t += dt;
    for (const ex of this.crashExplosions) ex.t += dt;

    // Ambulance drives in from left starting at t=0.3
    if (this.crashTimer >= 0.3 && this.crashAmbulanceX < this.crashAmbulanceTarget) {
      this.crashAmbulanceX = Math.min(this.crashAmbulanceTarget, this.crashAmbulanceX + 290 * dt);
    }

    if (this.crashTimer >= 3.0) {
      this.state = STATE.GAME_OVER;
    }
  }

  _drawCrashAnim() {
    const ctx = this.ctx;
    // Background frozen — draw but do not update; trails injected behind far buildings
    this.background.draw(ctx, () => {
      for (const tr of this.crashTrails) {
        if (tr.t < tr.duration) {
          Art.drawRocketTrail(ctx, tr.x, tr.fromY, tr.toY, tr.t / tr.duration);
        }
      }
    });
    this.obstacles.forEach(o => o.draw(ctx));

    // Hit obstacle reaction
    const hr = this.hitReaction;
    if (hr) {
      const ctx2 = ctx;
      if (hr.type === 'cat' && hr.x < W + 60) {
        Art.drawCat(ctx2, Math.round(hr.x), hr.y, hr.animFrame, hr.catScheme);
      } else if (hr.type === 'pedestrian') {
        // Falls left: pivot at feet (x, GROUND_Y), rotate counter-clockwise
        ctx2.save();
        ctx2.translate(hr.x, GROUND_Y);
        ctx2.rotate(-hr.angle);
        ctx2.translate(-hr.x, -GROUND_Y);
        Art.drawPedestrian(ctx2, hr.x, GROUND_Y, hr.animFrame, hr.pedGender, hr.pedScheme);
        ctx2.restore();
      } else if (hr.type === 'trashcan') {
        // Tips right: pivot at base (x, GROUND_Y), rotate clockwise
        ctx2.save();
        ctx2.translate(hr.x, GROUND_Y);
        ctx2.rotate(hr.angle);
        ctx2.translate(-hr.x, -GROUND_Y);
        Art.drawTrashCan(ctx2, hr.x, hr.y);
        ctx2.restore();
      } else if (hr.type === 'scooter') {
        // Falls left: pivot at wheel base (x, GROUND_Y), rotate counter-clockwise
        ctx2.save();
        ctx2.translate(hr.x, GROUND_Y);
        ctx2.rotate(-hr.angle);
        ctx2.translate(-hr.x, -GROUND_Y);
        Art.drawScooter(ctx2, hr.x, hr.y);
        ctx2.restore();
      } else if (hr.type === 'drone') {
        // Smoke puffs (draw behind drone)
        for (const s of hr.smoke) {
          const alpha = (1 - s.t / s.dur) * 0.72;
          const r = Math.round(s.r);
          ctx2.fillStyle = `rgba(70,70,70,${alpha})`;
          ctx2.fillRect(Math.round(s.x) - r, Math.round(s.y) - r, r * 2, r * 2);
          ctx2.fillStyle = `rgba(140,140,140,${alpha * 0.5})`;
          ctx2.fillRect(Math.round(s.x) - Math.round(r * 0.6), Math.round(s.y) - Math.round(r * 0.6), Math.round(r * 1.2), Math.round(r * 1.2));
        }
        // Drone: rotate one full spin around its own center while dropping
        ctx2.save();
        ctx2.translate(hr.x, hr.y);
        ctx2.rotate(hr.spinAngle);
        Art.drawDrone(ctx2, 0, 0, hr.animFrame);
        ctx2.restore();
      }
    }

    // Fallen player (tips clockwise to the right)
    Art.drawCrashedPlayer(ctx, this.crashPlayerX, this.crashAngle);

    // Sky explosions
    for (const ex of this.crashExplosions) {
      if (ex.t < ex.duration) {
        Art.drawExplosion(ctx, ex.x, ex.y, ex.t / ex.duration);
      }
    }

    // Ambulance with flashing siren
    const flashOn = Math.floor(this.crashTimer * 6) % 2 === 0;
    Art.drawAmbulance(ctx, Math.round(this.crashAmbulanceX), GROUND_Y, flashOn);

    this.particles.draw(ctx);
  }

  _drawGameOver() {
    const ctx = this.ctx;
    this.background.draw(ctx);
    this.obstacles.forEach(o => o.draw(ctx));
    this.player.draw(ctx);
    this.particles.draw(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('GAME OVER', W / 2, 106);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('You got hit!', W / 2, 140);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#777';
    ctx.fillText(`Level ${this.currentLevel + 1}`, W / 2, 166);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('[ PRESS SPACE TO RETRY ]', W / 2, 218);
    }
    ctx.textAlign = 'left';
  }

  _drawVictory() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2);
    this.particles.draw(ctx);
    if (Math.floor(Date.now() / 800) % 2 === 0 && this.particles.particles.length < 80) {
      this.particles.burst(100 + Math.random() * 600, 50 + Math.random() * 150, 30,
        ['#fff','#aaa','#888','#555','#ccc']);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText("YOU'RE SAFE!", W / 2, 98);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('All 6 levels complete!', W / 2, 136);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Tel Aviv stands strong.', W / 2, 165);
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('[ PRESS SPACE TO PLAY AGAIN ]', W / 2, 226);
    }
    ctx.textAlign = 'left';
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
new Game(canvas);
