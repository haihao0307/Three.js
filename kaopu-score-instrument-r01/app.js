import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const INSTRUMENT_VERSION = 'K1.0.0';
const MAX_MESHES = 1200;
const MAX_REPEAT = 256;

const viewport = document.querySelector('#viewport');
const scoreInput = document.querySelector('#score');
const playButton = document.querySelector('#play');
const cameraButton = document.querySelector('#camera');
const statusNode = document.querySelector('#status');
const presetButtons = [...document.querySelectorAll('[data-score]')];

const metricNodes = {
  bytes: document.querySelector('#bytes'),
  objects: document.querySelector('#objects'),
  vertices: document.querySelector('#vertices'),
  triangles: document.querySelector('#triangles'),
  ratio: document.querySelector('#ratio'),
  hash: document.querySelector('#hash'),
};

const defaultColors = {
  b: '#d69a5a',
  s: '#5b9bd5',
  c: '#6ea870',
  n: '#b98a62',
  t: '#c87883',
  p: '#6f7d8c',
};

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101318');
scene.fog = new THREE.Fog('#101318', 14, 34);

const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 500);
camera.position.set(4.2, 3.2, 5.2);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  showFatal(`无法建立实时三维渲染器：${error instanceof Error ? error.message : String(error)}`);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 0.35;
controls.maxDistance = 80;
controls.target.set(0, 0.55, 0);

const hemi = new THREE.HemisphereLight('#dbe9ff', '#2b251e', 1.45);
scene.add(hemi);

const key = new THREE.DirectionalLight('#fff1d3', 4.2);
key.position.set(4.5, 7.5, 5.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -7;
key.shadow.camera.right = 7;
key.shadow.camera.top = 7;
key.shadow.camera.bottom = -7;
key.shadow.camera.near = 0.1;
key.shadow.camera.far = 30;
scene.add(key);

const rim = new THREE.DirectionalLight('#8eb7ff', 1.45);
rim.position.set(-4.5, 3.2, -5.5);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ color: '#000000', opacity: 0.32 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.002;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(20, 20, '#697481', '#303741');
grid.position.y = 0.001;
const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
for (const material of gridMaterials) {
  material.transparent = true;
  material.opacity = 0.52;
}
scene.add(grid);

let activeRoot = new THREE.Group();
activeRoot.name = 'KAOPU_SCORE_OUTPUT';
scene.add(activeRoot);
let lastBounds = null;

function showFatal(message) {
  viewport.innerHTML = `<div style="padding:24px;color:#ff9b9b;font:14px/1.6 system-ui">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle('error', isError);
}

function splitTopLevel(source, delimiter = ';') {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth < 0) throw new Error(`第 ${index + 1} 位出现多余的 }`);

    if (char === delimiter && depth === 0) {
      parts.push(source.slice(start, index));
      start = index + 1;
    }
  }

  if (depth !== 0) throw new Error('花括号没有闭合');
  parts.push(source.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseNumberList(text, defaults, label, options = {}) {
  const value = text.trim();
  if (!value) return [...defaults];

  const rawParts = value.split(',').map((part) => part.trim());
  if (rawParts.some((part) => part === '')) throw new Error(`${label} 中存在空参数`);
  if (rawParts.length > defaults.length) throw new Error(`${label} 最多允许 ${defaults.length} 个参数`);

  const parsed = rawParts.map((part) => Number(part));
  if (parsed.some((number) => !Number.isFinite(number))) throw new Error(`${label} 必须是有限数字`);

  if (options.uniform && parsed.length === 1) {
    return defaults.map(() => parsed[0]);
  }

  const output = [...defaults];
  parsed.forEach((number, index) => {
    output[index] = number;
  });
  return output;
}

function positive(value, label, minimum = 0.0001) {
  if (value < minimum) throw new Error(`${label} 必须大于 ${minimum}`);
  return value;
}

function clamp01(value, label) {
  if (value < 0 || value > 1) throw new Error(`${label} 必须在 0 到 1 之间`);
  return value;
}

function parseSections(token) {
  const markers = new Set(['#', '!', '@', '/', '%']);
  const sections = { dims: '' };
  let active = 'dims';
  let start = 1;

  for (let index = 1; index <= token.length; index += 1) {
    const char = token[index];
    const boundary = index === token.length || markers.has(char);
    if (!boundary) continue;

    sections[active] = token.slice(start, index).trim();
    if (index < token.length) {
      active = char;
      if (Object.hasOwn(sections, active)) throw new Error(`属性 ${active} 重复出现`);
      start = index + 1;
    }
  }

  return sections;
}

function validateColor(raw, fallback) {
  if (!raw) return fallback;
  const normalized = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized)) {
    throw new Error(`颜色 ${normalized} 不是 3 位或 6 位十六进制颜色`);
  }
  return normalized;
}

function createGeometry(shape, dimensions) {
  let geometry;

  switch (shape) {
    case 'b': {
      const [width, height, depth] = dimensions.map((value, index) => positive(value, ['方体宽', '方体高', '方体深'][index]));
      geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
      geometry.translate(0, height / 2, 0);
      break;
    }
    case 's': {
      const radius = positive(dimensions[0], '球体半径');
      geometry = new THREE.SphereGeometry(radius, 40, 24);
      geometry.translate(0, radius, 0);
      break;
    }
    case 'c': {
      const radius = positive(dimensions[0], '圆柱半径');
      const height = positive(dimensions[1], '圆柱高度');
      geometry = new THREE.CylinderGeometry(radius, radius, height, 40, 1, false);
      geometry.translate(0, height / 2, 0);
      break;
    }
    case 'n': {
      const radius = positive(dimensions[0], '圆锥半径');
      const height = positive(dimensions[1], '圆锥高度');
      geometry = new THREE.ConeGeometry(radius, height, 40, 1, false);
      geometry.translate(0, height / 2, 0);
      break;
    }
    case 't': {
      const radius = positive(dimensions[0], '圆环主半径');
      const tube = positive(dimensions[1], '圆环管半径');
      if (tube >= radius) throw new Error('圆环管半径必须小于主半径');
      geometry = new THREE.TorusGeometry(radius, tube, 20, 64);
      geometry.translate(0, radius + tube, 0);
      break;
    }
    case 'p': {
      const width = positive(dimensions[0], '平面宽度');
      const depth = positive(dimensions[1], '平面深度');
      geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
      geometry.rotateX(-Math.PI / 2);
      break;
    }
    default:
      throw new Error(`未知几何 ${shape}`);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function primitiveDefaults(shape) {
  switch (shape) {
    case 'b': return [1, 1, 1];
    case 's': return [0.5];
    case 'c': return [0.5, 1];
    case 'n': return [0.5, 1];
    case 't': return [0.65, 0.18];
    case 'p': return [1, 1];
    default: throw new Error(`K1 不认识几何 ${shape}`);
  }
}

function addPrimitive(token, parent, state) {
  const shape = token[0]?.toLowerCase();
  if (!shape || !Object.hasOwn(defaultColors, shape)) throw new Error(`节点“${token}”没有有效的几何字母`);

  const sections = parseSections(token);
  const dimensions = parseNumberList(sections.dims, primitiveDefaults(shape), `${shape} 尺寸`);
  const materialParams = parseNumberList(sections['!'] || '', [0.66, 0.06], '材质');
  const position = parseNumberList(sections['@'] || '', [0, 0, 0], '位置');
  const rotation = parseNumberList(sections['/'] || '', [0, 0, 0], '旋转');
  const scale = parseNumberList(sections['%'] || '', [1, 1, 1], '缩放', { uniform: true });

  scale.forEach((value) => positive(Math.abs(value), '缩放绝对值'));
  const roughness = clamp01(materialParams[0], '粗糙度');
  const metalness = clamp01(materialParams[1], '金属度');
  const color = validateColor(sections['#'], defaultColors[shape]);

  const geometry = createGeometry(shape, dimensions);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side: shape === 'p' ? THREE.DoubleSide : THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `${shape.toUpperCase()}_${state.meshes + 1}`;
  mesh.position.fromArray(position);
  mesh.rotation.set(...rotation.map(THREE.MathUtils.degToRad));
  mesh.scale.fromArray(scale);
  mesh.castShadow = shape !== 'p';
  mesh.receiveShadow = true;
  parent.add(mesh);

  state.meshes += 1;
  if (state.meshes > MAX_MESHES) throw new Error(`单次演奏最多生成 ${MAX_MESHES} 个几何对象`);
}

function findClosingBrace(token, openingIndex) {
  let depth = 0;
  for (let index = openingIndex; index < token.length; index += 1) {
    if (token[index] === '{') depth += 1;
    if (token[index] === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function addOperator(token, parent, state) {
  const type = token[0].toUpperCase();
  const opening = token.indexOf('{');
  if (opening < 0) throw new Error(`${type} 算子缺少 {子谱}`);
  const closing = findClosingBrace(token, opening);
  if (closing < 0) throw new Error(`${type} 算子的花括号没有闭合`);
  if (closing !== token.length - 1) throw new Error(`${type} 算子的 } 后面存在多余内容`);

  const header = token.slice(1, opening).trim();
  const childSource = token.slice(opening + 1, closing).trim();
  if (!childSource) throw new Error(`${type} 算子的子谱不能为空`);

  const args = header ? header.split(',').map((part) => Number(part.trim())) : [];
  if (args.some((number) => !Number.isFinite(number))) throw new Error(`${type} 算子参数必须是数字`);

  const count = Math.trunc(args[0] ?? 6);
  if (count < 1 || count > MAX_REPEAT) throw new Error(`${type} 数量必须在 1 到 ${MAX_REPEAT} 之间`);

  if (type === 'A') {
    const radius = positive(args[1] ?? 1, '环阵半径');
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const slot = new THREE.Group();
      slot.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      slot.rotation.y = -angle;
      parent.add(slot);
      parseSequence(childSource, slot, state);
    }
    return;
  }

  if (type === 'L') {
    const spacing = positive(args[1] ?? 0.5, '线阵间距');
    const center = (count - 1) / 2;
    for (let index = 0; index < count; index += 1) {
      const slot = new THREE.Group();
      slot.position.x = (index - center) * spacing;
      parent.add(slot);
      parseSequence(childSource, slot, state);
    }
    return;
  }

  throw new Error(`未知逻辑算子 ${type}`);
}

function parseNode(token, parent, state) {
  const type = token[0]?.toUpperCase();
  if (type === 'A' || type === 'L') {
    addOperator(token, parent, state);
  } else {
    addPrimitive(token, parent, state);
  }
}

function parseSequence(source, parent, state) {
  const nodes = splitTopLevel(source);
  if (nodes.length === 0) throw new Error('谱子中没有可演奏节点');
  for (const node of nodes) parseNode(node, parent, state);
}

function parseScore(rawScore) {
  const score = rawScore.trim();
  if (!score) throw new Error('谱子不能为空');

  const separator = score.indexOf('|');
  if (separator < 0) throw new Error('谱子必须以 K1| 开始');
  const version = score.slice(0, separator).trim();
  if (version !== 'K1') throw new Error(`当前乐器只支持 K1，收到的是 ${version || '空版本'}`);

  const body = score.slice(separator + 1).trim();
  if (!body) throw new Error('K1| 后面没有对象节点');

  const root = new THREE.Group();
  root.name = 'KAOPU_SCORE_OUTPUT';
  const state = { meshes: 0 };
  parseSequence(body, root, state);
  root.updateMatrixWorld(true);
  return { score, root, meshCount: state.meshes };
}

function disposeRoot(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material?.dispose();
    }
  });
}

function collectMetrics(root, score) {
  let objects = 0;
  let vertices = 0;
  let triangles = 0;

  root.traverse((object) => {
    if (!object.isMesh) return;
    objects += 1;
    const position = object.geometry.getAttribute('position');
    vertices += position?.count ?? 0;
    triangles += object.geometry.index
      ? object.geometry.index.count / 3
      : (position?.count ?? 0) / 3;
  });

  const bytes = new TextEncoder().encode(score).length;
  return {
    bytes,
    objects,
    vertices: Math.round(vertices),
    triangles: Math.round(triangles),
    ratio: bytes > 0 ? triangles / bytes : 0,
    hash: fnv1a(`${INSTRUMENT_VERSION}|${score}`),
  };
}

function fnv1a(value) {
  const bytes = new TextEncoder().encode(value);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function formatInteger(value) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function updateMetrics(metrics) {
  metricNodes.bytes.textContent = `${formatInteger(metrics.bytes)} B`;
  metricNodes.objects.textContent = formatInteger(metrics.objects);
  metricNodes.vertices.textContent = formatInteger(metrics.vertices);
  metricNodes.triangles.textContent = formatInteger(metrics.triangles);
  metricNodes.ratio.textContent = `${metrics.ratio.toFixed(metrics.ratio >= 100 ? 0 : 1)}×`;
  metricNodes.hash.textContent = metrics.hash;
}

function updatePresetState(score) {
  for (const button of presetButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.score === score));
  }
}

function computeBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error('生成结果没有有效包围盒');
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('生成结果尺寸无效');
  return { box, sphere };
}

function fitCamera(bounds = lastBounds) {
  if (!bounds) return;
  const { sphere } = bounds;
  const radius = Math.max(sphere.radius, 0.25);
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = (radius / Math.tan(halfFov)) * 1.35;
  const direction = new THREE.Vector3(1.25, 0.86, 1.45).normalize();
  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  camera.near = Math.max(distance / 500, 0.005);
  camera.far = Math.max(distance * 80, 80);
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.minDistance = Math.max(radius * 0.2, 0.12);
  controls.maxDistance = Math.max(radius * 18, 20);
  controls.update();
}

function playScore({ resetCamera = true } = {}) {
  const raw = scoreInput.value;
  let parsed;

  try {
    parsed = parseScore(raw);
    const bounds = computeBounds(parsed.root);
    const metrics = collectMetrics(parsed.root, parsed.score);

    scene.remove(activeRoot);
    disposeRoot(activeRoot);
    activeRoot = parsed.root;
    scene.add(activeRoot);
    lastBounds = bounds;

    updateMetrics(metrics);
    updatePresetState(parsed.score);
    setStatus(`演奏完成：${metrics.bytes} B 谱子展开为 ${formatInteger(metrics.objects)} 个对象、${formatInteger(metrics.triangles)} 个三角面。`);
    if (resetCamera) fitCamera(bounds);
  } catch (error) {
    parsed?.root && disposeRoot(parsed.root);
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`谱子未执行：${message}`, true);
  }
}

function updateDraftByteCount() {
  const score = scoreInput.value.trim();
  const bytes = new TextEncoder().encode(score).length;
  metricNodes.bytes.textContent = `${formatInteger(bytes)} B`;
  updatePresetState(score);
  setStatus('谱子已修改，按“演奏谱子”生成新的三维结果。');
}

for (const button of presetButtons) {
  button.addEventListener('click', () => {
    scoreInput.value = button.dataset.score || '';
    playScore();
  });
}

playButton.addEventListener('click', () => playScore());
cameraButton.addEventListener('click', () => fitCamera());
scoreInput.addEventListener('input', updateDraftByteCount);
scoreInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    playScore();
  }
});

const resizeObserver = new ResizeObserver(() => {
  const width = Math.max(viewport.clientWidth, 1);
  const height = Math.max(viewport.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(viewport);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

playScore();
