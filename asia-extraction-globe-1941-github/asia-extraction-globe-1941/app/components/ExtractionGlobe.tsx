"use client";

import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import generatedShippingLanes from "../data/shipping-routes.generated.json";

type TransportMode = "all" | "sea" | "air";

export type GlobeController = {
  setDensity(value: number): void;
  setTransport(mode: TransportMode): void;
  setPaused(value: boolean): void;
  setTimeline(step: number): void;
  focusAsia(): void;
  focusPacific(): void;
  focusAtlantic(): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
};

export type ExtractionGlobeProps = {
  embedded?: boolean;
  className?: string;
  onReady?: (controller: GlobeController) => void;
};

type Route = {
  from: [number, number];
  to: [number, number];
  previous?: [number, number];
  next?: [number, number];
  kind: "sea" | "air";
  resource: keyof typeof RESOURCE_COLORS;
  color?: string;
  projected?: boolean;
  weight?: number;
  altitude?: number;
  startStep?: number;
  endStep?: number;
  smooth?: boolean;
  networkImmune?: boolean;
  geodesic?: boolean;
  curveStrength?: number;
  timelineMode?: "legacy" | "event";
  strategic?: boolean;
};

type ShippingLane = {
  path: Array<[number, number]>;
  flow: "inbound" | "outbound";
  projected?: boolean;
  weight?: number;
  smooth?: boolean[];
};

const RESOURCE_COLORS = {
  oil: new THREE.Color("#e35a3f"),
  rubber: new THREE.Color("#d99a3f"),
  tin: new THREE.Color("#7ea99b"),
  iron: new THREE.Color("#b9a58c"),
  rice: new THREE.Color("#cfbd61"),
  labor: new THREE.Color("#ae4d48"),
};

const HUBS: Record<string, [number, number]> = {
  tokyo: [35.1, 140.0],
  osaka: [34.5, 135.1],
  kobe: [34.58, 135.05],
  moji: [34.05, 130.7],
};

const PORTS: Record<string, [number, number]> = {
  keelung: [25.2, 121.8],
  takao: [22.55, 120.15],
  shanghai: [31.2, 121.7],
  qingdao: [36.02, 120.28],
  busan: [35.08, 129.1],
  hongKong: [22.2, 114.1],
  haikou: [20.15, 110.25],
  muara: [5.08, 115.0],
  haiphong: [20.86, 106.68],
  saigon: [10.1, 107.4],
  kualaLumpur: [3.14, 101.69],
  singapore: [1.16, 103.72],
  manila: [14.5, 120.72],
  davao: [6.95, 125.75],
  batavia: [-5.95, 106.7],
  soerabaja: [-7.35, 112.75],
  palembang: [-2.45, 105.45],
  balikpapan: [-1.3, 116.95],
  tarakan: [3.35, 117.72],
  makassar: [-5.15, 119.3],
  ambon: [-3.75, 128.1],
  palau: [7.52, 134.58],
  saipan: [15.18, 145.75],
  truk: [7.45, 151.84],
  kwajalein: [8.72, 167.73],
  rabaul: [-4.25, 152.25],
  lae: [-6.8, 147.08],
  rangoon: [15.6, 96.0],
  tulagi: [-9.1, 160.22],
};

const OPERATION_POINTS: Record<string, [number, number]> = {
  hitokappu: [45.5, 148.7],
  northPacific: [42.0, 170.0],
  hawaiiApproach: [26.0, -160.0],
  pearlHarbor: [21.36, -157.95],
  kure: [34.24, 132.56],
  midwayApproach: [31.0, -170.0],
  midway: [28.2, -177.37],
  taiwanOkinawa: [24.8, 124.8],
  peleliu: [7.0, 134.25],
  darwin: [-12.46, 130.84],
};

const STRATEGIC_POINTS: Record<string, [number, number]> = {
  chengduBaseGroup: [30.55, 103.82],
  saipanIsley: [15.12, 145.73],
  tinianNorthField: [15.08, 145.63],
  yawata: [33.87, 130.82],
  sasebo: [33.16, 129.72],
  tokyo: [35.68, 139.76],
  yokohama: [35.44, 139.64],
  nagoya: [35.18, 136.91],
  osaka: [34.69, 135.5],
  kobe: [34.69, 135.2],
  hiroshima: [34.39, 132.46],
  nagasaki: [32.75, 129.88],
};

const AIRFIELD_POINTS: Record<string, [number, number]> = {
  // 中國戰時城市與航空節點
  tianjin: [39.08, 117.2],
  shijiazhuang: [38.04, 114.51],
  kaifeng: [34.8, 114.3],
  zhengzhou: [34.75, 113.62],
  luoyang: [34.62, 112.45],
  changsha: [28.23, 112.94],
  nanning: [22.82, 108.32],
  // 荷屬東印度／日佔東印度城市
  bandung: [-6.92, 107.62],
  semarang: [-6.97, 110.42],
  cilacap: [-7.73, 109.0],
  medan: [3.59, 98.67],
  padang: [-0.95, 100.35],
  pontianak: [-0.03, 109.34],
  banjarmasin: [-3.32, 114.59],
  manado: [1.49, 124.84],
  kupang: [-10.17, 123.61],
  hollandia: [-2.53, 140.72],
  // 緬甸戰時城市與航空節點
  moulmein: [16.49, 97.63],
  tavoy: [14.08, 98.2],
  mergui: [12.44, 98.6],
  pegu: [17.34, 96.48],
  prome: [18.82, 95.22],
  mandalay: [21.98, 96.08],
  lashio: [22.93, 97.75],
  myitkyina: [25.38, 97.39],
  akyab: [20.15, 92.9],
};

const ALLIED_POINTS: Record<string, [number, number]> = {
  newYork: [40.71, -74.0],
  miami: [25.79, -80.29],
  borinquen: [18.5, -67.13],
  atkinson: [6.5, -58.25],
  belem: [-1.46, -48.5],
  natal: [-5.79, -35.21],
  ascension: [-7.95, -14.36],
  accra: [5.6, -0.19],
  khartoum: [15.5, 32.56],
  cairo: [30.04, 31.24],
  basra: [30.51, 47.78],
  gooseBay: [53.32, -60.43],
  narsarsuaq: [61.16, -45.43],
  reykjavik: [64.13, -21.94],
  prestwick: [55.51, -4.61],
  sanFrancisco: [37.62, -122.38],
  honolulu: [21.31, -157.86],
  christmasIsland: [1.87, -157.4],
  cantonIsland: [-2.78, -171.72],
  nadi: [-17.75, 177.45],
  noumea: [-22.27, 166.44],
  brisbane: [-27.47, 153.03],
  townsville: [-19.26, 146.82],
  portMoresby: [-9.44, 147.18],
  capeTown: [-33.92, 18.42],
  karachi: [24.86, 67.01],
  delhi: [28.61, 77.21],
  calcutta: [22.57, 88.36],
  guwahati: [26.14, 91.74],
  ledo: [27.29, 95.74],
  dinjan: [27.54, 95.27],
  chabua: [27.48, 95.17],
  sookerating: [27.55, 95.58],
  bhamo: [24.25, 97.23],
  muse: [23.98, 97.9],
  wanting: [24.05, 98.15],
  baoshan: [25.12, 99.16],
  dali: [25.61, 100.27],
  kunming: [25.04, 102.72],
  chongqing: [29.56, 106.55],
  chengdu: [30.67, 104.06],
  guiyang: [26.65, 106.63],
  lhasa: [29.65, 91.12],
  xian: [34.34, 108.94],
};

type MapLabel = {
  label: string;
  point: [number, number];
  status: "context" | "mandate" | "occupied" | "contested" | "resistance" | "allied";
  citySlug?: string;
  size?: number;
  startStep?: number;
  endStep?: number;
  timelineMode?: "legacy" | "event";
};

const CITY_PAGE_PATHS: Record<string, string> = {
  "chiang-mai": "/cities/chiang-mai",
  kunming: "/cities/kunming",
  chongqing: "/cities/chongqing",
  chengdu: "/cities/chengdu",
  guilin: "/cities/guilin",
  wenzhou: "/cities/wenzhou",
  guangzhou: "/cities/guangzhou",
};

const EVENT_STEPS = {
  midway: 14,
  palauCounteroffensive: 18,
  taiwanOkinawa: 18,
  chengduYawata: 21,
  saipanSecured: 23,
  tinianSecured: 24,
  saipanTokyo: 28,
  matterhornWithdrawn: 30,
  tokyoFirebombing: 32,
  hiroshima: 38,
  nagasaki: 39,
  surrenderBroadcast: 40,
} as const;

// The expanded UI timeline adds exact city and air-war transitions while the
// established territorial and transport layers retain 24 campaign phases.
const TIMELINE_LEGACY_PHASE = [
  0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  16, 16, 16, 16, 16, 16, 17, 18, 19, 19, 19, 19, 20, 20, 20, 21,
  21, 21, 21, 21, 21, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23,
] as const;

const LAST_EVENT_STEP = TIMELINE_LEGACY_PHASE.length - 1;

type ChineseCityHistory = {
  label: string;
  point: [number, number];
  size: number;
  citySlug?: string;
  occupied: ReadonlyArray<readonly [number, number]>;
};

function buildChineseCityLabels(history: ChineseCityHistory): MapLabel[] {
  const labels: MapLabel[] = [];
  let cursor = 0;
  history.occupied.forEach(([startStep, endStep]) => {
    if (cursor < startStep) {
      labels.push({
        label: history.label, point: history.point, size: history.size, citySlug: history.citySlug,
        status: "resistance", startStep: cursor, endStep: startStep - 1, timelineMode: "event",
      });
    }
    labels.push({
      label: history.label, point: history.point, size: history.size, citySlug: history.citySlug,
      status: "occupied", startStep, endStep, timelineMode: "event",
    });
    cursor = endStep + 1;
  });
  if (cursor <= LAST_EVENT_STEP) {
    labels.push({
      label: history.label, point: history.point, size: history.size, citySlug: history.citySlug,
      status: "resistance", startStep: cursor, endStep: LAST_EVENT_STEP, timelineMode: "event",
    });
  }
  return labels;
}

// Occupation ranges refer to exact entries in the expanded 1941—1945 timeline.
// Cities already occupied before January 1941 begin red; the blue gaps for
// Zhengzhou and Nanning preserve their documented interim recoveries.
const CHINESE_CITY_HISTORIES: ChineseCityHistory[] = [
  { label: "北平", point: [39.9, 116.4], size: 0.13, occupied: [[0, 53]] },
  { label: "天津", point: AIRFIELD_POINTS.tianjin, size: 0.12, occupied: [[0, 53]] },
  { label: "石家莊", point: AIRFIELD_POINTS.shijiazhuang, size: 0.13, occupied: [[0, 53]] },
  { label: "青島", point: [36.07, 120.38], size: 0.13, occupied: [[0, 55]] },
  { label: "上海", point: [31.23, 121.47], size: 0.13, occupied: [[0, 45]] },
  { label: "南京", point: [32.06, 118.8], size: 0.13, occupied: [[0, 44]] },
  { label: "蘇州", point: [31.3, 120.58], size: 0.12, occupied: [[0, 45]] },
  { label: "杭州", point: [30.27, 120.15], size: 0.12, occupied: [[0, 47]] },
  { label: "濟南", point: [36.65, 117.0], size: 0.12, occupied: [[0, 55]] },
  { label: "太原", point: [37.87, 112.55], size: 0.12, occupied: [[0, 46]] },
  { label: "徐州", point: [34.26, 117.2], size: 0.12, occupied: [[0, 52]] },
  { label: "廈門", point: [24.48, 118.08], size: 0.12, occupied: [[0, 47]] },
  { label: "武漢", point: [30.59, 114.3], size: 0.13, occupied: [[0, 49]] },
  { label: "廣州", point: [23.13, 113.26], size: 0.13, citySlug: "guangzhou", occupied: [[0, 48]] },
  { label: "開封", point: AIRFIELD_POINTS.kaifeng, size: 0.12, occupied: [[0, 50]] },
  { label: "鄭州", point: AIRFIELD_POINTS.zhengzhou, size: 0.12, occupied: [[2, 2], [19, 50]] },
  { label: "洛陽", point: AIRFIELD_POINTS.luoyang, size: 0.12, occupied: [[20, 51]] },
  { label: "長沙", point: AIRFIELD_POINTS.changsha, size: 0.12, occupied: [[22, 47]] },
  { label: "衡陽", point: [26.89, 112.57], size: 0.13, occupied: [[25, 47]] },
  { label: "桂林", point: [25.27, 110.29], size: 0.13, citySlug: "guilin", occupied: [[27, 36]] },
  { label: "柳州", point: [24.33, 109.42], size: 0.13, occupied: [[27, 35]] },
  { label: "南寧", point: AIRFIELD_POINTS.nanning, size: 0.12, occupied: [[29, 34]] },
  { label: "海南島", point: [19.15, 109.75], size: 0.17, occupied: [[0, 48]] },
  { label: "海口", point: [20.03, 110.32], size: 0.12, occupied: [[0, 48]] },
  { label: "新京", point: [43.9, 125.32], size: 0.12, occupied: [[0, 40]] },
  { label: "奉天", point: [41.8, 123.43], size: 0.12, occupied: [[0, 40]] },
  { label: "大連", point: [38.91, 121.61], size: 0.12, occupied: [[0, 41]] },
  { label: "香港", point: [22.3, 114.17], size: 0.13, occupied: [[6, 42]] },
  { label: "基隆", point: [25.13, 121.74], size: 0.13, occupied: [[0, 54]] },
  { label: "臺北", point: [25.04, 121.56], size: 0.12, occupied: [[0, 54]] },
];

const CHINESE_CITY_LABELS: MapLabel[] = CHINESE_CITY_HISTORIES.flatMap(buildChineseCityLabels);

const MAP_LABELS: MapLabel[] = [
  { label: "中華民國", point: [35, 104], status: "context", size: 0.29 },
  { label: "滿洲國 · 傀儡政權", point: [46, 127], status: "occupied", size: 0.28 },
  { label: "朝鮮 · 日本殖民地", point: [38.2, 127.2], status: "occupied", size: 0.23 },
  { label: "臺灣 · 日本殖民地", point: [23.8, 121], status: "occupied", size: 0.22 },
  { label: "日本", point: [37, 138.2], status: "occupied", size: 0.25 },
  { label: "菲律賓自治邦", point: [12.5, 122.5], status: "contested", size: 0.25 },
  { label: "法屬印度支那", point: [17.5, 106], status: "contested", size: 0.23 },
  { label: "泰國", point: [15.5, 101], status: "context", size: 0.19 },
  { label: "清邁", point: [18.79, 98.99], status: "context", size: 0.14, citySlug: "chiang-mai" },
  { label: "英屬馬來亞", point: [5.2, 102], status: "contested", size: 0.21 },
  { label: "荷屬東印度", point: [-5, 112], status: "contested", size: 0.25 },
  { label: "英屬緬甸", point: [21, 96], status: "contested", size: 0.21 },
  { label: "英屬印度", point: [23, 80], status: "context", size: 0.25 },
  { label: "帛琉 · 南洋廳", point: [7.52, 134.58], status: "mandate", size: 0.2 },
  { label: "雅浦 · 南洋廳", point: [9.54, 138.13], status: "mandate", size: 0.19 },
  { label: "特魯克 · 南洋廳", point: [7.45, 151.84], status: "mandate", size: 0.21 },
  { label: "波納佩 · 南洋廳", point: [6.92, 158.18], status: "mandate", size: 0.2 },
  { label: "塞班 · 日軍基地", point: [15.18, 145.75], status: "mandate", size: 0.2, endStep: EVENT_STEPS.saipanSecured - 1, timelineMode: "event" },
  { label: "塞班 · B-29基地", point: STRATEGIC_POINTS.saipanIsley, status: "allied", size: 0.2, startStep: EVENT_STEPS.saipanSecured, timelineMode: "event" },
  { label: "提尼安 · B-29基地", point: STRATEGIC_POINTS.tinianNorthField, status: "allied", size: 0.2, startStep: EVENT_STEPS.tinianSecured, timelineMode: "event" },
  { label: "關島 · 美國領地", point: [13.44, 144.79], status: "contested", size: 0.2 },
  { label: "馬紹爾群島 · 南洋廳", point: [7.1, 171.2], status: "mandate", size: 0.24 },
  { label: "新幾內亞島 · 地理整體", point: [-5.2, 142.5], status: "context", size: 0.31 },
  { label: "英屬索羅門群島", point: [-7.8, 157.7], status: "contested", size: 0.27 },
  { label: "東京", point: [35.68, 139.76], status: "occupied", size: 0.13 },
  { label: "廣島", point: STRATEGIC_POINTS.hiroshima, status: "occupied", size: 0.12 },
  { label: "長崎", point: STRATEGIC_POINTS.nagasaki, status: "occupied", size: 0.12 },
  { label: "成都B-29基地群", point: STRATEGIC_POINTS.chengduBaseGroup, status: "allied", size: 0.16, citySlug: "chengdu", startStep: EVENT_STEPS.chengduYawata, endStep: EVENT_STEPS.matterhornWithdrawn - 1, timelineMode: "event" },
  ...CHINESE_CITY_LABELS,
  { label: "河內", point: [21.03, 105.85], status: "contested", size: 0.13 },
  { label: "西貢", point: [10.82, 106.63], status: "contested", size: 0.13 },
  { label: "吉隆坡", point: [3.14, 101.69], status: "occupied", size: 0.14, startStep: 6 },
  { label: "新加坡", point: [1.29, 103.85], status: "contested", size: 0.14, endStep: 7 },
  { label: "昭南（新加坡）", point: [1.29, 103.85], status: "occupied", size: 0.19, startStep: 8, endStep: 22 },
  { label: "新加坡", point: [1.29, 103.85], status: "context", size: 0.14, startStep: 23 },
  { label: "馬尼拉", point: [14.6, 120.98], status: "contested", size: 0.14 },
  { label: "巴達維亞", point: [-6.1, 106.88], status: "occupied", size: 0.15, startStep: 10 },
  { label: "泗水", point: [-7.25, 112.75], status: "occupied", size: 0.13, startStep: 10 },
  { label: "巴厘巴板", point: [-1.24, 116.83], status: "occupied", size: 0.15, startStep: 10 },
  { label: "達沃", point: [7.07, 125.61], status: "contested", size: 0.13 },
  { label: "仰光", point: [16.84, 96.17], status: "occupied", size: 0.13, startStep: 13, endStep: 20 },
  { label: "曼德勒", point: [21.98, 96.08], status: "occupied", size: 0.14, startStep: 13, endStep: 20 },
  { label: "拉包爾", point: [-4.2, 152.18], status: "contested", size: 0.14 },
  { label: "萊城", point: [-6.73, 147], status: "contested", size: 0.13 },
  { label: "圖拉吉", point: [-9.1, 160.15], status: "contested", size: 0.13 },
  { label: "瓜達康納爾", point: [-9.58, 160.15], status: "contested", size: 0.17 },
  { label: "單冠灣 · 擇捉島", point: [45.5, 148.7], status: "occupied", size: 0.18 },
  { label: "珍珠港 · 夏威夷", point: [21.36, -157.95], status: "contested", size: 0.2 },
  { label: "中途島", point: [28.2, -177.37], status: "contested", size: 0.14 },
  { label: "中途島海戰 · 1942", point: OPERATION_POINTS.midway, status: "contested", size: 0.18, startStep: EVENT_STEPS.midway, endStep: EVENT_STEPS.midway, timelineMode: "event" },
  { label: "帛琉盟軍反攻 · 貝里琉", point: OPERATION_POINTS.peleliu, status: "allied", size: 0.2, startStep: EVENT_STEPS.palauCounteroffensive, endStep: EVENT_STEPS.palauCounteroffensive, timelineMode: "event" },
  { label: "臺灣沖航空戰（臺灣沖海戰）", point: OPERATION_POINTS.taiwanOkinawa, status: "allied", size: 0.22, startStep: EVENT_STEPS.taiwanOkinawa, endStep: EVENT_STEPS.taiwanOkinawa, timelineMode: "event" },
  { label: "達爾文", point: [-12.46, 130.84], status: "contested", size: 0.14 },
  // 未被日軍佔領的中國後方與抵抗中心；拉薩作為未被佔領地區標識。
  { label: "昆明", point: ALLIED_POINTS.kunming, status: "resistance", size: 0.15, citySlug: "kunming" },
  { label: "重慶", point: ALLIED_POINTS.chongqing, status: "resistance", size: 0.15, citySlug: "chongqing" },
  { label: "成都", point: ALLIED_POINTS.chengdu, status: "resistance", size: 0.14, citySlug: "chengdu" },
  { label: "貴陽", point: ALLIED_POINTS.guiyang, status: "resistance", size: 0.14 },
  { label: "拉薩", point: ALLIED_POINTS.lhasa, status: "resistance", size: 0.14 },
  { label: "西安", point: ALLIED_POINTS.xian, status: "resistance", size: 0.14 },
  { label: "溫州", point: [27.99, 120.7], status: "context", size: 0.14, citySlug: "wenzhou" },
  // 租借援華、滇緬公路、駝峰航線與中印公路節點。
  { label: "紐約", point: ALLIED_POINTS.newYork, status: "allied", size: 0.13 },
  { label: "邁阿密", point: ALLIED_POINTS.miami, status: "allied", size: 0.12 },
  { label: "博林肯機場", point: ALLIED_POINTS.borinquen, status: "allied", size: 0.13 },
  { label: "阿特金森機場", point: ALLIED_POINTS.atkinson, status: "allied", size: 0.14 },
  { label: "貝倫", point: ALLIED_POINTS.belem, status: "allied", size: 0.11 },
  { label: "納塔爾", point: ALLIED_POINTS.natal, status: "allied", size: 0.12 },
  { label: "阿森松島", point: ALLIED_POINTS.ascension, status: "allied", size: 0.13 },
  { label: "阿克拉", point: ALLIED_POINTS.accra, status: "allied", size: 0.11 },
  { label: "喀土穆", point: ALLIED_POINTS.khartoum, status: "allied", size: 0.12 },
  { label: "開羅", point: ALLIED_POINTS.cairo, status: "allied", size: 0.11 },
  { label: "巴士拉", point: ALLIED_POINTS.basra, status: "allied", size: 0.11 },
  { label: "古斯灣", point: ALLIED_POINTS.gooseBay, status: "allied", size: 0.11 },
  { label: "納薩斯瓦克", point: ALLIED_POINTS.narsarsuaq, status: "allied", size: 0.13 },
  { label: "雷克雅未克", point: ALLIED_POINTS.reykjavik, status: "allied", size: 0.13 },
  { label: "普雷斯特威克", point: ALLIED_POINTS.prestwick, status: "allied", size: 0.14 },
  { label: "舊金山", point: ALLIED_POINTS.sanFrancisco, status: "allied", size: 0.12 },
  { label: "檀香山", point: ALLIED_POINTS.honolulu, status: "allied", size: 0.12 },
  { label: "聖誕島", point: ALLIED_POINTS.christmasIsland, status: "allied", size: 0.12 },
  { label: "坎頓島", point: ALLIED_POINTS.cantonIsland, status: "allied", size: 0.12 },
  { label: "楠迪", point: ALLIED_POINTS.nadi, status: "allied", size: 0.11 },
  { label: "努美阿", point: ALLIED_POINTS.noumea, status: "allied", size: 0.11 },
  { label: "布里斯班", point: ALLIED_POINTS.brisbane, status: "allied", size: 0.13 },
  { label: "湯斯維爾", point: ALLIED_POINTS.townsville, status: "allied", size: 0.13 },
  { label: "莫士比港", point: ALLIED_POINTS.portMoresby, status: "allied", size: 0.13 },
  { label: "開普敦", point: ALLIED_POINTS.capeTown, status: "allied", size: 0.14 },
  { label: "卡拉奇", point: ALLIED_POINTS.karachi, status: "allied", size: 0.14, startStep: 13 },
  { label: "德里", point: ALLIED_POINTS.delhi, status: "allied", size: 0.12, startStep: 13 },
  { label: "加爾各答", point: ALLIED_POINTS.calcutta, status: "allied", size: 0.15, startStep: 13 },
  { label: "高哈蒂", point: ALLIED_POINTS.guwahati, status: "allied", size: 0.12, startStep: 13 },
  { label: "利多", point: ALLIED_POINTS.ledo, status: "allied", size: 0.12, startStep: 13 },
  { label: "汀江", point: ALLIED_POINTS.dinjan, status: "allied", size: 0.11, startStep: 13 },
  { label: "查布亞", point: ALLIED_POINTS.chabua, status: "allied", size: 0.12, startStep: 13 },
  { label: "蘇克拉廷", point: ALLIED_POINTS.sookerating, status: "allied", size: 0.12, startStep: 13 },
  { label: "八莫", point: ALLIED_POINTS.bhamo, status: "allied", size: 0.11, startStep: 20 },
  { label: "木姐", point: ALLIED_POINTS.muse, status: "allied", size: 0.11, startStep: 20 },
  { label: "畹町", point: ALLIED_POINTS.wanting, status: "allied", size: 0.11 },
  { label: "保山", point: ALLIED_POINTS.baoshan, status: "allied", size: 0.11 },
  { label: "大理", point: ALLIED_POINTS.dali, status: "allied", size: 0.11 },
  // 補齊每個港口與樞紐的繁體中文名稱。
  { label: "大阪", point: HUBS.osaka, status: "occupied", size: 0.12 },
  { label: "神戶", point: HUBS.kobe, status: "occupied", size: 0.12 },
  { label: "門司", point: HUBS.moji, status: "occupied", size: 0.12 },
  { label: "吳", point: OPERATION_POINTS.kure, status: "occupied", size: 0.11 },
  { label: "高雄", point: PORTS.takao, status: "occupied", size: 0.12 },
  { label: "釜山", point: PORTS.busan, status: "occupied", size: 0.12 },
  { label: "京城", point: [37.56, 126.98], status: "occupied", size: 0.12 },
  { label: "毛亞", point: PORTS.muara, status: "contested", size: 0.11 },
  { label: "海防", point: PORTS.haiphong, status: "contested", size: 0.12 },
  { label: "瓜加林", point: PORTS.kwajalein, status: "mandate", size: 0.13 },
  // 日佔東印度：使用1941年前後常見中文譯名。
  { label: "萬隆", point: AIRFIELD_POINTS.bandung, status: "occupied", size: 0.12, startStep: 10 },
  { label: "三寶壟", point: AIRFIELD_POINTS.semarang, status: "occupied", size: 0.13, startStep: 10 },
  { label: "芝拉扎", point: AIRFIELD_POINTS.cilacap, status: "occupied", size: 0.13, startStep: 10 },
  { label: "巨港", point: [ -2.99, 104.76 ], status: "occupied", size: 0.12, startStep: 10 },
  { label: "棉蘭", point: AIRFIELD_POINTS.medan, status: "occupied", size: 0.12, startStep: 10 },
  { label: "巴東", point: AIRFIELD_POINTS.padang, status: "occupied", size: 0.12, startStep: 10 },
  { label: "坤甸", point: AIRFIELD_POINTS.pontianak, status: "occupied", size: 0.12, startStep: 10 },
  { label: "馬辰", point: AIRFIELD_POINTS.banjarmasin, status: "occupied", size: 0.12, startStep: 10 },
  { label: "打拉根", point: [3.3, 117.63], status: "occupied", size: 0.12, startStep: 10 },
  { label: "望加錫", point: [-5.14, 119.41], status: "occupied", size: 0.12, startStep: 10 },
  { label: "萬鴉老", point: AIRFIELD_POINTS.manado, status: "occupied", size: 0.12, startStep: 10 },
  { label: "安汶", point: [-3.7, 128.17], status: "occupied", size: 0.12, startStep: 10 },
  { label: "古邦", point: AIRFIELD_POINTS.kupang, status: "occupied", size: 0.12, startStep: 10 },
  { label: "荷蘭迪亞", point: AIRFIELD_POINTS.hollandia, status: "occupied", size: 0.13, startStep: 10 },
  // 緬甸：以戰時英文地名的繁體中文譯名標示。
  { label: "毛淡棉", point: AIRFIELD_POINTS.moulmein, status: "occupied", size: 0.13, startStep: 13, endStep: 20 },
  { label: "土瓦", point: AIRFIELD_POINTS.tavoy, status: "occupied", size: 0.11, startStep: 13, endStep: 20 },
  { label: "丹老", point: AIRFIELD_POINTS.mergui, status: "occupied", size: 0.11, startStep: 13, endStep: 20 },
  { label: "勃固", point: AIRFIELD_POINTS.pegu, status: "occupied", size: 0.11, startStep: 13, endStep: 20 },
  { label: "卑謬", point: AIRFIELD_POINTS.prome, status: "occupied", size: 0.11, startStep: 13, endStep: 20 },
  { label: "臘戍", point: AIRFIELD_POINTS.lashio, status: "occupied", size: 0.11, startStep: 13, endStep: 20 },
  { label: "密支那", point: AIRFIELD_POINTS.myitkyina, status: "occupied", size: 0.12, startStep: 13, endStep: 18 },
  { label: "阿恰布", point: AIRFIELD_POINTS.akyab, status: "occupied", size: 0.12, startStep: 13, endStep: 20 },
];

const STATUS_COLORS = {
  context: "#e8d9b4",
  mandate: "#d99a3f",
  occupied: "#e35a3f",
  contested: "#7ea99b",
  resistance: "#37b8ff",
  allied: "#72dcff",
};

const AIR_ROUTES: Route[] = [
  // 時間節點作戰弧：表示艦隊與前進基地走廊，並非軍機由日本本土一次直飛。
  { from: OPERATION_POINTS.hitokappu, to: OPERATION_POINTS.northPacific, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.42, weight: 1.8, startStep: 2, endStep: 2 },
  { from: OPERATION_POINTS.northPacific, to: OPERATION_POINTS.hawaiiApproach, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.55, weight: 1.9, startStep: 2, endStep: 2 },
  { from: OPERATION_POINTS.hawaiiApproach, to: OPERATION_POINTS.pearlHarbor, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.36, weight: 1.8, startStep: 2, endStep: 2 },
  { from: OPERATION_POINTS.kure, to: PORTS.palau, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.36, weight: 1.8, startStep: 9, endStep: 9 },
  { from: PORTS.palau, to: PORTS.ambon, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.38, weight: 1.8, startStep: 9, endStep: 9 },
  { from: PORTS.ambon, to: OPERATION_POINTS.darwin, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.34, weight: 1.9, startStep: 9, endStep: 9 },
  { from: OPERATION_POINTS.kure, to: [32.0, 160.0], kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.44, weight: 1.8, startStep: 14, endStep: 14 },
  { from: [32.0, 160.0], to: OPERATION_POINTS.midwayApproach, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.52, weight: 1.9, startStep: 14, endStep: 14 },
  { from: OPERATION_POINTS.midwayApproach, to: OPERATION_POINTS.midway, kind: "air", resource: "labor", color: "#ffd65a", altitude: 1.36, weight: 1.8, startStep: 14, endStep: 14 },
  // 1944年帛琉反攻與臺灣沖航空戰：事件節點以盟軍低弧與日軍黃色高弧分層。
  { from: PORTS.saipan, to: OPERATION_POINTS.peleliu, kind: "air", resource: "labor", color: "#bdefff", altitude: 0.48, weight: 2.3, startStep: EVENT_STEPS.palauCounteroffensive, endStep: EVENT_STEPS.palauCounteroffensive, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: PORTS.palau, to: OPERATION_POINTS.peleliu, kind: "sea", resource: "labor", color: "#6fc9ef", altitude: 0.06, weight: 2.0, startStep: EVENT_STEPS.palauCounteroffensive, endStep: EVENT_STEPS.palauCounteroffensive, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: PORTS.saipan, to: OPERATION_POINTS.taiwanOkinawa, kind: "air", resource: "labor", color: "#bdefff", altitude: 0.52, weight: 2.15, startStep: EVENT_STEPS.taiwanOkinawa, endStep: EVENT_STEPS.taiwanOkinawa, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: OPERATION_POINTS.taiwanOkinawa, to: PORTS.takao, kind: "air", resource: "labor", color: "#e7c65a", altitude: 0.76, weight: 1.9, startStep: EVENT_STEPS.taiwanOkinawa, endStep: EVENT_STEPS.taiwanOkinawa, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  // 黃色高空弧由日本本土出發，呈現帝國海空網絡向亞洲與太平洋放射。
  { from: HUBS.tokyo, to: [39.9, 116.4], kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.22, weight: 1.15 },
  { from: HUBS.tokyo, to: PORTS.shanghai, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.18, weight: 1.2 },
  { from: HUBS.tokyo, to: PORTS.keelung, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.2, weight: 1.25 },
  { from: HUBS.tokyo, to: PORTS.manila, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.22, weight: 1.55, startStep: 5 },
  { from: HUBS.tokyo, to: PORTS.saigon, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.26, weight: 1.45, projected: true, startStep: 1 },
  { from: HUBS.tokyo, to: PORTS.singapore, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.3, weight: 1.8, projected: true, startStep: 8 },
  { from: HUBS.tokyo, to: PORTS.palau, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.24, weight: 1.15 },
  { from: HUBS.tokyo, to: PORTS.saipan, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.2, weight: 1.1 },
  { from: HUBS.tokyo, to: PORTS.truk, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.26, weight: 1.1 },
  { from: HUBS.tokyo, to: PORTS.kwajalein, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.3, weight: 1.05, projected: true },
  { from: HUBS.tokyo, to: PORTS.rabaul, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.34, weight: 1.45, projected: true, startStep: 7 },
  // 使用1941年地名的南方軍用空路：紅色高弧表示路網關係，而非逐班次飛行記錄。
  { from: PORTS.singapore, to: PORTS.keelung, kind: "air", resource: "labor", weight: 1.75, startStep: 8 },
  { from: PORTS.keelung, to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.55 },
  { from: [21.03, 105.85], to: PORTS.keelung, kind: "air", resource: "labor", weight: 1.25 },
  { from: PORTS.saigon, to: PORTS.keelung, kind: "air", resource: "labor", weight: 1.35 },
  { from: PORTS.kualaLumpur, to: PORTS.singapore, kind: "air", resource: "labor", weight: 1.25, startStep: 8 },
  { from: PORTS.rabaul, to: PORTS.palau, kind: "air", resource: "labor", weight: 1.55, startStep: 7 },
  { from: PORTS.lae, to: PORTS.palau, kind: "air", resource: "labor", projected: true, weight: 1.35, startStep: 10 },
  { from: PORTS.palau, to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.45 },
  { from: PORTS.kwajalein, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.4 },
  // 1935交通圖可辨的東亞航空路骨架；以分段節點呈現，不作逐班次航跡解讀。
  { from: [43.9, 125.32], to: [41.8, 123.43], kind: "air", resource: "labor", weight: 0.85 },
  { from: [41.8, 123.43], to: [38.91, 121.61], kind: "air", resource: "labor", weight: 0.9 },
  { from: [38.91, 121.61], to: [37.56, 126.98], kind: "air", resource: "labor", weight: 0.95 },
  { from: [37.56, 126.98], to: HUBS.moji, kind: "air", resource: "labor", weight: 0.95 },
  { from: HUBS.moji, to: HUBS.osaka, kind: "air", resource: "labor", weight: 0.9 },
  { from: HUBS.osaka, to: HUBS.tokyo, kind: "air", resource: "labor", weight: 0.9 },
  { from: [31.23, 121.47], to: HUBS.moji, kind: "air", resource: "labor", weight: 0.95 },
  { from: [25.04, 121.56], to: HUBS.moji, kind: "air", resource: "rice", weight: 0.9 },
  { from: [38.91, 121.61], to: HUBS.osaka, kind: "air", resource: "labor", weight: 1.1 },
  { from: [39.9, 116.4], to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.2 },
  { from: [31.23, 121.47], to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.3 },
  { from: [25.04, 121.56], to: HUBS.osaka, kind: "air", resource: "rice", weight: 1.1 },
  { from: [14.6, 120.98], to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.55, startStep: 5 },
  { from: [1.29, 103.85], to: HUBS.osaka, kind: "air", resource: "rubber", projected: true, weight: 1.75, startStep: 8 },
  { from: [-6.12, 106.84], to: HUBS.tokyo, kind: "air", resource: "oil", projected: true, weight: 1.8, startStep: 10 },
  { from: [21.03, 105.85], to: HUBS.osaka, kind: "air", resource: "rice", projected: true, weight: 1.25 },
  { from: [16.84, 96.17], to: HUBS.tokyo, kind: "air", resource: "rice", projected: true, weight: 1.65, startStep: 13 },
  { from: [15.18, 145.75], to: [7.45, 151.84], kind: "air", resource: "labor", weight: 1.2 },
  { from: [7.45, 151.84], to: [-4.2, 152.18], kind: "air", resource: "labor", projected: true, weight: 1.45 },
  { from: [-4.2, 152.18], to: [-6.73, 147], kind: "air", resource: "labor", projected: true, weight: 1.3 },
  { from: [-4.2, 152.18], to: [-9.58, 160.15], kind: "air", resource: "labor", projected: true, weight: 1.4 },
  // 佔領城市—日本紅色高弧：以主要軍政／航空節點重構高頻網絡，不作逐班次解讀。
  { from: [32.06, 118.8], to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.7 },
  { from: [30.59, 114.3], to: HUBS.osaka, kind: "air", resource: "rice", weight: 1.65 },
  { from: [23.13, 113.26], to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.65 },
  { from: AIRFIELD_POINTS.tianjin, to: HUBS.tokyo, kind: "air", resource: "labor", weight: 1.55 },
  { from: AIRFIELD_POINTS.shijiazhuang, to: HUBS.osaka, kind: "air", resource: "labor", projected: true, weight: 1.35 },
  { from: AIRFIELD_POINTS.changsha, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.55, startStep: 17 },
  { from: AIRFIELD_POINTS.nanning, to: HUBS.osaka, kind: "air", resource: "rice", projected: true, weight: 1.45, startStep: 19 },
  { from: AIRFIELD_POINTS.bandung, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.45, startStep: 10 },
  { from: AIRFIELD_POINTS.semarang, to: HUBS.osaka, kind: "air", resource: "rice", projected: true, weight: 1.4, startStep: 10 },
  { from: PORTS.soerabaja, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.7, startStep: 10 },
  { from: PORTS.palembang, to: HUBS.osaka, kind: "air", resource: "oil", projected: true, weight: 1.75, startStep: 10 },
  { from: PORTS.balikpapan, to: HUBS.tokyo, kind: "air", resource: "oil", projected: true, weight: 1.8, startStep: 10 },
  { from: AIRFIELD_POINTS.banjarmasin, to: HUBS.osaka, kind: "air", resource: "labor", projected: true, weight: 1.4, startStep: 10 },
  { from: PORTS.makassar, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.55, startStep: 10 },
  { from: PORTS.ambon, to: HUBS.tokyo, kind: "air", resource: "labor", projected: true, weight: 1.5, startStep: 10 },
  { from: AIRFIELD_POINTS.medan, to: PORTS.singapore, kind: "air", resource: "rubber", projected: true, weight: 1.35, startStep: 10 },
  { from: AIRFIELD_POINTS.kupang, to: PORTS.ambon, kind: "air", resource: "labor", projected: true, weight: 1.25, startStep: 10 },
  { from: AIRFIELD_POINTS.hollandia, to: PORTS.palau, kind: "air", resource: "labor", projected: true, weight: 1.35, startStep: 10 },
  { from: AIRFIELD_POINTS.mandalay, to: HUBS.tokyo, kind: "air", resource: "rice", projected: true, weight: 1.55, startStep: 13 },
  { from: AIRFIELD_POINTS.lashio, to: PORTS.keelung, kind: "air", resource: "labor", projected: true, weight: 1.35, startStep: 13 },
  { from: AIRFIELD_POINTS.myitkyina, to: AIRFIELD_POINTS.mandalay, kind: "air", resource: "labor", projected: true, weight: 1.25, startStep: 13 },
  { from: AIRFIELD_POINTS.moulmein, to: PORTS.singapore, kind: "air", resource: "rice", projected: true, weight: 1.4, startStep: 13 },
  // 日本出發黃色高空弧：與紅色回程／地區線形成方向對照。
  { from: HUBS.tokyo, to: [32.06, 118.8], kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.22, weight: 1.65 },
  { from: HUBS.tokyo, to: [30.59, 114.3], kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.25, weight: 1.6 },
  { from: HUBS.osaka, to: [23.13, 113.26], kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.27, weight: 1.55 },
  { from: HUBS.tokyo, to: AIRFIELD_POINTS.changsha, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.27, weight: 1.5, projected: true, startStep: 17 },
  { from: HUBS.osaka, to: AIRFIELD_POINTS.nanning, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.3, weight: 1.4, projected: true, startStep: 19 },
  { from: HUBS.tokyo, to: AIRFIELD_POINTS.bandung, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.33, weight: 1.55, projected: true, startStep: 10 },
  { from: HUBS.osaka, to: PORTS.soerabaja, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.32, weight: 1.55, projected: true, startStep: 10 },
  { from: HUBS.tokyo, to: PORTS.palembang, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.34, weight: 1.6, projected: true, startStep: 10 },
  { from: HUBS.osaka, to: PORTS.balikpapan, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.31, weight: 1.6, projected: true, startStep: 10 },
  { from: HUBS.tokyo, to: PORTS.makassar, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.34, weight: 1.5, projected: true, startStep: 10 },
  { from: HUBS.tokyo, to: PORTS.ambon, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.35, weight: 1.45, projected: true, startStep: 10 },
  { from: HUBS.tokyo, to: AIRFIELD_POINTS.mandalay, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.32, weight: 1.5, projected: true, startStep: 13 },
  { from: HUBS.osaka, to: AIRFIELD_POINTS.lashio, kind: "air", resource: "labor", color: "#e7c65a", altitude: 1.34, weight: 1.4, projected: true, startStep: 13 },
];

type AlliedAirPath = {
  path: Array<[number, number]>;
  startStep: number;
  endStep: number;
  color: string;
  weight: number;
  altitude: number;
};

// 盟軍航空運輸骨架：北大西洋、南大西洋—非洲—印度，以及南太平洋渡運鏈。
// 分段節點依美國陸軍／陸軍航空軍官方史料重構，表示主要走廊而非逐班次航跡。
const ALLIED_AIR_PATHS: AlliedAirPath[] = [
  {
    startStep: 0, endStep: 22, color: "#9bcfff", weight: 1.55, altitude: 0.32,
    path: [ALLIED_POINTS.newYork, ALLIED_POINTS.gooseBay, ALLIED_POINTS.narsarsuaq, ALLIED_POINTS.reykjavik, ALLIED_POINTS.prestwick],
  },
  {
    startStep: 2, endStep: 22, color: "#75dcff", weight: 1.85, altitude: 0.35,
    path: [ALLIED_POINTS.miami, ALLIED_POINTS.borinquen, ALLIED_POINTS.atkinson, ALLIED_POINTS.belem, ALLIED_POINTS.natal, ALLIED_POINTS.ascension, ALLIED_POINTS.accra, ALLIED_POINTS.khartoum, ALLIED_POINTS.cairo, ALLIED_POINTS.basra, ALLIED_POINTS.karachi, ALLIED_POINTS.calcutta],
  },
  {
    startStep: 0, endStep: 22, color: "#a8f0ff", weight: 1.75, altitude: 0.33,
    path: [ALLIED_POINTS.sanFrancisco, ALLIED_POINTS.honolulu, ALLIED_POINTS.christmasIsland, ALLIED_POINTS.cantonIsland, ALLIED_POINTS.nadi, ALLIED_POINTS.noumea, ALLIED_POINTS.brisbane, ALLIED_POINTS.townsville, ALLIED_POINTS.portMoresby],
  },
];

AIR_ROUTES.push(...ALLIED_AIR_PATHS.flatMap((lane) => lane.path.slice(0, -1).map((from, index) => ({
  from,
  to: lane.path[index + 1],
  kind: "air" as const,
  resource: "labor" as const,
  color: lane.color,
  altitude: lane.altitude,
  weight: lane.weight,
  startStep: lane.startStep,
  endStep: lane.endStep,
  networkImmune: true,
  geodesic: true,
}))));

// 1942年4月首批援運開始後，阿薩姆基地群至昆明的駝峰空運逐步接替被切斷的地面生命線。
AIR_ROUTES.push(
  { from: ALLIED_POINTS.dinjan, to: ALLIED_POINTS.kunming, kind: "air", resource: "labor", color: "#dcfbff", altitude: 0.36, weight: 2.35, startStep: 11, endStep: 22, networkImmune: true },
  { from: ALLIED_POINTS.chabua, to: ALLIED_POINTS.kunming, kind: "air", resource: "labor", color: "#75d6ff", altitude: 0.39, weight: 2.2, startStep: 11, endStep: 22, networkImmune: true },
  { from: ALLIED_POINTS.sookerating, to: ALLIED_POINTS.kunming, kind: "air", resource: "labor", color: "#a8efff", altitude: 0.42, weight: 2.05, startStep: 11, endStep: 22, networkImmune: true },
  { from: ALLIED_POINTS.kunming, to: ALLIED_POINTS.chongqing, kind: "air", resource: "labor", color: "#78d9ff", altitude: 0.29, weight: 1.55, startStep: 11, endStep: 22, networkImmune: true, projected: true },
  { from: ALLIED_POINTS.kunming, to: ALLIED_POINTS.chengdu, kind: "air", resource: "labor", color: "#9deaff", altitude: 0.31, weight: 1.45, startStep: 11, endStep: 22, networkImmune: true, projected: true },
);

// B-29對日戰略轟炸：先由成都基地群出發，1944年末轉向塞班與提尼安。
// 使用事件時間而非24段領土時間，確保首襲、轉場、燃燒彈空襲與原爆任務逐日出現。
AIR_ROUTES.push(
  { from: STRATEGIC_POINTS.chengduBaseGroup, to: STRATEGIC_POINTS.yawata, kind: "air", resource: "labor", color: "#d8efff", altitude: 0.64, weight: 2.9, startStep: EVENT_STEPS.chengduYawata, endStep: EVENT_STEPS.matterhornWithdrawn - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.chengduBaseGroup, to: STRATEGIC_POINTS.sasebo, kind: "air", resource: "labor", color: "#a9d5ff", altitude: 0.6, weight: 1.45, startStep: EVENT_STEPS.chengduYawata, endStep: EVENT_STEPS.matterhornWithdrawn - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true, projected: true },
  { from: STRATEGIC_POINTS.saipanIsley, to: STRATEGIC_POINTS.tokyo, kind: "air", resource: "labor", color: "#eef8ff", altitude: 0.62, weight: 4.6, startStep: EVENT_STEPS.saipanTokyo, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.saipanIsley, to: STRATEGIC_POINTS.nagoya, kind: "air", resource: "labor", color: "#b9ddff", altitude: 0.6, weight: 3.5, startStep: EVENT_STEPS.saipanTokyo, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.saipanIsley, to: STRATEGIC_POINTS.yawata, kind: "air", resource: "labor", color: "#a7d3ff", altitude: 0.58, weight: 2.7, startStep: EVENT_STEPS.saipanTokyo, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.tokyo, kind: "air", resource: "labor", color: "#f3fbff", altitude: 0.64, weight: 4.8, startStep: EVENT_STEPS.tokyoFirebombing, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.yokohama, kind: "air", resource: "labor", color: "#d8efff", altitude: 0.62, weight: 3.2, startStep: EVENT_STEPS.tokyoFirebombing, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.osaka, kind: "air", resource: "labor", color: "#c4e4ff", altitude: 0.6, weight: 3.8, startStep: EVENT_STEPS.tokyoFirebombing, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.kobe, kind: "air", resource: "labor", color: "#b6dcff", altitude: 0.58, weight: 3.25, startStep: EVENT_STEPS.tokyoFirebombing, endStep: EVENT_STEPS.surrenderBroadcast - 1, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.hiroshima, kind: "air", resource: "labor", color: "#fff1cb", altitude: 0.68, weight: 3.3, startStep: EVENT_STEPS.hiroshima, endStep: EVENT_STEPS.hiroshima, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
  { from: STRATEGIC_POINTS.tinianNorthField, to: STRATEGIC_POINTS.nagasaki, kind: "air", resource: "labor", color: "#ffe2ae", altitude: 0.68, weight: 3.3, startStep: EVENT_STEPS.nagasaki, endStep: EVENT_STEPS.nagasaki, timelineMode: "event", strategic: true, networkImmune: true, geodesic: true },
);

// Relative airlift throughput by timeline step. The curve follows the documented
// Hump buildup from a very small 1942 operation to its July 1945 peak, then ends
// with the surrender. It controls width, glow and the number of visible streams.
const ALLIED_AIR_VOLUME_BY_STEP = [
  0.18, 0.20, 0.22, 0.22, 0.24, 0.26, 0.28, 0.30, 0.32, 0.34, 0.36,
  0.08, 0.12, 0.16, 0.18, 0.32, 0.48, 0.66, 0.72, 0.78, 0.86, 0.94, 1.00, 0,
] as const;

const SHIPPING_LANE_ANCHORS: ShippingLane[] = [
  // 南方資源區—日本：石油、橡膠、錫、糧食等北運，按主要港口和海峽重構。
  { flow: "inbound", weight: 2.2, projected: true, path: [PORTS.palembang, [-3.5, 107.0], [-1.5, 107.0], [0.0, 106.0], [1.0, 104.8], PORTS.singapore, [7.2, 108.2], [14.5, 112.8], [20.4, 116.2], [23.6, 119.5], [25.7, 120.0], [27.2, 122.5], [28.8, 126.2], [31.0, 126.5], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 2.1, projected: true, path: [PORTS.balikpapan, [-1.7, 117.4], [-2.0, 119.0], [0.0, 121.0], [4.3, 125.5], [4.5, 127.0], [7.5, 128.0], [9.5, 127.8], [15.5, 129.0], [22.4, 126.5], [27.0, 126.0], [28.8, 126.2], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.kobe] },
  { flow: "inbound", weight: 1.8, projected: true, path: [PORTS.batavia, [-5.8, 105.4], [-4.5, 105.2], [-3.0, 105.5], [-1.0, 106.0], [0.0, 106.0], [1.0, 104.8], PORTS.singapore, [9.0, 109.5], [18.5, 116.0], [23.6, 119.5], [25.7, 120.0], [27.2, 122.5], [29.0, 126.4], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.osaka] },
  { flow: "inbound", weight: 1.55, projected: true, path: [PORTS.muara, [8.0, 112.0], [14.0, 113.0], [20.4, 116.2], [23.6, 119.5], [25.7, 120.0], [27.2, 122.5], [28.5, 126.0], [31.0, 126.5], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.5, projected: true, path: [PORTS.saigon, [10.0, 108.0], [11.5, 109.0], [14.0, 110.0], [16.0, 112.5], [21.5, 117.5], [23.6, 119.5], [25.7, 120.0], [27.2, 122.5], [29.0, 126.4], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.kobe] },
  { flow: "inbound", weight: 1.45, projected: true, path: [PORTS.manila, [14.2, 120.0], [15.0, 119.0], [16.5, 119.5], [18.6, 120.0], [22.1, 121.2], [27.0, 125.5], [28.8, 126.2], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.osaka] },
  { flow: "inbound", weight: 1.5, path: [PORTS.shanghai, [32.0, 124.3], [31.0, 126.5], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.25, path: [PORTS.qingdao, [34.6, 124.8], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.45, path: [[38.91, 121.61], [36.2, 123.6], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.2, path: [[35.18, 129.07], [34.5, 130.0], HUBS.moji] },
  { flow: "inbound", weight: 1.35, path: [PORTS.keelung, [25.5, 122.2], [26.8, 124.8], [29.2, 127.3], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.kobe] },
  // 美國陸軍航運圖與戰後調查可辨的南方港口、群島與日本本土走廊。
  { flow: "inbound", weight: 1.65, path: [PORTS.singapore, [1.2, 104.5], [5.0, 107.0], [8.0, 109.0], [10.0, 108.0], PORTS.saigon, [11.5, 109.0], [14.0, 110.0], [18.2, 111.4], PORTS.hongKong, [22.0, 115.0], [22.5, 118.0], [23.6, 119.5], [22.6, 119.9], PORTS.takao, [24.0, 119.5], [25.7, 120.0], [27.2, 122.5], [28.8, 126.2], [31.0, 126.5], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.45, path: [PORTS.singapore, [4.0, 109.5], [8.5, 114.5], [6.5, 118.0], [5.5, 119.0], [4.0, 120.5], [4.0, 123.0], [4.5, 126.5], [5.5, 126.5], [6.4, 126.0], PORTS.davao, [6.4, 126.0], [5.5, 126.5], [4.5, 126.5], [4.0, 123.0], [5.0, 122.0], [6.0, 118.0], [9.0, 116.5], [13.0, 117.5], [14.2, 120.0], PORTS.manila, [14.2, 120.0], [15.0, 119.0], [16.5, 119.5], [18.5, 120.0], [22.1, 121.2], [27.0, 125.5], [28.8, 126.2], [29.0, 129.0], [30.0, 131.5], [31.5, 133.0], [32.7, 134.2], [33.4, 134.7], [33.8, 135.1], [34.2, 135.0], HUBS.kobe] },
  { flow: "inbound", weight: 1.35, path: [PORTS.batavia, [-5.8, 105.4], [-4.5, 105.2], [-3.0, 105.5], [-1.0, 106.0], [0.0, 106.0], [1.0, 104.8], PORTS.singapore, [1.2, 104.5], [5.0, 107.0], [8.0, 109.0], [10.0, 108.0], PORTS.saigon] },
  { flow: "inbound", weight: 1.5, path: [PORTS.palembang, [-3.5, 107.0], [-1.5, 107.0], [0.0, 106.0], [1.0, 104.8], PORTS.singapore, [1.2, 104.5], [5.0, 107.0], [8.0, 109.0], [10.0, 108.0], PORTS.saigon, [11.5, 109.0], [14.0, 110.0], [18.2, 111.4], PORTS.hongKong, [22.0, 115.0], [22.5, 118.0], [23.6, 119.5], [25.7, 120.0], [27.2, 122.5], [28.8, 126.2], [31.0, 126.5], [33.0, 127.0], [34.0, 128.0], [34.0, 129.1], HUBS.moji] },
  { flow: "inbound", weight: 1.5, path: [PORTS.soerabaja, [-7.5, 113.5], [-7.5, 114.5], [-6.5, 115.0], [-5.5, 116.5], PORTS.makassar, [-4.0, 118.5], [-2.0, 117.5], PORTS.balikpapan, [-1.7, 117.4], [-2.0, 119.0], [0.0, 121.0], [4.2, 124.8], [6.4, 130.2], PORTS.palau, [12.0, 138.0], [20.0, 141.0], [30.5, 141.0], [34.5, 140.0], HUBS.tokyo] },
  { flow: "inbound", weight: 1.35, path: [PORTS.tarakan, [3.2, 118.2], [2.0, 120.0], [4.0, 123.0], [4.5, 126.5], [5.5, 126.5], [6.4, 126.0], PORTS.davao, [6.4, 126.0], [5.5, 126.5], [4.5, 126.5], [4.0, 123.0], [5.0, 122.0], [6.0, 118.0], [9.0, 116.5], [13.0, 117.5], [14.2, 120.0], PORTS.manila] },
  { flow: "inbound", weight: 1.25, path: [PORTS.ambon, [-4.5, 129.5], [-3.5, 131.5], [-1.0, 131.5], [2.5, 131.0], [5.2, 132.5], PORTS.palau, PORTS.saipan, [22.0, 141.0], [30.5, 141.0], [34.5, 140.0], HUBS.tokyo] },
  { flow: "inbound", weight: 1.3, path: [PORTS.rabaul, PORTS.truk, PORTS.saipan, HUBS.tokyo] },
  { flow: "inbound", weight: 1.15, path: [PORTS.lae, [-7.2, 148.0], [-7.5, 150.0], [-6.5, 152.5], [-5.0, 153.0], [-4.0, 152.8], PORTS.rabaul, PORTS.truk] },
  { flow: "inbound", weight: 1.25, path: [PORTS.palau, PORTS.saipan, PORTS.truk] },
  { flow: "inbound", weight: 1.2, path: [PORTS.kwajalein, PORTS.truk, PORTS.saipan, HUBS.tokyo] },
  { flow: "inbound", weight: 1.15, projected: true, path: [PORTS.rangoon, [12.0, 95.0], [9.0, 96.0], [6.0, 97.2], [5.0, 99.0], [4.0, 99.5], [3.0, 100.5], [2.5, 101.0], [2.0, 102.1], [1.5, 102.9], [1.1, 103.3], PORTS.singapore] },
  { flow: "inbound", weight: 1.05, projected: true, path: [PORTS.haikou, [20.3, 110.5], [20.3, 111.2], [20.2, 112.5], [21.2, 113.5], PORTS.hongKong, PORTS.takao] },
  { flow: "inbound", weight: 1.05, projected: true, path: [PORTS.tulagi, [-9.5, 161.0], [-8.0, 162.0], [-6.0, 160.0], [-4.8, 156.8], [-4.0, 155.0], [-4.0, 152.8], PORTS.rabaul, PORTS.truk] },
  // 南洋群島與南太平洋基地網絡。
  { flow: "inbound", weight: 1.25, path: [PORTS.rabaul, [0.0, 152.0], PORTS.truk, [12.0, 149.0], PORTS.saipan, [22.0, 141.0], [30.5, 141.0], [34.5, 140.0], HUBS.tokyo] },
  { flow: "inbound", weight: 1.1, projected: true, path: [PORTS.lae, [-7.2, 148.0], [-7.5, 150.0], [-6.5, 152.5], [-5.0, 153.0], [-4.0, 152.8], PORTS.rabaul, [1.0, 152.0], PORTS.truk] },
  // 日本工業品、殖民地商品與軍需向外輸出。
  { flow: "outbound", weight: 1.65, path: [HUBS.osaka, [34.2, 135.0], [33.8, 135.1], [33.4, 134.7], [32.7, 134.2], [31.5, 133.0], [30.0, 131.5], [29.0, 129.0], [28.8, 126.2], [32.0, 124.3], PORTS.shanghai] },
  { flow: "outbound", weight: 1.55, path: [HUBS.kobe, [34.2, 135.0], [33.8, 135.1], [33.4, 134.7], [32.7, 134.2], [31.5, 133.0], [30.0, 131.5], [29.0, 129.0], [29.0, 127.0], [26.0, 124.0], [25.5, 122.2], PORTS.keelung, [24.8, 122.2], [22.5, 122.0], [22.0, 121.0], [18.0, 120.0], [16.5, 119.5], [15.0, 119.0], [14.2, 120.0], PORTS.manila] },
  { flow: "outbound", weight: 1.7, projected: true, path: [HUBS.moji, [34.0, 129.1], [34.0, 128.0], [33.0, 127.0], [31.0, 126.5], [28.8, 126.2], [27.2, 122.5], [25.7, 120.0], [23.6, 119.5], [20.4, 116.2], [14.0, 112.8], [7.2, 108.2], PORTS.singapore] },
  { flow: "outbound", weight: 1.45, projected: true, path: [HUBS.tokyo, [34.5, 140.0], [30.5, 141.0], [22.0, 141.0], PORTS.saipan, [11.0, 148.5], PORTS.truk, [1.0, 152.0], PORTS.rabaul, [-4.0, 152.8], [-4.0, 155.0], [-4.8, 156.8], [-6.0, 160.0], [-8.0, 162.0], [-9.5, 161.0], PORTS.tulagi] },
  { flow: "outbound", weight: 1.3, projected: true, path: [HUBS.moji, [33.0, 131.8], [31.5, 132.2], [28.0, 134.0], [18.0, 136.0], PORTS.palau, [2.0, 140.0], [0.0, 145.0], [-3.0, 150.0], [-6.5, 152.5], [-7.5, 150.0], [-7.2, 148.0], PORTS.lae] },
  { flow: "outbound", weight: 1.2, path: [HUBS.moji, [34.2, 130.6], [34.4, 130.2], PORTS.busan] },
  { flow: "outbound", weight: 1.45, path: [HUBS.moji, [34.0, 129.1], [34.0, 128.0], [33.0, 127.0], [31.0, 126.5], [28.8, 126.2], [25.7, 120.0], [24.0, 119.5], PORTS.takao, [22.6, 119.9], [23.6, 119.5], [22.5, 118.0], [22.0, 115.0], PORTS.hongKong, [19.0, 111.5], [16.0, 109.0], [14.0, 110.0], [11.5, 109.0], [10.0, 108.0], PORTS.saigon, [8.0, 109.0], [5.0, 107.0], [1.2, 104.5], PORTS.singapore] },
  { flow: "outbound", weight: 1.25, path: [HUBS.tokyo, [34.5, 140.0], [30.5, 141.0], [22.0, 141.0], PORTS.saipan, PORTS.truk, PORTS.palau, [6.4, 130.2], [5.5, 126.5], [6.4, 126.0], PORTS.davao] },
];

const SHIPPING_LANES = generatedShippingLanes as unknown as ShippingLane[];
// Kept as a documented hand-curated fallback/reference set; production uses
// the generated, coastline-safe route data above.
void SHIPPING_LANE_ANCHORS;

const SEA_ROUTES: Route[] = SHIPPING_LANES.flatMap((lane) => lane.path.slice(0, -1).map((from, index) => ({
  from,
  to: lane.path[index + 1],
  previous: lane.path[Math.max(0, index - 1)],
  next: lane.path[Math.min(lane.path.length - 1, index + 2)],
  smooth: lane.smooth?.[index] ?? true,
  kind: "sea" as const,
  resource: "labor" as const,
  color: lane.flow === "inbound" ? "#123f78" : "#78d9f1",
  projected: lane.projected,
  weight: lane.weight,
})));

type AlliedPath = {
  path: Array<[number, number]>;
  startStep: number;
  endStep: number;
  color?: string;
  weight?: number;
  projected?: boolean;
  geodesic?: boolean;
  curveStrength?: number;
};

const ALLIED_SURFACE_PATHS: AlliedPath[] = [
  // 1941年末：美援先海運至仰光，再由鐵路到臘戍、卡車走滇緬公路至昆明。
  { startStep: 0, endStep: 12, color: "#327fb8", weight: 1.65, curveStrength: 0.36, path: [ALLIED_POINTS.newYork, [25, -60], [5, -35], [-18, -25], [-32, -8], [-35.5, 12], [-36.8, 20], [-34, 30], [-29, 43], [-25, 51], [-17, 55], [-10, 61], [-2, 75], [8, 89], PORTS.rangoon] },
  { startStep: 0, endStep: 12, color: "#38b8f2", weight: 1.8, curveStrength: 0.18, path: [PORTS.rangoon, AIRFIELD_POINTS.pegu, AIRFIELD_POINTS.mandalay, AIRFIELD_POINTS.lashio, ALLIED_POINTS.wanting, ALLIED_POINTS.baoshan, ALLIED_POINTS.dali, ALLIED_POINTS.kunming] },
  // 1942年5月後：貨物進入卡拉奇及加爾各答，再經印度鐵路與公路送至阿薩姆空運基地。
  { startStep: 13, endStep: 22, color: "#327fb8", weight: 1.75, curveStrength: 0.36, path: [ALLIED_POINTS.newYork, [25, -60], [5, -35], [-18, -25], [-32, -8], [-35.5, 12], [-36.8, 20], [-34, 30], [-29, 43], [-25, 51], [-17, 55], [-10, 61], [8, 67], ALLIED_POINTS.karachi] },
  { startStep: 13, endStep: 22, color: "#459bc9", weight: 1.65, curveStrength: 0.36, path: [[-34.3, 18], [-36.8, 21], [-34.5, 31], [-29, 43], [-25, 51], [-17, 55], [-10, 61], [-2, 75], [8, 86], ALLIED_POINTS.calcutta] },
  { startStep: 13, endStep: 22, color: "#58cef5", weight: 1.5, curveStrength: 0.18, path: [ALLIED_POINTS.karachi, ALLIED_POINTS.delhi, ALLIED_POINTS.calcutta, ALLIED_POINTS.guwahati, ALLIED_POINTS.dinjan, ALLIED_POINTS.ledo] },
  // 1945年初中印公路接通；首支車隊2月4日抵達昆明。
  { startStep: 20, endStep: 22, color: "#7de2ff", weight: 1.9, curveStrength: 0.18, path: [ALLIED_POINTS.ledo, AIRFIELD_POINTS.myitkyina, ALLIED_POINTS.bhamo, ALLIED_POINTS.muse, ALLIED_POINTS.wanting, ALLIED_POINTS.baoshan, ALLIED_POINTS.dali, ALLIED_POINTS.kunming] },
  // 援助抵昆後向中國後方與前線的分發走廊示意，不作逐車道路解讀。
  { startStep: 0, endStep: 22, color: "#268fd4", weight: 1.15, projected: true, curveStrength: 0.16, path: [ALLIED_POINTS.kunming, ALLIED_POINTS.guiyang, ALLIED_POINTS.chongqing, ALLIED_POINTS.chengdu] },
  { startStep: 0, endStep: 22, color: "#268fd4", weight: 1.0, projected: true, curveStrength: 0.16, path: [ALLIED_POINTS.chongqing, ALLIED_POINTS.xian] },
];

SEA_ROUTES.push(...ALLIED_SURFACE_PATHS.flatMap((lane) => lane.path.slice(0, -1).map((from, index) => ({
  from,
  to: lane.path[index + 1],
  previous: lane.path[Math.max(0, index - 1)],
  next: lane.path[Math.min(lane.path.length - 1, index + 2)],
  smooth: true,
  kind: "sea" as const,
  resource: "labor" as const,
  color: lane.color ?? "#58cef5",
  projected: lane.projected,
  weight: lane.weight,
  startStep: lane.startStep,
  endStep: lane.endStep,
  networkImmune: true,
  geodesic: lane.geodesic,
  curveStrength: lane.curveStrength,
}))));

function latLon(lat: number, lon: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(-lon);
  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta) * radius,
    Math.sin(phi) * radius,
    Math.cos(phi) * Math.sin(theta) * radius,
  );
}

function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 0.0001) return a.clone();
  const sin = Math.sin(omega);
  return a.clone().multiplyScalar(Math.sin((1 - t) * omega) / sin)
    .add(b.clone().multiplyScalar(Math.sin(t * omega) / sin));
}

function buildEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#b9c7ad");
  gradient.addColorStop(0.5, "#92aa97");
  gradient.addColorStop(1, "#c7b996");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 0.11;
  for (let i = 0; i < 19000; i++) {
    const shade = 70 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 16})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2.5, Math.random() * 2.5);
  }
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#234d50";
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 15) {
    const y = (90 - lat) / 180 * canvas.height;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function createEarthMaterial(earthTexture: THREE.Texture, sunDirection: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: earthTexture },
      uSunDirection: { value: sunDirection.clone().normalize() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uSunDirection;
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        float solar = dot(normalize(vWorldNormal), normalize(uSunDirection));
        float daylight = smoothstep(-0.08, 0.1, solar);
        float twilight = smoothstep(-0.3, -0.035, solar) * (1.0 - smoothstep(-0.035, 0.14, solar));
        vec3 atlas = texture2D(uMap, vUv).rgb;
        vec3 night = atlas * vec3(0.014, 0.026, 0.045);
        vec3 day = atlas * vec3(1.03, 0.985, 0.88) * (0.88 + max(solar, 0.0) * 0.2);
        vec3 color = mix(night, day, daylight);
        color += vec3(0.2, 0.075, 0.022) * twilight;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function createDayNightOverlay(sunDirection: THREE.Vector3) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSunDirection: { value: sunDirection.clone().normalize() },
    },
    vertexShader: `
      varying vec3 vWorldNormal;

      void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDirection;
      varying vec3 vWorldNormal;

      void main() {
        float solar = dot(normalize(vWorldNormal), normalize(uSunDirection));
        float nightSide = 1.0 - smoothstep(-0.18, 0.08, solar);
        float deepNight = 1.0 - smoothstep(-0.72, -0.1, solar);
        float alpha = nightSide * (0.26 + deepNight * 0.48);
        gl_FragColor = vec4(0.008, 0.022, 0.052, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.0138, 160, 120), material);
  mesh.name = "dayNightTerminator";
  mesh.renderOrder = 3.5;
  return mesh;
}

type WartimeLightCenter = {
  point: [number, number];
  intensity: number;
  spread?: number;
};

// 稀疏的1942年城市與港口電氣化意象；強度刻意受燈火管制、空襲與戰時條件壓低。
// 這不是現代衛星夜光資料，也不主張逐像素還原史實。
const WARTIME_LIGHT_CENTERS: WartimeLightCenter[] = [
  { point: [35.68, 139.76], intensity: 0.34, spread: 0.5 }, // 東京
  { point: [34.69, 135.5], intensity: 0.34, spread: 0.42 }, // 大阪
  { point: [34.69, 135.19], intensity: 0.28 }, // 神戶
  { point: [33.95, 130.95], intensity: 0.24 }, // 門司
  { point: [37.57, 126.98], intensity: 0.23 }, // 京城
  { point: [35.18, 129.08], intensity: 0.22 }, // 釜山
  { point: [25.04, 121.51], intensity: 0.23 }, // 臺北
  { point: [22.63, 120.3], intensity: 0.2 }, // 高雄
  { point: [39.9, 116.4], intensity: 0.18 }, // 北京
  { point: [39.13, 117.2], intensity: 0.19 }, // 天津
  { point: [36.07, 120.38], intensity: 0.18 }, // 青島
  { point: [31.23, 121.47], intensity: 0.24, spread: 0.38 }, // 上海
  { point: [30.59, 114.3], intensity: 0.16 }, // 武漢
  { point: [32.06, 118.79], intensity: 0.16 }, // 南京
  { point: [23.13, 113.26], intensity: 0.15 }, // 廣州
  { point: [22.29, 114.17], intensity: 0.16 }, // 香港
  { point: [29.56, 106.55], intensity: 0.1 }, // 重慶
  { point: [25.04, 102.72], intensity: 0.1 }, // 昆明
  { point: [30.67, 104.07], intensity: 0.11 }, // 成都
  { point: [34.34, 108.94], intensity: 0.1 }, // 西安
  { point: [14.6, 120.98], intensity: 0.15 }, // 馬尼拉
  { point: [1.29, 103.85], intensity: 0.16 }, // 昭南
  { point: [10.78, 106.7], intensity: 0.16 }, // 西貢
  { point: [16.84, 96.17], intensity: 0.1 }, // 仰光
  { point: [22.0, 96.08], intensity: 0.08 }, // 曼德勒
  { point: [22.57, 88.36], intensity: 0.12 }, // 加爾各答（空襲風險）
  { point: [19.08, 72.88], intensity: 0.22 }, // 孟買
  { point: [24.86, 67.01], intensity: 0.2 }, // 卡拉奇
  { point: [28.61, 77.21], intensity: 0.16 }, // 德里
  { point: [-6.21, 106.85], intensity: 0.17 }, // 巴達維亞
  { point: [-7.25, 112.75], intensity: 0.15 }, // 泗水
  { point: [-2.99, 104.76], intensity: 0.12 }, // 巨港
  { point: [-4.2, 152.18], intensity: 0.07 }, // 拉包爾
  { point: [-12.46, 130.84], intensity: 0.1 }, // 達爾文
  { point: [21.31, -157.86], intensity: 0.12 }, // 檀香山（燈火管制）
  { point: [40.71, -74.01], intensity: 0.3, spread: 0.5 }, // 紐約
  { point: [-33.92, 18.42], intensity: 0.2 }, // 開普敦
];

function createWartimeLightsLayer(sunDirection: THREE.Vector3) {
  const samplesPerCenter = 5;
  const positions = new Float32Array(WARTIME_LIGHT_CENTERS.length * samplesPerCenter * 3);
  const colors = new Float32Array(WARTIME_LIGHT_CENTERS.length * samplesPerCenter * 3);
  const intensities = new Float32Array(WARTIME_LIGHT_CENTERS.length * samplesPerCenter);
  const sizes = new Float32Array(WARTIME_LIGHT_CENTERS.length * samplesPerCenter);
  const warmPalette = [new THREE.Color("#ffd58a"), new THREE.Color("#f2a54b"), new THREE.Color("#ffe5ad")];

  WARTIME_LIGHT_CENTERS.forEach((center, centerIndex) => {
    for (let sample = 0; sample < samplesPerCenter; sample++) {
      const index = centerIndex * samplesPerCenter + sample;
      const seed = centerIndex * 53 + sample * 19 + 7;
      const spread = center.spread ?? 0.26;
      const angle = random01(seed) * Math.PI * 2;
      const radius = sample === 0 ? 0 : Math.sqrt(random01(seed + 3)) * spread;
      const lat = center.point[0] + Math.sin(angle) * radius;
      const longitudeScale = Math.max(0.34, Math.cos(THREE.MathUtils.degToRad(center.point[0])));
      const lon = center.point[1] + Math.cos(angle) * radius / longitudeScale;
      positions.set(latLon(lat, lon, 1.0155).toArray(), index * 3);
      colors.set(warmPalette[Math.floor(random01(seed + 11) * warmPalette.length)].toArray(), index * 3);
      intensities[index] = center.intensity * (sample === 0 ? 1 : 0.38 + random01(seed + 17) * 0.28);
      sizes[index] = sample === 0 ? 5.6 : 2.8 + random01(seed + 23) * 1.9;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aLightColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aIntensity", new THREE.BufferAttribute(intensities, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.03);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSunDirection: { value: sunDirection.clone().normalize() },
    },
    vertexShader: `
      attribute vec3 aLightColor;
      attribute float aIntensity;
      attribute float aSize;
      uniform vec3 uSunDirection;
      varying vec3 vLightColor;
      varying float vLightAlpha;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 globeCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 worldNormal = normalize(worldPosition.xyz - globeCenter);
        float solar = dot(worldNormal, normalize(uSunDirection));
        float night = 1.0 - smoothstep(-0.1, 0.16, solar);
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * clamp(3.0 / max(1.0, -mvPosition.z), 0.8, 1.8);
        vLightColor = aLightColor;
        vLightAlpha = aIntensity * night;
      }
    `,
    fragmentShader: `
      varying vec3 vLightColor;
      varying float vLightAlpha;

      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float core = smoothstep(0.5, 0.02, distanceToCenter);
        float halo = smoothstep(0.5, 0.16, distanceToCenter) * 0.42;
        float alpha = (core + halo) * vLightAlpha;
        if (alpha < 0.006) discard;
        gl_FragColor = vec4(vLightColor * (1.0 + core * 0.38), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "wartimeLights1942";
  points.frustumCulled = false;
  points.renderOrder = 4;
  return points;
}

function createMapLabel(item: MapLabel) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 96;
  const context = canvas.getContext("2d")!;
  context.font = "700 34px 'Kaiti TC', 'DFKai-SB', 'KaiTi', 'STKaiti', serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 7;
  context.strokeStyle = "rgba(4, 15, 14, .92)";
  context.strokeText(item.label, 320, 48);
  context.fillStyle = STATUS_COLORS[item.status];
  context.fillText(item.label, 320, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(material);
  const width = item.size ?? 0.22;
  sprite.scale.set(width, width * 0.15, 1);
  sprite.position.copy(latLon(item.point[0], item.point[1], 1.045));
  sprite.renderOrder = 7;
  sprite.userData.labelTexture = texture;
  sprite.userData.startStep = item.startStep ?? 0;
  sprite.userData.endStep = item.endStep ?? 99;
  sprite.userData.timelineMode = item.timelineMode ?? "legacy";
  sprite.userData.citySlug = item.citySlug;
  return sprite;
}

function createCityHitTarget(item: MapLabel) {
  if (!item.citySlug) return null;
  const material = new THREE.SpriteMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const width = item.size ?? 0.22;
  sprite.scale.set(width * 1.8, width * 1.8, 1);
  sprite.position.copy(latLon(item.point[0], item.point[1], 1.04));
  sprite.renderOrder = 8;
  sprite.userData.citySlug = item.citySlug;
  sprite.userData.cityHitTarget = true;
  sprite.userData.startStep = item.startStep ?? 0;
  sprite.userData.endStep = item.endStep ?? 99;
  sprite.userData.timelineMode = item.timelineMode ?? "legacy";
  return sprite;
}

const NON_CITY_LABELS = new Set([
  "中華民國", "滿洲國 · 傀儡政權", "朝鮮 · 日本殖民地", "臺灣 · 日本殖民地", "日本",
  "菲律賓自治邦", "法屬印度支那", "泰國", "英屬馬來亞", "荷屬東印度", "英屬緬甸", "英屬印度",
  "帛琉 · 南洋廳", "雅浦 · 南洋廳", "特魯克 · 南洋廳", "波納佩 · 南洋廳", "塞班 · 南洋廳",
  "關島 · 美國領地", "馬紹爾群島 · 南洋廳", "新幾內亞島 · 地理整體", "英屬索羅門群島", "海南島",
]);

type PulseRingLayer = {
  mesh: THREE.InstancedMesh<THREE.RingGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
};

function createPulseRingLayer(items: MapLabel[]): PulseRingLayer {
  const markers = items.filter((item) => !NON_CITY_LABELS.has(item.label));
  const geometry = new THREE.RingGeometry(0.0048, 0.0094, 24);
  const colors = new Float32Array(markers.length * 3);
  const phases = new Float32Array(markers.length);
  const scales = new Float32Array(markers.length);
  const timelineStarts = new Float32Array(markers.length);
  const timelineEnds = new Float32Array(markers.length);
  const timelineModes = new Float32Array(markers.length);

  markers.forEach((item, index) => {
    colors.set(new THREE.Color(STATUS_COLORS[item.status]).toArray(), index * 3);
    phases[index] = random01(index * 41 + 17);
    scales[index] = item.status === "resistance" ? 1.72 : item.status === "allied" ? 1.28 : 1;
    timelineStarts[index] = item.startStep ?? 0;
    timelineEnds[index] = item.endStep ?? 99;
    timelineModes[index] = item.timelineMode === "event" ? 1 : 0;
  });
  geometry.setAttribute("aRingColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("aPulsePhase", new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute("aMarkerScale", new THREE.InstancedBufferAttribute(scales, 1));
  geometry.setAttribute("aTimelineStart", new THREE.InstancedBufferAttribute(timelineStarts, 1));
  geometry.setAttribute("aTimelineEnd", new THREE.InstancedBufferAttribute(timelineEnds, 1));
  geometry.setAttribute("aTimelineMode", new THREE.InstancedBufferAttribute(timelineModes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTimelineStep: { value: 0 },
      uLegacyTimelineStep: { value: 0 },
    },
    vertexShader: `
      attribute vec3 aRingColor;
      attribute float aPulsePhase;
      attribute float aMarkerScale;
      attribute float aTimelineStart;
      attribute float aTimelineEnd;
      attribute float aTimelineMode;
      uniform float uTime;
      uniform float uTimelineStep;
      uniform float uLegacyTimelineStep;
      varying vec3 vRingColor;
      varying float vRingAlpha;

      void main() {
        float pulse = fract(uTime * 0.17 + aPulsePhase);
        float timelineValue = mix(uLegacyTimelineStep, uTimelineStep, aTimelineMode);
        float visible = step(aTimelineStart, timelineValue + 0.1) * step(timelineValue - 0.1, aTimelineEnd);
        vec3 localPosition = position;
        localPosition.xy *= aMarkerScale * (0.9 + pulse * 0.42);
        vec4 instancePosition = vec4(localPosition, 1.0);
        #ifdef USE_INSTANCING
          instancePosition = instanceMatrix * instancePosition;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
        vRingColor = aRingColor;
        vRingAlpha = visible * (0.18 + (1.0 - pulse) * 0.68);
      }
    `,
    fragmentShader: `
      varying vec3 vRingColor;
      varying float vRingAlpha;
      void main() {
        gl_FragColor = vec4(vRingColor * 1.16, vRingAlpha);
      }
    `,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, markers.length);
  const transform = new THREE.Object3D();
  markers.forEach((item, index) => {
    const point = latLon(item.point[0], item.point[1], 1.017);
    transform.position.copy(point);
    transform.lookAt(point.clone().multiplyScalar(2));
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = "dynamicCityPulseRings";
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return { mesh, material };
}

type AtomicImpactLayer = {
  group: THREE.Group;
  setTimeline(step: number): void;
  update(delta: number): void;
};

const ATOMIC_IMPACTS = [
  { point: STRATEGIC_POINTS.hiroshima, step: EVENT_STEPS.hiroshima },
  { point: STRATEGIC_POINTS.nagasaki, step: EVENT_STEPS.nagasaki },
] as const;

const ATOMIC_RADIUS_SCALE = 0.25;
const ATOMIC_TIME_SCALE = 4 / 3;

const ATOMIC_ENVELOPE_GLSL = `
  float eventEnvelope(float impactStep) {
    float deltaStep = uEventStep - impactStep;
    float current = 1.0 - step(0.25, abs(deltaStep));
    float nextMoment = step(0.5, deltaStep) * (1.0 - step(1.5, deltaStep));
    float rise = smoothstep(0.0, ${(.52 * ATOMIC_TIME_SCALE).toFixed(3)}, uElapsed);
    float decay = 1.0 - smoothstep(${(2 * ATOMIC_TIME_SCALE).toFixed(3)}, ${(5 * ATOMIC_TIME_SCALE).toFixed(3)}, uElapsed);
    float afterglow = nextMoment * 0.13 * (1.0 - smoothstep(${(.8 * ATOMIC_TIME_SCALE).toFixed(3)}, ${(3.2 * ATOMIC_TIME_SCALE).toFixed(3)}, uElapsed));
    return current * rise * decay + afterglow;
  }
`;

function createAtomicImpactLayer(): AtomicImpactLayer {
  const group = new THREE.Group();
  group.name = "atomicImpactMemorialLayer";
  const sharedUniforms = {
    uEventStep: { value: 0 },
    uElapsed: { value: 0 },
  };

  const haloGeometry = new THREE.PlaneGeometry(1, 1);
  haloGeometry.setAttribute("aImpactStep", new THREE.InstancedBufferAttribute(
    new Float32Array(ATOMIC_IMPACTS.map((impact) => impact.step)), 1,
  ));
  const haloMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: sharedUniforms,
    vertexShader: `
      attribute float aImpactStep;
      uniform float uEventStep;
      uniform float uElapsed;
      varying vec2 vUv;
      varying float vEnvelope;
      varying float vProgress;
      ${ATOMIC_ENVELOPE_GLSL}
      void main() {
        float after = step(0.5, uEventStep - aImpactStep);
        vEnvelope = eventEnvelope(aImpactStep);
        vProgress = mix(clamp(uElapsed / ${(2.6 * ATOMIC_TIME_SCALE).toFixed(3)}, 0.0, 1.0), 1.0, after);
        float scale = mix(${(.025 * ATOMIC_RADIUS_SCALE).toFixed(4)}, ${(.54 * ATOMIC_RADIUS_SCALE).toFixed(3)}, smoothstep(0.0, 0.92, vProgress));
        vec3 localPosition = position;
        localPosition.xy *= scale;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(localPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vEnvelope;
      varying float vProgress;
      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float distanceToCenter = length(centered);
        float core = smoothstep(0.28, 0.0, distanceToCenter);
        float halo = smoothstep(1.0, 0.08, distanceToCenter) * 0.46;
        float ringRadius = 0.16 + vProgress * 0.68;
        float shockRing = smoothstep(0.075, 0.0, abs(distanceToCenter - ringRadius));
        float alpha = (core * 1.25 + halo + shockRing * 0.88) * vEnvelope;
        if (alpha < 0.006) discard;
        vec3 color = mix(vec3(1.0, 0.48, 0.16), vec3(1.0, 0.97, 0.82), core + shockRing * 0.46);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const haloMesh = new THREE.InstancedMesh(haloGeometry, haloMaterial, ATOMIC_IMPACTS.length);
  const transform = new THREE.Object3D();
  ATOMIC_IMPACTS.forEach((impact, index) => {
    const point = latLon(impact.point[0], impact.point[1], 1.026);
    transform.position.copy(point);
    transform.lookAt(point.clone().multiplyScalar(2));
    transform.updateMatrix();
    haloMesh.setMatrixAt(index, transform.matrix);
  });
  haloMesh.instanceMatrix.needsUpdate = true;
  haloMesh.frustumCulled = false;
  haloMesh.renderOrder = 10;
  haloMesh.name = "atomicFlashAndShockwave";
  group.add(haloMesh);

  const particleCount = 36;
  const totalParticles = particleCount * ATOMIC_IMPACTS.length;
  const particlePositions = new Float32Array(totalParticles * 3);
  const particleRadials = new Float32Array(totalParticles * 3);
  const particleDrifts = new Float32Array(totalParticles * 3);
  const particleSteps = new Float32Array(totalParticles);
  const particleSeeds = new Float32Array(totalParticles);
  const particleLayers = new Float32Array(totalParticles);
  ATOMIC_IMPACTS.forEach((impact, impactIndex) => {
    const radial = latLon(impact.point[0], impact.point[1], 1).normalize();
    const base = radial.clone().multiplyScalar(1.027);
    const reference = Math.abs(radial.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const tangentA = new THREE.Vector3().crossVectors(radial, reference).normalize();
    const tangentB = new THREE.Vector3().crossVectors(radial, tangentA).normalize();
    for (let particle = 0; particle < particleCount; particle++) {
      const index = impactIndex * particleCount + particle;
      const seed = random01(impactIndex * 701 + particle * 31 + 17);
      const layer = particle / (particleCount - 1);
      const angle = seed * Math.PI * 2;
      const spread = ATOMIC_RADIUS_SCALE * (0.025 + random01(index + 81) * (0.035 + layer * 0.055));
      const drift = tangentA.clone().multiplyScalar(Math.cos(angle) * spread)
        .addScaledVector(tangentB, Math.sin(angle) * spread);
      particlePositions.set(base.toArray(), index * 3);
      particleRadials.set(radial.toArray(), index * 3);
      particleDrifts.set(drift.toArray(), index * 3);
      particleSteps[index] = impact.step;
      particleSeeds[index] = seed;
      particleLayers[index] = layer;
    }
  });
  const plumeGeometry = new THREE.BufferGeometry();
  plumeGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  plumeGeometry.setAttribute("aRadial", new THREE.BufferAttribute(particleRadials, 3));
  plumeGeometry.setAttribute("aDrift", new THREE.BufferAttribute(particleDrifts, 3));
  plumeGeometry.setAttribute("aImpactStep", new THREE.BufferAttribute(particleSteps, 1));
  plumeGeometry.setAttribute("aSeed", new THREE.BufferAttribute(particleSeeds, 1));
  plumeGeometry.setAttribute("aLayer", new THREE.BufferAttribute(particleLayers, 1));
  const plumeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: sharedUniforms,
    vertexShader: `
      attribute vec3 aRadial;
      attribute vec3 aDrift;
      attribute float aImpactStep;
      attribute float aSeed;
      attribute float aLayer;
      uniform float uEventStep;
      uniform float uElapsed;
      varying float vEnvelope;
      varying float vLayer;
      varying float vSeed;
      ${ATOMIC_ENVELOPE_GLSL}
      void main() {
        float after = step(0.5, uEventStep - aImpactStep);
        float progress = mix(clamp(uElapsed / ${(3.8 * ATOMIC_TIME_SCALE).toFixed(3)}, 0.0, 1.0), 1.0, after);
        vEnvelope = eventEnvelope(aImpactStep);
        vLayer = aLayer;
        vSeed = aSeed;
        float rise = progress * (0.028 + aLayer * 0.24);
        float crown = smoothstep(0.52, 1.0, aLayer) * smoothstep(0.18, 0.9, progress);
        vec3 animatedPosition = position + aRadial * rise + aDrift * progress * (0.28 + crown * 1.5);
        vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
        gl_PointSize = vEnvelope * (0.048 + crown * 0.11 + (1.0 - aLayer) * 0.035) * ${ATOMIC_RADIUS_SCALE.toFixed(1)} * (480.0 / max(0.8, -viewPosition.z));
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying float vEnvelope;
      varying float vLayer;
      varying float vSeed;
      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        float puff = smoothstep(0.5, 0.12 + vSeed * 0.08, distanceToCenter);
        float alpha = puff * vEnvelope * (0.42 + (1.0 - vLayer) * 0.42);
        if (alpha < 0.008) discard;
        vec3 hot = vec3(1.0, 0.63, 0.25);
        vec3 ash = vec3(0.62, 0.59, 0.52);
        gl_FragColor = vec4(mix(hot, ash, smoothstep(0.15, 0.9, vLayer)), alpha);
      }
    `,
  });
  const plume = new THREE.Points(plumeGeometry, plumeMaterial);
  plume.frustumCulled = false;
  plume.renderOrder = 11;
  plume.name = "atomicRisingClouds";
  group.add(plume);

  const hiroshimaDirection = latLon(STRATEGIC_POINTS.hiroshima[0], STRATEGIC_POINTS.hiroshima[1], 1).normalize();
  const nagasakiDirection = latLon(STRATEGIC_POINTS.nagasaki[0], STRATEGIC_POINTS.nagasaki[1], 1).normalize();
  const skyMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      ...sharedUniforms,
      uHiroshimaDirection: { value: hiroshimaDirection },
      uNagasakiDirection: { value: nagasakiDirection },
      uHiroshimaStep: { value: EVENT_STEPS.hiroshima },
      uNagasakiStep: { value: EVENT_STEPS.nagasaki },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uEventStep;
      uniform float uElapsed;
      uniform float uHiroshimaStep;
      uniform float uNagasakiStep;
      uniform vec3 uHiroshimaDirection;
      uniform vec3 uNagasakiDirection;
      varying vec3 vDirection;
      ${ATOMIC_ENVELOPE_GLSL}
      void main() {
        float hiroshimaGlow = pow(max(dot(vDirection, uHiroshimaDirection), 0.0), 72.0) * eventEnvelope(uHiroshimaStep);
        float nagasakiGlow = pow(max(dot(vDirection, uNagasakiDirection), 0.0), 72.0) * eventEnvelope(uNagasakiStep);
        float intensity = hiroshimaGlow + nagasakiGlow;
        if (intensity < 0.004) discard;
        vec3 color = mix(vec3(1.0, 0.47, 0.17), vec3(1.0, 0.96, 0.78), smoothstep(0.0, 0.75, intensity));
        gl_FragColor = vec4(color, intensity * 0.58);
      }
    `,
  });
  const skyGlow = new THREE.Mesh(new THREE.SphereGeometry(1.095, 72, 54), skyMaterial);
  skyGlow.frustumCulled = false;
  skyGlow.renderOrder = 9;
  skyGlow.name = "atomicSkyIllumination";
  group.add(skyGlow);

  return {
    group,
    setTimeline(step) {
      sharedUniforms.uEventStep.value = step;
      sharedUniforms.uElapsed.value = 0;
    },
    update(delta) {
      sharedUniforms.uElapsed.value += delta;
    },
  };
}

type ArcLayer = {
  mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
};

function random01(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createArcLayer(kind: "sea" | "air"): ArcLayer {
  const segments = kind === "sea" ? 72 : 52;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = new Uint16Array(segments * 6);

  for (let segment = 0; segment <= segments; segment++) {
    const t = segment / segments;
    for (let side = 0; side < 2; side++) {
      const vertex = segment * 2 + side;
      positions[vertex * 3] = side === 0 ? -1 : 1;
      positions[vertex * 3 + 1] = t;
      uvs[vertex * 2] = side;
      uvs[vertex * 2 + 1] = t;
    }
    if (segment < segments) {
      const base = segment * 2;
      indices.set([base, base + 1, base + 2, base + 1, base + 3, base + 2], segment * 6);
    }
  }

  const routeSet = kind === "sea" ? SEA_ROUTES : AIR_ROUTES;
  const instances = routeSet.flatMap((route, routeIndex) => {
    const multiplier = kind === "air" ? 11 : 11;
    const count = Math.max(4, Math.round((route.weight ?? 1) * multiplier));
    return Array.from({ length: count }, (_, copy) => ({ route, routeIndex, copy, count }));
  });

  const starts = new Float32Array(instances.length * 3);
  const controls1 = new Float32Array(instances.length * 3);
  const controls2 = new Float32Array(instances.length * 3);
  const ends = new Float32Array(instances.length * 3);
  const colors = new Float32Array(instances.length * 3);
  const phases = new Float32Array(instances.length);
  const speeds = new Float32Array(instances.length);
  const opacities = new Float32Array(instances.length);
  const projected = new Float32Array(instances.length);
  const ranks = new Float32Array(instances.length);
  const seeds = new Float32Array(instances.length);
  const timelineStarts = new Float32Array(instances.length);
  const timelineEnds = new Float32Array(instances.length);

  instances.forEach(({ route, routeIndex, copy, count }, index) => {
    const seed = 101 + routeIndex * 97 + copy * 17 + (kind === "air" ? 7 : 0);
    const surfaceRadius = kind === "air" ? 1.014 : 1.0125;
    const start = latLon(route.from[0], route.from[1], surfaceRadius);
    const end = latLon(route.to[0], route.to[1], surfaceRadius);
    const angle = Math.acos(THREE.MathUtils.clamp(start.clone().normalize().dot(end.clone().normalize()), -1, 1));
    const planeNormal = new THREE.Vector3().crossVectors(start, end).normalize();
    const height = ((kind === "air" ? 0.15 : 0.0018)
      + angle * (kind === "air" ? 0.19 : 0.003)
      + (random01(seed) - 0.5) * (kind === "air" ? 0.045 : 0.0008))
      * (kind === "air" ? route.altitude ?? 1 : 1);
    const lateral = (random01(seed + 3) - 0.5) * (kind === "air" ? 0.075 : 0);
    let c1: THREE.Vector3;
    let c2: THREE.Vector3;
    if (kind === "sea" && route.smooth !== false && !route.geodesic) {
      // 航圖式連續圓弧：相鄰海上避陸航點共同決定端點切線，
      // 讓整條藍線像參考圖的港口扇形弧，而不是逐段折線。
      const previous = route.previous ?? route.from;
      const next = route.next ?? route.to;
      // Catmull-Rom式切線手柄形成明顯而連續的貼海大弧；盟軍跨洋線
      // 使用專屬強弧度與遠海避陸點，陸路段則保留較短手柄。
      const tension = route.curveStrength ?? (route.networkImmune ? 0.24 : 0.28);
      const previousPoint = latLon(previous[0], previous[1], surfaceRadius);
      const nextPoint = latLon(next[0], next[1], surfaceRadius);
      c1 = start.clone().add(end.clone().sub(previousPoint).multiplyScalar(tension));
      c2 = end.clone().sub(nextPoint.clone().sub(start).multiplyScalar(tension));
    } else {
      c1 = slerp(start.clone().normalize(), end.clone().normalize(), 0.34)
        .normalize().multiplyScalar(surfaceRadius + height * 0.84)
        .addScaledVector(planeNormal, lateral);
      c2 = slerp(start.clone().normalize(), end.clone().normalize(), 0.68)
        .normalize().multiplyScalar(surfaceRadius + height * 0.9)
        .addScaledVector(planeNormal, lateral * 0.82);
    }
    const color = route.color
      ? new THREE.Color(route.color)
      : kind === "air" ? new THREE.Color("#b63e32") : RESOURCE_COLORS[route.resource];

    starts.set(start.toArray(), index * 3);
    controls1.set(c1.toArray(), index * 3);
    controls2.set(c2.toArray(), index * 3);
    ends.set(end.toArray(), index * 3);
    colors.set(color.toArray(), index * 3);
    phases[index] = random01(seed + 5);
    speeds[index] = (kind === "air" ? 0.16 : 0.075) * (0.8 + random01(seed + 11) * 0.45);
    opacities[index] = route.projected ? 0.27 : kind === "air" ? 0.72 : 0.82;
    // 同一浮點屬性打包：bit 0=推定虛線，bit 1=大圓，bit 2=事件時間，bit 3=戰略轟炸。
    projected[index] = (route.projected ? 1 : 0) + (route.geodesic ? 2 : 0)
      + (route.timelineMode === "event" ? 4 : 0) + (route.strategic ? 8 : 0);
    ranks[index] = (copy + random01(seed + 13) * 0.7) / count;
    seeds[index] = random01(seed + 19);
    timelineStarts[index] = route.startStep ?? -1;
    const timelineEnd = route.endStep ?? 99;
    // 以負值打包盟軍援華線標誌，避免再占一個GPU實例屬性。
    timelineEnds[index] = route.networkImmune ? -(timelineEnd + 1) : timelineEnd;
  });

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute("aStart", new THREE.InstancedBufferAttribute(starts, 3));
  geometry.setAttribute("aControl1", new THREE.InstancedBufferAttribute(controls1, 3));
  geometry.setAttribute("aControl2", new THREE.InstancedBufferAttribute(controls2, 3));
  geometry.setAttribute("aEnd", new THREE.InstancedBufferAttribute(ends, 3));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(speeds, 1));
  geometry.setAttribute("aOpacity", new THREE.InstancedBufferAttribute(opacities, 1));
  geometry.setAttribute("aProjected", new THREE.InstancedBufferAttribute(projected, 1));
  geometry.setAttribute("aRank", new THREE.InstancedBufferAttribute(ranks, 1));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute("aTimelineStart", new THREE.InstancedBufferAttribute(timelineStarts, 1));
  geometry.setAttribute("aTimelineEnd", new THREE.InstancedBufferAttribute(timelineEnds, 1));
  geometry.instanceCount = instances.length;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.8);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: 0.72 },
      uThickness: { value: kind === "air" ? 0.0042 : 0.0023 },
      uTail: { value: kind === "air" ? 0.24 : 0.28 },
      uTimelineStep: { value: 0 },
      uEventTimelineStep: { value: 0 },
      uNetworkIntegrity: { value: 1 },
      uSurfaceFollow: { value: kind === "sea" ? 1 : 0 },
      uAlliedVolume: { value: ALLIED_AIR_VOLUME_BY_STEP[0] },
      uAlliedVolumeEffect: { value: kind === "air" ? 1 : 0 },
    },
    vertexShader: `
      attribute vec3 aStart;
      attribute vec3 aControl1;
      attribute vec3 aControl2;
      attribute vec3 aEnd;
      attribute vec3 aColor;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aOpacity;
      attribute float aProjected;
      attribute float aRank;
      attribute float aSeed;
      attribute float aTimelineStart;
      attribute float aTimelineEnd;
      uniform float uTime;
      uniform float uThickness;
      uniform float uTimelineStep;
      uniform float uEventTimelineStep;
      uniform float uSurfaceFollow;
      uniform float uAlliedVolume;
      uniform float uAlliedVolumeEffect;
      varying vec3 vColor;
      varying float vT;
      varying float vHead;
      varying float vOpacity;
      varying float vProjected;
      varying float vRank;
      varying float vSeed;
      varying float vTimelineVisible;
      varying float vNetworkImmune;
      varying float vStrategic;

      vec3 cubic(float t) {
        float u = 1.0 - t;
        return u*u*u*aStart + 3.0*u*u*t*aControl1 + 3.0*u*t*t*aControl2 + t*t*t*aEnd;
      }

      vec3 cubicTangent(float t) {
        float u = 1.0 - t;
        return 3.0*u*u*(aControl1-aStart) + 6.0*u*t*(aControl2-aControl1) + 3.0*t*t*(aEnd-aControl2);
      }

      vec3 surfaceCubic(float t) {
        vec3 point = cubic(t);
        float radius = mix(length(aStart), length(aEnd), t);
        return normalize(point) * radius;
      }

      vec3 surfaceCubicTangent(float t) {
        float before = max(0.0, t - 0.003);
        float after = min(1.0, t + 0.003);
        return surfaceCubic(after) - surfaceCubic(before);
      }

      vec3 greatCircle(float t) {
        vec3 startDirection = normalize(aStart);
        vec3 endDirection = normalize(aEnd);
        float omega = acos(clamp(dot(startDirection, endDirection), -1.0, 1.0));
        float sinOmega = max(sin(omega), 0.00001);
        vec3 direction = omega < 0.0001
          ? normalize(mix(startDirection, endDirection, t))
          : normalize(
              startDirection * (sin((1.0 - t) * omega) / sinOmega)
              + endDirection * (sin(t * omega) / sinOmega)
            );
        float baseRadius = mix(length(aStart), length(aEnd), t);
        float controlRadius = max(length(aControl1), length(aControl2));
        float radius = baseRadius + sin(3.14159265 * t) * max(0.0, controlRadius - baseRadius);
        return direction * radius;
      }

      vec3 greatCircleTangent(float t) {
        float before = max(0.0, t - 0.004);
        float after = min(1.0, t + 0.004);
        return greatCircle(after) - greatCircle(before);
      }

      void main() {
        float t = position.y;
        float strategicFlag = step(7.5, aProjected);
        float withoutStrategic = mod(aProjected, 8.0);
        float eventTimelineFlag = step(3.5, withoutStrategic);
        float routeFlags = mod(withoutStrategic, 4.0);
        float geodesicFlag = step(1.5, routeFlags);
        float projectedFlag = mod(routeFlags, 2.0);
        float networkImmuneFlag = step(aTimelineEnd, -0.5);
        float surfaceCurveFlag = uSurfaceFollow * (1.0 - geodesicFlag);
        vec3 cubicPoint = mix(cubic(t), surfaceCubic(t), surfaceCurveFlag);
        vec3 cubicDirection = mix(cubicTangent(t), surfaceCubicTangent(t), surfaceCurveFlag);
        vec3 point = mix(cubicPoint, greatCircle(t), geodesicFlag);
        vec3 tangent = normalize(mix(cubicDirection, greatCircleTangent(t), geodesicFlag));
        vec4 viewPoint = modelViewMatrix * vec4(point, 1.0);
        vec3 viewTangent = normalize((modelViewMatrix * vec4(tangent, 0.0)).xyz);
        vec3 viewDirection = normalize(-viewPoint.xyz);
        vec3 ribbonSide = normalize(cross(viewTangent, viewDirection));
        float endpointFade = mix(0.42 + sin(3.14159265 * t) * 0.58, 1.0, uSurfaceFollow);
        float volumeWidth = mix(1.38, 0.62 + uAlliedVolume, uAlliedVolumeEffect);
        float alliedTransportFlag = networkImmuneFlag * (1.0 - strategicFlag);
        float alliedWidth = mix(1.0, volumeWidth, alliedTransportFlag) * mix(1.0, 1.22, strategicFlag);
        viewPoint.xyz += ribbonSide * position.x * uThickness * endpointFade * alliedWidth;
        gl_Position = projectionMatrix * viewPoint;
        vColor = aColor;
        vT = t;
        vHead = fract(uTime * aSpeed + aPhase);
        vOpacity = aOpacity;
        vProjected = projectedFlag;
        vRank = aRank;
        vSeed = aSeed;
        float timelineEnd = mix(aTimelineEnd, -aTimelineEnd - 1.0, networkImmuneFlag);
        float timelineValue = mix(uTimelineStep, uEventTimelineStep, eventTimelineFlag);
        vTimelineVisible = step(aTimelineStart, timelineValue + 0.1) * step(timelineValue - 0.1, timelineEnd);
        vNetworkImmune = networkImmuneFlag;
        vStrategic = strategicFlag;
      }
    `,
    fragmentShader: `
      uniform float uDensity;
      uniform float uTail;
      uniform float uNetworkIntegrity;
      uniform float uSurfaceFollow;
      uniform float uAlliedVolume;
      uniform float uAlliedVolumeEffect;
      varying vec3 vColor;
      varying float vT;
      varying float vHead;
      varying float vOpacity;
      varying float vProjected;
      varying float vRank;
      varying float vSeed;
      varying float vTimelineVisible;
      varying float vNetworkImmune;
      varying float vStrategic;

      void main() {
        float routeIntegrity = mix(uNetworkIntegrity, 1.0, vNetworkImmune);
        float alliedTransportFlag = vNetworkImmune * (1.0 - vStrategic);
        float alliedDensity = mix(1.0, 0.42 + uAlliedVolume * 0.58, uAlliedVolumeEffect * alliedTransportFlag);
        if (routeIntegrity < 0.01 || vRank > uDensity * routeIntegrity * alliedDensity) discard;
        float behind = vHead - vT;
        float movingTrail = smoothstep(uTail, 0.0, behind) * step(0.0, behind);
        float headGlow = smoothstep(0.028, 0.0, abs(behind));
        float segmentFade = smoothstep(0.0, 0.025, vT) * smoothstep(1.0, 0.965, vT);
        float endpointFade = mix(mix(segmentFade, 1.0, vNetworkImmune), 1.0, uSurfaceFollow);
        float dash = mix(1.0, step(0.46, fract(vT * 23.0 + vSeed * 3.0)), vProjected);
        float disruption = 1.0 - routeIntegrity;
        float damageMix = smoothstep(0.12, 0.92, disruption);
        float brokenPattern = step(disruption * 0.72, fract(vT * 11.0 + vSeed * 6.0));
        float survivingLine = mix(1.0, brokenPattern, damageMix * 0.9);
        float baseLine = mix(mix(0.10, 0.14, vNetworkImmune), 0.19, vStrategic);
        float alpha = (baseLine + movingTrail * 0.82 + headGlow * 0.9) * vOpacity * endpointFade * dash * vTimelineVisible * survivingLine;
        float alliedIntensity = mix(1.0, 0.48 + uAlliedVolume * 0.90, uAlliedVolumeEffect * alliedTransportFlag);
        alpha *= alliedIntensity * mix(1.0, 1.2, vStrategic);
        gl_FragColor = vec4(vColor * (0.88 + headGlow * 0.55), alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = kind === "air" ? 5 : 4;
  return { mesh, material };
}

const ExtractionGlobeImpl = forwardRef<GlobeController, ExtractionGlobeProps>(
  function ExtractionGlobe({ embedded = false, className = "", onReady }, ref) {
    const mount = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<GlobeController | null>(null);

    useImperativeHandle(ref, () => ({
      setDensity(value) { controllerRef.current?.setDensity(value); },
      setTransport(value) { controllerRef.current?.setTransport(value); },
      setPaused(value) { controllerRef.current?.setPaused(value); },
      setTimeline(value) { controllerRef.current?.setTimeline(value); },
      focusAsia() { controllerRef.current?.focusAsia(); },
      focusPacific() { controllerRef.current?.focusPacific(); },
      focusAtlantic() { controllerRef.current?.focusAtlantic(); },
      zoomIn() { controllerRef.current?.zoomIn(); },
      zoomOut() { controllerRef.current?.zoomOut(); },
      destroy() { controllerRef.current?.destroy(); },
    }), []);

    useEffect(() => {
      if (!mount.current) return;
      const host = mount.current;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2("#071413", 0.075);
      const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
      // The initial framing is intentionally Asia-forward so the requested
      // city nodes remain legible without requiring a first interaction.
      camera.position.set(0.15, 0.3, 2.15);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.cursor = "grab";
      host.appendChild(renderer.domElement);

      const globeRoot = new THREE.Group();
      // Keep the normal 1942—45 composition between China and Japan.
      globeRoot.rotation.set(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(160), 0);
      scene.add(globeRoot);

      const paperTexture = buildEarthTexture();
      paperTexture.colorSpace = THREE.SRGBColorSpace;
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load("/earth-nasa-5400.jpg");
      const borderTexture = textureLoader.load("/country-borders-4k.png");
      const controlTexture = textureLoader.load("/imperial-control-4k.png");
      const occupationTexture = textureLoader.load("/occupation-timeline-4k.png");
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      borderTexture.colorSpace = THREE.SRGBColorSpace;
      controlTexture.colorSpace = THREE.SRGBColorSpace;
      occupationTexture.colorSpace = THREE.NoColorSpace;
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      earthTexture.anisotropy = Math.min(8, maxAnisotropy);
      borderTexture.anisotropy = Math.min(8, maxAnisotropy);
      controlTexture.anisotropy = Math.min(8, maxAnisotropy);
      occupationTexture.anisotropy = Math.min(8, maxAnisotropy);
      const sunDirection = new THREE.Vector3(2.4, 1.15, 2).normalize();
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 160, 120),
        createEarthMaterial(earthTexture, sunDirection),
      );
      earth.name = "earth";
      globeRoot.add(earth);

      const paperVeil = new THREE.Mesh(
        new THREE.SphereGeometry(1.003, 128, 96),
        new THREE.MeshBasicMaterial({ map: paperTexture, transparent: true, opacity: 0.055, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false }),
      );
      globeRoot.add(paperVeil);

      const countryBoundaries = new THREE.Mesh(
        new THREE.SphereGeometry(1.006, 160, 120),
        new THREE.MeshBasicMaterial({ map: borderTexture, transparent: true, opacity: 0.74, depthWrite: false }),
      );
      countryBoundaries.name = "countryBoundaries";
      countryBoundaries.renderOrder = 2;
      globeRoot.add(countryBoundaries);

      const imperialMaterial = new THREE.MeshBasicMaterial({
          map: controlTexture,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
      });
      const imperialGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.009, 160, 120),
        imperialMaterial,
      );
      imperialGlow.name = "imperialControl";
      imperialGlow.renderOrder = 3;
      globeRoot.add(imperialGlow);

      const occupationMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: occupationTexture },
          uTimelineStep: { value: 0 },
          uLiberation: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform float uTimelineStep;
          uniform float uLiberation;
          varying vec2 vUv;
          void main() {
            float encoded = texture2D(uMap, vUv).r;
            float activationStep = encoded * 255.0 / 12.0 - 1.0;
            float hasTerritory = step(0.02, encoded);
            float isActive = step(activationStep, uTimelineStep + 0.12);
            float alpha = hasTerritory * isActive * 0.48 * (1.0 - uLiberation);
            gl_FragColor = vec4(0.74, 0.25, 0.21, alpha);
          }
        `,
      });
      const occupationTimeline = new THREE.Mesh(
        new THREE.SphereGeometry(1.0115, 160, 120),
        occupationMaterial,
      );
      occupationTimeline.name = "occupationTimeline";
      occupationTimeline.renderOrder = 3;
      globeRoot.add(occupationTimeline);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.045, 64, 48),
        new THREE.MeshBasicMaterial({ color: "#d9c9a3", transparent: true, opacity: 0.055, side: THREE.BackSide, blending: THREE.AdditiveBlending }),
      );
      globeRoot.add(atmosphere);

      const wartimeLights = createWartimeLightsLayer(sunDirection);
      const dayNightOverlay = createDayNightOverlay(sunDirection);
      globeRoot.add(dayNightOverlay);
      globeRoot.add(wartimeLights);

      const routeRoot = new THREE.Group();
      const seaLayer = createArcLayer("sea");
      const airLayer = createArcLayer("air");
      routeRoot.add(seaLayer.mesh, airLayer.mesh);
      globeRoot.add(routeRoot);

      const pulseRingLayer = createPulseRingLayer(MAP_LABELS);
      globeRoot.add(pulseRingLayer.mesh);

      const atomicImpactLayer = createAtomicImpactLayer();
      globeRoot.add(atomicImpactLayer.group);

      const labelRoot = new THREE.Group();
      MAP_LABELS.forEach((label) => {
        const sprite = createMapLabel(label);
        sprite.visible = (sprite.userData.startStep as number) <= 0;
        labelRoot.add(sprite);
        const hitTarget = createCityHitTarget(label);
        if (hitTarget) {
          hitTarget.visible = sprite.visible;
          labelRoot.add(hitTarget);
        }
      });
      globeRoot.add(labelRoot);

      let density = 1;
      let transport: TransportMode = "all";
      let paused = false;
      let dragging = false;
      let resumeRotationAt = 0;
      let zoom = 2.15;
      let frame = 0;
      const pointers = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      const clock = new THREE.Clock();
      let simulationTime = 0;
      let alliedAirVolumeTarget: number = ALLIED_AIR_VOLUME_BY_STEP[0];
      let currentEventStep = 0;
      const targetViewQuaternion = globeRoot.quaternion.clone();
      let viewTransitionActive = false;
      const worldYawAxis = new THREE.Vector3(0, 1, 0);
      const worldPitchAxis = new THREE.Vector3(1, 0, 0);
      const dragRotation = new THREE.Quaternion();

      const postponeAutoRotation = () => {
        resumeRotationAt = performance.now() + 8000;
      };

      const setZoom = (next: number) => {
        zoom = THREE.MathUtils.clamp(next, 1.3, 6);
        postponeAutoRotation();
      };

      const queueViewQuaternion = (quaternion: THREE.Quaternion, nextZoom: number) => {
        targetViewQuaternion.copy(quaternion);
        setZoom(nextZoom);
        viewTransitionActive = true;
      };

      const queueEulerView = (x: number, y: number, z: number, nextZoom: number) => {
        queueViewQuaternion(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)),
          nextZoom,
        );
      };

      const focusGlobePoint = (point: readonly [number, number], nextZoom: number) => {
        const localOut = latLon(point[0], point[1], 1).normalize();
        const localNorth = new THREE.Vector3(0, 1, 0)
          .addScaledVector(localOut, -localOut.y)
          .normalize();
        const localEast = localNorth.clone().cross(localOut).normalize();

        // The camera has a deliberate x/y offset so the globe sits between the
        // magazine panels. Aim the selected city at the camera's actual centre
        // ray instead of relying on fragile hand-tuned Euler angles.
        const centreX = THREE.MathUtils.clamp(camera.position.x, -0.72, 0.72);
        const centreY = THREE.MathUtils.clamp(camera.position.y, -0.72, 0.72);
        const centreZ = Math.sqrt(Math.max(0.08, 1 - centreX * centreX - centreY * centreY));
        const viewOut = new THREE.Vector3(centreX, centreY, centreZ).normalize();
        const viewNorth = new THREE.Vector3(0, 1, 0)
          .addScaledVector(viewOut, -viewOut.y)
          .normalize();
        const viewEast = viewNorth.clone().cross(viewOut).normalize();

        const localBasis = new THREE.Matrix4().makeBasis(localEast, localNorth, localOut);
        const viewBasis = new THREE.Matrix4().makeBasis(viewEast, viewNorth, viewOut);
        const rotationMatrix = viewBasis.multiply(localBasis.invert());
        queueViewQuaternion(
          new THREE.Quaternion().setFromRotationMatrix(rotationMatrix),
          nextZoom,
        );
      };

      const setVisibility = () => {
        const gpuDensity = THREE.MathUtils.clamp(0.36 + density * 0.32, 0.4, 1);
        seaLayer.material.uniforms.uDensity.value = gpuDensity;
        airLayer.material.uniforms.uDensity.value = gpuDensity;
        seaLayer.mesh.visible = transport === "all" || transport === "sea";
        airLayer.mesh.visible = transport === "all" || transport === "air";
      };

      const controller: GlobeController = {
        setDensity(value) { density = value; setVisibility(); },
        setTransport(value) { transport = value; setVisibility(); },
        setTimeline(value) {
          const eventStep = THREE.MathUtils.clamp(Math.round(value), 0, LAST_EVENT_STEP);
          const legacyStep = TIMELINE_LEGACY_PHASE[eventStep] ?? 23;
          const eventChanged = eventStep !== currentEventStep;
          occupationMaterial.uniforms.uTimelineStep.value = legacyStep;
          seaLayer.material.uniforms.uTimelineStep.value = legacyStep;
          airLayer.material.uniforms.uTimelineStep.value = legacyStep;
          airLayer.material.uniforms.uEventTimelineStep.value = eventStep;
          pulseRingLayer.material.uniforms.uTimelineStep.value = eventStep;
          pulseRingLayer.material.uniforms.uLegacyTimelineStep.value = legacyStep;
          atomicImpactLayer.setTimeline(eventStep);
          alliedAirVolumeTarget = ALLIED_AIR_VOLUME_BY_STEP[legacyStep];
          const networkIntegrity = legacyStep < 15 ? 1
            : legacyStep === 15 ? 0.78
              : legacyStep === 16 ? 0.58
                : legacyStep === 17 ? 0.48
                  : legacyStep === 18 ? 0.3
                    : legacyStep === 19 ? 0.22
                      : legacyStep === 20 ? 0.08
                        : legacyStep === 21 ? 0.04
                          : 0;
          seaLayer.material.uniforms.uNetworkIntegrity.value = networkIntegrity;
          airLayer.material.uniforms.uNetworkIntegrity.value = networkIntegrity;
          labelRoot.children.forEach((label) => {
            const start = label.userData.startStep as number;
            const end = label.userData.endStep as number;
            const timelineValue = label.userData.timelineMode === "event" ? eventStep : legacyStep;
            label.visible = timelineValue >= start && timelineValue <= end;
          });
          const liberation = legacyStep < 18 ? 0 : legacyStep < 20 ? 0.1 : legacyStep === 20 ? 0.46 : legacyStep === 21 ? 0.78 : 1;
          occupationMaterial.uniforms.uLiberation.value = liberation;
          imperialMaterial.opacity = legacyStep < 22 ? 0.92 : legacyStep === 22 ? 0.35 : 0.08;
          if (eventChanged && eventStep === EVENT_STEPS.midway) {
            focusGlobePoint(OPERATION_POINTS.midway, 2.48);
          } else if (eventChanged && eventStep === 15) {
            queueEulerView(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(160), 0, 2.15);
          } else if (eventChanged && eventStep === EVENT_STEPS.palauCounteroffensive) {
            focusGlobePoint(OPERATION_POINTS.peleliu, 2.32);
          } else if (eventChanged && eventStep === 19) {
            queueEulerView(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(160), 0, 2.15);
          } else if (eventChanged && eventStep === EVENT_STEPS.chengduYawata) {
            queueEulerView(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(158), 0, 2.08);
          } else if (eventChanged && eventStep === EVENT_STEPS.saipanTokyo) {
            queueEulerView(THREE.MathUtils.degToRad(-7), THREE.MathUtils.degToRad(132), 0, 2.0);
          } else if (eventStep === EVENT_STEPS.hiroshima || eventStep === EVENT_STEPS.nagasaki) {
            const impactPoint = eventStep === EVENT_STEPS.hiroshima
              ? STRATEGIC_POINTS.hiroshima
              : STRATEGIC_POINTS.nagasaki;
            focusGlobePoint(impactPoint, 1.76);
          }
          currentEventStep = eventStep;
        },
        setPaused(value) {
          if (paused === value) return;
          paused = value;
          if (!paused) clock.start();
        },
        focusAsia() {
          queueEulerView(THREE.MathUtils.degToRad(-12), THREE.MathUtils.degToRad(160), 0, 2.15);
        },
        focusPacific() {
          queueEulerView(THREE.MathUtils.degToRad(-2), THREE.MathUtils.degToRad(112), 0, 2.05);
        },
        focusAtlantic() {
          queueEulerView(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(-55), 0, 2.48);
        },
        zoomIn() { setZoom(zoom - 0.38); },
        zoomOut() { setZoom(zoom + 0.38); },
        destroy() {
          cancelAnimationFrame(frame);
          renderer.dispose();
          earthTexture.dispose();
          borderTexture.dispose();
          controlTexture.dispose();
          occupationTexture.dispose();
          paperTexture.dispose();
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
            if (object instanceof THREE.Sprite) {
              object.material.map?.dispose();
              object.material.dispose();
            }
          });
          renderer.domElement.remove();
        },
      };
      controllerRef.current = controller;
      window.ExtractionGlobeAPI = { controller };
      onReady?.(controller);

      const cityWorldPoint = new THREE.Vector3();
      const cityGlobeCenter = new THREE.Vector3();
      const cityProjectedPoint = new THREE.Vector3();
      const getCityAtPointer = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const targets = labelRoot.children.filter((object) =>
          object.visible && object.userData.cityHitTarget === true,
        );
        globeRoot.getWorldPosition(cityGlobeCenter);
        let closest: THREE.Object3D | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          target.getWorldPosition(cityWorldPoint);
          const outward = cityWorldPoint.clone().sub(cityGlobeCenter).normalize();
          const towardCamera = camera.position.clone().sub(cityWorldPoint).normalize();
          if (outward.dot(towardCamera) <= 0) continue;
          cityProjectedPoint.copy(cityWorldPoint).project(camera);
          if (cityProjectedPoint.z < -1 || cityProjectedPoint.z > 1) continue;
          const screenX = rect.left + ((cityProjectedPoint.x + 1) * 0.5 * rect.width);
          const screenY = rect.top + ((1 - cityProjectedPoint.y) * 0.5 * rect.height);
          const distance = Math.hypot(event.clientX - screenX, event.clientY - screenY);
          // Select the nearest visible city in screen space. This prevents
          // neighbouring Kunming/Chengdu or Guangzhou/Guilin hit areas from
          // stealing one another's long-press gesture.
          const pickRadius = Math.max(18, Math.min(32, target.scale.x * rect.width * 0.34));
          if (distance <= pickRadius && distance < closestDistance) {
            closest = target;
            closestDistance = distance;
          }
        }
        return closest;
      };
      let cityPressTimer: number | null = null;
      let cityPressPointerId: number | null = null;
      let cityPressTarget: THREE.Object3D | null = null;
      let cityPressStart = { x: 0, y: 0 };
      let cityPressMoved = false;
      const clearCityPress = () => {
        if (cityPressTimer !== null) window.clearTimeout(cityPressTimer);
        cityPressTimer = null;
        cityPressPointerId = null;
        cityPressTarget = null;
      };

      const onPointerDown = (event: PointerEvent) => {
        // Freeze any event-view tween at the point where the user takes over;
        // this avoids a click being interpreted as a large orientation jump.
        targetViewQuaternion.copy(globeRoot.quaternion);
        viewTransitionActive = false;
        dragging = true;
        postponeAutoRotation();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        renderer.domElement.setPointerCapture(event.pointerId);
        if (pointers.size > 1) {
          clearCityPress();
        } else {
          const city = getCityAtPointer(event);
          cityPressTarget = city;
          cityPressPointerId = city ? event.pointerId : null;
          cityPressStart = { x: event.clientX, y: event.clientY };
          cityPressMoved = false;
          if (city) {
            const slug = city.userData.citySlug as string | undefined;
            cityPressTimer = window.setTimeout(() => {
              cityPressTimer = null;
              if (slug && CITY_PAGE_PATHS[slug]) window.location.assign(CITY_PAGE_PATHS[slug]);
            }, 1500);
          }
        }
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        }
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) {
          renderer.domElement.style.cursor = getCityAtPointer(event) ? "pointer" : "grab";
          return;
        }
        const oldPoint = pointers.get(event.pointerId);
        if (!oldPoint) return;
        if (cityPressPointerId === event.pointerId && cityPressTarget && !cityPressMoved) {
          const distance = Math.hypot(event.clientX - cityPressStart.x, event.clientY - cityPressStart.y);
          if (distance < 8) {
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            return;
          }
          clearCityPress();
          cityPressMoved = true;
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2) {
          const [a, b] = [...pointers.values()];
          const nextDistance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance > 0) setZoom(zoom - (nextDistance - pinchDistance) * 0.006);
          pinchDistance = nextDistance;
          return;
        }
        if (!oldPoint) return;
        const dx = event.clientX - oldPoint.x;
        const dy = event.clientY - oldPoint.y;
        postponeAutoRotation();
        // Keep drag math in quaternion space. Mixing Euler writes into a
        // quaternion set by an event focus causes the globe to jump through
        // an Euler branch and appear to flip upside down.
        dragRotation.setFromAxisAngle(worldYawAxis, -dx * 0.0045);
        globeRoot.quaternion.premultiply(dragRotation);
        dragRotation.setFromAxisAngle(worldPitchAxis, dy * 0.003);
        globeRoot.quaternion.premultiply(dragRotation);
      };
      const onPointerUp = (event: PointerEvent) => {
        if (cityPressPointerId === event.pointerId) clearCityPress();
        pointers.delete(event.pointerId);
        dragging = pointers.size > 0;
        pinchDistance = 0;
        renderer.domElement.style.cursor = "grab";
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        setZoom(zoom + event.deltaY * 0.0015);
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.04);
        camera.position.z += (zoom - camera.position.z) * 0.08;
        const alliedVolumeBlend = 1 - Math.exp(-delta * 2.2);
        airLayer.material.uniforms.uAlliedVolume.value +=
          (alliedAirVolumeTarget - airLayer.material.uniforms.uAlliedVolume.value) * alliedVolumeBlend;
        if (!paused) {
          simulationTime += delta;
          if (viewTransitionActive) {
            const viewBlend = 1 - Math.exp(-delta * 0.72);
            globeRoot.quaternion.slerp(targetViewQuaternion, viewBlend);
            if (globeRoot.quaternion.angleTo(targetViewQuaternion) < 0.001) {
              globeRoot.quaternion.copy(targetViewQuaternion);
              viewTransitionActive = false;
            }
          } else if (!dragging && performance.now() >= resumeRotationAt) {
            // Asia-focused default view; halve the globe's previous rotation rate.
            dragRotation.setFromAxisAngle(worldYawAxis, -delta * 0.0225);
            globeRoot.quaternion.premultiply(dragRotation);
          }
          seaLayer.material.uniforms.uTime.value = simulationTime * density;
          airLayer.material.uniforms.uTime.value = simulationTime * density;
          pulseRingLayer.material.uniforms.uTime.value = simulationTime;
        }
        // Atomic-event playback belongs to the documentary timeline rather
        // than the transport-flow pause control, so its 5.2 s sequence keeps
        // advancing even if route particles are paused.
        atomicImpactLayer.update(delta);
        renderer.render(scene, camera);
      };
      animate();

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      return () => {
        observer.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        controller.destroy();
        controllerRef.current = null;
        window.ExtractionGlobeAPI = { controller: null };
      };
    }, [onReady]);

    return <div className={`globe-stage ${embedded ? "embedded" : ""} ${className}`} ref={mount} />;
  },
);

export const ExtractionGlobe = ExtractionGlobeImpl;

export function mountExtractionGlobe(
  element: HTMLElement,
  options: Omit<ExtractionGlobeProps, "embedded"> = {},
) {
  const root = createRoot(element);
  let controller: GlobeController | null = null;
  root.render(createElement(ExtractionGlobe, {
    ...options,
    embedded: true,
    onReady(nextController) {
      controller = nextController;
      options.onReady?.(nextController);
    },
  }));
  return {
    get controller() { return controller; },
    unmount() { root.unmount(); },
  };
}

declare global {
  interface Window {
    ExtractionGlobeAPI?: {
      controller: GlobeController | null;
    };
  }
}
