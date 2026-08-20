import Link from "next/link";

type CityRecord = {
  name: string;
  romanized: string;
  coordinate: string;
  role: string;
  lead: string;
  tags: string[];
  timeline: string[];
  network: string[];
  notes: string;
};

const CITY_PAGES = {
  "chiang-mai": {
    name: "清邁",
    romanized: "CHIANG MAI · 泰北",
    coordinate: "18.79°N · 98.99°E",
    role: "北部交通與航空中繼",
    lead: "清邁位於泰北山地交通帶，是日軍進入緬甸北部後連接泰國、撣邦與滇西的區域節點。",
    tags: ["泰國", "泰北鐵路", "緬甸戰區"],
    timeline: [
      "1941—1942：泰國成為日軍南進與緬甸作戰的通道，清邁附近交通線被納入軍需調度。",
      "1942—1944：由曼谷、清邁通向緬甸的陸空聯絡與物資轉運保持戰時狀態。",
      "1945：日本撤退與盟軍反攻使這條區域線路逐步失去原有軍事功能。",
    ],
    network: [
      "北向：清邁—撣邦—曼德勒方向的陸路與航空聯絡。",
      "南向：清邁—曼谷—馬來半島的鐵路與港口體系。",
      "地圖節點以城市環與弧線表示區域關係，不代表逐列車或逐架次航跡。",
    ],
    notes: "頁面中的地名採1941年前後的歷史語境；現代行政區界線不等同於戰時控制範圍。",
  },
  kunming: {
    name: "昆明",
    romanized: "KUNMING · 滇西後方",
    coordinate: "25.04°N · 102.72°E",
    role: "滇緬公路終點與駝峰空運接收地",
    lead: "昆明是中國西南的重要後方與航空樞紐，承接由英屬印度經駝峰航線運入的租借援華物資。",
    tags: ["滇緬公路", "駝峰航線", "租借法案"],
    timeline: [
      "1941：滇緬公路仍是援華物資進入中國的重要陸路走廊。",
      "1942：緬甸失守後，陸路受阻，盟軍轉以阿薩姆—昆明的駝峰空運維持補給。",
      "1944—1945：中印公路重新向東推進，陸空兩線共同支援中國戰場。",
    ],
    network: [
      "西線：利多／汀江—八莫—畹町—保山—昆明。",
      "空線：汀江、查布亞、蘇克拉廷飛越喜馬拉雅山脈至昆明。",
      "南線：昆明與重慶、貴陽、成都的公路與航空聯絡。",
    ],
    notes: "昆明環以藍色抵抗脈衝呈現，代表未被日軍佔領的後方節點與援華網絡。",
  },
  chongqing: {
    name: "重慶",
    romanized: "CHUNGKING · 戰時陪都",
    coordinate: "29.56°N · 106.55°E",
    role: "中國戰時政治、軍事與工業指揮中心",
    lead: "重慶是抗戰時期中國政府與軍事指揮核心，承受長期空襲，也維繫西南內地的戰時生產。",
    tags: ["戰時陪都", "空襲", "西南後方"],
    timeline: [
      "1941—1942：重慶持續遭受日軍航空襲擊，城市仍維持政府與軍事中樞功能。",
      "1942—1944：滇緬公路中斷後，昆明—重慶空陸聯絡成為後方支柱。",
      "1945：日本投降後，重慶成為受降與戰後接管的重要政治中心。",
    ],
    network: [
      "西南：昆明—貴陽—重慶的陸路與航空節點。",
      "西北：重慶—西安—成都的內陸軍需與人員調度。",
      "盟軍航空以較低的冰藍弧連接後方基地，與日軍紅色高弧分層。",
    ],
    notes: "城市圖標的藍色擴散環是抵抗與後方支援的視覺符號，不是傷亡統計。",
  },
  chengdu: {
    name: "成都",
    romanized: "CHENGTU · B-29前進基地群",
    coordinate: "30.67°N · 104.06°E",
    role: "1944年前後對日戰略轟炸的中國基地群",
    lead: "成都平原的多個機場構成駝峰後方與B-29作戰基地群，曾支援對日本本土的遠程轟炸。",
    tags: ["B-29", "駝峰後方", "戰略轟炸"],
    timeline: [
      "1942—1943：成都及周邊機場整備，逐步形成遠程航空作戰支援帶。",
      "1944：B-29自成都基地群出擊九州與日本西部，冰白高弧在時間線中增強。",
      "1945：塞班、提尼安基地成熟後，對日主力逐步轉向馬里亞納群島。",
    ],
    network: [
      "成都—昆明：後方航空與油料補給聯絡。",
      "成都—九州：高空戰略轟炸弧，按事件節點顯示。",
      "1945年後，成都基地群的對日航線亮度與密度按時間線降低。",
    ],
    notes: "基地群標記代表多座機場的概略範圍，並非單一機場座標。",
  },
  guilin: {
    name: "桂林",
    romanized: "KWEILIN · 桂柳會戰節點",
    coordinate: "25.27°N · 110.29°E",
    role: "華南戰場與桂柳會戰城市",
    lead: "桂林是華南內陸交通與防禦節點，1944年桂柳會戰期間失守，並在戰爭末期回到中國控制。",
    tags: ["桂柳會戰", "華南戰場", "城市換色"],
    timeline: [
      "1941—1943：桂林保持中國後方城市與交通節點的藍色狀態。",
      "1944.10—11：桂林、柳州相繼失守，時間線中城市節點轉為淺紅。",
      "1945：日軍撤退與受降推進，桂林在時間線末段恢復藍色。",
    ],
    network: [
      "桂林—柳州—南寧：華南內陸交通走廊。",
      "桂林—衡陽—長沙：與湘桂、湘黔方向的戰場聯絡。",
      "紅色高弧表示佔領期日軍航空與軍需聯絡，藍色脈衝表示前後方抵抗。",
    ],
    notes: "城市顏色嚴格跟隨時間線事件，不以1945年8月15日作為所有城市的同一切換點。",
  },
  wenzhou: {
    name: "溫州",
    romanized: "WENCHOW · 浙南沿海",
    coordinate: "27.99°N · 120.70°E",
    role: "浙南沿海港口與交通節點",
    lead: "溫州面向東海，城市與周邊港灣構成浙南沿海交通網，在戰時海運弧線中作為近海節點觀察。",
    tags: ["浙江", "東海港灣", "沿海交通"],
    timeline: [
      "1941—1944：浙東、浙南沿海受封鎖與軍事壓力影響，城市網絡保持高度不穩定。",
      "海運層：日本沿中國沿海的藍色弧線繞行海峽與近海航點，不穿越陸地。",
      "1945：日本撤退後，沿海節點逐步回到中國行政與航運體系。",
    ],
    network: [
      "溫州—上海—臺灣：沿東海與臺灣海峽的港口聯絡。",
      "溫州—福州—廣州：華南沿海近海弧線。",
      "城市頁面保留歷史地名與港口視角，避免將近代邊界倒投射到1941年。",
    ],
    notes: "溫州節點以情境標記呈現，並不宣稱整座城市在整段時間線內均被佔領。",
  },
  guangzhou: {
    name: "廣州",
    romanized: "CANTON · 華南港口",
    coordinate: "23.13°N · 113.26°E",
    role: "華南港口、珠江口與南方戰場節點",
    lead: "廣州是華南重要港口與工業城市，日軍控制期間成為南中國沿海軍需與海運網絡的一環。",
    tags: ["珠江口", "華南港口", "海運弧線"],
    timeline: [
      "1941—1944：廣州處於日軍佔領期，城市節點以淺紅標識，並接入華南港口線。",
      "海運層：廣州—香港—海口—臺灣的近海弧線沿海峽與避陸航點繪製。",
      "1945：日軍撤退與受降後，廣州城市狀態恢復藍色。",
    ],
    network: [
      "廣州—香港—海口：珠江口與華南沿岸運輸鏈。",
      "廣州—西貢—新加坡／昭南：南進航線的港口節點。",
      "紅色高弧與深藍海運同時降低，反映1943年後封鎖、損失與基地受襲。",
    ],
    notes: "廣州的顏色由城市失守與受降事件驅動，與區域底圖的概略控制色分開計算。",
  },
} satisfies Record<string, CityRecord>;

export function generateStaticParams() {
  return Object.keys(CITY_PAGES).map((slug) => ({ slug }));
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = CITY_PAGES[slug as keyof typeof CITY_PAGES];
  if (!city) {
    return (
      <main className="city-page">
        <article className="city-page-panel">
          <Link className="city-page-back" href="/">← 返回互動地球</Link>
          <h1>城市節點未找到</h1>
          <p className="city-page-lead">請從地球上的指定城市圖標長按1.5秒進入城市頁面。</p>
        </article>
      </main>
    );
  }

  return (
    <main className="city-page">
      <article className="city-page-panel">
        <Link className="city-page-back" href="/">← 返回1941—1945互動地球</Link>
        <div className="city-page-kicker">戰時城市檔案 · 1941—1945</div>
        <h1>{city.name}</h1>
        <div className="city-page-meta">{city.romanized} · {city.coordinate} · {city.role}</div>
        <p className="city-page-lead">{city.lead}</p>
        <div className="city-page-tags">
          {city.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="city-page-grid">
          <section>
            <h2>時間線</h2>
            <ul>{city.timeline.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h2>航運與航空網絡</h2>
            <ul>{city.network.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h2>讀圖提示</h2>
            <p>{city.notes}</p>
          </section>
          <section>
            <h2>互動操作</h2>
            <p>返回地球後，可拖曳旋轉、滾輪縮放；再次長按城市節點1.5秒即可回到本頁。</p>
          </section>
        </div>
        <Link className="city-page-return" href="/">返回亞洲視線範圍</Link>
      </article>
    </main>
  );
}
