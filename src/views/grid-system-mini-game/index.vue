<template>
  <div class="game-container">
    <div id="map" class="map-container"></div>
    <div class="coordinate-labels" aria-hidden="true">
      <div
        v-for="label in edgeLabels"
        :key="label.id"
        class="graticule-text-label edge-label"
        :class="`edge-label-${label.axis}`"
        :style="{ left: label.axis === 'lng' ? `${label.position}px` : undefined, top: `${label.top}px`, color: label.color }"
      ><span>{{ label.text }}</span></div>
    </div>

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
          <span class="value">{{ round }}/{{ totalQuestions }}</span>
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

    <button ref="settingsButton" class="settings-button" type="button" @click="openSettings">
      出题设置
    </button>

    <dialog ref="settingsDialog" class="settings-dialog" aria-labelledby="settings-title" @close="handleSettingsClose">
      <form @submit.prevent="saveSettings">
        <div class="settings-heading">
          <h2 id="settings-title">出题设置</h2>
          <button type="button" class="close-button" aria-label="关闭设置" @click="settingsDialog.close()">×</button>
        </div>

        <fieldset>
          <legend><label for="question-region">出题范围</label></legend>
          <select id="question-region" v-model="settingsDraft.region" class="region-select" @change="refillQuestions">
            <option v-for="region in regionOptions" :key="region.value" :value="region.value">{{ region.label }}</option>
          </select>
          <p class="settings-help">{{ regionDescriptions[settingsDraft.region] }}随机生成的位置遵守所选范围，老师手动填写的目标不受半球限制。</p>
        </fieldset>

        <fieldset>
          <legend>目标位置</legend>
          <div class="settings-options">
            <label><input v-model="settingsDraft.mode" type="radio" value="random" name="question-mode">随机出题</label>
            <label><input v-model="settingsDraft.mode" type="radio" value="custom" name="question-mode">自定义题组</label>
          </div>
        </fieldset>

        <div v-if="settingsDraft.mode === 'custom'" class="custom-questions">
          <div class="question-list-heading">
            <strong>共 {{ settingsDraft.questions.length }} 题（1–10 题）</strong>
            <div class="question-edit-actions">
              <button type="button" class="question-edit-button" @click="refillQuestions">按范围随机填充</button>
              <button type="button" class="question-edit-button" :disabled="settingsDraft.questions.length >= 10" @click="addQuestion">添加一题</button>
            </div>
          </div>
          <p id="coordinate-help" class="settings-help">默认随机填充 10 题，可修改或删除；切换范围会按当前题数重新填充，新增题目也会自动填充。按列表顺序出题，每题另生成 19 个随机干扰点。纬度 0–85°、经度 0–180°，最多两位小数。</p>
          <div class="question-list">
            <div v-for="(question, index) in settingsDraft.questions" :key="index" class="question-card" role="group" :aria-label="`第 ${index + 1} 题目标位置`">
              <div class="question-list-heading">
                <strong>第 {{ index + 1 }} 题</strong>
                <button type="button" class="question-edit-button" :disabled="settingsDraft.questions.length <= 1" :aria-label="`删除第 ${index + 1} 题`" @click="removeQuestion(index)">删除</button>
              </div>
              <div class="coordinate-input-row">
                <label :for="`question-latitude-${index}`">纬度</label>
                <select v-model="question.latDirection" :aria-label="`第 ${index + 1} 题纬度方向`">
                  <option value="N">北纬 N</option>
                  <option value="S">南纬 S</option>
                </select>
                <input :id="`question-latitude-${index}`" v-model.number="question.latDegrees" type="number" min="0" max="85" step="0.01" required aria-describedby="coordinate-help">
                <span>°</span>
              </div>
              <div class="coordinate-input-row">
                <label :for="`question-longitude-${index}`">经度</label>
                <select v-model="question.lngDirection" :aria-label="`第 ${index + 1} 题经度方向`">
                  <option value="E">东经 E</option>
                  <option value="W">西经 W</option>
                </select>
                <input :id="`question-longitude-${index}`" v-model.number="question.lngDegrees" type="number" min="0" max="180" step="0.01" required aria-describedby="coordinate-help">
                <span>°</span>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="settings-help">每局固定 10 题。每题随机生成 20 个候选点，并从中选取目标位置。</p>

        <fieldset>
          <legend>目标坐标显示</legend>
          <div class="settings-options">
            <label><input v-model="settingsDraft.coordinateFormat" type="radio" value="chinese" name="coordinate-format">中文方向</label>
            <label><input v-model="settingsDraft.coordinateFormat" type="radio" value="letters" name="coordinate-format">方向字母</label>
          </div>
          <p class="format-example">{{ settingsDraft.coordinateFormat === 'letters' ? '示例：30.00°N，120.00°E' : '示例：北纬 30.00°，东经 120.00°' }}</p>
        </fieldset>

        <p class="settings-help">{{ gameState === 'playing' || gameState === 'round-ended' ? '设置期间计时暂停。修改出题范围、方式或题组后，将从第 1 题重新开始，重置得分和用时；仅切换显示方式保留当前进度。' : '保存后，下次开始游戏时使用这些设置。' }}</p>
        <p v-if="settingsError" class="settings-error" role="alert">{{ settingsError }}</p>
        <div class="settings-actions">
          <button type="button" class="cancel-button" @click="settingsDialog.close()">取消</button>
          <button type="submit" class="save-button">{{ restartRequired ? '保存并重新开始' : '保存设置' }}</button>
        </div>
      </form>
    </dialog>

    <div class="bottom-center">
      <div v-if="feedbackMsg" class="feedback-msg" :class="feedbackStatus">
        {{ feedbackMsg }}
      </div>

      <button v-if="gameState === 'idle' || gameState === 'game-over'" class="action-btn" @click="startGame">
        {{ gameState === 'idle' ? '生成点位 (开始游戏)' : '重新开始' }}
      </button>

      <button v-if="gameState === 'round-ended'" class="action-btn next-btn" @click="nextRound">
        {{ round < totalQuestions ? '生成下一题' : '查看最终结果' }} </button>

      <button v-if="gameState === 'playing' || gameState === 'round-ended'" type="button" class="end-game-button" @click="endGame(true)">
        结束本局
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
const regionOptions = [
  { value: 'all', label: '不限制' },
  { value: 'north', label: '北半球' },
  { value: 'south', label: '南半球' },
  { value: 'east', label: '东半球' },
  { value: 'west', label: '西半球' }
];
const regionDescriptions = {
  all: '不限定半球。',
  north: '赤道以北，不含赤道。',
  south: '赤道以南，不含赤道。',
  east: '西经 20° 向东至东经 160°，不含两条分界线。',
  west: '东经 160° 向东跨越 180° 至西经 20°，不含两条分界线。'
};
const questionToPoint = question => ({
  lat: question.latDegrees * (question.latDirection === 'S' ? -1 : 1),
  lng: question.lngDegrees * (question.lngDirection === 'W' ? -1 : 1)
});
const pointToQuestion = ({ lat, lng }) => ({
  latDegrees: Math.abs(lat), latDirection: lat < 0 ? 'S' : 'N',
  lngDegrees: Math.abs(lng), lngDirection: lng < 0 ? 'W' : 'E'
});
// 在百分之一度的整数网格上取样，避免四舍五入到半球分界线上。
const randomInteger = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const createRandomPoint = region => {
  const lat = region === 'north' ? randomInteger(1, 7000)
    : region === 'south' ? randomInteger(-7000, -1) : randomInteger(-7000, 7000);
  let lng;
  if (region === 'east') {
    lng = randomInteger(-1999, 15999);
  } else if (region === 'west') {
    // 连续取样西半球，再将超出 180° 的部分换算为西经。
    lng = randomInteger(16001, 33999);
    if (lng > 18000) lng -= 36000;
  } else {
    lng = randomInteger(-18000, 17999);
  }
  return { lat: lat / 100, lng: lng / 100 };
};
const coordinateKey = ({ lat, lng }) => `${lat},${Math.abs(lng) === 180 ? -180 : lng}`;
const createRandomQuestions = (count, region, existing = []) => {
  const usedCoordinates = new Set(existing.map(question => coordinateKey(questionToPoint(question))));
  return Array.from({ length: count }, () => {
    let point;
    do {
      point = createRandomPoint(region);
    } while (usedCoordinates.has(coordinateKey(point)));
    usedCoordinates.add(coordinateKey(point));
    return pointToQuestion(point);
  });
};
const cloneSettings = value => ({ ...value, questions: value.questions.map(question => ({ ...question })) });
const settings = ref({
  mode: 'random', region: 'all', coordinateFormat: 'chinese', questions: createRandomQuestions(10, 'all')
});
const settingsDraft = ref(cloneSettings(settings.value));
// 固定本局题组，结算后修改设置也不会改变上一局的分母。
const sessionSettings = ref(cloneSettings(settings.value));
const totalQuestions = computed(() => {
  const source = gameState.value === 'idle' ? settings.value : sessionSettings.value;
  return source.mode === 'custom' ? source.questions.length : 10;
});
const restartRequired = computed(() => {
  if (gameState.value !== 'playing' && gameState.value !== 'round-ended') return false;
  const draft = settingsDraft.value;
  return sessionSettings.value.mode !== draft.mode || sessionSettings.value.region !== draft.region || (draft.mode === 'custom'
    && JSON.stringify(sessionSettings.value.questions) !== JSON.stringify(draft.questions));
});
const settingsDialog = ref(null);
const settingsButton = ref(null);
const settingsOpen = ref(false);
const settingsError = ref('');

const openSettings = () => {
  settingsDraft.value = cloneSettings(settings.value);
  settingsError.value = '';
  settingsOpen.value = true;
  settingsDialog.value.showModal();
};

const handleSettingsClose = () => {
  settingsOpen.value = false;
  settingsButton.value?.focus();
};

const addQuestion = () => {
  if (settingsDraft.value.questions.length >= 10) return;
  settingsDraft.value.questions.push(...createRandomQuestions(1, settingsDraft.value.region, settingsDraft.value.questions));
  settingsError.value = '';
};

const refillQuestions = () => {
  settingsDraft.value.questions = createRandomQuestions(settingsDraft.value.questions.length, settingsDraft.value.region);
  settingsError.value = '';
};

const removeQuestion = (index) => {
  if (settingsDraft.value.questions.length <= 1) return;
  settingsDraft.value.questions.splice(index, 1);
  settingsError.value = '';
};

const saveSettings = () => {
  const draft = settingsDraft.value;
  if (!regionOptions.some(region => region.value === draft.region)) {
    settingsError.value = '请选择有效的出题范围。';
    return;
  }
  if (draft.mode === 'custom') {
    if (draft.questions.length < 1 || draft.questions.length > 10) {
      settingsError.value = '自定义题组至少 1 题，最多 10 题。';
      return;
    }
    const validDegree = (value, max) => typeof value === 'number' && Number.isFinite(value)
      && value >= 0 && value <= max && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
    const invalidIndex = draft.questions.findIndex(question => !validDegree(question.latDegrees, 85)
      || !validDegree(question.lngDegrees, 180)
      || !['N', 'S'].includes(question.latDirection) || !['E', 'W'].includes(question.lngDirection));
    if (invalidIndex !== -1) {
      settingsError.value = `第 ${invalidIndex + 1} 题坐标无效：纬度 0–85°，经度 0–180°，最多两位小数。`;
      return;
    }
  }
  const shouldRestart = restartRequired.value;
  settings.value = cloneSettings(draft);
  if (shouldRestart) startGame();
  settingsDialog.value.close();
};

// 计时器引用
let countdownInterval = null;
let totalTimeInterval = null;

// 地图与图层引用
let map = null;
let graticuleLayerGroup = null; // 经纬网图层组
const edgeLabels = ref([]);
const graticuleLabels = [];
const candidateMarkers = [];     // 存储当前回合的20个候选点
let resultLine = null;          // 答错连线

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  clearInterval(countdownInterval);
  clearInterval(totalTimeInterval);
  if (map) {
    map.off('move zoom resize', updateEdgeLabels);
    map.remove();
  }
});

// 根据设置切换目标坐标的中文方向和方向字母。
const formatLat = (lat) => {
  if (settings.value.coordinateFormat === 'letters') {
    return `${Math.abs(lat).toFixed(2)}°${lat > 0 ? 'N' : lat < 0 ? 'S' : ''}`;
  }
  if (lat > 0) return `北纬 ${lat.toFixed(2)}°`;
  if (lat < 0) return `南纬 ${Math.abs(lat).toFixed(2)}°`;
  return '赤道 (0.00°)';
};

const formatLng = (lng) => {
  if (Math.abs(lng) === 180) return '180.00°';
  if (settings.value.coordinateFormat === 'letters') {
    return `${Math.abs(lng).toFixed(2)}°${lng > 0 ? 'E' : lng < 0 ? 'W' : ''}`;
  }
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
    maxZoom: 5,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0,
    zoomControl: false // 1. 禁用默认的左上角放大缩小控件
  });

  // 2. 手动将放大缩小控件添加到右下角
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // 使用 OpenStreetMap 瓦片
  L.tileLayer('/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 初始化经纬网图层
  graticuleLayerGroup = L.layerGroup().addTo(map);
  drawGraticule();
  map.on('move zoom resize', updateEdgeLabels);
  updateEdgeLabels();
};

// 标签使用容器像素坐标，始终贴在当前视口顶部和右侧。
const updateEdgeLabels = () => {
  if (!map) return;
  const { x: width, y: height } = map.getSize();
  const center = map.getCenter();
  edgeLabels.value = graticuleLabels.flatMap((label) => {
    const isLongitude = label.axis === 'lng';
    const point = map.latLngToContainerPoint(
      isLongitude ? [center.lat, label.value] : [label.value, center.lng]
    );
    const position = isLongitude ? point.x : point.y;
    const limit = isLongitude ? width : height;
    if (position < 0 || position > limit) return [];

    return [{
      ...label,
      position: Math.max(30, Math.min(width - 30, position)),
      top: isLongitude
        ? ((label.value / 15) % 2 === 0 ? 6 : 34)
        : Math.max(14, Math.min(height - 14, position))
    }];
  });
};

// 绘制经纬网及度数标签
const drawGraticule = () => {
  graticuleLayerGroup.clearLayers();
  graticuleLabels.length = 0;

  // 普通经纬线为细实线，赤道为红色实线，回归线为黄色虚线，极圈为蓝色虚线。
  const lineColor = '#334155';
  const labelColor = '#0f172a';
  const equatorColor = '#c1121f';

  // 1. 绘制纬线 (从-75到75，每15度一条)，度数显示在视口右侧。
  for (let lat = -75; lat <= 75; lat += 15) {
    const isEquator = lat === 0;
    L.polyline([[lat, -180], [lat, 180]], {
      color: isEquator ? equatorColor : lineColor,
      weight: isEquator ? 3 : 1.8,
      opacity: isEquator ? 1 : 0.85
    }).addTo(graticuleLayerGroup);

    let latLabel = lat === 0 ? '0° (赤道)' : (lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`);
    graticuleLabels.push({
      id: `lat-${lat}`, axis: 'lat', value: lat,
      text: latLabel, color: isEquator ? equatorColor : labelColor
    });
  }

  // 2. 绘制经线 (从-180到180，每15度一条)，度数显示在视口顶部。
  for (let lng = -180; lng <= 180; lng += 15) {
    const isPrimeMeridian = lng === 0;
    L.polyline([[-85, lng], [85, lng]], {
      color: isPrimeMeridian ? '#333' : lineColor,
      weight: isPrimeMeridian ? 2.6 : 1.8,
      opacity: isPrimeMeridian ? 1 : 0.85
    }).addTo(graticuleLayerGroup);

    let lngLabel = lng === 0 ? '0°' : (lng > 0 ? `${lng}°E` : `${Math.abs(lng)}°W`);
    if (lng === 180 || lng === -180) lngLabel = '180°';

    graticuleLabels.push({
      id: `lng-${lng}`, axis: 'lng', value: lng,
      text: lngLabel, color: isPrimeMeridian ? '#c1121f' : labelColor
    });
  }

  // 3. 绘制南北回归线和南北极圈；黄色线的标签使用深黄色以提高对比度。
  const tropicColor = '#facc15';
  const polarCircleColor = '#2563eb';
  // 度分须先换算成十进制度，23°26′ 并非 23.26°。
  const tropicLatitude = 23 + 26 / 60;
  const polarCircleLatitude = 90 - tropicLatitude;
  const specialLatitudes = [
    { lat: tropicLatitude, name: '北回归线', latitudeLabel: '23°26′N', color: tropicColor, textColor: '#854d0e' },
    { lat: -tropicLatitude, name: '南回归线', latitudeLabel: '23°26′S', color: tropicColor, textColor: '#854d0e' },
    { lat: polarCircleLatitude, name: '北极圈', latitudeLabel: '66°34′N', color: polarCircleColor },
    { lat: -polarCircleLatitude, name: '南极圈', latitudeLabel: '66°34′S', color: polarCircleColor }
  ];

  specialLatitudes.forEach(({ lat, name, latitudeLabel, color, textColor = color }) => {
    L.polyline([[lat, -180], [lat, 180]], {
      color,
      weight: 2.4,
      opacity: 1,
      dashArray: '8, 6'
    }).addTo(graticuleLayerGroup);

    graticuleLabels.push({
      id: `lat-${lat}`, axis: 'lat', value: lat,
      text: `${name} (${latitudeLabel})`, color: textColor
    });
  });
};

// 开始游戏
const startGame = () => {
  sessionSettings.value = cloneSettings(settings.value);
  round.value = 0;
  score.value = 0;
  totalTime.value = 0;
  feedbackMsg.value = '';
  gameState.value = 'playing';

  clearInterval(totalTimeInterval);
  totalTimeInterval = setInterval(() => {
    if (gameState.value === 'playing' && !settingsOpen.value) {
      totalTime.value += 0.1;
    }
  }, 100);

  nextRound();
};

// 下一回合
const nextRound = () => {
  if (round.value >= totalQuestions.value) {
    endGame();
    return;
  }

  round.value++;
  generateRound();
};

// 按本局模式生成当前题目。
const generateRound = () => {
  clearInterval(countdownInterval);
  clearRoundLayers();
  gameState.value = 'playing';
  feedbackMsg.value = '';
  countdown.value = 20;

  // 按题组顺序取目标，但候选点编号随机，避免答案固定在同一编号。
  const targetIndex = Math.floor(Math.random() * 20);
  const question = sessionSettings.value.mode === 'custom' ? sessionSettings.value.questions[round.value - 1] : null;
  const customTarget = question ? questionToPoint(question) : null;
  const usedCoordinates = new Set(customTarget ? [coordinateKey(customTarget)] : []);
  const points = [];
  for (let i = 0; i < 20; i++) {
    let point;
    if (customTarget && i === targetIndex) {
      point = customTarget;
    } else {
      // 使用与题面一致的两位小数，且避免出现重复坐标。
      do {
        point = createRandomPoint(sessionSettings.value.region);
      } while (usedCoordinates.has(coordinateKey(point)));
      usedCoordinates.add(coordinateKey(point));
    }
    points.push({ ...point, id: i + 1 });
  }

  const targetPoint = points[targetIndex];
  targetLat.value = targetPoint.lat;
  targetLng.value = targetPoint.lng;

  // 将 20 个候选点渲染到地图上。
  points.forEach((pt) => {
    const numberIcon = L.divIcon({
      className: 'custom-number-icon',
      html: `<div class="marker-peer">${pt.id}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([pt.lat, pt.lng], { icon: numberIcon }).addTo(map);

    marker.on('click', () => {
      if (gameState.value === 'playing' && !settingsOpen.value) {
        handleChoice(pt);
      }
    });

    candidateMarkers.push({ marker, pt });
  });

  // 4. 开启 20s 倒计时
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (settingsOpen.value || gameState.value !== 'playing') return;
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

const endGame = (forced = false) => {
  if (gameState.value !== 'playing' && gameState.value !== 'round-ended') return;
  gameState.value = 'game-over';
  clearInterval(countdownInterval);
  clearInterval(totalTimeInterval);
  countdownInterval = null;
  totalTimeInterval = null;
  clearRoundLayers();
  feedbackStatus.value = 'success';
  feedbackMsg.value = `${forced ? '本局已提前结束！' : '游戏结束！'}最终得分：${score.value}/${totalQuestions.value}，总耗时：${totalTime.value.toFixed(1)} 秒。`;
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
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
  pointer-events: none;
}

.graticule-text-label > span {
  display: inline-block;
  padding: 2px 5px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(51, 65, 85, 0.25);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.custom-number-icon {
  background: none !important;
  border: none !important;
}

.marker-peer {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #2ec4b6;
  border-radius: 50%;
  color: #1a1a2e;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.marker-peer:hover {
  transform: scale(1.2);
  background: #2ec4b6;
  color: white;
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
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.coordinate-labels {
  position: absolute;
  inset: 0;
  z-index: 1100;
  pointer-events: none;
  overflow: hidden;
}

.edge-label {
  position: absolute;
}

.edge-label-lng {
  transform: translateX(-50%);
}

.edge-label-lat {
  right: 6px;
  transform: translateY(-50%);
}

.edge-label-lat > span {
  padding-block: 1px;
}

.settings-button {
  position: absolute;
  left: 20px;
  bottom: 24px;
  z-index: 1000;
  padding: 11px 20px;
  border: 1px solid rgba(46, 196, 182, 0.6);
  border-radius: 10px;
  background: rgba(1, 22, 39, 0.94);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.settings-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  box-sizing: border-box;
  width: 460px;
  height: fit-content;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #2ec4b6;
  border-radius: 16px;
  background: #0b2535;
  color: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.settings-dialog::backdrop {
  background: rgba(1, 16, 27, 0.55);
}

.settings-heading,
.settings-actions,
.settings-options {
  display: flex;
  align-items: center;
  gap: 16px;
}

.settings-heading {
  justify-content: space-between;
  margin-bottom: 20px;
}

.settings-heading h2 {
  margin: 0;
  font-size: 20px;
}

.settings-dialog button,
.settings-dialog input,
.settings-dialog select {
  font: inherit;
}

.settings-dialog fieldset {
  margin: 0 0 14px;
  padding: 0;
  border: none;
}

.settings-dialog legend {
  margin-bottom: 12px;
  color: #7ee4d9;
  font-weight: bold;
}

.settings-options {
  flex-wrap: wrap;
}

.settings-options label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.settings-options input {
  accent-color: #2ec4b6;
}

.custom-questions {
  margin-bottom: 20px;
}

.question-list-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
}

.question-edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-list {
  max-height: 34vh;
  overflow-y: auto;
  padding-right: 6px;
}

.question-card {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #35566b;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.question-card:last-child {
  margin-bottom: 0;
}

.question-edit-button {
  border: 1px solid #557589;
  border-radius: 6px;
  padding: 5px 10px;
  background: transparent;
  color: #c8fff8;
  cursor: pointer;
}

.question-edit-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.coordinate-input-row {
  display: grid;
  grid-template-columns: 36px 100px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.coordinate-input-row input,
.coordinate-input-row select,
.region-select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid #557589;
  border-radius: 6px;
  background: #fff;
  color: #102a3a;
}

.settings-help {
  margin: 12px 0 20px;
  color: #b5c9d5;
  font-size: 13px;
  line-height: 1.6;
}

.format-example {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(46, 196, 182, 0.12);
  color: #c8fff8;
  font-size: 14px;
}

.settings-error {
  color: #ffacb9;
  font-size: 13px;
}

.settings-actions {
  justify-content: flex-end;
}

.settings-actions button {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.cancel-button {
  border: 1px solid #557589;
  background: transparent;
  color: #fff;
}

.save-button {
  border: 1px solid #2ec4b6;
  background: #2ec4b6;
  color: #06232c;
  font-weight: bold !important;
}

.close-button {
  border: none;
  padding: 2px 8px;
  background: transparent;
  color: #d8e7ed;
  font-size: 26px !important;
  cursor: pointer;
}

.settings-button:focus-visible,
.settings-dialog :focus-visible {
  outline: 2px solid #7ee4d9;
  outline-offset: 3px;
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
  top: 74px;
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
  border-top: 1px dashed rgba(255, 255, 255, 0.15);
  padding-top: 10px;
  line-height: 1.4;
}

/* 中间上方：数据记录 */
.top-center {
  top: 74px;
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
  top: 74px;
  right: 190px;
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
  0% {
    transform: scale(1) rotate(0deg);
  }

  25% {
    transform: scale(1.2) rotate(-3deg);
  }

  50% {
    transform: scale(1) rotate(0deg);
  }

  75% {
    transform: scale(1.2) rotate(3deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
  }
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

.end-game-button {
  padding: 9px 22px;
  border: 1px solid #ff8299;
  border-radius: 20px;
  background: rgba(64, 17, 32, 0.92);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.end-game-button:hover {
  background: #922841;
}

.end-game-button:focus-visible {
  outline: 2px solid #ff8299;
  outline-offset: 3px;
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
