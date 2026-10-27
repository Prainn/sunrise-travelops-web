import type { FlightKind, LonLat } from "./flight-map";

/** 动画层需要的路线最小信息；路径在经纬度空间预先切段。 */
export interface AnimatedRoute {
  key: string;
  kind: FlightKind;
  legCount: number;
  segments: LonLat[][];
}

export interface AnimatedAirport {
  code: string;
  coord: LonLat;
  kind: FlightKind | "mixed";
}

export interface FlightRouteAnimatorOptions {
  /** 经纬度 → 容器像素；不可见或越界返回 null。 */
  project: (coord: LonLat) => [number, number] | null;
  colors: Record<FlightKind | "mixed", string>;
  maxMovers: number;
}

interface PixelPath {
  /** 每段的像素采样点，跨 ±180° 的段之间不连线 */
  segments: Float32Array[];
  /** 每段的累计长度，末项为该段总长 */
  lengths: Float32Array[];
  total: number;
}

interface RouteState {
  route: AnimatedRoute;
  offset: number;
  path: PixelPath | null;
}

const MAX_DPR = 2;
const MIN_PERIOD_MS = 2400;
const MAX_PERIOD_MS = 7000;
/** 末段停顿比例：光点到达后短暂淡出，再从出发机场重新开始 */
const ARRIVAL_HOLD = 0.12;
const TRAIL_RATIO = 0.28;
const TRAIL_MAX_PX = 140;
const PULSE_PERIOD_MS = 2600;
const DIMMED_ALPHA = 0.18;

/**
 * 世界航线演示动画的 Canvas 叠加层。
 *
 * 单一 requestAnimationFrame 驱动全部光点与机场脉冲；相位直接由当前时间计算，暂停后恢复不补跑。
 * 像素路径只在数据、尺寸或缩放平移变化后重算，不在每帧访问 Vue 响应式数据。
 */
export class FlightRouteAnimator {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly options: FlightRouteAnimatorOptions;
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private routes: RouteState[] = [];
  private airports: Array<{ airport: AnimatedAirport; offset: number; pixel: [number, number] | null }> =
    [];
  private highlight: Set<string> | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private frame = 0;
  private isDirty = true;

  constructor(canvas: HTMLCanvasElement, options: FlightRouteAnimatorOptions) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.options = options;
  }

  get isRunning() {
    return this.frame !== 0;
  }

  /** 超出上限的路线只保留 ECharts 静态线与方向箭头，不再生成光点。 */
  setData(routes: AnimatedRoute[], airports: AnimatedAirport[]) {
    this.routes = [...routes]
      .sort((a, b) => b.legCount - a.legCount)
      .slice(0, this.options.maxMovers)
      .map((route) => ({ route, offset: hashUnit(route.key), path: null }));
    this.airports = airports.map((airport) => ({
      airport,
      offset: hashUnit(airport.code),
      pixel: null,
    }));
    this.invalidate();
  }

  setHighlight(keys: Iterable<string> | null) {
    this.highlight = keys ? new Set(keys) : null;
  }

  /** 尺寸、缩放或平移变化后调用，下一帧重新投影。 */
  invalidate() {
    this.isDirty = true;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.max(1, Math.round(width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.invalidate();
  }

  start() {
    if (this.frame || !this.context) return;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    this.stop();
    this.routes = [];
    this.airports = [];
    this.sprites.clear();
  }

  private readonly tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (this.isDirty) this.reproject();
    this.draw(now);
  };

  private reproject() {
    this.isDirty = false;
    for (const state of this.routes) state.path = this.toPixelPath(state.route.segments);
    for (const item of this.airports) item.pixel = this.options.project(item.airport.coord);
  }

  private toPixelPath(segments: LonLat[][]): PixelPath | null {
    const pixelSegments: Float32Array[] = [];
    const lengths: Float32Array[] = [];
    let total = 0;
    for (const segment of segments) {
      const points = new Float32Array(segment.length * 2);
      const cumulative = new Float32Array(segment.length);
      for (let i = 0; i < segment.length; i++) {
        const coord = segment[i];
        const pixel = coord ? this.options.project(coord) : null;
        if (!pixel) return null;
        points[i * 2] = pixel[0];
        points[i * 2 + 1] = pixel[1];
        if (i > 0) {
          const dx = pixel[0] - (points[i * 2 - 2] ?? 0);
          const dy = pixel[1] - (points[i * 2 - 1] ?? 0);
          cumulative[i] = (cumulative[i - 1] ?? 0) + Math.hypot(dx, dy);
        }
      }
      pixelSegments.push(points);
      lengths.push(cumulative);
      total += cumulative[segment.length - 1] ?? 0;
    }
    return total > 0 ? { segments: pixelSegments, lengths, total } : null;
  }

  private draw(now: number) {
    const ctx = this.context;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";

    for (const item of this.airports) this.drawPulse(ctx, item, now);
    for (const state of this.routes) this.drawMover(ctx, state, now);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  private drawPulse(
    ctx: CanvasRenderingContext2D,
    item: { airport: AnimatedAirport; offset: number; pixel: [number, number] | null },
    now: number,
  ) {
    if (!item.pixel || !this.isInView(item.pixel)) return;
    const phase = (now / PULSE_PERIOD_MS + item.offset) % 1;
    ctx.globalAlpha = (1 - phase) * 0.55;
    ctx.strokeStyle = this.options.colors[item.airport.kind];
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(item.pixel[0], item.pixel[1], 3 + phase * 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawMover(ctx: CanvasRenderingContext2D, state: RouteState, now: number) {
    const path = state.path;
    if (!path) return;
    const period = Math.min(MAX_PERIOD_MS, Math.max(MIN_PERIOD_MS, path.total * 9));
    const phase = (now / period + state.offset) % 1;
    const travel = Math.min(1, phase / (1 - ARRIVAL_HOLD));
    const progress = easeInOut(travel) * path.total;
    const fade = phase > 1 - ARRIVAL_HOLD ? 1 - (phase - (1 - ARRIVAL_HOLD)) / ARRIVAL_HOLD : 1;
    const isDimmed = this.highlight !== null && !this.highlight.has(state.route.key);
    const alpha = fade * (isDimmed ? DIMMED_ALPHA : 1);
    if (alpha <= 0.01) return;

    const color = this.options.colors[state.route.kind];
    const trail = Math.min(path.total * TRAIL_RATIO, TRAIL_MAX_PX);
    this.drawTrail(ctx, path, Math.max(0, progress - trail), progress, color, alpha);

    const head = locate(path, progress);
    if (!head || !this.isInView(head.point)) return;
    const sprite = this.sprite(color);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, head.point[0] - 9, head.point[1] - 9, 18, 18);
    drawPlane(ctx, head.point, head.angle, alpha);
  }

  /** 尾迹按长度分段递增透明度，越靠近光点越亮。 */
  private drawTrail(
    ctx: CanvasRenderingContext2D,
    path: PixelPath,
    from: number,
    to: number,
    color: string,
    alpha: number,
  ) {
    if (to - from < 1) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    let distance = 0;
    for (let s = 0; s < path.segments.length; s++) {
      const points = path.segments[s];
      const lengths = path.lengths[s];
      if (!points || !lengths) continue;
      for (let i = 1; i < lengths.length; i++) {
        const start = distance + (lengths[i - 1] ?? 0);
        const end = distance + (lengths[i] ?? 0);
        if (end < from || start > to) continue;
        ctx.globalAlpha = alpha * Math.max(0.05, (end - from) / (to - from)) * 0.9;
        ctx.beginPath();
        ctx.moveTo(points[i * 2 - 2] ?? 0, points[i * 2 - 1] ?? 0);
        ctx.lineTo(points[i * 2] ?? 0, points[i * 2 + 1] ?? 0);
        ctx.stroke();
      }
      distance += lengths[lengths.length - 1] ?? 0;
    }
  }

  private sprite(color: string) {
    let sprite = this.sprites.get(color);
    if (sprite) return sprite;
    sprite = document.createElement("canvas");
    sprite.width = 56;
    sprite.height = 56;
    const ctx = sprite.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(28, 28, 0, 28, 28, 28);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.18, color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 56, 56);
    }
    this.sprites.set(color, sprite);
    return sprite;
  }

  private isInView([x, y]: [number, number]) {
    return x >= -20 && y >= -20 && x <= this.width + 20 && y <= this.height + 20;
  }
}

function locate(path: PixelPath, distance: number) {
  let remaining = distance;
  for (let s = 0; s < path.segments.length; s++) {
    const points = path.segments[s];
    const lengths = path.lengths[s];
    if (!points || !lengths) continue;
    const segmentLength = lengths[lengths.length - 1] ?? 0;
    const isLast = s === path.segments.length - 1;
    if (remaining > segmentLength && !isLast) {
      remaining -= segmentLength;
      continue;
    }
    for (let i = 1; i < lengths.length; i++) {
      const end = lengths[i] ?? 0;
      if (end < remaining && i < lengths.length - 1) continue;
      const start = lengths[i - 1] ?? 0;
      const t = end > start ? Math.min(1, Math.max(0, (remaining - start) / (end - start))) : 0;
      const x0 = points[i * 2 - 2] ?? 0;
      const y0 = points[i * 2 - 1] ?? 0;
      const x1 = points[i * 2] ?? 0;
      const y1 = points[i * 2 + 1] ?? 0;
      return {
        point: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as [number, number],
        angle: Math.atan2(y1 - y0, x1 - x0),
      };
    }
  }
  return null;
}

/** 机头朝向行进方向的简化飞机剪影。 */
function drawPlane(ctx: CanvasRenderingContext2D, [x, y]: [number, number], angle: number, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-1, -1.2);
  ctx.lineTo(-3, -5);
  ctx.lineTo(-4.5, -5);
  ctx.lineTo(-3, -1.2);
  ctx.lineTo(-5, -1);
  ctx.lineTo(-6, -2.6);
  ctx.lineTo(-7, -2.6);
  ctx.lineTo(-6.2, 0);
  ctx.lineTo(-7, 2.6);
  ctx.lineTo(-6, 2.6);
  ctx.lineTo(-5, 1);
  ctx.lineTo(-3, 1.2);
  ctx.lineTo(-4.5, 5);
  ctx.lineTo(-3, 5);
  ctx.lineTo(-1, 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** 字符串稳定散列到 [0,1)，让各路线错开起点且刷新后保持一致。 */
function hashUnit(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
