/**
 * 3D COACHING — Animation d'accueil
 * ---------------------------------
 * Scènes animées de la bannière. Chargé séparément du script principal :
 * la page reste utilisable même si ce fichier arrive en retard.
 *
 * Optimisations :
 *  - l'animation s'arrête dès que la bannière sort de l'écran (économie de
 *    batterie et de processeur pendant que le visiteur lit la page) ;
 *  - moins d'éléments animés sur téléphone ;
 *  - une seule image fixe si le visiteur a demandé de réduire les animations.
 */

(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = document.getElementById('accueil');

    // Réglage système « réduire les animations » : on dessinera une seule image.
    const animationsReduites = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Téléphone ou machine modeste : scène allégée, pour rester fluide partout.
    const petitEcran = window.innerWidth < 768;
    const machineModeste = (navigator.hardwareConcurrency || 4) <= 4;
    const NB = (petitEcran || machineModeste)
        ? { particules: 45, trainees: 4, formes: 6 }
        : { particules: 150, trainees: 10, formes: 16 };

    let W, H;
    function resize() {
        // Résolution plafonnée : inutile de dessiner 4000 px de large.
        W = canvas.width = Math.min(hero ? hero.offsetWidth : window.innerWidth, 2200);
        H = canvas.height = Math.min(hero ? hero.offsetHeight : window.innerHeight, 1400);
    }
    resize();

    let minuteurRedimension;
    window.addEventListener('resize', () => {
        clearTimeout(minuteurRedimension);
        minuteurRedimension = setTimeout(resize, 200);
    });

    const GOLD = '#C9A84C';
    const LGOLD = '#E8C97A';

    // ── Particles ──────────────────────────────────────────────────────
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = -Math.random() * 0.6 - 0.1;
            this.size = Math.random() * 2.5 + 0.3;
            this.alpha = Math.random() * 0.7 + 0.1;
            this.gold = Math.random() > 0.6;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 300;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.life++;
            if (this.life > this.maxLife || this.y < -10) this.reset();
        }
        draw() {
            const fade = Math.min(this.life / 40, 1) * Math.min((this.maxLife - this.life) / 40, 1);
            ctx.save();
            ctx.globalAlpha = this.alpha * fade;
            ctx.fillStyle = this.gold ? LGOLD : 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    const particles = Array.from({ length: NB.particules }, () => new Particle());

    // ── Gold streaks ────────────────────────────────────────────────────
    class GoldLine {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = H + 50;
            this.targetX = this.x + (Math.random() - 0.5) * 300;
            this.targetY = -50;
            this.progress = 0;
            this.speed = 0.002 + Math.random() * 0.003;
            this.alpha = Math.random() * 0.35 + 0.08;
            this.width = Math.random() * 1.5 + 0.3;
            this.color = Math.random() > 0.5 ? GOLD : LGOLD;
            this.trail = [];
        }
        update() {
            this.progress += this.speed;
            const cx = this.x + (this.targetX - this.x) * this.progress;
            const cy = this.y + (this.targetY - this.y) * this.progress;
            this.trail.push({ x: cx, y: cy });
            if (this.trail.length > 60) this.trail.shift();
            if (this.progress >= 1) this.reset();
        }
        draw() {
            if (this.trail.length < 2) return;
            ctx.save();
            for (let i = 1; i < this.trail.length; i++) {
                const t = i / this.trail.length;
                ctx.globalAlpha = this.alpha * t * 0.8;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width * t;
                ctx.beginPath();
                ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
                ctx.stroke();
            }
            const head = this.trail[this.trail.length - 1];
            ctx.globalAlpha = this.alpha;
            const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 4);
            g.addColorStop(0, LGOLD); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(head.x, head.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    const goldLines = Array.from({ length: NB.trainees }, () => { const g = new GoldLine(); g.progress = Math.random(); return g; });

    // ── Geometric shapes ────────────────────────────────────────────────
    class GeomShape {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W; this.y = Math.random() * H;
            this.size = 40 + Math.random() * 120;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.003;
            this.alpha = 0.015 + Math.random() * 0.05;
            this.sides = [3, 4, 6][Math.floor(Math.random() * 3)];
            this.vx = (Math.random() - 0.5) * 0.15; this.vy = (Math.random() - 0.5) * 0.15;
            this.gold = Math.random() > 0.4;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.rotation += this.rotSpeed;
            if (this.x < -200 || this.x > W + 200 || this.y < -200 || this.y > H + 200) this.reset();
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
            ctx.globalAlpha = this.alpha;
            ctx.strokeStyle = this.gold ? GOLD : 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let i = 0; i < this.sides; i++) {
                const angle = (i / this.sides) * Math.PI * 2 - Math.PI / 2;
                i === 0 ? ctx.moveTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size)
                    : ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
            }
            ctx.closePath(); ctx.stroke();
            ctx.restore();
        }
    }
    const shapes = Array.from({ length: NB.formes }, () => new GeomShape());

    // ── Utility helpers ─────────────────────────────────────────────────
    function drawFigure(x, y, scale, facing, alpha, style) {
        ctx.save();
        ctx.translate(x, y); ctx.scale(facing * scale, scale);
        ctx.globalAlpha = alpha;
        const fill = style === 'gold' ? `rgba(201,168,76,${alpha * 0.9})` : `rgba(255,255,255,${alpha * 0.15})`;
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(0, -72, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-10, -60, 20, 42, 4); ctx.fill();
        if (style === 'walking') {
            ctx.beginPath(); ctx.roundRect(-8, -18, 8, 38, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(0, -18, 8, 35, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(-18, -58, 8, 30, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(10, -55, 8, 28, 3); ctx.fill();
        } else {
            ctx.beginPath(); ctx.roundRect(-9, -18, 8, 42, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(1, -18, 8, 42, 3); ctx.fill();
        }
        ctx.restore();
    }

    function drawSkyline(alpha, t) {
        ctx.save(); ctx.globalAlpha = alpha;
        const buildings = [
            { x: 0.05, w: 0.06, h: 0.45, floors: 12 }, { x: 0.10, w: 0.04, h: 0.35, floors: 9 },
            { x: 0.13, w: 0.08, h: 0.55, floors: 15 }, { x: 0.20, w: 0.05, h: 0.40, floors: 11 },
            { x: 0.24, w: 0.09, h: 0.65, floors: 18 }, { x: 0.32, w: 0.04, h: 0.50, floors: 13 },
            { x: 0.35, w: 0.07, h: 0.72, floors: 20 }, { x: 0.41, w: 0.05, h: 0.48, floors: 12 },
            { x: 0.45, w: 0.10, h: 0.80, floors: 22 }, { x: 0.54, w: 0.04, h: 0.60, floors: 16 },
            { x: 0.57, w: 0.08, h: 0.68, floors: 18 }, { x: 0.64, w: 0.05, h: 0.52, floors: 14 },
            { x: 0.68, w: 0.07, h: 0.70, floors: 19 }, { x: 0.74, w: 0.04, h: 0.45, floors: 12 },
            { x: 0.77, w: 0.06, h: 0.55, floors: 15 }, { x: 0.82, w: 0.09, h: 0.62, floors: 17 },
            { x: 0.90, w: 0.05, h: 0.50, floors: 13 }, { x: 0.94, w: 0.07, h: 0.40, floors: 11 },
        ];
        buildings.forEach(b => {
            const bx = b.x * W, bw = b.w * W, bh = b.h * H * 0.6, by = H - bh;
            const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
            grad.addColorStop(0, 'rgba(26,47,90,0.9)'); grad.addColorStop(0.5, 'rgba(20,38,76,0.95)'); grad.addColorStop(1, 'rgba(13,27,62,0.9)');
            ctx.fillStyle = grad; ctx.fillRect(bx, by, bw, bh);
            const wCols = Math.max(1, Math.floor(bw / 12)), wRows = b.floors;
            const ww = bw / wCols * 0.5, wh = bh / wRows * 0.35;
            for (let row = 0; row < wRows; row++) {
                for (let col = 0; col < wCols; col++) {
                    const lit = Math.sin(row * 3.7 + col * 2.1 + b.x * 10) > 0.1;
                    if (lit) {
                        ctx.fillStyle = 'rgba(220,230,255,0.55)';
                        ctx.fillRect(bx + col * (bw / wCols) + (bw / wCols - ww) * 0.5, by + row * (bh / wRows) + (bh / wRows - wh) * 0.5 + 4, ww, wh);
                    }
                }
            }
            ctx.strokeStyle = 'rgba(201,168,76,0.07)'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, by, bw, bh);
        });
        ctx.restore();
    }

    function drawNetwork(alpha, t) {
        ctx.save();
        const nodes = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: (0.15 + 0.7 * (i % 4) / 3 + Math.sin(t * 0.008 + i) * 0.03) * W,
                y: (0.2 + 0.6 * Math.floor(i / 4) / 2 + Math.cos(t * 0.006 + i) * 0.03) * H,
            });
        }
        nodes.forEach((n, i) => {
            nodes.forEach((m, j) => {
                if (j <= i) return;
                const d = Math.hypot(n.x - m.x, n.y - m.y);
                if (d < W * 0.35) {
                    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.5;
                    ctx.globalAlpha = alpha * 0.15 * (1 - d / (W * 0.35));
                    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                }
            });
        });
        nodes.forEach((n, i) => {
            ctx.globalAlpha = alpha * 0.55;
            const pulse = 0.7 + 0.3 * Math.sin(t * 0.05 + i);
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 12 * pulse);
            g.addColorStop(0, LGOLD); g.addColorStop(0.4, 'rgba(201,168,76,0.4)'); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 12 * pulse, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }

    function drawRadialBurst(cx, cy, alpha, t) {
        ctx.save();
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const len = 80 + Math.sin(t * 0.04 + i * 0.7) * 30;
            ctx.globalAlpha = alpha * 0.12 * (0.5 + 0.5 * Math.sin(t * 0.03 + i));
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len); ctx.stroke();
        }
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
        g.addColorStop(0, `rgba(201,168,76,${alpha * 0.25})`);
        g.addColorStop(0.5, `rgba(201,168,76,${alpha * 0.07})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ── Scenes ──────────────────────────────────────────────────────────
    function sceneVision(t) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#060E1F'); bg.addColorStop(0.4, '#0D1B3E'); bg.addColorStop(1, '#1A2F5A');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        drawSkyline(0.9, t);
        const fog = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.75);
        fog.addColorStop(0, 'transparent'); fog.addColorStop(0.5, 'rgba(13,27,62,0.5)'); fog.addColorStop(1, 'rgba(13,27,62,0.8)');
        ctx.fillStyle = fog; ctx.fillRect(0, H * 0.45, W, H * 0.55);
        for (let i = 0; i < 5; i++) {
            const fx = ((i / 5) + (t * 0.0005)) % 1;
            drawFigure(fx * W, H * 0.82, 0.6 + i * 0.1, 1, 0.35, 'walking');
        }
        drawNetwork(0.45, t);
        const h = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.4);
        h.addColorStop(0, 'rgba(201,168,76,0.05)'); h.addColorStop(1, 'transparent');
        ctx.fillStyle = h; ctx.fillRect(0, 0, W, H);
    }

    function sceneLeadership(t) {
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#080F1E'); bg.addColorStop(0.5, '#0E1C3A'); bg.addColorStop(1, '#152444');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i <= 6; i++) {
            ctx.strokeStyle = 'rgba(201,168,76,0.05)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(W * i / 6, 0); ctx.lineTo(W * i / 6, H); ctx.stroke();
        }
        // Table
        const ty = H * 0.65;
        const tg = ctx.createLinearGradient(W * 0.1, ty, W * 0.9, ty);
        tg.addColorStop(0, 'rgba(26,47,90,0.9)'); tg.addColorStop(0.5, 'rgba(30,55,100,0.95)'); tg.addColorStop(1, 'rgba(26,47,90,0.9)');
        ctx.fillStyle = tg; ctx.fillRect(W * 0.1, ty, W * 0.8, H * 0.06);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(W * 0.1, ty); ctx.lineTo(W * 0.9, ty); ctx.stroke(); ctx.globalAlpha = 1;
        drawFigure(W * 0.35, H * 0.7, 1.4, 1, 0.45, 'standing');
        drawFigure(W * 0.5, H * 0.72, 1.2, -1, 0.35, 'standing');
        drawFigure(W * 0.62, H * 0.73, 1.1, 1, 0.3, 'standing');
        drawRadialBurst(W * 0.35, H * 0.45, 0.55, t);
    }

    function sceneCollaboration(t) {
        const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
        bg.addColorStop(0, '#122040'); bg.addColorStop(0.6, '#0D1B3E'); bg.addColorStop(1, '#060E20');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * 0.62, tr = W * 0.15;
        const tg = ctx.createRadialGradient(cx, cy, 0, cx, cy, tr);
        tg.addColorStop(0, 'rgba(30,55,100,0.8)'); tg.addColorStop(1, 'rgba(20,37,75,0.9)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(cx, cy, tr, tr * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(201,168,76,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const px = cx + Math.cos(angle) * tr * 1.05, py = cy + Math.sin(angle) * tr * 0.45;
            drawFigure(px, py - 50, 0.85, angle > Math.PI ? -1 : 1, 0.4, 'standing');
            const pulse = 0.3 + 0.3 * Math.sin(t * 0.04 + i * 1.2);
            ctx.strokeStyle = GOLD; ctx.lineWidth = 0.5; ctx.globalAlpha = pulse * 0.25;
            ctx.beginPath(); ctx.moveTo(px, py - 50); ctx.lineTo(cx, cy - 30); ctx.stroke(); ctx.globalAlpha = 1;
        }
        drawRadialBurst(cx, cy - 20, 0.75, t);
    }

    function sceneExcellence(t) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#060C1A'); bg.addColorStop(0.5, '#0A1530'); bg.addColorStop(1, '#152040');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        const sw = W * 0.6, sh = H * 0.45, sx = (W - sw) / 2, sy = H * 0.08;
        const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
        sg.addColorStop(0, 'rgba(20,40,90,0.9)'); sg.addColorStop(0.5, 'rgba(30,55,110,0.85)'); sg.addColorStop(1, 'rgba(20,40,90,0.9)');
        ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(201,168,76,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh);
        ctx.save(); ctx.globalAlpha = 0.12;
        for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = i === 0 ? GOLD : 'rgba(255,255,255,0.5)'; ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.beginPath(); const ly = sy + sh * (0.15 + i * 0.14);
            ctx.moveTo(sx + sw * 0.08, ly); ctx.lineTo(sx + sw * 0.08 + sw * (0.25 + i * 0.06), ly); ctx.stroke();
        }
        ctx.restore();
        const glow = ctx.createRadialGradient(W / 2, sy + sh / 2, 0, W / 2, sy + sh / 2, sw * 0.7);
        glow.addColorStop(0, 'rgba(50,100,200,0.07)'); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        drawFigure(W / 2, sy + sh + 10, 1.2, 1, 0.55, 'standing');
        for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
            drawFigure(W * (0.1 + 0.8 * c / 9), H * (0.66 + r * 0.09), 0.5 - r * 0.03, 1, 0.2 - r * 0.03, 'standing');
        }
        const spot = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, H * 0.7);
        spot.addColorStop(0, 'rgba(232,201,122,0.07)'); spot.addColorStop(1, 'transparent');
        ctx.fillStyle = spot;
        ctx.beginPath(); ctx.moveTo(W / 2 - 10, 0); ctx.lineTo(W / 2 + 10, 0);
        ctx.lineTo(W / 2 + 100, H * 0.7); ctx.lineTo(W / 2 - 100, H * 0.7); ctx.fill();
    }

    function sceneTransformation(t) {
        const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
        bg.addColorStop(0, '#0E1E45'); bg.addColorStop(0.5, '#0A1530'); bg.addColorStop(1, '#050B1A');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H / 2);
        for (let i = 0; i < 360; i++) {
            const angle = (i / 360) * Math.PI * 16 + t * 0.008;
            const r = i * 0.8 + Math.sin(t * 0.02 + i * 0.05) * 5;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r * 0.6;
            if (r > W * 0.6) continue;
            ctx.globalAlpha = 0.07 * (1 - r / (W * 0.6));
            ctx.fillStyle = i % 2 === 0 ? GOLD : LGOLD;
            ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        drawFigure(W / 2, H * 0.7, 1.6, 1, 0.55, 'gold');
        drawRadialBurst(W / 2, H * 0.52, 1.1, t);
        for (let i = 0; i < 5; i++) {
            const r2 = 50 + i * 80 + Math.sin(t * 0.02) * 20;
            ctx.save(); ctx.globalAlpha = 0.07 * (0.5 + 0.5 * Math.sin(t * 0.03 - i * 0.5));
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(W / 2, H * 0.52, r2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const shine = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.5);
        shine.addColorStop(0, 'rgba(201,168,76,0.1)'); shine.addColorStop(1, 'transparent');
        ctx.fillStyle = shine; ctx.fillRect(0, 0, W, H * 0.5);
    }

    const scenes = [sceneVision, sceneLeadership, sceneCollaboration, sceneExcellence, sceneTransformation];
    let sceneIndex = 0, sceneTime = 0;
    const SCENE_DURATION = 420;
    let animT = 0;

    function dessinerImage() {
        animT++; sceneTime++;
        if (sceneTime >= SCENE_DURATION) { sceneTime = 0; sceneIndex = (sceneIndex + 1) % scenes.length; }

        const transProgress = sceneTime / SCENE_DURATION;
        let sceneAlpha = 1;
        if (transProgress < 0.1) sceneAlpha = transProgress / 0.1;
        else if (transProgress > 0.9) sceneAlpha = (1 - transProgress) / 0.1;

        ctx.clearRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = sceneAlpha;
        scenes[sceneIndex](animT);
        ctx.restore();

        particles.forEach(p => { p.update(); p.draw(); });
        goldLines.forEach(g => { g.update(); g.draw(); });
        shapes.forEach(s => { s.update(); s.draw(); });

        // Vignette
        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(5,10,25,0.55)');
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    }

    // ── Marche / arrêt de l'animation ───────────────────────────────────
    // L'animation ne tourne que si la bannière est à l'écran ET si l'onglet
    // est au premier plan. Le reste du temps, le processeur est libre.

    let idAnimation = null;
    let banniereVisible = true;

    function boucle() {
        dessinerImage();
        idAnimation = requestAnimationFrame(boucle);
    }

    function synchroniser() {
        const doitTourner = banniereVisible && !document.hidden;
        if (doitTourner && idAnimation === null) {
            idAnimation = requestAnimationFrame(boucle);
        } else if (!doitTourner && idAnimation !== null) {
            cancelAnimationFrame(idAnimation);
            idAnimation = null;
        }
    }

    if (animationsReduites) {
        dessinerImage();   // une image fixe, sans mouvement
        return;
    }

    if ('IntersectionObserver' in window && hero) {
        new IntersectionObserver((entrees) => {
            banniereVisible = entrees[0].isIntersecting;
            synchroniser();
        }, { threshold: 0 }).observe(hero);
    }

    document.addEventListener('visibilitychange', synchroniser);
    synchroniser();
})();
