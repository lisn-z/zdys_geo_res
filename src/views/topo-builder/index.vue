<template>
  <div ref="rootRef" class="topo-builder flex h-screen w-full flex-col">
    <div id="top-toolbar"
      class="z-20 flex h-14 shrink-0 items-center overflow-x-auto whitespace-nowrap border-b border-slate-700 bg-[#252526] px-4">
      <div class="mr-2 flex shrink-0 items-center text-sm font-bold text-[#02DECA]">
        <i data-lucide="map" class="mr-2 h-5 w-5"></i> TopoBuilder
      </div>
      <div class="toolbar-divider shrink-0"></div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-1">
          <button id="btn-draw" @click="setMode('draw')" class="icon-button accent-button" title="自由手绘"><i
              data-lucide="pen-tool" class="h-4 w-4"></i></button>
          <button id="btn-erase" @click="setMode('erase')"
            class="icon-button text-slate-400 hover:bg-slate-700 hover:text-white" title="橡皮擦"><i data-lucide="eraser"
              class="h-4 w-4"></i></button>
          <button id="btn-height-paint" @click="setMode('height-paint')"
            class="icon-button text-slate-400 hover:bg-slate-700 hover:text-white" title="黑白柔边高度笔刷"><i
              data-lucide="brush" class="h-4 w-4"></i></button>
          <button id="btn-sculpt" @click="setMode('sculpt')"
            class="icon-button text-slate-400 hover:bg-slate-700 hover:text-white" title="三维雕刻"><i data-lucide="pickaxe"
              class="h-4 w-4"></i></button>
        </div>
        <div class="flex items-center gap-1">
          <button id="btn-undo" @click="undo()"
            class="icon-button cursor-not-allowed text-slate-400 opacity-30 hover:text-white" title="撤销"><i
              data-lucide="undo" class="h-4 w-4"></i></button>
          <button id="btn-redo" @click="redo()"
            class="icon-button cursor-not-allowed text-slate-400 opacity-30 hover:text-white" title="重做"><i
              data-lucide="redo" class="h-4 w-4"></i></button>
          <div class="mx-1 h-4 w-px bg-slate-700"></div>
          <button id="btn-clear" @click="clearCanvas()" class="icon-button text-slate-400 hover:text-red-400"
            title="清空"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
        </div>
      </div>
      <div class="toolbar-divider shrink-0"></div>

      <div class="flex shrink-0 items-center gap-2">
        <button id="upload-trigger"
          class="flex items-center gap-1.5 rounded border border-slate-600 bg-[#1e1e1e] px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-[#02DECA] hover:text-white"
          title="上传等高线图片">
          <i data-lucide="image-up" class="h-3.5 w-3.5 text-[#02DECA]"></i> 上传等高线
        </button>
        <input id="contour-image-input" type="file" accept="image/*" class="hidden">
        <button id="heightmap-trigger"
          class="flex items-center gap-1.5 rounded border border-slate-600 bg-[#1e1e1e] px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-[#02DECA] hover:text-white"
          title="上传黑白高度图">
          <i data-lucide="layers-3" class="h-3.5 w-3.5 text-[#02DECA]"></i> 高度图
        </button>
        <input id="heightmap-input" type="file" accept="image/*" class="hidden">
        <label class="flex items-center gap-1 text-xs text-slate-400">
          等高距
          <input id="image-interval-input" type="number" min="10" max="200" step="10" value="50"
            class="h-7 w-14 rounded border border-slate-600 bg-slate-800 px-2 text-xs text-white outline-none focus:border-[#02DECA]">
        </label>
        <label class="flex items-center gap-1 text-xs text-slate-400">
          最高点
          <input id="heightmap-max-input" type="number" min="10" max="3000" step="10" value="500"
            class="h-7 w-16 rounded border border-slate-600 bg-slate-800 px-2 text-xs text-white outline-none focus:border-[#02DECA]">
        </label>
        <label class="flex items-center gap-1 text-xs text-slate-400">
          最低点
          <input id="heightmap-min-input" type="number" min="-3000" max="-10" step="10" value="-500"
            class="h-7 w-16 rounded border border-slate-600 bg-slate-800 px-2 text-xs text-white outline-none focus:border-[#02DECA]">
        </label>
        <button id="heightmap-apply"
          class="icon-button border border-slate-600 text-slate-300 hover:border-[#02DECA] hover:text-white"
          title="按最高点重新生成高度图">
          <i data-lucide="refresh-cw" class="h-3.5 w-3.5"></i>
        </button>
        <button id="heightmap-contours"
          class="icon-button border border-slate-600 text-slate-300 hover:border-[#02DECA] hover:text-white"
          title="显示高度图等高线">
          <i data-lucide="scan-line" class="h-3.5 w-3.5"></i>
        </button>
        <div class="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-1">
          <button id="brush-white" class="icon-button accent-button" title="白笔刷：抬高"><i data-lucide="sun"
              class="h-3.5 w-3.5"></i></button>
          <button id="brush-black" class="icon-button text-slate-400 hover:bg-slate-700 hover:text-white"
            title="黑笔刷：压低"><i data-lucide="moon" class="h-3.5 w-3.5"></i></button>
        </div>
        <label class="flex items-center gap-1 text-xs text-slate-400">
          笔刷
          <input id="brush-size-slider" type="range" min="8" max="120" step="2" value="42" class="w-16">
        </label>
        <label class="flex items-center gap-1 text-xs text-slate-400">
          强度
          <input id="brush-strength-slider" type="range" min="0.03" max="0.5" step="0.01" value="0.18" class="w-16">
        </label>
      </div>
      <div class="toolbar-divider shrink-0"></div>

      <div class="flex shrink-0 items-center gap-2">
        <i data-lucide="mountain" class="h-4 w-4 text-[#02DECA]"></i>
        <select id="preset-select"
          class="cursor-pointer rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none hover:bg-slate-600 focus:border-[#02DECA]">
          <option value="" disabled selected>选择经典地貌...</option>
          <option value="peak">山峰</option>
          <option value="basin">盆地</option>
          <option value="saddle">鞍部</option>
          <option value="steep">陡坡与缓坡</option>
          <option value="valley_ridge">山谷与山脊</option>
        </select>
      </div>
      <div class="toolbar-divider shrink-0"></div>

      <div class="flex shrink-0 items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">高程 <span id="elev-display"
              class="ml-1 inline-block w-10 font-mono text-[#02DECA]">100m</span></span>
          <input type="range" id="elev-slider" min="-500" max="500" step="10" value="100" class="w-24">
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Z轴 <span id="scale-display"
              class="ml-1 inline-block w-8 font-mono text-[#02DECA]">1.0x</span></span>
          <input type="range" id="scale-slider" min="0.1" max="5.0" step="0.1" value="1.0" class="w-20">
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">柔化 <span id="radius-display"
              class="ml-1 inline-block w-8 font-mono text-[#02DECA]">150</span></span>
          <input type="range" id="radius-slider" min="50" max="500" step="10" value="150" class="w-20">
        </div>
      </div>
      <div class="toolbar-divider shrink-0"></div>

      <div class="flex shrink-0 items-center gap-4">
        <label class="flex cursor-pointer items-center gap-2 text-xs text-slate-300 hover:text-white">
          <input type="checkbox" id="wireframe-toggle" class="h-3.5 w-3.5 accent-[#02DECA]"> 线框
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-slate-300 hover:text-white">
          <input type="checkbox" id="autorotate-toggle" class="h-3.5 w-3.5 accent-[#02DECA]" checked> 自转
        </label>
        <button @click="generateRealisticImage()"
          class="flex items-center gap-1.5 rounded bg-[#02DECA] px-3 py-1.5 text-xs font-bold text-[#041312] shadow-md transition-all hover:bg-[#20f0df]">
          <i data-lucide="sparkles" class="h-3.5 w-3.5"></i> AI 实景图
        </button>
      </div>
      <div class="min-w-[10px] flex-1"></div>

      <div class="flex shrink-0 rounded border border-slate-700 bg-[#1e1e1e] p-1">
        <button id="layout-horizontal"
          class="flex gap-1 rounded bg-slate-700 px-3 py-1 text-xs font-bold text-white shadow"><i data-lucide="columns"
            class="h-3.5 w-3.5"></i> 左右</button>
        <button id="layout-vertical"
          class="flex gap-1 rounded px-3 py-1 text-xs font-bold text-slate-400 hover:text-white"><i data-lucide="rows"
            class="h-3.5 w-3.5"></i> 上下</button>
      </div>
    </div>

    <div id="center-workspace" class="relative flex min-w-0 flex-1 flex-row bg-[#1e1e1e]">
      <div id="canvas-container" class="relative flex-1 overflow-hidden border-r border-slate-700"
        style="cursor: crosshair;">
        <div
          class="pointer-events-none absolute left-6 top-4 z-10 flex items-center gap-2 rounded border border-slate-600 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur">
          <i data-lucide="crosshair" class="h-4 w-4 text-[#02DECA]"></i> 2D 等高线区
        </div>
        <button id="expand-up"
          class="absolute left-1/2 top-4 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-slate-600 bg-[#1e1e1e]/90 text-[#02DECA] shadow hover:border-[#02DECA]"
          title="向上增加 600m">+</button>
        <button id="expand-down"
          class="absolute bottom-4 left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-slate-600 bg-[#1e1e1e]/90 text-[#02DECA] shadow hover:border-[#02DECA]"
          title="向下增加 600m">+</button>
        <button id="expand-left"
          class="absolute left-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-[#1e1e1e]/90 text-[#02DECA] shadow hover:border-[#02DECA]"
          title="向左增加 600m">+</button>
        <button id="expand-right"
          class="absolute right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-[#1e1e1e]/90 text-[#02DECA] shadow hover:border-[#02DECA]"
          title="向右增加 600m">+</button>
        <div id="import-status"
          class="pointer-events-none absolute bottom-4 left-6 z-10 max-w-[70%] rounded border border-slate-700 bg-black/45 px-3 py-2 text-[11px] text-slate-300 backdrop-blur">
        </div>
        <canvas id="canvas-2d" class="absolute inset-0 h-full w-full"></canvas>
      </div>

      <div class="relative flex-1 overflow-hidden bg-[#111111]">
        <div
          class="pointer-events-none absolute left-6 top-4 z-10 flex items-center gap-2 rounded border border-slate-600 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur">
          <i data-lucide="box" class="h-4 w-4 text-[#02DECA]"></i> 3D 地形区
        </div>
        <div class="absolute right-6 top-4 z-20" style="perspective: 400px; width: 60px; height: 60px;">
          <div id="view-cube" class="absolute h-full w-full"
            style="transform-style: preserve-3d; transform: translateZ(-30px);">
            <div class="view-cube-face face-front" @click="snapView('front')">前</div>
            <div class="view-cube-face face-back" @click="snapView('back')">后</div>
            <div class="view-cube-face face-right" @click="snapView('right')">右</div>
            <div class="view-cube-face face-left" @click="snapView('left')">左</div>
            <div class="view-cube-face face-top" @click="snapView('top')">顶</div>
            <div class="view-cube-face face-bottom" @click="snapView('bottom')">底</div>
          </div>
        </div>
        <div
          class="pointer-events-none absolute bottom-6 right-6 z-20 flex gap-3 rounded-lg border border-slate-700 bg-[#1e1e1e]/80 p-3 shadow-lg backdrop-blur">
          <div class="h-40 w-4 rounded shadow-inner"
            style="background: linear-gradient(to top, rgb(8,32,86) 0%, rgb(18,84,150) 18%, rgb(51,148,198) 36%, rgb(58,140,102) 50%, rgb(242,230,125) 68%, rgb(179,77,38) 86%, rgb(245,245,245) 100%);">
          </div>
          <div class="flex flex-col justify-between py-0.5 font-mono text-[10px] text-slate-300">
            <span>500m</span><span>300m</span><span>100m</span><span>0m</span><span>-300m</span><span>-500m</span>
          </div>
        </div>
        <div id="three-container" class="absolute inset-0 h-full w-full"></div>
        <div
          class="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          WebGL Engine Active</div>
      </div>
    </div>

    <div id="ai-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        class="flex max-h-[90vh] w-[600px] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#252526] shadow-2xl">
        <div class="flex h-12 items-center justify-between border-b border-slate-700 bg-[#2d2d2d] px-4">
          <span class="flex items-center gap-2 text-sm font-bold text-[#02DECA]"><i data-lucide="sparkles"
              class="h-4 w-4"></i> AI 地貌实景转换</span>
          <button @click="closeAiModal()" class="text-slate-400 hover:text-white"><i data-lucide="x"
              class="h-5 w-5"></i></button>
        </div>
        <div class="relative flex min-h-[300px] flex-col items-center justify-center p-6">
          <div id="ai-config" class="flex w-full flex-col gap-5">
            <div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300"><i data-lucide="camera"
                  class="h-4 w-4 text-[#02DECA]"></i> 1. 确认截取视角</h3>
              <div class="flex gap-2">
                <button @click="snapView('top')"
                  class="rounded border border-slate-600 bg-[#1e1e1e] px-3 py-1.5 text-xs text-slate-300 hover:border-[#02DECA]">垂直俯视</button>
                <button @click="snapView('front')"
                  class="rounded border border-slate-600 bg-[#1e1e1e] px-3 py-1.5 text-xs text-slate-300 hover:border-[#02DECA]">45°
                  鸟瞰</button>
              </div>
            </div>
            <div class="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300"><i data-lucide="leaf"
                  class="h-4 w-4 text-green-400"></i> 2. 选择自然环境</h3>
              <select id="ai-biome-select"
                class="w-full rounded border border-slate-600 bg-[#1e1e1e] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#02DECA]">
                <option value="summer">夏季森林与草坡</option>
                <option value="autumn">秋季阔叶林</option>
                <option value="desert">干旱荒漠与裸岩</option>
                <option value="volcanic">火山灰地貌</option>
              </select>
            </div>
            <button @click="startAiGeneration()"
              class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#02DECA] py-3 font-bold text-[#041312] shadow-lg hover:bg-[#20f0df]">确认并生成</button>
          </div>
          <div id="ai-loading" class="hidden flex-col items-center gap-4">
            <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-[#02DECA]"></div>
            <p class="animate-pulse text-sm text-slate-300">正在生成实景图...</p>
          </div>
          <div id="ai-result" class="hidden w-full flex-col items-center gap-4">
            <img id="ai-image" src=""
              class="max-h-[50vh] max-w-full rounded-lg border border-slate-700 object-contain shadow-lg"
              alt="AI 生成实景图">
            <div class="flex w-full gap-3">
              <button @click="openAiConfigModal()"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-[#1e1e1e] py-2 text-sm text-slate-300 hover:bg-slate-700">重新生成</button>
              <button id="ai-download-btn"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#02DECA] px-6 py-2 text-sm font-bold text-[#041312] shadow hover:bg-[#20f0df]">下载图片</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Box,
  Brush,
  Camera,
  Columns,
  Crosshair,
  Eraser,
  ImageUp,
  Layers3,
  Leaf,
  Map as MapIcon,
  Moon,
  Mountain,
  PenTool,
  Pickaxe,
  Redo,
  RefreshCw,
  Rows,
  ScanLine,
  Sparkles,
  Sun,
  Trash2,
  Undo,
  X,
  createIcons,
} from 'lucide'

const rootRef = ref(null)

const lucideIcons = {
  Box,
  Brush,
  Camera,
  Columns,
  Crosshair,
  Eraser,
  ImageUp,
  Layers3,
  Leaf,
  Map: MapIcon,
  Moon,
  Mountain,
  PenTool,
  Pickaxe,
  Redo,
  RefreshCw,
  Rows,
  ScanLine,
  Sparkles,
  Sun,
  Trash2,
  Undo,
  X,
}

let engineApi = null
let animationFrameId = 0
let destroyEngine = () => { }

const setMode = mode => engineApi?.setMode(mode)
const undo = () => engineApi?.undo()
const redo = () => engineApi?.redo()
const clearCanvas = () => engineApi?.clearCanvas()
const snapView = view => engineApi?.snapView(view)
const generateRealisticImage = () => engineApi?.generateRealisticImage()
const closeAiModal = () => engineApi?.closeAiModal()
const openAiConfigModal = () => engineApi?.openAiConfigModal()
const startAiGeneration = () => engineApi?.startAiGeneration()

onMounted(() => {
  const root = rootRef.value
  if (!root) return

  const getEl = id => root.querySelector(`#${id}`)
  const windowListenerCleanups = []
  const addWindowListener = (type, handler, options) => {
    window.addEventListener(type, handler, options)
    windowListenerCleanups.push(() => window.removeEventListener(type, handler, options))
  }

  createIcons({ icons: lucideIcons });

  const THEME_COLOR = 0x02DECA;
  const PLANE_SIZE = 600;
  const RESOLUTION = 96;
  const GRID_RES = RESOLUTION + 1;
  let worldWidth = PLANE_SIZE;
  let worldDepth = PLANE_SIZE;
  const TOPO_COLORS = [
    { h: -500, r: 8, g: 32, b: 86 },
    { h: -300, r: 18, g: 84, b: 150 },
    { h: -100, r: 51, g: 148, b: 198 },
    { h: 0, r: 58, g: 140, b: 102 },
    { h: 100, r: 153, g: 204, b: 102 },
    { h: 200, r: 242, g: 230, b: 125 },
    { h: 300, r: 230, g: 153, b: 51 },
    { h: 400, r: 179, g: 77, b: 38 },
    { h: 500, r: 245, g: 245, b: 245 }
  ];

  const topToolbar = getEl('top-toolbar');
  topToolbar.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      topToolbar.scrollLeft += e.deltaY * 1.5;
    }
  }, { passive: false });

  let currentElevation = 100;
  let points = [];
  let currentStrokeId = 0;
  let needsTerrainUpdate = false;
  let mapBox = { x: 0, y: 0, width: 0, height: 0, size: 0 };
  let currentMode = 'draw';
  let historyList = [];
  let historyStep = -1;
  let isDrawing = false;
  let lastHeightField = new Float32Array(GRID_RES * GRID_RES);
  let importedHeightMap = null;
  let heightMapBase = null;
  let heightMapMaxElevation = 500;
  let heightMapPreview = null;
  let brushTone = 1;
  let brushSize = 42;
  let brushStrength = 0.18;
  let showHeightContours = false;
  let isSculpting3D = false;
  let lastImportSummary = '';

  const threeContainer = getEl('three-container');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a1a1a, 0.0006);

  const camera = new THREE.PerspectiveCamera(35, threeContainer.clientWidth / threeContainer.clientHeight, 10, 5000);
  camera.position.set(0, 450, 450);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  threeContainer.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 50;
  controls.maxDistance = 2500;

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(200, 500, 300);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
  fillLight.position.set(-200, 300, -300);
  scene.add(fillLight);

  const geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, RESOLUTION, RESOLUTION);
  geometry.rotateX(-Math.PI / 2);
  const colors = new Float32Array(GRID_RES * GRID_RES * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMaterial = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: false,
    shininess: 18
  });
  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  scene.add(terrainMesh);
  const sculptRaycaster = new THREE.Raycaster();
  const sculptPointer = new THREE.Vector2();
  const sculptBrushGroup = new THREE.Group();
  const sculptBrushFill = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
  );
  const sculptBrushRing = new THREE.Mesh(
    new THREE.RingGeometry(0.97, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  sculptBrushGroup.add(sculptBrushFill, sculptBrushRing);
  sculptBrushGroup.visible = false;
  scene.add(sculptBrushGroup);

  const gridHelper = new THREE.GridHelper(PLANE_SIZE, 30, THEME_COLOR, 0x666666);
  gridHelper.position.y = -1;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.48;
  scene.add(gridHelper);

  const canvas = getEl('canvas-2d');
  const ctx = canvas.getContext('2d');
  const centerWorkspace = getEl('center-workspace');
  const canvasContainerNode = getEl('canvas-container');
  const btnLayoutVertical = getEl('layout-vertical');
  const btnLayoutHorizontal = getEl('layout-horizontal');
  const importStatus = getEl('import-status');

  function getElevationColor(h) {
    h = Math.max(-500, Math.min(500, h));
    for (let i = 0; i < TOPO_COLORS.length - 1; i++) {
      const c1 = TOPO_COLORS[i];
      const c2 = TOPO_COLORS[i + 1];
      if (h >= c1.h && h <= c2.h) {
        const t = (h - c1.h) / (c2.h - c1.h);
        return {
          r: Math.round(c1.r + (c2.r - c1.r) * t),
          g: Math.round(c1.g + (c2.g - c1.g) * t),
          b: Math.round(c1.b + (c2.b - c1.b) * t)
        };
      }
    }
    return TOPO_COLORS[TOPO_COLORS.length - 1];
  }

  function getHeightRange() {
    const minInput = getEl('heightmap-min-input');
    const maxInput = getEl('heightmap-max-input');
    const min = clamp(parseInt(minInput?.value, 10) || -500, -3000, -10);
    const max = clamp(parseInt(maxInput?.value, 10) || 500, 10, 3000);
    if (minInput) minInput.value = min;
    if (maxInput) maxInput.value = max;
    return { min, max, span: Math.max(1, max - min) };
  }

  function seaLevelNormalized() {
    const range = getHeightRange();
    return clamp((0 - range.min) / range.span, 0, 1);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function groupStrokes() {
    const groups = new globalThis.Map();
    for (const p of points) {
      if (!groups.has(p.strokeId)) groups.set(p.strokeId, []);
      groups.get(p.strokeId).push(p);
    }
    return [...groups.values()].filter(g => g.length > 0);
  }

  function clearHeightMapImport() {
    importedHeightMap = null;
    heightMapBase = null;
    heightMapPreview = null;
    heightMapMaxElevation = 500;
  }

  function getContourSamples() {
    const samples = [];
    const step = Math.min(worldWidth, worldDepth) / RESOLUTION;
    for (const stroke of groupStrokes()) {
      if (stroke[0]?.imported) {
        const stride = Math.max(1, Math.ceil(stroke.length / 280));
        for (let i = 0; i < stroke.length; i += stride) {
          samples.push({ x: stroke[i].x, y: stroke[i].y, h: stroke[i].h, weight: 0.55 });
        }
        continue;
      }

      for (let i = 0; i < stroke.length; i++) {
        const p = stroke[i];
        samples.push({ x: p.x, y: p.y, h: p.h, weight: 0.78 });
        const next = stroke[i + 1];
        if (!next) continue;
        const dist = Math.hypot(next.x - p.x, next.y - p.y);
        const count = Math.floor(dist / Math.max(5, step * 0.75));
        for (let j = 1; j < count; j++) {
          const t = j / count;
          samples.push({
            x: p.x + (next.x - p.x) * t,
            y: p.y + (next.y - p.y) * t,
            h: p.h,
            weight: 0.78
          });
        }
      }
    }
    return samples;
  }

  function updateTerrain() {
    const vExag = parseFloat(getEl('scale-slider').value);
    const softControl = parseFloat(getEl('radius-slider').value);
    const res = GRID_RES;
    const size = res * res;
    const heights = new Float32Array(size);

    if (importedHeightMap) {
      const range = getHeightRange();
      for (let i = 0; i < size; i++) {
        heights[i] = clamp(importedHeightMap[i] || 0, range.min, range.max);
      }
      applyHeightsToMesh(heights, vExag);
      return;
    }

    const anchorValue = new Float32Array(size);
    const anchorWeight = new Float32Array(size);
    const samples = getContourSamples();
    const closedContours = prepareClosedContours();

    if (samples.length === 0) {
      for (let i = 0; i < size; i++) {
        heights[i] = 0;
      }
    } else if (closedContours.length >= 2) {
      generateClosedContourTerrain(heights, closedContours, softControl);
    } else {
      for (const s of samples) {
        const gx = clamp(Math.round((s.x / worldWidth) * RESOLUTION), 0, RESOLUTION);
        const gy = clamp(Math.round((s.y / worldDepth) * RESOLUTION), 0, RESOLUTION);
        const idx = gy * res + gx;
        const w = s.weight || 0.7;
        const range = getHeightRange();
        anchorValue[idx] += clamp(s.h, range.min, range.max) * w;
        anchorWeight[idx] += w;
      }

      for (let i = 0; i < size; i++) {
        if (anchorWeight[i] > 0) anchorValue[i] /= anchorWeight[i];
      }

      const idwSamples = samples.length > 2200
        ? samples.filter((_, i) => i % Math.ceil(samples.length / 2200) === 0)
        : samples;
      const smoothing = Math.pow(Math.max(16, softControl / 5), 2);
      for (let gy = 0; gy < res; gy++) {
        for (let gx = 0; gx < res; gx++) {
          const idx = gy * res + gx;
          const x = (gx / RESOLUTION) * worldWidth;
          const y = (gy / RESOLUTION) * worldDepth;
          let sumZ = 0;
          let sumW = 0;
          for (const s of idwSamples) {
            const dx = x - s.x;
            const dy = y - s.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 4) {
              sumZ = s.h;
              sumW = 1;
              break;
            }
            const w = 1 / Math.pow(d2 + smoothing, 1.12);
            sumZ += s.h * w;
            sumW += w;
          }
          heights[idx] = sumW > 0 ? sumZ / sumW : 0;
        }
      }

      const tempHeights = new Float32Array(size);
      const iterations = Math.round(80 + softControl * 0.28);
      for (let iter = 0; iter < iterations; iter++) {
        for (let gy = 0; gy < res; gy++) {
          const y0 = Math.max(0, gy - 1);
          const y1 = Math.min(res - 1, gy + 1);
          for (let gx = 0; gx < res; gx++) {
            const x0 = Math.max(0, gx - 1);
            const x1 = Math.min(res - 1, gx + 1);
            const idx = gy * res + gx;
            const neighborAverage = (
              heights[gy * res + x0] +
              heights[gy * res + x1] +
              heights[y0 * res + gx] +
              heights[y1 * res + gx] +
              0.5 * (heights[y0 * res + x0] + heights[y0 * res + x1] + heights[y1 * res + x0] + heights[y1 * res + x1])
            ) / 6;
            const edgeDistance = Math.min(gx, gy, res - 1 - gx, res - 1 - gy);
            const edgeRelax = clamp(edgeDistance / 9, 0, 1);
            const localAnchor = anchorWeight[idx] > 0 ? anchorValue[idx] : neighborAverage;
            const pin = anchorWeight[idx] > 0 ? (0.12 + anchorWeight[idx] * 0.12) : 0;
            const smoothBlend = 0.56 + (1 - edgeRelax) * 0.16;
            const relaxed = heights[idx] * (1 - smoothBlend) + neighborAverage * smoothBlend;
            tempHeights[idx] = anchorWeight[idx] > 0 ? relaxed * (1 - pin) + localAnchor * pin : relaxed;
          }
        }
        heights.set(tempHeights);
      }
      limitTerrainSlope(heights, res, 10 + softControl * 0.035, 8);
    }

    applyHeightsToMesh(heights, vExag);
  }

  function prepareClosedContours() {
    const contours = [];
    for (const stroke of groupStrokes()) {
      if (stroke.length < 16 || stroke[0]?.imported) continue;
      const first = stroke[0];
      const last = stroke[stroke.length - 1];
      const closeDistance = Math.hypot(first.x - last.x, first.y - last.y);
      const bbox = stroke.reduce((b, p) => ({
        minX: Math.min(b.minX, p.x),
        maxX: Math.max(b.maxX, p.x),
        minY: Math.min(b.minY, p.y),
        maxY: Math.max(b.maxY, p.y)
      }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
      const closedEnough = closeDistance < Math.max(20, Math.min(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) * 0.16);
      if (!closedEnough) continue;
      const area = Math.abs(polygonArea(stroke));
      if (area < 400) continue;
      const centroid = polygonCentroid(stroke, area);
      contours.push({
        points: stroke,
        h: clamp(stroke[0].h, getHeightRange().min, getHeightRange().max),
        area,
        radius: Math.sqrt(area / Math.PI),
        centroid
      });
    }
    return contours.sort((a, b) => b.area - a.area);
  }

  function polygonArea(poly) {
    let area = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      area += (poly[j].x * poly[i].y) - (poly[i].x * poly[j].y);
    }
    return area / 2;
  }

  function polygonCentroid(poly, absArea) {
    let x = 0;
    let y = 0;
    for (const p of poly) {
      x += p.x;
      y += p.y;
    }
    const count = Math.max(1, poly.length);
    return { x: x / count, y: y / count, radius: Math.sqrt(absArea / Math.PI) };
  }

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-6) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distanceToPolyline(x, y, poly) {
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const lenSq = vx * vx + vy * vy || 1;
      const t = clamp(((x - a.x) * vx + (y - a.y) * vy) / lenSq, 0, 1);
      const px = a.x + vx * t;
      const py = a.y + vy * t;
      best = Math.min(best, Math.hypot(x - px, y - py));
    }
    return best;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / ((edge1 - edge0) || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function detectContourMode(contours) {
    const outer = contours[0];
    const inner = contours[contours.length - 1];
    return inner.h >= outer.h ? 'peak' : 'basin';
  }

  function generateClosedContourTerrain(heights, contours, softControl) {
    const mode = detectContourMode(contours);
    const interval = clamp(parseInt(getEl('image-interval-input').value, 10) || 50, 10, 200);
    const range = getHeightRange();
    const topTarget = mode === 'peak'
      ? clamp(Math.max(...contours.map(c => c.h)) + interval * 2, range.min, range.max)
      : clamp(Math.min(...contours.map(c => c.h)) - interval * 2, range.min, range.max);
    const outerFade = 85 + softControl * 0.42;

    for (let gy = 0; gy < GRID_RES; gy++) {
      for (let gx = 0; gx < GRID_RES; gx++) {
        const x = (gx / RESOLUTION) * worldWidth;
        const y = (gy / RESOLUTION) * worldDepth;
        const idx = gy * GRID_RES + gx;
        const states = contours.map(c => ({
          contour: c,
          inside: pointInPolygon(x, y, c.points),
          distance: distanceToPolyline(x, y, c.points)
        }));
        const contained = states.filter(s => s.inside);

        if (!contained.length) {
          const nearest = states.reduce((best, s) => s.distance < best.distance ? s : best, states[0]);
          const fade = 1 - smoothstep(0, outerFade, nearest.distance);
          const base = mode === 'peak' ? 0 : 500;
          heights[idx] = lerp(base, nearest.contour.h, fade);
          continue;
        }

        if (mode === 'peak') {
          const lower = contained.reduce((best, s) => s.contour.h > best.contour.h ? s : best, contained[0]);
          const innerCandidates = states.filter(s => !s.inside && s.contour.h > lower.contour.h);
          if (innerCandidates.length) {
            const upper = innerCandidates.reduce((best, s) => s.distance < best.distance ? s : best, innerCandidates[0]);
            const t = smoothstep(0, 1, lower.distance / (lower.distance + upper.distance + 1e-6));
            heights[idx] = lerp(lower.contour.h, upper.contour.h, t);
          } else {
            const d = lower.distance;
            const dome = smoothstep(0, lower.contour.radius * 0.72, d);
            heights[idx] = lerp(lower.contour.h, topTarget, dome);
          }
        } else {
          const upper = contained.reduce((best, s) => s.contour.h < best.contour.h ? s : best, contained[0]);
          const innerCandidates = states.filter(s => !s.inside && s.contour.h < upper.contour.h);
          if (innerCandidates.length) {
            const lower = innerCandidates.reduce((best, s) => s.distance < best.distance ? s : best, innerCandidates[0]);
            const t = smoothstep(0, 1, upper.distance / (upper.distance + lower.distance + 1e-6));
            heights[idx] = lerp(upper.contour.h, lower.contour.h, t);
          } else {
            const d = upper.distance;
            const bowl = smoothstep(0, upper.contour.radius * 0.72, d);
            heights[idx] = lerp(upper.contour.h, topTarget, bowl);
          }
        }
      }
    }

    gaussianBlurHeightField(heights, GRID_RES, Math.round(2 + softControl / 95));
    thermalErodeHeightField(heights, GRID_RES, 7.5 + softControl * 0.018, 18);
    gaussianBlurHeightField(heights, GRID_RES, 1);
    addSubtleTerrainNoise(heights, GRID_RES, mode === 'peak' ? 2.6 : 1.4);
    limitTerrainSlope(heights, GRID_RES, 9 + softControl * 0.025, 10);
  }

  function gaussianBlurHeightField(heights, res, passes) {
    const temp = new Float32Array(heights.length);
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < res; y++) {
        const y0 = Math.max(0, y - 1);
        const y1 = Math.min(res - 1, y + 1);
        for (let x = 0; x < res; x++) {
          const x0 = Math.max(0, x - 1);
          const x1 = Math.min(res - 1, x + 1);
          const idx = y * res + x;
          temp[idx] = (
            heights[y0 * res + x0] + 2 * heights[y0 * res + x] + heights[y0 * res + x1] +
            2 * heights[y * res + x0] + 4 * heights[idx] + 2 * heights[y * res + x1] +
            heights[y1 * res + x0] + 2 * heights[y1 * res + x] + heights[y1 * res + x1]
          ) / 16;
        }
      }
      heights.set(temp);
    }
  }

  function thermalErodeHeightField(heights, res, talus, passes) {
    const delta = new Float32Array(heights.length);
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let pass = 0; pass < passes; pass++) {
      delta.fill(0);
      for (let y = 1; y < res - 1; y++) {
        for (let x = 1; x < res - 1; x++) {
          const idx = y * res + x;
          let total = 0;
          const drops = [];
          for (const [ox, oy] of neighbors) {
            const ni = (y + oy) * res + (x + ox);
            const drop = heights[idx] - heights[ni] - talus;
            if (drop > 0) {
              drops.push([ni, drop]);
              total += drop;
            }
          }
          if (total <= 0) continue;
          const moved = Math.min(total * 0.18, 4.5);
          delta[idx] -= moved;
          for (const [ni, drop] of drops) {
            delta[ni] += moved * (drop / total);
          }
        }
      }
      for (let i = 0; i < heights.length; i++) {
        const range = getHeightRange();
        heights[i] = clamp(heights[i] + delta[i], range.min, range.max);
      }
    }
  }

  function addSubtleTerrainNoise(heights, res, amount) {
    if (amount <= 0) return;
    for (let y = 1; y < res - 1; y++) {
      for (let x = 1; x < res - 1; x++) {
        const idx = y * res + x;
        const slope = Math.abs(heights[idx] - heights[idx - 1]) + Math.abs(heights[idx] - heights[idx - res]);
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const grain = (n - Math.floor(n) - 0.5) * amount * clamp(slope / 80, 0, 1);
        const range = getHeightRange();
        heights[idx] = clamp(heights[idx] + grain, range.min, range.max);
      }
    }
  }

  function limitTerrainSlope(heights, res, maxDelta, passes) {
    for (let pass = 0; pass < passes; pass++) {
      for (let gy = 0; gy < res; gy++) {
        for (let gx = 0; gx < res; gx++) {
          const idx = gy * res + gx;
          if (gx < res - 1) {
            const n = idx + 1;
            const d = heights[idx] - heights[n];
            if (Math.abs(d) > maxDelta) {
              const excess = (Math.abs(d) - maxDelta) * 0.5 * Math.sign(d);
              heights[idx] -= excess;
              heights[n] += excess;
            }
          }
          if (gy < res - 1) {
            const n = idx + res;
            const d = heights[idx] - heights[n];
            if (Math.abs(d) > maxDelta) {
              const excess = (Math.abs(d) - maxDelta) * 0.5 * Math.sign(d);
              heights[idx] -= excess;
              heights[n] += excess;
            }
          }
        }
      }
    }
  }

  function applyHeightsToMesh(heights, vExag) {
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    const range = getHeightRange();
    for (let i = 0; i < heights.length; i++) {
      const gx = i % GRID_RES;
      const gy = Math.floor(i / GRID_RES);
      const h = clamp(heights[i], range.min, range.max);
      heights[i] = h;
      pos[i * 3] = (gx / RESOLUTION) * worldWidth - worldWidth / 2;
      pos[i * 3 + 1] = h * vExag;
      pos[i * 3 + 2] = (gy / RESOLUTION) * worldDepth - worldDepth / 2;
      const c = getElevationColor(h);
      const shade = Math.abs(h) < 0.5 ? 0.70 : 1;
      col[i * 3] = (c.r / 255) * shade;
      col[i * 3 + 1] = (c.g / 255) * shade;
      col[i * 3 + 2] = (c.b / 255) * shade;
    }
    lastHeightField = heights;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    gridHelper.scale.set(worldWidth / PLANE_SIZE, 1, worldDepth / PLANE_SIZE);
  }

  function sampleTerrainHeight(x, y) {
    const gx = clamp((x / worldWidth) * RESOLUTION, 0, RESOLUTION);
    const gy = clamp((y / worldDepth) * RESOLUTION, 0, RESOLUTION);
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(RESOLUTION, x0 + 1);
    const y1 = Math.min(RESOLUTION, y0 + 1);
    const tx = gx - x0;
    const ty = gy - y0;
    const h00 = lastHeightField[y0 * GRID_RES + x0] || 0;
    const h10 = lastHeightField[y0 * GRID_RES + x1] || 0;
    const h01 = lastHeightField[y1 * GRID_RES + x0] || 0;
    const h11 = lastHeightField[y1 * GRID_RES + x1] || 0;
    return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
  }

  function updateHistoryButtons() {
    const btnUndo = getEl('btn-undo');
    const btnRedo = getEl('btn-redo');
    btnUndo.style.opacity = historyStep <= 0 ? 0.3 : 1;
    btnUndo.style.cursor = historyStep <= 0 ? 'not-allowed' : 'pointer';
    btnRedo.style.opacity = historyStep >= historyList.length - 1 ? 0.3 : 1;
    btnRedo.style.cursor = historyStep >= historyList.length - 1 ? 'not-allowed' : 'pointer';
  }

  function serializeState() {
    return {
      points: JSON.parse(JSON.stringify(points)),
      currentStrokeId,
      heightMapBase: heightMapBase ? Array.from(heightMapBase) : null,
      heightMapMaxElevation,
      heightMapMinElevation: getHeightRange().min,
      worldWidth,
      worldDepth,
      lastImportSummary
    };
  }

  function restoreState(state) {
    if (Array.isArray(state)) {
      points = JSON.parse(JSON.stringify(state));
      currentStrokeId = points.reduce((max, p) => Math.max(max, p.strokeId || 0), 0);
      clearHeightMapImport();
      lastImportSummary = '';
      return;
    }
    points = JSON.parse(JSON.stringify(state?.points || []));
    currentStrokeId = state?.currentStrokeId || points.reduce((max, p) => Math.max(max, p.strokeId || 0), 0);
    heightMapMaxElevation = state?.heightMapMaxElevation || getHeightMapMaxInput();
    getEl('heightmap-max-input').value = heightMapMaxElevation;
    if (state?.heightMapMinElevation !== undefined) getEl('heightmap-min-input').value = state.heightMapMinElevation;
    worldWidth = state?.worldWidth || worldWidth;
    worldDepth = state?.worldDepth || worldDepth;
    heightMapBase = state?.heightMapBase ? new Float32Array(state.heightMapBase) : null;
    lastImportSummary = state?.lastImportSummary || '';
    if (heightMapBase) {
      rebuildHeightMapPreview();
      applyHeightMapMaxElevation(false);
    } else {
      importedHeightMap = null;
      heightMapPreview = null;
    }
  }

  function saveState() {
    const current = serializeState();
    const currentState = JSON.stringify(current);
    if (historyStep >= 0 && JSON.stringify(historyList[historyStep]) === currentState) return;
    historyList = historyList.slice(0, historyStep + 1);
    historyList.push(current);
    historyStep++;
    updateHistoryButtons();
  }

  window.undo = function () {
    if (historyStep > 0) {
      historyStep--;
      restoreState(historyList[historyStep]);
      resizeCanvas();
      needsTerrainUpdate = true;
      updateHistoryButtons();
    }
  };

  window.redo = function () {
    if (historyStep < historyList.length - 1) {
      historyStep++;
      restoreState(historyList[historyStep]);
      resizeCanvas();
      needsTerrainUpdate = true;
      updateHistoryButtons();
    }
  };

  window.setMode = function (mode) {
    currentMode = mode;
    const active = "icon-button accent-button";
    const idle = "icon-button text-slate-400 hover:text-white hover:bg-slate-700";
    getEl('btn-draw').className = mode === 'draw' ? active : idle;
    getEl('btn-erase').className = mode === 'erase' ? active : idle;
    getEl('btn-height-paint').className = mode === 'height-paint' ? active : idle;
    getEl('btn-sculpt').className = mode === 'sculpt' ? active : idle;
    canvas.style.cursor = mode === 'draw' ? 'crosshair' : (mode === 'height-paint' ? 'none' : 'cell');
    renderer.domElement.style.cursor = mode === 'sculpt' ? 'none' : 'grab';
    sculptBrushGroup.visible = false;
    if (mode === 'sculpt') getEl('autorotate-toggle').checked = false;
    controls.enabled = mode !== 'sculpt' || !isSculpting3D;
  };

  function setLayout(isVertical) {
    if (isVertical) {
      centerWorkspace.classList.replace('flex-row', 'flex-col');
      canvasContainerNode.classList.replace('border-r', 'border-b');
      btnLayoutVertical.classList.add('bg-slate-700', 'text-white', 'shadow');
      btnLayoutVertical.classList.remove('text-slate-400');
      btnLayoutHorizontal.classList.add('text-slate-400');
      btnLayoutHorizontal.classList.remove('bg-slate-700', 'text-white', 'shadow');
    } else {
      centerWorkspace.classList.replace('flex-col', 'flex-row');
      canvasContainerNode.classList.replace('border-b', 'border-r');
      btnLayoutHorizontal.classList.add('bg-slate-700', 'text-white', 'shadow');
      btnLayoutHorizontal.classList.remove('text-slate-400');
      btnLayoutVertical.classList.add('text-slate-400');
      btnLayoutVertical.classList.remove('bg-slate-700', 'text-white', 'shadow');
    }
    setTimeout(resizeAll, 50);
  }

  btnLayoutVertical.addEventListener('click', () => setLayout(true));
  btnLayoutHorizontal.addEventListener('click', () => setLayout(false));

  function resizeCanvas() {
    canvas.width = canvasContainerNode.clientWidth;
    canvas.height = canvasContainerNode.clientHeight;
    const padding = 40;
    const maxW = Math.max(120, canvas.width - padding * 2);
    const maxH = Math.max(120, canvas.height - padding * 2);
    const scale = Math.min(maxW / worldWidth, maxH / worldDepth);
    mapBox.width = worldWidth * scale;
    mapBox.height = worldDepth * scale;
    mapBox.size = Math.min(mapBox.width, mapBox.height);
    mapBox.x = (canvas.width - mapBox.width) / 2;
    mapBox.y = (canvas.height - mapBox.height) / 2;
    draw2D();
  }

  function resizeAll() {
    resizeCanvas();
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    needsTerrainUpdate = true;
  }

  function snapView(v) {
    getEl('autorotate-toggle').checked = false;
    const d = camera.position.distanceTo(controls.target);
    const target = new THREE.Vector3();
    if (v === 'top') target.set(0, d, 0.01);
    else if (v === 'front') target.set(0, d * 0.1, d);
    else if (v === 'right') target.set(d, d * 0.1, 0);
    else if (v === 'left') target.set(-d, d * 0.1, 0);
    else if (v === 'back') target.set(0, d * 0.1, -d);
    else if (v === 'bottom') target.set(0, -d, 0.01);
    target.normalize().multiplyScalar(d).add(controls.target);
    const start = camera.position.clone();
    const startT = performance.now();
    function anim(now) {
      let p = (now - startT) / 500;
      if (p > 1) p = 1;
      camera.position.lerpVectors(start, target, 1 - Math.pow(1 - p, 3));
      controls.update();
      if (p < 1) requestAnimationFrame(anim);
    }
    requestAnimationFrame(anim);
  }

  getEl('wireframe-toggle').addEventListener('change', (e) => {
    terrainMaterial.wireframe = e.target.checked;
  });

  getEl('elev-slider').addEventListener('input', (e) => {
    currentElevation = parseInt(e.target.value, 10);
    getEl('elev-display').textContent = `${currentElevation}m`;
  });
  getEl('scale-slider').addEventListener('input', (e) => {
    getEl('scale-display').textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    needsTerrainUpdate = true;
  });
  getEl('radius-slider').addEventListener('input', (e) => {
    getEl('radius-display').textContent = e.target.value;
    needsTerrainUpdate = true;
  });
  getEl('brush-white').addEventListener('click', () => setBrushTone(1));
  getEl('brush-black').addEventListener('click', () => setBrushTone(0));
  getEl('brush-size-slider').addEventListener('input', (e) => {
    brushSize = parseFloat(e.target.value);
    updateSculptBrushVisual();
    draw2D();
  });
  getEl('brush-strength-slider').addEventListener('input', (e) => {
    brushStrength = parseFloat(e.target.value);
  });
  getEl('heightmap-contours').addEventListener('click', () => {
    showHeightContours = !showHeightContours;
    getEl('heightmap-contours').className = showHeightContours
      ? "icon-button accent-button"
      : "icon-button border border-slate-600 text-slate-300 hover:border-[#02DECA] hover:text-white";
    draw2D();
  });
  getEl('expand-up').addEventListener('click', () => expandWorld('up'));
  getEl('expand-down').addEventListener('click', () => expandWorld('down'));
  getEl('expand-left').addEventListener('click', () => expandWorld('left'));
  getEl('expand-right').addEventListener('click', () => expandWorld('right'));

  function setBrushTone(tone) {
    brushTone = tone;
    const active = "icon-button accent-button";
    const idle = "icon-button text-slate-400 hover:text-white hover:bg-slate-700";
    getEl('brush-white').className = tone === 1 ? active : idle;
    getEl('brush-black').className = tone === 0 ? active : idle;
    updateSculptBrushVisual();
  }

  function expandWorld(direction) {
    const oldWidth = worldWidth;
    const oldDepth = worldDepth;
    let shiftX = 0;
    let shiftY = 0;
    if (direction === 'left') {
      worldWidth += PLANE_SIZE;
      shiftX = PLANE_SIZE;
    } else if (direction === 'right') {
      worldWidth += PLANE_SIZE;
    } else if (direction === 'up') {
      worldDepth += PLANE_SIZE;
      shiftY = PLANE_SIZE;
    } else if (direction === 'down') {
      worldDepth += PLANE_SIZE;
    }

    if (shiftX || shiftY) {
      points = points.map(p => ({ ...p, x: p.x + shiftX, y: p.y + shiftY }));
    }
    if (heightMapBase) {
      heightMapBase = resampleHeightMapForExpansion(heightMapBase, oldWidth, oldDepth, shiftX, shiftY);
      updateImportedHeightMapFromBase();
      rebuildHeightMapPreview();
    }
    lastImportSummary = `已向${{ up: '上', down: '下', left: '左', right: '右' }[direction]}扩展 600m，当前范围 ${Math.round(worldWidth)}m x ${Math.round(worldDepth)}m。`;
    resizeCanvas();
    needsTerrainUpdate = true;
    saveState();
  }

  function resampleHeightMapForExpansion(oldMap, oldWidth, oldDepth, shiftX, shiftY) {
    const next = new Float32Array(GRID_RES * GRID_RES);
    next.fill(seaLevelNormalized());
    for (let gy = 0; gy < GRID_RES; gy++) {
      for (let gx = 0; gx < GRID_RES; gx++) {
        const worldX = (gx / RESOLUTION) * worldWidth - shiftX;
        const worldY = (gy / RESOLUTION) * worldDepth - shiftY;
        if (worldX < 0 || worldX > oldWidth || worldY < 0 || worldY > oldDepth) continue;
        const ox = (worldX / oldWidth) * RESOLUTION;
        const oy = (worldY / oldDepth) * RESOLUTION;
        next[gy * GRID_RES + gx] = sampleHeightMapArray(oldMap, ox, oy);
      }
    }
    return next;
  }

  function sampleHeightMapArray(map, x, y) {
    const x0 = clamp(Math.floor(x), 0, RESOLUTION);
    const y0 = clamp(Math.floor(y), 0, RESOLUTION);
    const x1 = Math.min(RESOLUTION, x0 + 1);
    const y1 = Math.min(RESOLUTION, y0 + 1);
    const tx = clamp(x - x0, 0, 1);
    const ty = clamp(y - y0, 0, 1);
    const sea = seaLevelNormalized();
    const h00 = map[y0 * GRID_RES + x0] ?? sea;
    const h10 = map[y0 * GRID_RES + x1] ?? sea;
    const h01 = map[y1 * GRID_RES + x0] ?? sea;
    const h11 = map[y1 * GRID_RES + x1] ?? sea;
    return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
  }

  canvas.addEventListener('mousedown', (e) => {
    getEl('preset-select').value = '';
    lastImportSummary = '';
    isDrawing = true;
    if (currentMode === 'draw') {
      clearHeightMapImport();
      currentStrokeId++;
      addPoint(e);
    } else if (currentMode === 'erase') {
      clearHeightMapImport();
      eraseAt(e);
    } else if (currentMode === 'height-paint') {
      paintHeightMap(e);
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) {
      draw2D(e);
      return;
    }
    if (currentMode === 'draw') addPoint(e);
    else if (currentMode === 'erase') eraseAt(e);
    else if (currentMode === 'height-paint') paintHeightMap(e);
  });
  canvas.addEventListener('mouseleave', () => draw2D());
  addWindowListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (currentMode !== 'sculpt') return;
    e.preventDefault();
    const hit = updateSculptBrushFromPointer(e);
    if (!hit) return;
    isSculpting3D = true;
    controls.enabled = false;
    renderer.domElement.setPointerCapture?.(e.pointerId);
    sculptTerrainAtHit(hit);
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (currentMode !== 'sculpt') return;
    e.preventDefault();
    const hit = updateSculptBrushFromPointer(e);
    if (isSculpting3D && hit) sculptTerrainAtHit(hit);
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    if (!isSculpting3D) sculptBrushGroup.visible = false;
  });

  addWindowListener('pointerup', (e) => {
    if (!isSculpting3D) return;
    isSculpting3D = false;
    controls.enabled = true;
    try { renderer.domElement.releasePointerCapture?.(e.pointerId); } catch (_) { }
    saveState();
  });

  function getSculptHitFromPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    sculptPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    sculptPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    sculptRaycaster.setFromCamera(sculptPointer, camera);
    return sculptRaycaster.intersectObject(terrainMesh, false)[0] || null;
  }

  function updateSculptBrushVisual(hit = null) {
    if (currentMode !== 'sculpt') {
      sculptBrushGroup.visible = false;
      return;
    }
    sculptBrushFill.material.color.set(brushTone ? 0xffffff : 0x050505);
    sculptBrushFill.material.opacity = brushTone ? 0.14 : 0.2;
    sculptBrushRing.material.color.set(brushTone ? 0xffffff : THEME_COLOR);
    sculptBrushGroup.scale.set(brushSize, brushSize, brushSize);
    if (hit) {
      const normal = hit.face?.normal
        ? hit.face.normal.clone().transformDirection(terrainMesh.matrixWorld).normalize()
        : new THREE.Vector3(0, 1, 0);
      const toCamera = camera.position.clone().sub(hit.point).normalize();
      if (normal.dot(toCamera) < 0) normal.multiplyScalar(-1);
      sculptBrushGroup.position.copy(hit.point).addScaledVector(normal, 3);
      sculptBrushGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      sculptBrushGroup.visible = true;
    }
  }

  function updateSculptBrushFromPointer(e) {
    const hit = getSculptHitFromPointer(e);
    if (hit) updateSculptBrushVisual(hit);
    else sculptBrushGroup.visible = false;
    return hit;
  }

  function sculptTerrainAtHit(hit) {
    const mapX = clamp(hit.point.x + worldWidth / 2, 0, worldWidth);
    const mapY = clamp(hit.point.z + worldDepth / 2, 0, worldDepth);
    ensureHeightMapFromCurrentTerrain();
    applyHeightBrushAtMap(mapX, mapY, brushStrength * 0.75);
    lastImportSummary = `三维雕刻：${brushTone ? '抬高' : '压低'}，圆形笔刷可从任意视角精修。`;
    draw2D();
    needsTerrainUpdate = true;
    updateTerrain();
    needsTerrainUpdate = false;
    const vExag = parseFloat(getEl('scale-slider').value);
    hit.point.y = sampleTerrainHeight(mapX, mapY) * vExag;
    updateSculptBrushVisual(hit);
  }

  function canvasToMap(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left - mapBox.x) / mapBox.width) * worldWidth,
      y: ((e.clientY - rect.top - mapBox.y) / mapBox.height) * worldDepth
    };
  }

  function mapToScreenX(x) {
    return (x / worldWidth) * mapBox.width + mapBox.x;
  }

  function mapToScreenY(y) {
    return (y / worldDepth) * mapBox.height + mapBox.y;
  }

  function addPoint(e) {
    const { x, y } = canvasToMap(e);
    if (x < 0 || x > worldWidth || y < 0 || y > worldDepth) return;
    if (points.length > 0 && points[points.length - 1].strokeId === currentStrokeId) {
      if (Math.hypot(points[points.length - 1].x - x, points[points.length - 1].y - y) < 5) return;
    }
    points.push({ x, y, h: currentElevation, strokeId: currentStrokeId });
    draw2D();
    needsTerrainUpdate = true;
  }

  function eraseAt(e) {
    const { x, y } = canvasToMap(e);
    const eraseRadius = 20 * (worldWidth / mapBox.width);
    const ids = new Set();
    points.forEach(p => {
      if (Math.hypot(p.x - x, p.y - y) < eraseRadius) ids.add(p.strokeId);
    });
    if (ids.size > 0) {
      points = points.filter(p => !ids.has(p.strokeId));
      lastImportSummary = '';
      draw2D();
      needsTerrainUpdate = true;
    }
  }

  function ensureHeightMapForPainting() {
    if (!heightMapBase) {
      points = [];
      heightMapMaxElevation = getHeightRange().max;
      heightMapBase = new Float32Array(GRID_RES * GRID_RES);
      heightMapBase.fill(seaLevelNormalized());
      importedHeightMap = new Float32Array(GRID_RES * GRID_RES);
      rebuildHeightMapPreview();
    }
  }

  function ensureHeightMapFromCurrentTerrain() {
    if (heightMapBase) return;
    if (needsTerrainUpdate) {
      updateTerrain();
      needsTerrainUpdate = false;
    }
    const range = getHeightRange();
    heightMapMaxElevation = range.max;
    heightMapBase = new Float32Array(GRID_RES * GRID_RES);
    for (let i = 0; i < heightMapBase.length; i++) {
      heightMapBase[i] = clamp(((lastHeightField[i] || 0) - range.min) / range.span, 0, 1);
    }
    points = [];
    updateImportedHeightMapFromBase();
    rebuildHeightMapPreview();
  }

  function updateImportedHeightMapFromBase() {
    const range = getHeightRange();
    heightMapMaxElevation = range.max;
    importedHeightMap = new Float32Array(heightMapBase.length);
    for (let i = 0; i < heightMapBase.length; i++) {
      importedHeightMap[i] = range.min + heightMapBase[i] * range.span;
    }
  }

  function rebuildHeightMapPreview() {
    if (!heightMapBase) {
      heightMapPreview = null;
      return;
    }
    const off = document.createElement('canvas');
    off.width = GRID_RES;
    off.height = GRID_RES;
    const octx = off.getContext('2d');
    const image = octx.createImageData(GRID_RES, GRID_RES);
    for (let i = 0; i < heightMapBase.length; i++) {
      const v = Math.round(clamp(heightMapBase[i], 0, 1) * 255);
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v;
      image.data[i * 4 + 2] = v;
      image.data[i * 4 + 3] = 255;
    }
    octx.putImageData(image, 0, 0);
    heightMapPreview = off;
  }

  function paintHeightMap(e) {
    const { x, y } = canvasToMap(e);
    if (x < 0 || x > worldWidth || y < 0 || y > worldDepth) return;
    ensureHeightMapForPainting();
    applyHeightBrushAtMap(x, y, brushStrength);
    lastImportSummary = `高度图笔刷：${brushTone ? '白色抬高' : '黑色压低'}，柔边半径 ${Math.round(brushSize)}m。`;
    draw2D(e);
    needsTerrainUpdate = true;
  }

  function applyHeightBrushAtMap(x, y, strengthScale = brushStrength) {
    const cx = (x / worldWidth) * RESOLUTION;
    const cy = (y / worldDepth) * RESOLUTION;
    const radius = Math.max(1, (brushSize / Math.min(worldWidth, worldDepth)) * RESOLUTION);
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(RESOLUTION, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(RESOLUTION, Math.ceil(cy + radius));

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const d = Math.hypot(gx - cx, gy - cy);
        if (d > radius) continue;
        const falloff = smoothstep(0, 1, 1 - d / radius);
        const idx = gy * GRID_RES + gx;
        const amount = strengthScale * falloff;
        heightMapBase[idx] = heightMapBase[idx] * (1 - amount) + brushTone * amount;
      }
    }

    updateImportedHeightMapFromBase();
    rebuildHeightMapPreview();
  }

  function drawHeightMapContours2D() {
    if (!heightMapBase) return;
    const interval = clamp(parseInt(getEl('image-interval-input').value, 10) || 50, 10, 200);
    const maxElevation = Math.max(1, getHeightMapMaxInput());
    const levels = [];
    for (let h = interval; h < maxElevation; h += interval) {
      levels.push(h / maxElevation);
    }
    if (!levels.length) return;

    ctx.save();
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.86;
    ctx.setLineDash([]);

    const cellX = mapBox.width / RESOLUTION;
    const cellY = mapBox.height / RESOLUTION;
    for (const level of levels) {
      const c = getElevationColor(level * 500);
      ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
      ctx.beginPath();
      for (let y = 0; y < RESOLUTION; y++) {
        for (let x = 0; x < RESOLUTION; x++) {
          const h00 = heightMapBase[y * GRID_RES + x];
          const h10 = heightMapBase[y * GRID_RES + x + 1];
          const h11 = heightMapBase[(y + 1) * GRID_RES + x + 1];
          const h01 = heightMapBase[(y + 1) * GRID_RES + x];
          const pts = [];
          addContourCrossing(pts, x, y, x + 1, y, h00, h10, level);
          addContourCrossing(pts, x + 1, y, x + 1, y + 1, h10, h11, level);
          addContourCrossing(pts, x + 1, y + 1, x, y + 1, h11, h01, level);
          addContourCrossing(pts, x, y + 1, x, y, h01, h00, level);
          for (let i = 0; i + 1 < pts.length; i += 2) {
            ctx.moveTo(mapBox.x + pts[i].x * cellX, mapBox.y + pts[i].y * cellY);
            ctx.lineTo(mapBox.x + pts[i + 1].x * cellX, mapBox.y + pts[i + 1].y * cellY);
          }
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function addContourCrossing(pts, x1, y1, x2, y2, h1, h2, level) {
    if ((h1 < level && h2 < level) || (h1 >= level && h2 >= level)) return;
    const t = clamp((level - h1) / ((h2 - h1) || 1e-6), 0, 1);
    pts.push({ x: lerp(x1, x2, t), y: lerp(y1, y2, t) });
  }

  function draw2D(pointerEvent) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(2, 222, 202, 0.42)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(mapBox.x, mapBox.y, mapBox.width, mapBox.height);
    ctx.fillStyle = 'rgba(2, 222, 202, 0.025)';
    ctx.fillRect(mapBox.x, mapBox.y, mapBox.width, mapBox.height);
    if (heightMapPreview) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(heightMapPreview, mapBox.x, mapBox.y, mapBox.width, mapBox.height);
      ctx.restore();
      if (showHeightContours) {
        drawHeightMapContours2D();
      }
    }
    ctx.fillStyle = 'rgba(2, 222, 202, 0.74)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`3D 地形对应区域 (${Math.round(worldWidth)}m x ${Math.round(worldDepth)}m)`, canvas.width / 2, mapBox.y + 20);
    ctx.beginPath();
    ctx.rect(mapBox.x, mapBox.y, mapBox.width, mapBox.height);
    ctx.clip();

    const textDrawn = new Set();
    for (const stroke of groupStrokes()) {
      if (!stroke.length) continue;
      const c = getElevationColor(stroke[0].h);
      ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke[0].imported) {
        ctx.globalAlpha = 0.82;
        const radius = Math.max(1.2, Math.min(mapBox.width, mapBox.height) / 420);
        for (const p of stroke) {
          const px = mapToScreenX(p.x);
          const py = mapToScreenY(p.y);
          ctx.fillRect(px - radius / 2, py - radius / 2, radius, radius);
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        stroke.forEach((p, i) => {
          const px = mapToScreenX(p.x);
          const py = mapToScreenY(p.y);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const labelPoint = stroke[0];
      if (labelPoint && !textDrawn.has(labelPoint.strokeId)) {
        const px = mapToScreenX(labelPoint.x);
        const py = mapToScreenY(labelPoint.y);
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${labelPoint.h}m`, px + 8, py - 8);
        textDrawn.add(labelPoint.strokeId);
      }
    }

    if (currentMode === 'height-paint' && pointerEvent) {
      const p = canvasToMap(pointerEvent);
      if (p.x >= 0 && p.x <= worldWidth && p.y >= 0 && p.y <= worldDepth) {
        const px = mapToScreenX(p.x);
        const py = mapToScreenY(p.y);
        const pr = (brushSize / Math.min(worldWidth, worldDepth)) * Math.min(mapBox.width, mapBox.height);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = brushTone ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.9)';
        ctx.fillStyle = brushTone ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    importStatus.textContent = lastImportSummary || '可手绘等高线，也可上传黑白或彩色等高线图自动生成地形。';
  }

  window.clearCanvas = function () {
    points = [];
    currentStrokeId = 0;
    clearHeightMapImport();
    lastImportSummary = '';
    getEl('preset-select').value = '';
    draw2D();
    needsTerrainUpdate = true;
    saveState();
  };

  const presetSelect = getEl('preset-select');
  function terrainNoise(a, seed) {
    return (
      Math.sin(a * 2.1 + seed * 1.73) * 0.55 +
      Math.sin(a * 3.7 + seed * 2.41) * 0.28 +
      Math.sin(a * 6.3 + seed * 0.91) * 0.17
    );
  }

  function genCirc(cx, cy, r, h, id, opts = {}) {
    const segments = opts.segments || 128;
    const rx = r * (opts.rx || 1);
    const ry = r * (opts.ry || 1);
    const rotate = opts.rotate || 0;
    const jitter = opts.jitter ?? 0.055;
    const seed = opts.seed || id;
    const ox = opts.ox || 0;
    const oy = opts.oy || 0;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const n = terrainNoise(a, seed);
      const rr = 1 + n * jitter;
      const px = Math.cos(a) * rx * rr;
      const py = Math.sin(a) * ry * rr;
      const x = cx + ox + px * Math.cos(rotate) - py * Math.sin(rotate);
      const y = cy + oy + px * Math.sin(rotate) + py * Math.cos(rotate);
      points.push({ x, y, h, strokeId: id });
    }
  }
  function genU(cx, cy, w, d, h, id, rotate = 0) {
    const segments = 88;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) - 0.5;
      const wobble = Math.sin(i * 0.27 + id) * 8 + Math.sin(i * 0.11 + id * 2.3) * 5;
      const px0 = t * w + wobble;
      const py0 = t * t * 4 * d + Math.sin(i * 0.18 + id) * 10;
      const x = cx + px0 * Math.cos(rotate) - py0 * Math.sin(rotate);
      const y = cy + px0 * Math.sin(rotate) + py0 * Math.cos(rotate);
      points.push({ x, y, h, strokeId: id });
    }
  }

  presetSelect.addEventListener('change', (e) => {
    const t = e.target.value;
    if (!t) return;
    points = [];
    clearHeightMapImport();
    lastImportSummary = '';
    let id = 1;
    const cx = 300;
    const cy = 300;
    if (t === 'peak') {
      genCirc(cx - 8, cy + 10, 215, 100, id++, { rx: 1.12, ry: 0.92, rotate: 0.24, jitter: 0.07, seed: 4 });
      genCirc(cx + 2, cy + 3, 162, 200, id++, { rx: 1.05, ry: 0.96, rotate: 0.18, jitter: 0.065, seed: 9 });
      genCirc(cx + 13, cy - 8, 106, 300, id++, { rx: 0.94, ry: 1.08, rotate: -0.15, jitter: 0.055, seed: 14 });
      genCirc(cx + 23, cy - 18, 54, 400, id++, { rx: 0.86, ry: 1.12, rotate: -0.28, jitter: 0.045, seed: 18 });
    } else if (t === 'basin') {
      genCirc(cx + 4, cy - 6, 220, 400, id++, { rx: 1.08, ry: 0.9, rotate: -0.18, jitter: 0.06, seed: 23 });
      genCirc(cx - 7, cy + 2, 164, 300, id++, { rx: 1.0, ry: 0.94, rotate: -0.08, jitter: 0.055, seed: 29 });
      genCirc(cx - 15, cy + 12, 108, 200, id++, { rx: 0.9, ry: 1.08, rotate: 0.22, jitter: 0.05, seed: 31 });
      genCirc(cx - 26, cy + 19, 56, 100, id++, { rx: 0.88, ry: 0.98, rotate: 0.32, jitter: 0.04, seed: 37 });
    } else if (t === 'saddle') {
      genCirc(cx - 105, cy - 8, 44, 400, id++, { rx: 1.08, ry: 0.82, rotate: 0.3, jitter: 0.045, seed: 41 });
      genCirc(cx - 96, cy - 4, 92, 300, id++, { rx: 1.18, ry: 0.88, rotate: 0.2, jitter: 0.06, seed: 43 });
      genCirc(cx + 94, cy + 10, 46, 400, id++, { rx: 0.94, ry: 1.12, rotate: -0.16, jitter: 0.045, seed: 47 });
      genCirc(cx + 103, cy + 6, 94, 300, id++, { rx: 0.9, ry: 1.16, rotate: -0.25, jitter: 0.06, seed: 53 });
      genCirc(cx + 2, cy, 208, 160, id++, { rx: 1.2, ry: 0.72, rotate: 0.03, jitter: 0.055, seed: 59 });
    } else if (t === 'steep') {
      genCirc(cx - 48, cy + 8, 184, 100, id++, { rx: 1.18, ry: 0.84, rotate: 0.1, jitter: 0.065, seed: 61 });
      genCirc(cx + 0, cy + 2, 138, 200, id++, { rx: 1.08, ry: 0.88, rotate: 0.05, jitter: 0.055, seed: 67 });
      genCirc(cx + 64, cy - 5, 94, 300, id++, { rx: 0.98, ry: 0.95, rotate: -0.08, jitter: 0.045, seed: 71 });
      genCirc(cx + 112, cy - 13, 52, 400, id++, { rx: 0.78, ry: 1.06, rotate: -0.2, jitter: 0.04, seed: 73 });
    } else if (t === 'valley_ridge') {
      for (let i = 0; i < 4; i++) genU(cx - 120, cy + 70 - i * 28, 225 - i * 24, 86, 100 + i * 90, id++, 0);
      for (let i = 0; i < 4; i++) genU(cx + 120, cy - 70 + i * 28, 225 - i * 24, 86, 100 + i * 90, id++, Math.PI);
    }
    currentStrokeId = id;
    draw2D();
    needsTerrainUpdate = true;
    saveState();
  });

  getEl('upload-trigger').addEventListener('click', () => {
    getEl('contour-image-input').click();
  });

  getEl('heightmap-trigger').addEventListener('click', () => {
    getEl('heightmap-input').click();
  });

  getEl('contour-image-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importContourImage(file);
    e.target.value = '';
  });

  getEl('heightmap-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importHeightMapImage(file);
    e.target.value = '';
  });

  getEl('heightmap-apply').addEventListener('click', () => {
    applyHeightMapMaxElevation();
    saveState();
  });

  getEl('heightmap-max-input').addEventListener('change', () => {
    applyHeightMapMaxElevation();
    saveState();
  });
  getEl('heightmap-min-input').addEventListener('change', () => {
    applyHeightMapMaxElevation();
    saveState();
  });

  function getHeightMapMaxInput() {
    return getHeightRange().max;
  }

  function applyHeightMapMaxElevation(updateMessage = true) {
    const range = getHeightRange();
    heightMapMaxElevation = range.max;
    if (!heightMapBase) {
      if (updateMessage) lastImportSummary = `高度范围已设为 ${range.min}m 到 ${range.max}m；黑色为海底，白色为高地。`;
      draw2D();
      return;
    }
    updateImportedHeightMapFromBase();
    rebuildHeightMapPreview();
    if (updateMessage) lastImportSummary = `已按黑低白高重新生成，高度范围 ${range.min}-${range.max}m。`;
    draw2D();
    needsTerrainUpdate = true;
  }

  async function importHeightMapImage(file) {
    const img = await loadImageFromFile(file);
    const off = document.createElement('canvas');
    off.width = GRID_RES;
    off.height = GRID_RES;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, GRID_RES, GRID_RES);
    octx.drawImage(img, 0, 0, GRID_RES, GRID_RES);
    const image = octx.getImageData(0, 0, GRID_RES, GRID_RES);
    const data = image.data;
    const normalized = new Float32Array(GRID_RES * GRID_RES);
    let minGray = 255;
    let maxGray = 0;

    for (let i = 0; i < GRID_RES * GRID_RES; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      minGray = Math.min(minGray, gray);
      maxGray = Math.max(maxGray, gray);
      normalized[i] = gray;
    }

    const range = Math.max(1, maxGray - minGray);
    for (let i = 0; i < normalized.length; i++) {
      normalized[i] = (normalized[i] - minGray) / range;
    }

    points = [];
    heightMapBase = normalized;
    getEl('preset-select').value = '';
    applyHeightMapMaxElevation();
    saveState();
  }

  async function importContourImage(file) {
    const img = await loadImageFromFile(file);
    clearHeightMapImport();
    const interval = clamp(parseInt(getEl('image-interval-input').value, 10) || 50, 10, 200);
    const analysisSize = 300;
    const off = document.createElement('canvas');
    off.width = analysisSize;
    off.height = analysisSize;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, analysisSize, analysisSize);
    const scale = Math.min(analysisSize / img.width, analysisSize / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (analysisSize - drawW) / 2;
    const dy = (analysisSize - drawH) / 2;
    octx.drawImage(img, dx, dy, drawW, drawH);
    const image = octx.getImageData(0, 0, analysisSize, analysisSize);
    const mask = extractLineMask(image, analysisSize, analysisSize);
    const components = findLineComponents(mask, analysisSize, analysisSize);

    if (!components.length) {
      lastImportSummary = '未识别到足够清晰的等高线，请使用线条对比更强的图片。';
      draw2D();
      return;
    }

    const maxBorderDistance = Math.max(...components.map(c => c.avgBorderDistance), 1);
    const generated = [];
    let id = currentStrokeId + 1;
    for (const comp of components) {
      const level = Math.max(1, Math.round((comp.avgBorderDistance / maxBorderDistance) * (500 / interval)));
      const height = clamp(level * interval, interval, 500);
      const stride = Math.max(1, Math.ceil(comp.pixels.length / 300));
      const strokeId = id++;
      for (let i = 0; i < comp.pixels.length; i += stride) {
        const p = comp.pixels[i];
        generated.push({
          x: (p.x / (analysisSize - 1)) * worldWidth,
          y: (p.y / (analysisSize - 1)) * worldDepth,
          h: height,
          strokeId,
          imported: true
        });
      }
    }

    points = generated;
    currentStrokeId = id;
    getEl('preset-select').value = '';
    lastImportSummary = `已从图片提取 ${components.length} 组等高线，按 ${interval}m 等高距估算高程；复杂地图可继续手绘修正。`;
    draw2D();
    needsTerrainUpdate = true;
    saveState();
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function extractLineMask(image, w, h) {
    const data = image.data;
    const gray = new Float32Array(w * h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;
      const saturation = max === 0 ? 0 : (max - min) / max;
      gray[i] = brightness;
      if (brightness < 172 || (saturation > 0.22 && brightness < 235)) mask[i] = 1;
    }

    const refined = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (x < 4 || y < 4 || x > w - 5 || y > h - 5) continue;
        const gx = -gray[idx - w - 1] - 2 * gray[idx - 1] - gray[idx + w - 1] + gray[idx - w + 1] + 2 * gray[idx + 1] + gray[idx + w + 1];
        const gy = -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] + gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
        const edge = Math.sqrt(gx * gx + gy * gy);
        const neighbors =
          mask[idx - 1] + mask[idx + 1] + mask[idx - w] + mask[idx + w] +
          mask[idx - w - 1] + mask[idx - w + 1] + mask[idx + w - 1] + mask[idx + w + 1];
        if ((mask[idx] && neighbors >= 1) || (edge > 95 && gray[idx] < 235)) refined[idx] = 1;
      }
    }
    return refined;
  }

  function findLineComponents(mask, w, h) {
    const visited = new Uint8Array(w * h);
    const components = [];
    const queue = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const start = y * w + x;
        if (!mask[start] || visited[start]) continue;

        queue.length = 0;
        queue.push(start);
        visited[start] = 1;
        const pixels = [];
        let minX = x, maxX = x, minY = y, maxY = y;
        let borderSum = 0;

        for (let q = 0; q < queue.length; q++) {
          const idx = queue[q];
          const px = idx % w;
          const py = Math.floor(idx / w);
          pixels.push({ x: px, y: py });
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
          borderSum += Math.min(px, py, w - 1 - px, h - 1 - py);

          for (const [ox, oy] of dirs) {
            const nx = px + ox;
            const ny = py + oy;
            const ni = ny * w + nx;
            if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
            if (mask[ni] && !visited[ni]) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const area = width * height;
        const density = pixels.length / area;
        const longEnough = pixels.length >= 32 && Math.max(width, height) >= 16;
        const notSolidBlock = density < 0.72;
        const touchesFrame = minX <= 6 || minY <= 6 || maxX >= w - 7 || maxY >= h - 7;
        const looksLikeMapFrame = touchesFrame && (width > w * 0.72 || height > h * 0.72);
        const tooCloseToBorder = (borderSum / pixels.length) < 7;
        if (longEnough && notSolidBlock && !looksLikeMapFrame && !tooCloseToBorder) {
          components.push({
            pixels,
            avgBorderDistance: borderSum / pixels.length,
            minX, maxX, minY, maxY
          });
        }
      }
    }

    return components
      .sort((a, b) => a.avgBorderDistance - b.avgBorderDistance)
      .slice(0, 48);
  }

  const viewCube = getEl('view-cube');
  function updateViewCube() {
    const v = camera.position.clone().sub(controls.target);
    const p = Math.asin(v.y / v.length());
    const y = Math.atan2(v.x, v.z);
    viewCube.style.transform = `translateZ(-30px) rotateX(${-p}rad) rotateY(${-y}rad)`;
  }

  addWindowListener('resize', resizeAll);

  const aiModal = getEl('ai-modal');
  const aiConfig = getEl('ai-config');
  const aiLoading = getEl('ai-loading');
  const aiResult = getEl('ai-result');
  const aiImage = getEl('ai-image');
  const aiDownloadBtn = getEl('ai-download-btn');
  window.closeAiModal = () => {
    aiModal.classList.add('hidden');
    aiModal.classList.remove('flex');
  };
  window.generateRealisticImage = () => {
    aiModal.classList.remove('hidden');
    aiModal.classList.add('flex');
    aiConfig.classList.remove('hidden');
    aiConfig.classList.add('flex');
    aiLoading.classList.add('hidden');
    aiLoading.classList.remove('flex');
    aiResult.classList.add('hidden');
    aiResult.classList.remove('flex');
  };
  window.openAiConfigModal = window.generateRealisticImage;
  window.startAiGeneration = async () => {
    const biome = getEl('ai-biome-select').value;
    let style = "";
    if (biome === 'summer') style = "Lush green forests, grassy hills, summer.";
    else if (biome === 'autumn') style = "Autumn forests, red orange leaves.";
    else if (biome === 'desert') style = "Arid desert, rocky, sand.";
    else if (biome === 'volcanic') style = "Dark basalt rock, volcanic ash.";

    const rotating = getEl('autorotate-toggle').checked;
    getEl('autorotate-toggle').checked = false;
    renderer.render(scene, camera);
    const b64 = renderer.domElement.toDataURL('image/png').split(',')[1];
    if (rotating) getEl('autorotate-toggle').checked = true;

    aiConfig.classList.add('hidden');
    aiConfig.classList.remove('flex');
    aiLoading.classList.remove('hidden');
    aiLoading.classList.add('flex');
    aiLoading.innerHTML = '<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-[#02DECA]"></div><p class="animate-pulse text-sm text-slate-300">正在生成实景图...</p>';

    try {
      const k = "";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${k}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Satellite photo style. Top-down drone view. 8k resolution. ${style} Max elevation 500m, natural terrain, no labels, no contour lines.` },
              { inlineData: { mimeType: "image/png", data: b64 } }
            ]
          }]
        })
      });
      const json = await res.json();
      const img = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (!img) throw new Error("No image");
      aiImage.src = `data:image/png;base64,${img}`;
      aiLoading.classList.add('hidden');
      aiLoading.classList.remove('flex');
      aiResult.classList.remove('hidden');
      aiResult.classList.add('flex');
      aiDownloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = aiImage.src;
        a.download = `Topo_${Date.now()}.png`;
        a.click();
      };
    } catch (e) {
      aiLoading.innerHTML = '<div class="font-bold text-red-400">生成失败，请检查 API Key 或稍后重试</div><button onclick="openAiConfigModal()" class="mt-4 rounded bg-slate-700 px-3 py-1 text-sm">返回</button>';
    }
  };

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (needsTerrainUpdate) {
      updateTerrain();
      needsTerrainUpdate = false;
    }
    if (getEl('autorotate-toggle').checked && !isDrawing) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2.0;
    } else {
      controls.autoRotate = false;
    }
    controls.update();
    updateViewCube();
    renderer.render(scene, camera);
  }

  engineApi = {
    setMode: window.setMode,
    undo: window.undo,
    redo: window.redo,
    clearCanvas: window.clearCanvas,
    snapView,
    generateRealisticImage: window.generateRealisticImage,
    closeAiModal: window.closeAiModal,
    openAiConfigModal: window.openAiConfigModal,
    startAiGeneration: window.startAiGeneration
  };

  destroyEngine = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }

    windowListenerCleanups.splice(0).forEach(remove => remove());

    controls.dispose();
    scene.traverse(object => {
      if (object.geometry?.dispose) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach(material => {
          Object.values(material).forEach(value => {
            if (value?.isTexture && value.dispose) value.dispose();
          });
          material.dispose?.();
        });
      }
    });

    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement.remove();

    [
      'undo',
      'redo',
      'setMode',
      'clearCanvas',
      'closeAiModal',
      'generateRealisticImage',
      'openAiConfigModal',
      'startAiGeneration'
    ].forEach(key => {
      try { delete window[key]; } catch (_) { window[key] = undefined; }
    });
  };

  setLayout(false);
  saveState();
  animate();
})

onBeforeUnmount(() => {
  destroyEngine()
  engineApi = null
})
</script>

<style scoped>
.topo-builder {
  --accent: #02DECA;
  --accent-soft: rgba(2, 222, 202, 0.26);
  --panel: #252526;
  --surface: #1e1e1e;
}

.topo-builder {
  margin: 0;
  overflow: hidden;
  background-color: var(--surface);
  color: #e2e8f0;
  font-family: Inter, "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}

.topo-builder ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.topo-builder ::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

.topo-builder ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.topo-builder ::-webkit-scrollbar-track {
  background: transparent;
}

#canvas-container {
  background-image: radial-gradient(#334155 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: center;
}

input[type=range] {
  -webkit-appearance: none;
  background: transparent;
  height: 16px;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  margin-top: -5px;
  box-shadow: 0 0 4px rgba(2, 222, 202, 0.55);
}

input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #334155;
  border-radius: 2px;
}

input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button {
  margin: 0;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #334155;
  margin: 0 12px;
}

.icon-button {
  height: 30px;
  min-width: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color .18s ease, background .18s ease, border-color .18s ease;
}

.accent-button {
  background: var(--accent);
  color: #041312;
  box-shadow: 0 0 8px rgba(2, 222, 202, 0.25);
}

.view-cube-face {
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(40, 40, 40, 0.85);
  border: 1px solid #475569;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-cube-face:hover {
  background: var(--accent-soft);
  color: white;
  border-color: var(--accent);
}

.face-front {
  transform: rotateY(0deg) translateZ(30px);
}

.face-back {
  transform: rotateY(180deg) translateZ(30px);
}

.face-right {
  transform: rotateY(90deg) translateZ(30px);
}

.face-left {
  transform: rotateY(-90deg) translateZ(30px);
}

.face-top {
  transform: rotateX(90deg) translateZ(30px);
}

.face-bottom {
  transform: rotateX(-90deg) translateZ(30px);
}

#top-toolbar {
  scroll-behavior: smooth;
}

.topo-builder {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  min-width: 0;
  min-height: 0;
}

.topo-builder button,
.topo-builder input,
.topo-builder select {
  font: inherit;
}
</style>

<style>
/* Generated from the original Tailwind utility classes, prefixed to this component. */
.topo-builder .pointer-events-none {
  pointer-events: none
}

.topo-builder .visible {
  visibility: visible
}

.topo-builder .fixed {
  position: fixed
}

.topo-builder .absolute {
  position: absolute
}

.topo-builder .relative {
  position: relative
}

.topo-builder .inset-0 {
  inset: 0
}

.topo-builder .bottom-4 {
  bottom: 1rem
}

.topo-builder .bottom-6 {
  bottom: 1.5rem
}

.topo-builder .left-1\/2 {
  left: 50%
}

.topo-builder .left-4 {
  left: 1rem
}

.topo-builder .left-6 {
  left: 1.5rem
}

.topo-builder .right-4 {
  right: 1rem
}

.topo-builder .right-6 {
  right: 1.5rem
}

.topo-builder .top-1\/2 {
  top: 50%
}

.topo-builder .top-4 {
  top: 1rem
}

.topo-builder .z-10 {
  z-index: 10
}

.topo-builder .z-20 {
  z-index: 20
}

.topo-builder .z-50 {
  z-index: 50
}

.topo-builder .mx-1 {
  margin-left: .25rem;
  margin-right: .25rem
}

.topo-builder .mb-2 {
  margin-bottom: .5rem
}

.topo-builder .ml-1 {
  margin-left: .25rem
}

.topo-builder .mr-2 {
  margin-right: .5rem
}

.topo-builder .mt-2 {
  margin-top: .5rem
}

.topo-builder .mt-4 {
  margin-top: 1rem
}

.topo-builder .inline-block {
  display: inline-block
}

.topo-builder .flex {
  display: flex
}

.topo-builder .contents {
  display: contents
}

.topo-builder .hidden {
  display: none
}

.topo-builder .h-12 {
  height: 3rem
}

.topo-builder .h-14 {
  height: 3.5rem
}

.topo-builder .h-3\.5 {
  height: .875rem
}

.topo-builder .h-4 {
  height: 1rem
}

.topo-builder .h-40 {
  height: 10rem
}

.topo-builder .h-5 {
  height: 1.25rem
}

.topo-builder .h-7 {
  height: 1.75rem
}

.topo-builder .h-8 {
  height: 2rem
}

.topo-builder .h-full {
  height: 100%
}

.topo-builder .h-screen {
  height: 100vh
}

.topo-builder .max-h-\[50vh\] {
  max-height: 50vh
}

.topo-builder .max-h-\[90vh\] {
  max-height: 90vh
}

.topo-builder .min-h-\[300px\] {
  min-height: 300px
}

.topo-builder .w-10 {
  width: 2.5rem
}

.topo-builder .w-12 {
  width: 3rem
}

.topo-builder .w-14 {
  width: 3.5rem
}

.topo-builder .w-16 {
  width: 4rem
}

.topo-builder .w-20 {
  width: 5rem
}

.topo-builder .w-24 {
  width: 6rem
}

.topo-builder .w-3\.5 {
  width: .875rem
}

.topo-builder .w-4 {
  width: 1rem
}

.topo-builder .w-5 {
  width: 1.25rem
}

.topo-builder .w-8 {
  width: 2rem
}

.topo-builder .w-\[600px\] {
  width: 600px
}

.topo-builder .w-full {
  width: 100%
}

.topo-builder .w-px {
  width: 1px
}

.topo-builder .min-w-0 {
  min-width: 0
}

.topo-builder .min-w-\[10px\] {
  min-width: 10px
}

.topo-builder .max-w-\[70\%\] {
  max-width: 70%
}

.topo-builder .max-w-\[90vw\] {
  max-width: 90vw
}

.topo-builder .max-w-full {
  max-width: 100%
}

.topo-builder .flex-1 {
  flex: 1 1 0%
}

.topo-builder .shrink-0 {
  flex-shrink: 0
}

.topo-builder .-translate-x-1\/2 {
  --tw-translate-x: -50%
}

.topo-builder .-translate-x-1\/2,
.topo-builder .-translate-y-1\/2 {
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))
}

.topo-builder .-translate-y-1\/2 {
  --tw-translate-y: -50%
}

.topo-builder .transform {
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))
}

@keyframes pulse {
  50% {
    opacity: .5
  }
}

.topo-builder .animate-pulse {
  animation: pulse 2s cubic-bezier(.4, 0, .6, 1) infinite
}

@keyframes spin {
  to {
    transform: rotate(1turn)
  }
}

.topo-builder .animate-spin {
  animation: spin 1s linear infinite
}

.topo-builder .cursor-not-allowed {
  cursor: not-allowed
}

.topo-builder .cursor-pointer {
  cursor: pointer
}

.topo-builder .resize {
  resize: both
}

.topo-builder .flex-row {
  flex-direction: row
}

.topo-builder .flex-col {
  flex-direction: column
}

.topo-builder .items-center {
  align-items: center
}

.topo-builder .justify-center {
  justify-content: center
}

.topo-builder .justify-between {
  justify-content: space-between
}

.topo-builder .gap-1 {
  gap: .25rem
}

.topo-builder .gap-1\.5 {
  gap: .375rem
}

.topo-builder .gap-2 {
  gap: .5rem
}

.topo-builder .gap-3 {
  gap: .75rem
}

.topo-builder .gap-4 {
  gap: 1rem
}

.topo-builder .gap-5 {
  gap: 1.25rem
}

.topo-builder .overflow-hidden {
  overflow: hidden
}

.topo-builder .overflow-x-auto {
  overflow-x: auto
}

.topo-builder .whitespace-nowrap {
  white-space: nowrap
}

.topo-builder .rounded {
  border-radius: .25rem
}

.topo-builder .rounded-full {
  border-radius: 9999px
}

.topo-builder .rounded-lg {
  border-radius: .5rem
}

.topo-builder .rounded-xl {
  border-radius: .75rem
}

.topo-builder .border {
  border-width: 1px
}

.topo-builder .border-4 {
  border-width: 4px
}

.topo-builder .border-b {
  border-bottom-width: 1px
}

.topo-builder .border-r {
  border-right-width: 1px
}

.topo-builder .border-slate-600 {
  --tw-border-opacity: 1;
  border-color: rgb(71 85 105/var(--tw-border-opacity, 1))
}

.topo-builder .border-slate-700 {
  --tw-border-opacity: 1;
  border-color: rgb(51 65 85/var(--tw-border-opacity, 1))
}

.topo-builder .border-t-\[\#02DECA\] {
  --tw-border-opacity: 1;
  border-top-color: rgb(2 222 202/var(--tw-border-opacity, 1))
}

.topo-builder .bg-\[\#02DECA\] {
  --tw-bg-opacity: 1;
  background-color: rgb(2 222 202/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-\[\#111111\] {
  --tw-bg-opacity: 1;
  background-color: rgb(17 17 17/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-\[\#1e1e1e\] {
  --tw-bg-opacity: 1;
  background-color: rgb(30 30 30/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-\[\#1e1e1e\]\/80 {
  background-color: rgba(30, 30, 30, .8)
}

.topo-builder .bg-\[\#1e1e1e\]\/90 {
  background-color: rgba(30, 30, 30, .9)
}

.topo-builder .bg-\[\#252526\] {
  --tw-bg-opacity: 1;
  background-color: rgb(37 37 38/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-\[\#2d2d2d\] {
  --tw-bg-opacity: 1;
  background-color: rgb(45 45 45/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-black\/40 {
  background-color: rgba(0, 0, 0, .4)
}

.topo-builder .bg-black\/45 {
  background-color: rgba(0, 0, 0, .45)
}

.topo-builder .bg-black\/60 {
  background-color: rgba(0, 0, 0, .6)
}

.topo-builder .bg-slate-700 {
  --tw-bg-opacity: 1;
  background-color: rgb(51 65 85/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-slate-800 {
  --tw-bg-opacity: 1;
  background-color: rgb(30 41 59/var(--tw-bg-opacity, 1))
}

.topo-builder .bg-slate-800\/50 {
  background-color: rgba(30, 41, 59, .5)
}

.topo-builder .object-contain {
  -o-object-fit: contain;
  object-fit: contain
}

.topo-builder .p-1 {
  padding: .25rem
}

.topo-builder .p-3 {
  padding: .75rem
}

.topo-builder .p-4 {
  padding: 1rem
}

.topo-builder .p-6 {
  padding: 1.5rem
}

.topo-builder .px-2 {
  padding-left: .5rem;
  padding-right: .5rem
}

.topo-builder .px-3 {
  padding-left: .75rem;
  padding-right: .75rem
}

.topo-builder .px-4 {
  padding-left: 1rem;
  padding-right: 1rem
}

.topo-builder .px-6 {
  padding-left: 1.5rem;
  padding-right: 1.5rem
}

.topo-builder .py-0\.5 {
  padding-top: .125rem;
  padding-bottom: .125rem
}

.topo-builder .py-1 {
  padding-top: .25rem;
  padding-bottom: .25rem
}

.topo-builder .py-1\.5 {
  padding-top: .375rem;
  padding-bottom: .375rem
}

.topo-builder .py-2 {
  padding-top: .5rem;
  padding-bottom: .5rem
}

.topo-builder .py-3 {
  padding-top: .75rem;
  padding-bottom: .75rem
}

.topo-builder .font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace
}

.topo-builder .text-\[10px\] {
  font-size: 10px
}

.topo-builder .text-\[11px\] {
  font-size: 11px
}

.topo-builder .text-sm {
  font-size: .875rem;
  line-height: 1.25rem
}

.topo-builder .text-xs {
  font-size: .75rem;
  line-height: 1rem
}

.topo-builder .font-bold {
  font-weight: 700
}

.topo-builder .uppercase {
  text-transform: uppercase
}

.topo-builder .tracking-widest {
  letter-spacing: .1em
}

.topo-builder .text-\[\#02DECA\] {
  --tw-text-opacity: 1;
  color: rgb(2 222 202/var(--tw-text-opacity, 1))
}

.topo-builder .text-\[\#041312\] {
  --tw-text-opacity: 1;
  color: rgb(4 19 18/var(--tw-text-opacity, 1))
}

.topo-builder .text-green-400 {
  --tw-text-opacity: 1;
  color: rgb(74 222 128/var(--tw-text-opacity, 1))
}

.topo-builder .text-red-400 {
  --tw-text-opacity: 1;
  color: rgb(248 113 113/var(--tw-text-opacity, 1))
}

.topo-builder .text-slate-200 {
  --tw-text-opacity: 1;
  color: rgb(226 232 240/var(--tw-text-opacity, 1))
}

.topo-builder .text-slate-300 {
  --tw-text-opacity: 1;
  color: rgb(203 213 225/var(--tw-text-opacity, 1))
}

.topo-builder .text-slate-400 {
  --tw-text-opacity: 1;
  color: rgb(148 163 184/var(--tw-text-opacity, 1))
}

.topo-builder .text-slate-500 {
  --tw-text-opacity: 1;
  color: rgb(100 116 139/var(--tw-text-opacity, 1))
}

.topo-builder .text-white {
  --tw-text-opacity: 1;
  color: rgb(255 255 255/var(--tw-text-opacity, 1))
}

.topo-builder .accent-\[\#02DECA\] {
  accent-color: #02deca
}

.topo-builder .opacity-30 {
  opacity: .3
}

.topo-builder .shadow {
  --tw-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px -1px rgba(0, 0, 0, .1);
  --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color)
}

.topo-builder .shadow,
.topo-builder .shadow-2xl {
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)
}

.topo-builder .shadow-2xl {
  --tw-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25);
  --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color)
}

.topo-builder .shadow-inner {
  --tw-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, .05);
  --tw-shadow-colored: inset 0 2px 4px 0 var(--tw-shadow-color)
}

.topo-builder .shadow-inner,
.topo-builder .shadow-lg {
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)
}

.topo-builder .shadow-lg {
  --tw-shadow: 0 10px 15px -3px rgba(0, 0, 0, .1), 0 4px 6px -4px rgba(0, 0, 0, .1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color)
}

.topo-builder .shadow-md {
  --tw-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -2px rgba(0, 0, 0, .1);
  --tw-shadow-colored: 0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)
}

.topo-builder .outline-none {
  outline: 2px solid transparent;
  outline-offset: 2px
}

.topo-builder .filter {
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)
}

.topo-builder .backdrop-blur {
  --tw-backdrop-blur: blur(8px)
}

.topo-builder .backdrop-blur,
.topo-builder .backdrop-blur-sm {
  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)
}

.topo-builder .backdrop-blur-sm {
  --tw-backdrop-blur: blur(4px)
}

.topo-builder .transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(.4, 0, .2, 1);
  transition-duration: .15s
}

.topo-builder .transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(.4, 0, .2, 1);
  transition-duration: .15s
}

.topo-builder .hover\:border-\[\#02DECA\]:hover {
  --tw-border-opacity: 1;
  border-color: rgb(2 222 202/var(--tw-border-opacity, 1))
}

.topo-builder .hover\:bg-\[\#20f0df\]:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(32 240 223/var(--tw-bg-opacity, 1))
}

.topo-builder .hover\:bg-slate-600:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(71 85 105/var(--tw-bg-opacity, 1))
}

.topo-builder .hover\:bg-slate-700:hover {
  --tw-bg-opacity: 1;
  background-color: rgb(51 65 85/var(--tw-bg-opacity, 1))
}

.topo-builder .hover\:text-red-400:hover {
  --tw-text-opacity: 1;
  color: rgb(248 113 113/var(--tw-text-opacity, 1))
}

.topo-builder .hover\:text-white:hover {
  --tw-text-opacity: 1;
  color: rgb(255 255 255/var(--tw-text-opacity, 1))
}

.topo-builder .focus\:border-\[\#02DECA\]:focus {
  --tw-border-opacity: 1;
  border-color: rgb(2 222 202/var(--tw-border-opacity, 1))
}
</style>
