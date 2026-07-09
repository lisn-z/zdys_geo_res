<template>
  <div class="game-container">
    <div id="map" class="map-container"></div>

    <div class="panel top-left" v-if="gameState === 'playing' || gameState === 'round-ended'">
      <h3 class="panel-title">请在地图上找出该点：</h3>
      <div class="coord-box">
        <p>目标位置：</p>
        <p class="highlight-coord">{{ formatLat(targetLat) }}</p>
        <p class="highlight-coord">{{ formatLng(targetLng) }}</p>
      </div>
      <div class="tip-box" v-if="gameState === 'playing'">
        提示：利用地图上的经纬网线与度数，找出最符合上方描述的数字。
      </div>
    </div>

    <div class="panel top-center">
      <div class="stats-box">
        <div class="stat-item">
          <span class="label">进度</span>
          <span class="value">{{ round }}/10</span>
        </div>
        <div class="stat-item">
          <span class="label">准确率</span>
          <span class="value">{{ score }}/{{ round === 0 ? 0 : round }}</span>
        </div>
        <div class="stat-item">
          <span class="label">总耗时</span>
          <span class="value">{{ totalTime.toFixed(1) }}s</span>
        </div>
      </div>
    </div>

    <div class="panel top-right" v-if="gameState === 'playing'">
      <div class="countdown-wrapper" :class="{ 'danger-pulse': countdown <= 5 }">
        <span class="time">{{ countdown }}</span><span class="unit">s</span>
      </div>
    </div>

    <div class="bottom-center">
      <div v-if="feedbackMsg" class="feedback-msg" :class="feedbackStatus">
        {{ feedbackMsg }}
      </div>
      
      <button 
        v-if="gameState === 'idle' || gameState === 'game-over'" 
        class="action-btn" 
        @click="startGame"
      >
        {{ gameState === 'idle' ? '生成点位 (开始游戏)' : '重新开始' }}
      </button>
      
      <button 
        v-if="gameState === 'round-ended'" 
        class="action-btn next-btn" 
        @click="nextRound"
      >
        {{ round < 10 ? '生成下一题' : '查看最终结果' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 游戏状态变量
const gameState = ref('idle'); // idle, playing, round-ended, game-over
const round = ref(0);
const score = ref(0);
const totalTime = ref(0);
const countdown = ref(20); 
const targetLat = ref(0);
const targetLng = ref(0);
const feedbackMsg = ref('');
const feedbackStatus = ref(''); 

// 计时器引用
let countdownInterval = null;
let totalTimeInterval = null;

// 地图与图层引用
let map = null;
let graticuleLayerGroup = null; // 经纬网和文字图层组
const candidateMarkers = [];     // 存储当前回合的10个候选点
let resultLine = null;          // 答错连线

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  clearInterval(countdownInterval);
  clearInterval(totalTimeInterval);
  if (map) map.remove();
});

// 格式化纬度为中文
const formatLat = (lat) => {
  if (lat > 0) return `北纬 ${lat.toFixed(2)}°`;
  if (lat < 0) return `南纬 ${Math.abs(lat).toFixed(2)}°`;
  return '赤道 (0.00°)';
};

// 格式化经度为中文
const formatLng = (lng) => {
  if (lng > 0) return `东经 ${lng.toFixed(2)}°`;
  if (lng < 0) return `西经 ${Math.abs(lng).toFixed(2)}°`;
  return '本初子午线 (0.00°)';
};

// 初始化地图
const initMap = () => {
  map = L.map('map', {
    center: [20, 0],
    zoom: 3,
    minZoom: 2,
    maxZoom: 10,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0,
    zoomControl: false // 1. 禁用默认的左上角放大缩小控件
  });

  // 2. 手动将放大缩小控件添加到右下角
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // 使用 OpenStreetMap 瓦片
  L.tileLayer('https://zdys.szjx.ai-study.net/geo-resources-folder/tiles/otm-tiles/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 初始化经纬网图层
  graticuleLayerGroup = L.layerGroup().addTo(map);
  drawGraticule();
};

// 绘制经纬网及度数标签
const drawGraticule = () => {
  graticuleLayerGroup.clearLayers();

  const lineColor = 'rgba(0, 0, 0, 0.45)'; 
  const labelColor = '#333333';            

  // 1. 绘制纬线 (从-75到75，每15度一条) 并在 0度经线 处添加度数标注
  for (let lat = -75; lat <= 75; lat += 15) {
    const isEquator = lat === 0;
    L.polyline([[lat, -180], [lat, 180]], { 
      color: isEquator ? '#333' : lineColor, 
      weight: isEquator ? 2 : 1.2, 
      dashArray: isEquator ? '' : '6, 6' 
    }).addTo(graticuleLayerGroup);

    let latLabel = lat === 0 ? '0° (赤道)' : (lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`);
    const txtIcon = L.divIcon({
      className: 'graticule-text-label',
      html: `<span style="color: ${isEquator ? '#c1121f' : labelColor}; font-weight: bold;">${latLabel}</span>`,
      iconSize: [60, 20],
      iconAnchor: [-5, 12] 
    });
    L.marker([lat, 0], { icon: txtIcon, interactive: false }).addTo(graticuleLayerGroup);
  }

  // 2. 绘制经线 (从-180到180，每15度一条) 并在 0度纬线(赤道) 处添加度数标注
  for (let lng = -180; lng <= 180; lng += 15) {
    const isPrimeMeridian = lng === 0;
    L.polyline([[-85, lng], [85, lng]], { 
      color: isPrimeMeridian ? '#333' : lineColor, 
      weight: isPrimeMeridian ? 2 : 1.2, 
      dashArray: isPrimeMeridian ? '' : '6, 6' 
    }).addTo(graticuleLayerGroup);

    let lngLabel = lng === 0 ? '0°' : (lng > 0 ? `${lng}°E` : `${Math.abs(lng)}°W`);
    if (lng === 180 || lng === -180) lngLabel = '180°';
    
    const txtIcon = L.divIcon({
      className: 'graticule-text-label',
      html: `<span style="color: ${isPrimeMeridian ? '#c1121f' : labelColor}; font-weight: bold;">${lngLabel}</span>`,
      iconSize: [50, 20],
      iconAnchor: [25, -2] 
    });
    L.marker([0, lng], { icon: txtIcon, interactive: false }).addTo(graticuleLayerGroup);
  }

  // 3. 绘制回归线 (北回归线 23.26, 南回归线 -23.26)
  const tropicColor = '#e76f51'; 
  L.polyline([[23.26, -180], [23.26, 180]], { color: tropicColor, weight: 2 }).addTo(graticuleLayerGroup);
  const ntLabel = L.divIcon({
    className: 'graticule-text-label tropic-label',
    html: `<span style="color: ${tropicColor}; font-size:11px;">北回归线 (23.26°N)</span>`,
    iconSize: [120, 20],
    iconAnchor: [-10, 15]
  });
  L.marker([23.26, 30], { icon: ntLabel, interactive: false }).addTo(graticuleLayerGroup);

  L.polyline([[-23.26, -180], [-23.26, 180]], { color: tropicColor, weight: 2 }).addTo(graticuleLayerGroup);
  const stLabel = L.divIcon({
    className: 'graticule-text-label tropic-label',
    html: `<span style="color: ${tropicColor}; font-size:11px;">南回归线 (23.26°S)</span>`,
    iconSize: [120, 20],
    iconAnchor: [-10, -2]
  });
  L.marker([-23.26, 30], { icon: stLabel, interactive: false }).addTo(graticuleLayerGroup);
};

// 开始游戏
const startGame = () => {
  round.value = 0;
  score.value = 0;
  totalTime.value = 0;
  feedbackMsg.value = '';
  gameState.value = 'playing';
  
  clearInterval(totalTimeInterval);
  totalTimeInterval = setInterval(() => {
    if (gameState.value === 'playing') {
      totalTime.value += 0.1;
    }
  }, 100);

  nextRound();
};

// 下一回合
const nextRound = () => {
  if (round.value >= 10) {
    endGame();
    return;
  }

  clearRoundLayers();

  round.value++;
  gameState.value = 'playing';
  feedbackMsg.value = '';
  countdown.value = 20; 

  // 1. 随机生成 10 个候选点位
  const points = [];
  for (let i = 0; i < 10; i++) {
    const lat = (Math.random() * 140) - 70; 
    const lng = (Math.random() * 320) - 160; 
    points.push({ lat, lng, id: i + 1 });
  }

  // 2. 从中抽取一个作为正确目标
  const targetIndex = Math.floor(Math.random() * 10);
  const targetPoint = points[targetIndex];
  targetLat.value = targetPoint.lat;
  targetLng.value = targetPoint.lng;

  // 3. 将 10 个候选点渲染到地图上
  points.forEach((pt) => {
    const numberIcon = L.divIcon({
      className: 'custom-number-icon',
      html: `<div class="marker-peer">${pt.id}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([pt.lat, pt.lng], { icon: numberIcon }).addTo(map);
    
    marker.on('click', () => {
      if (gameState.value === 'playing') {
        handleChoice(pt);
      }
    });

    candidateMarkers.push({ marker, pt });
  });

  // 4. 开启 20s 倒计时
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleRoundEnd(false, 'timeout', null);
    }
  }, 1000);
};

// 玩家选择
const handleChoice = (chosenPoint) => {
  const isCorrect = (chosenPoint.lat === targetLat.value && chosenPoint.lng === targetLng.value);
  handleRoundEnd(isCorrect, isCorrect ? 'success' : 'wrong', chosenPoint);
};

// 回合结算
const handleRoundEnd = (isCorrect, reason, chosenPoint) => {
  clearInterval(countdownInterval);
  gameState.value = 'round-ended';

  const targetLatLng = L.latLng(targetLat.value, targetLng.value);

  // 修改所有点的样式揭晓答案
  candidateMarkers.forEach(({ marker, pt }) => {
    const isThisTarget = (pt.lat === targetLat.value && pt.lng === targetLng.value);
    
    let bgClass = '';
    if (isThisTarget) {
      bgClass = 'marker-peer-correct'; 
    } else if (chosenPoint && pt.id === chosenPoint.id) {
      bgClass = 'marker-peer-wrong';   
    }

    marker.setIcon(L.divIcon({
      className: 'custom-number-icon',
      html: `<div class="marker-peer ${bgClass}">${pt.id}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }));
  });

  if (reason === 'timeout') {
    feedbackStatus.value = 'error';
    feedbackMsg.value = `超时啦！正确答案是标绿的数字。`;
  } else if (isCorrect) {
    score.value++;
    feedbackStatus.value = 'success';
    feedbackMsg.value = '极其精准！恭喜你答对了！';
  } else {
    feedbackStatus.value = 'error';
    feedbackMsg.value = `答错了！你选的是 ${chosenPoint.id} 号，正确答案是标绿的那个。`;
    
    const chosenLatLng = L.latLng(chosenPoint.lat, chosenPoint.lng);
    resultLine = L.polyline([chosenLatLng, targetLatLng], {
      color: '#ff3366',
      dashArray: '5, 5',
      weight: 2
    }).addTo(map);
  }
};

const endGame = () => {
  gameState.value = 'game-over';
  clearInterval(totalTimeInterval);
  clearRoundLayers();
  feedbackStatus.value = 'success';
  feedbackMsg.value = `游戏结束！最终得分：${score.value}/10，总耗时：${totalTime.value.toFixed(1)} 秒。`;
};

const clearRoundLayers = () => {
  candidateMarkers.forEach(({ marker }) => {
    if (map) map.removeLayer(marker);
  });
  candidateMarkers.length = 0;

  if (resultLine && map) {
    map.removeLayer(resultLine);
    resultLine = null;
  }
};
</script>

<style>
/* Leaflet 地图文字标签及数字图标的全局样式 */
.graticule-text-label {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 12px;
  white-space: nowrap;
  text-shadow: 1px 1px 1px #ffffff, -1px -1px 1px #ffffff, 1px -1px 1px #ffffff, -1px 1px 1px #ffffff; 
}
.custom-number-icon {
  background: none !important;
  border: none !important;
}
.marker-peer {
  width: 32px;
  height: 32px;
  background: rgba(0, 119, 182, 0.9);
  border: 2px solid #2ec4b6;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}
.marker-peer:hover {
  transform: scale(1.2);
  background: #2ec4b6;
}
.marker-peer-correct {
  background: #2ec4b6 !important;
  border-color: #fff !important;
  box-shadow: 0 0 15px #2ec4b6;
  transform: scale(1.2);
}
.marker-peer-wrong {
  background: #ff3366 !important;
  border-color: #fff !important;
  box-shadow: 0 0 15px #ff3366;
}

/* 确保右下角的放大缩小控件不贴紧屏幕边缘 */
.leaflet-bottom.leaflet-right {
  margin-bottom: 20px;
  margin-right: 20px;
}
</style>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 统一的面板样式 */
.panel {
  position: absolute;
  z-index: 1000;
  background: rgba(1, 22, 39, 0.88); 
  backdrop-filter: blur(8px);
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 12px;
  color: #fff;
  padding: 15px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 左上角面板强化 */
.top-left {
  top: 20px;
  left: 20px;
  min-width: 240px;
}
.panel-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #2ec4b6;
  letter-spacing: 0.5px;
}
.coord-box p {
  margin: 4px 0;
  font-size: 14px;
  color: #a0c4c4;
}
.coord-box .highlight-coord {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  background: rgba(46, 196, 182, 0.15);
  padding: 6px 12px;
  border-radius: 6px;
  margin: 6px 0;
  border-left: 3px solid #2ec4b6;
}
.tip-box {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px dashed rgba(255,255,255,0.15);
  padding-top: 10px;
  line-height: 1.4;
}

/* 中间上方：数据记录 */
.top-center {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 30px;
}
.stats-box {
  display: flex;
  gap: 30px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-item .label {
  font-size: 12px;
  color: #a0c4c4;
  margin-bottom: 4px;
}
.stat-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #2ec4b6;
}

/* 右上角：倒计时 */
.top-right {
  top: 20px;
  right: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  padding: 0;
  border: 3px solid #2ec4b6;
  background: linear-gradient(135deg, #011627, #0a4b52);
}
.countdown-wrapper {
  display: flex;
  align-items: baseline;
  transition: all 0.3s ease;
}
.countdown-wrapper .time {
  font-size: 32px;
  font-weight: bold;
  color: #2ec4b6;
}
.countdown-wrapper .unit {
  font-size: 14px;
  color: #a0c4c4;
  margin-left: 2px;
}

/* 倒计时 5s 危险状态动画 */
.danger-pulse .time,
.danger-pulse .unit {
  color: #ff3366 !important;
}
.danger-pulse {
  animation: pulse-shake 0.4s infinite;
}

@keyframes pulse-shake {
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.2) rotate(-3deg); }
  50% { transform: scale(1) rotate(0deg); }
  75% { transform: scale(1.2) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* 下方中间 */
.bottom-center {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.action-btn {
  background: linear-gradient(135deg, #2ec4b6, #0077b6);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(46, 196, 182, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  letter-spacing: 1px;
}
.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 196, 182, 0.6);
}
.action-btn:active {
  transform: translateY(1px);
}
.next-btn {
  background: linear-gradient(135deg, #ff9f1c, #e76f51);
  box-shadow: 0 4px 15px rgba(255, 159, 28, 0.4);
}
.next-btn:hover {
  box-shadow: 0 6px 20px rgba(255, 159, 28, 0.6);
}

.feedback-msg {
  padding: 10px 25px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 16px;
  animation: fadeIn 0.3s ease;
}
.feedback-msg.success {
  background-color: rgba(46, 196, 182, 0.9);
  color: #fff;
}
.feedback-msg.error {
  background-color: rgba(255, 51, 102, 0.9);
  color: #fff;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>