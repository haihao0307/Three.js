"use client";

import { useEffect, useRef, useState } from "react";
import { ExtractionGlobe, type GlobeController } from "./components/ExtractionGlobe";

const resources = [
  { key: "oil", label: "石油", color: "#b44836" },
  { key: "rubber", label: "橡膠", color: "#cb8432" },
  { key: "tin", label: "錫礦", color: "#668f86" },
  { key: "iron", label: "鐵與煤", color: "#a38d73" },
  { key: "rice", label: "糧食", color: "#b9a94e" },
  { key: "labor", label: "勞工與軍需", color: "#8f3a35" },
];

type MapSource = "air1935" | "propaganda1941";

const mapSources = {
  air1935: {
    tab: "1935 航空交通圖",
    src: "/1935-air-map-reference.jpg",
    alt: "1935年《日滿支那詳圖》史料掃描，包含東亞海運與航空路",
    caption: "1935年《日滿支那詳圖》（史料原題）。圖例可清楚分辨紅色航空路、藍色航路、鐵道與道路；本作品只採用可核對的港口、節點與走廊關係，並保留史料原有的紙張、套色與網點質感。原圖使用殖民時代用語，展示不代表認同。",
  },
  propaganda1941: {
    tab: "1941 宣傳地圖",
    src: "/1941-map-reference.jpg",
    alt: "1941年少年俱樂部大東亞地圖",
    caption: "1941年日本少年雜誌附錄宣傳地圖。它把帝國擴張包裝成「共榮」，本互動作品反向揭示資源攫取、殖民商品傾銷與軍事運輸網絡。",
  },
};

type TimelinePoint = {
  legacyPhase: number;
  date: string;
  title: string;
  detail: string;
  kind?: "atomic";
  holdMs?: number;
};

const ATOMIC_HOLD_MS = Math.round(5200 * 4 / 3);

const timelinePoints: readonly TimelinePoint[] = [
  { legacyPhase: 0, date: "1941.01—05.06", title: "既有佔領／租借援華啟動", detail: "北平、天津、上海、南京、武漢、廣州等在時間線開始前已處於日軍佔領；尚未失守的中國城市以藍色顯示" },
  { legacyPhase: 1, date: "1941.07.29", title: "法屬印度支那南部進駐", detail: "日軍擴大使用西貢等軍港與航空基地，法國殖民行政仍被保留" },
  { legacyPhase: 1, date: "1941.10.04", title: "鄭州第一次失守", detail: "鄭州由藍轉紅；此次佔領只持續到月底，不能與1944年的再次失守混為一段" },
  { legacyPhase: 1, date: "1941.10.31", title: "鄭州收復", detail: "日軍退出鄭州，中國軍隊收復城市，鄭州由紅恢復為藍" },
  { legacyPhase: 2, date: "1941.12.07／08", title: "珍珠港空襲", detail: "黃色高弧顯示單冠灣集結後取道北太平洋的艦隊作戰走廊；艦載機由夏威夷北方海域起飛" },
  { legacyPhase: 3, date: "1941.12.10", title: "關島陷落", detail: "關島被日軍佔領，納入南洋基地交通網" },
  { legacyPhase: 4, date: "1941.12.25", title: "香港陷落", detail: "十八日戰事後香港進入日軍佔領時期" },
  { legacyPhase: 5, date: "1942.01.02", title: "馬尼拉陷落", detail: "日軍進入已被宣布為不設防城市的馬尼拉；巴丹與科雷希多仍在抵抗" },
  { legacyPhase: 6, date: "1942.01.11", title: "吉隆坡陷落", detail: "日軍沿馬來半島南進，英屬馬來亞主要交通節點相繼失守" },
  { legacyPhase: 7, date: "1942.01.23", title: "拉包爾陷落", detail: "拉包爾成為日軍在南太平洋的重要海空基地" },
  { legacyPhase: 8, date: "1942.02.15", title: "新加坡投降／改稱昭南", detail: "英屬馬來亞與新加坡進入日軍佔領階段；日本軍政當局隨後把新加坡改稱「昭南島」" },
  { legacyPhase: 9, date: "1942.02.19", title: "達爾文空襲", detail: "黃色高弧經帛琉、安汶方向連向達爾文，表示艦隊與前進基地構成的作戰走廊" },
  { legacyPhase: 10, date: "1942.03.09", title: "荷屬東印度投降", detail: "爪哇投降；拉包爾之外，萊城與薩拉毛亞也在3月8日被佔" },
  { legacyPhase: 11, date: "1942.05.03", title: "圖拉吉被佔／駝峰援運開始", detail: "日軍佔領圖拉吉；4月8日起盟軍運輸機已從印度阿薩姆飛越駝峰至昆明，冰藍高弧自此出現" },
  { legacyPhase: 12, date: "1942.05.06", title: "菲律賓守軍投降", detail: "馬尼拉早於1月2日失守，科雷希多於5月6日投降；抵抗仍未完全停止" },
  { legacyPhase: 13, date: "1942.05.20", title: "滇緬公路中斷／駝峰接續", detail: "盟軍撤向印度，仰光—臘戍—昆明的地面生命線被切斷；貨物改由卡拉奇、加爾各答轉運至阿薩姆，再飛越駝峰抵達昆明" },
  { legacyPhase: 14, date: "1942.06.04", title: "中途島空襲與海戰", detail: "黃色高弧顯示日本本土至中途島西北海域的作戰走廊；艦載機由海上航空母艦起飛" },
  { legacyPhase: 15, date: "1943.12", title: "南方交通線持續減員", detail: "盟軍潛艇戰已使日本商船大量損失；航線密度開始下降並出現斷裂" },
  { legacyPhase: 16, date: "1944.02.17／18", title: "特魯克基地遭重創", detail: "「冰雹行動」重創特魯克基地，日軍交通網開始明顯瓦解" },
  { legacyPhase: 16, date: "1944.04.22", title: "鄭州再次失守", detail: "一號作戰展開，鄭州第二次由藍轉紅" },
  { legacyPhase: 16, date: "1944.05.25", title: "洛陽失守", detail: "洛陽保衛戰結束，洛陽由藍轉紅" },
  { legacyPhase: 16, date: "1944.06.15", title: "成都基地群首襲日本本土", detail: "美軍第二十轟炸機司令部的B-29由成都周邊前進基地起飛，越過東海攻擊九州八幡製鐵所；冰白高弧自中國西南伸向日本" },
  { legacyPhase: 16, date: "1944.06.18", title: "長沙失守", detail: "第四次長沙會戰中長沙失守，城市由藍轉紅" },
  { legacyPhase: 16, date: "1944.07.09", title: "塞班島戰役結束／B-29基地建設", detail: "美軍控制塞班後迅速修築重型轟炸機機場，馬里亞納群島開始成為對日戰略轟炸的主要支點" },
  { legacyPhase: 16, date: "1944.08.01", title: "提尼安島被盟軍控制", detail: "提尼安機場群開始擴建，後來成為大規模B-29作戰及兩次原子彈任務的出發地" },
  { legacyPhase: 17, date: "1944.08.08", title: "衡陽失守", detail: "衡陽守軍堅守47日後停止抵抗，城市由藍轉紅" },
  { legacyPhase: 18, date: "1944.09.15／10.12—20", title: "帛琉盟軍反攻／臺灣沖航空戰／重返菲律賓", detail: "盟軍於貝里琉登陸反攻；10月12—16日臺灣沖航空戰（臺灣沖海戰）在臺灣東方海空域爆發，隨後雷伊泰登陸展開反攻" },
  { legacyPhase: 19, date: "1944.11.10／11", title: "桂林、柳州失守", detail: "桂柳會戰後兩城由藍轉紅" },
  { legacyPhase: 19, date: "1944.11.24", title: "B-29由塞班首次空襲東京", detail: "塞班起飛的B-29首次攻擊東京；此後冰白航線由馬里亞納群島向東京、名古屋、大阪、神戶與九州逐步增密" },
  { legacyPhase: 19, date: "1944.11.24", title: "南寧再次失守", detail: "1940年已收復的南寧再次被日軍佔領，由藍轉紅" },
  { legacyPhase: 19, date: "1945.01.16", title: "中國方向B-29轉場", detail: "因燃料、炸彈均須越過駝峰運入成都，代價極高；美軍決定撤出中國前進基地，戰略轟炸重心完全轉向馬里亞納群島" },
  { legacyPhase: 20, date: "1945.02.04", title: "中印公路重開", detail: "首支中印公路車隊抵達昆明，援華地面生命線重新接通" },
  { legacyPhase: 20, date: "1945.03.09／10", title: "東京大規模燃燒彈空襲", detail: "馬里亞納B-29轉入大規模低空夜間燃燒彈轟炸；東京遭到巨大破壞，大量平民死傷。航線在此節點達到高密度" },
  { legacyPhase: 20, date: "1945.03.27", title: "日本水域航空布雷", detail: "B-29開始在下關海峽及日本主要港口航道布雷，殘存海上交通快速崩潰" },
  { legacyPhase: 21, date: "1945.05.03", title: "仰光收復", detail: "仰光被收復，緬甸日軍佔領體系接近崩潰" },
  { legacyPhase: 21, date: "1945.05.26", title: "南寧收復", detail: "桂柳反攻中南寧收復，由紅恢復為藍" },
  { legacyPhase: 21, date: "1945.06.29", title: "柳州收復", detail: "中國軍隊進入柳州，城市由紅恢復為藍" },
  { legacyPhase: 21, date: "1945.07.28", title: "桂林收復", detail: "桂林收復，由紅恢復為藍" },
  { legacyPhase: 21, date: "1945.08.06 · 08:15", title: "廣島原子彈爆炸", detail: "B-29「艾諾拉·蓋」由提尼安起飛，在廣島上空投下「小男孩」。白熱閃光、衝擊波與上升煙雲用於記錄城市毀滅及大量平民傷亡，不作勝利式呈現", kind: "atomic", holdMs: ATOMIC_HOLD_MS },
  { legacyPhase: 21, date: "1945.08.09 · 11:02", title: "長崎原子彈爆炸", detail: "B-29「博克之車」由提尼安起飛，因小倉上空能見度不足轉向長崎，投下「胖子」。第二次閃光延續前一事件的天空餘暉，記錄核武器造成的人道災難", kind: "atomic", holdMs: ATOMIC_HOLD_MS },
  { legacyPhase: 22, date: "1945.08.15", title: "日本宣布接受投降", detail: "停戰命令發布；城市是否已完成接管仍按實際克復或各受降區日期處理" },
  { legacyPhase: 22, date: "1945.08.19", title: "關東軍投降", detail: "關東軍在長春向蘇軍繳械；新京、奉天由紅轉藍" },
  { legacyPhase: 22, date: "1945.08.22", title: "旅大光復", detail: "蘇軍進駐旅順、大連，大連結束日本殖民統治並由紅轉藍" },
  { legacyPhase: 22, date: "1945.08.30", title: "香港重光", detail: "英國太平洋艦隊抵港並建立臨時軍政府，香港結束日佔並由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.02", title: "日本正式簽署投降書", detail: "日本代表在東京灣簽署投降書；中國各城市仍按實際克復或所屬受降區日期轉藍" },
  { legacyPhase: 23, date: "1945.09.09", title: "中國戰區受降／南京光復", detail: "中國戰區受降典禮在南京舉行，南京由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.11", title: "上海、蘇州地區受降", detail: "京滬受降區完成受降，上海、蘇州由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.13", title: "太原受降", detail: "山西受降區在太原受降，太原由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.15", title: "杭州、廈門、長衡受降", detail: "杭州與廈門受降；同日長沙、衡陽受降，四城由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.16", title: "廣州、海南受降", detail: "廣州、雷州半島與海南島受降，廣州、海口由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.18", title: "武漢受降", detail: "第六戰區在漢口受降，武漢由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.20", title: "鄭州、開封地區受降", detail: "第五戰區受降，鄭州、開封由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.22", title: "洛陽地區受降", detail: "第一戰區接受洛陽地區日軍投降，洛陽由紅轉藍" },
  { legacyPhase: 23, date: "1945.09.24", title: "徐州地區受降", detail: "第十戰區接受徐州等地日軍投降，徐州由紅轉藍" },
  { legacyPhase: 23, date: "1945.10.10", title: "平津、石家莊受降", detail: "北平受降涵蓋平津與石家莊，北平、天津、石家莊由紅轉藍" },
  { legacyPhase: 23, date: "1945.10.25", title: "臺灣地區受降", detail: "臺灣地區受降典禮在臺北舉行，臺北、基隆由紅轉藍" },
  { legacyPhase: 23, date: "1945.12.27", title: "濟南、青島地區受降", detail: "濟南受降涵蓋青島、濟南、德州；本時間線完成後回到1941年循環" },
];

const ATOMIC_SEQUENCE_START = timelinePoints.findIndex((point) => point.kind === "atomic");
const ATOMIC_SEQUENCE_LENGTH = timelinePoints.filter((point) => point.kind === "atomic").length;

const networkIntegrity = [
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  78, 58, 48, 30, 22, 8, 4, 0, 0,
] as const;

const alliedAirVolume = [
  18, 20, 22, 22, 24, 26, 28, 30, 32, 34, 36,
  8, 12, 16, 18, 32, 48, 66, 72, 78, 86, 94, 100, 0,
] as const;

export default function Home() {
  const controller = useRef<GlobeController | null>(null);
  const [density, setDensity] = useState(1);
  const [mode, setMode] = useState<"all" | "sea" | "air">("all");
  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSource, setMapSource] = useState<MapSource>("air1935");
  const [timelineStep, setTimelineStep] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(true);

  useEffect(() => controller.current?.setDensity(density), [density]);
  useEffect(() => controller.current?.setTransport(mode), [mode]);
  useEffect(() => controller.current?.setPaused(paused), [paused]);
  useEffect(() => controller.current?.setTimeline(timelineStep), [timelineStep]);
  useEffect(() => {
    if (!timelinePlaying || mapOpen) return;
    const holdMs = timelinePoints[timelineStep].holdMs ?? 3000;
    const timer = window.setTimeout(() => {
      setTimelineStep((step) => (step + 1) % timelinePoints.length);
    }, holdMs);
    return () => window.clearTimeout(timer);
  }, [timelinePlaying, mapOpen, timelineStep]);
  useEffect(() => {
    if (!mapOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mapOpen]);

  const openMap = (source: MapSource) => {
    setMapSource(source);
    setMapOpen(true);
  };

  const playAtomicSequence = () => {
    setMapOpen(false);
    setMode("all");
    setPaused(false);
    setTimelinePlaying(true);
    setTimelineStep(ATOMIC_SEQUENCE_START);
    controller.current?.setTransport("all");
    controller.current?.setPaused(false);
    // Calling the controller directly also replays the first flash when the
    // timeline is already parked on Hiroshima and React state does not change.
    controller.current?.setTimeline(ATOMIC_SEQUENCE_START);
  };

  const selectedMap = mapSources[mapSource];
  const currentMoment = timelinePoints[timelineStep];

  return (
    <main className={`experience-shell ${currentMoment.kind === "atomic" ? "atomic-moment" : ""}`}>
      <ExtractionGlobe ref={controller} />

      <header className="masthead">
        <div className="issue-line">
          <span className="eyebrow">史料可視化 · 1941—1945</span>
          <span className="issue-number">航空畫報式重構 · 第七號</span>
        </div>
        <h1>帝國的輸血線</h1>
        <p>日本帝國在東亞與太平洋構築的資源攫取、商品傾銷與軍事運輸網絡</p>
      </header>

      <aside className="context-card paper-panel">
        <div className="panel-kicker">批判性歷史重構</div>
        <p>
          深藍海運表示資源、糧食與勞工向日本本土集中；淺藍海運表示日本工業品、殖民地商品與軍需向外輸出。
          日本與盟軍海運依照史料可辨的港口、基地、海峽與近海航點分段重構，採球面三維連續切線形成更強的完整貼海大弧，<strong>不穿越陸地，也不是逐船航跡</strong>。
          深紅微光標出當時處於日本統治下的日本、朝鮮半島與臺灣。
          紅色高空弧連接日軍佔領城市、地區基地與日本；黃色高空弧表示日本出發及時間節點作戰走廊，均不代表逐班次或一次直飛。中途島海戰、帛琉盟軍反攻與臺灣沖航空戰（臺灣沖海戰）以事件節點、低弧／高弧和戰場標籤分層呈現。
          中國城市嚴格依當地失守、克復或所屬受降區完成受降的日期換色：<strong>未被佔領與收復後為藍色，日軍佔領期間為紅色</strong>。1941年前已失守的城市從紅色開始；鄭州、南寧的反復失守與收復分段呈現，不在8月15日一刀切換色。
          深海藍完整貼海大弧按時間展示租借援華海運，南繞好望角、東繞馬達加斯加並沿遠海控制點避開陸地；月光冰藍／白芯弧重構盟軍北大西洋、南大西洋—非洲—印度、南太平洋渡運鏈，以及阿薩姆飛越駝峰至昆明的空運。盟軍空運線的粗細、亮度與可見流束數按史料運量指數變化：1942年低位、1944年快速上升、1945年達到峰值。藍色動態環標出未被日軍佔領的中國後方與抵抗中心。
          冰白色戰略轟炸高弧先由成都基地群伸向九州，1944年末轉由塞班、提尼安向日本本土密集展開；廣島與長崎節點以局部天空增亮、衝擊環與上升煙雲記錄兩次原子彈爆炸及其人道災難。
          1943年後航線按商船損失、基地遭襲與港口封鎖逐步減少、斷裂並熄滅。
        </p>
        <p className="boundary-note">地球在固定日照下自轉，晨昏線隨之移動；暖色光點是參照1942年電氣化程度、戰時空襲與燈火管制所作的稀疏歷史意象，不是現代衛星夜光圖。新幾內亞以完整島嶼呈現，淺紅只標示史實可核對的佔領範圍。</p>
        <p className="city-link-note">城市節點：長按 1.5 秒進入城市頁面（清邁、昆明、重慶、成都、桂林、溫州、廣州）</p>
        <div className="source-buttons" aria-label="查看地圖史料">
          <button className="text-button" onClick={() => openMap("air1935")}>查看1935航空交通圖 →</button>
          <button className="text-button secondary" onClick={() => openMap("propaganda1941")}>查看1941宣傳地圖</button>
        </div>
      </aside>

      <section className="legend paper-panel" aria-label="運輸網絡圖例">
        <div className="panel-kicker">航路流向與資源</div>
        <div className="flow-legend">
          <span><i className="flow-swatch inbound" />資源向日本運輸</span>
          <span><i className="flow-swatch outbound" />日本商品／軍需向外輸出</span>
          <span><i className="flow-swatch control" />日本統治區域</span>
          <span><i className="flow-swatch expansion" />時間線新增佔領／駐軍區</span>
          <span><i className="flow-swatch occupied-air" />佔領城市—日本：紅色高弧</span>
          <span><i className="flow-swatch japan-air" />日本出發／作戰：黃色高弧</span>
          <span><i className="flow-swatch lend-lease" />租借援華：深海藍海運／陸運</span>
          <span><i className="flow-swatch allied-air" />盟軍航空：運量控制粗細／亮度</span>
          <span><i className="flow-swatch strategic-air" />對日戰略轟炸：冰白密集高弧</span>
          <span><i className="flow-swatch resistance" />中國城市：未佔／收復後藍色，日佔紅色</span>
        </div>
        <div className="resource-grid compact">
          {resources.map((item) => (
            <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>
          ))}
        </div>
        <div className="route-key">
          <span><b className="line sea" />貼海大弧：史料海運走廊</span>
          <span><b className="line air" />高弧：航空路／軍用空路</span>
          <span><b className="line projected" />斷續：擴張與推定線路</span>
          <span><b className="line allied" />完整貼海弧：盟軍跨洋援華海運</span>
          <span><b className="line allied-air" />盟軍：跨洋渡運與駝峰空運</span>
        </div>
        <div className="source-seal">日軍網絡與盟軍援華線分層顯示 · 1941—1945</div>
      </section>

      <section className="controls paper-panel" aria-label="地球控制">
        <div className="control-row segmented">
          {(["all", "sea", "air"] as const).map((item) => (
            <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>
              {item === "all" ? "全部" : item === "sea" ? "海運" : "空運"}
            </button>
          ))}
        </div>
        <label className="density-control">
          <span>航線密度</span>
          <input aria-label="航線密度" type="range" min="0.25" max="2" step="0.05" value={density}
            onChange={(event) => setDensity(Number(event.target.value))} />
          <output>{Math.round(density * 100)}%</output>
        </label>
        <div className="timeline-control">
          <div className="timeline-heading">
            <div className="timeline-actions">
              <button className="timeline-play" onClick={() => setTimelinePlaying((value) => !value)}>
                {timelinePlaying ? "暫停佔領時間線自動播放" : "繼續佔領時間線自動播放"}
              </button>
              <button className="atomic-replay" onClick={playAtomicSequence}>播放原爆雙節點</button>
            </div>
            <div className="timeline-meta">
              <span className="allied-volume" title="相對1945年峰值的歷史運量指數">
                盟軍空運 {alliedAirVolume[currentMoment.legacyPhase]}%
              </span>
              <span className={networkIntegrity[currentMoment.legacyPhase] < 50 ? "network-integrity damaged" : "network-integrity"}>
                交通網 {networkIntegrity[currentMoment.legacyPhase]}%
              </span>
              <time>{currentMoment.date}</time>
            </div>
          </div>
          <input
            aria-label="1941至1945年佔領與抗戰勝利時間線"
            type="range"
            min="0"
            max={timelinePoints.length - 1}
            step="1"
            value={timelineStep}
            onChange={(event) => {
              setTimelineStep(Number(event.target.value));
              // Scrubbing is a jump within the documentary playback, not a
              // permanent pause. Continue automatically from the chosen date.
              setTimelinePlaying(true);
            }}
          />
          <div key={currentMoment.date} className={`timeline-event ${currentMoment.kind === "atomic" ? "atomic" : ""}`} aria-live="polite">
            <div className="timeline-event-heading">
              <strong>{currentMoment.title}</strong>
              {currentMoment.kind === "atomic" && (
                <small>
                  原爆記錄 {timelineStep - ATOMIC_SEQUENCE_START + 1}/{ATOMIC_SEQUENCE_LENGTH} · 自動停留 {(ATOMIC_HOLD_MS / 1000).toFixed(2)} 秒
                </small>
              )}
            </div>
            <span>{currentMoment.detail}</span>
          </div>
          <div className="timeline-ends"><span>1941</span><span>1945.12 · 各受降區完成</span></div>
        </div>
        <div className="button-row">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "繼續流動" : "暫停流動"}</button>
          <button onClick={() => controller.current?.focusAsia()}>觀察亞洲</button>
          <button onClick={() => controller.current?.focusPacific()}>觀察太平洋</button>
          <button onClick={() => controller.current?.focusAtlantic()}>觀察大西洋</button>
        </div>
        <div className="zoom-row" aria-label="縮放控制">
          <span>近距離觀察</span>
          <button onClick={() => controller.current?.zoomOut()} aria-label="縮小">−</button>
          <button onClick={() => controller.current?.zoomIn()} aria-label="放大">＋</button>
        </div>
      </section>

      <div className="status-strip">
        <span><i className="pulse" />自動循環：1941—1945佔領、反攻與抗戰勝利</span>
        <span>拖動旋轉 · 滾輪／雙指縮放</span>
        <span>固定日照 · 強化晨昏線 · 1942戰時燈火</span>
      </div>

      {mapOpen && (
        <div className="map-modal" role="dialog" aria-modal="true" aria-label="歷史參考地圖">
          <button className="modal-close" onClick={() => setMapOpen(false)} aria-label="關閉">×</button>
          <figure>
            <nav className="map-tabs" aria-label="切換歷史地圖">
              {(Object.keys(mapSources) as MapSource[]).map((source) => (
                <button
                  key={source}
                  className={mapSource === source ? "active" : ""}
                  onClick={() => setMapSource(source)}
                >
                  {mapSources[source].tab}
                </button>
              ))}
            </nav>
            <div className="map-scroll">
              <img src={selectedMap.src} alt={selectedMap.alt} />
            </div>
            <figcaption>{selectedMap.caption}</figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}
