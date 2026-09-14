<template>
  <div class="lunar-lab geo-template-page theme-dark"
    :class="{ 'is-split': splitView, 'panels-hidden': !panelsVisible, 'is-resizing': resizing }"
    :style="{ '--timeline-height': `${timelineHeight}px` }">
    <header class="lab-header">
      <div class="lab-brand">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="智地有申" />
        <span class="brand-divider"></span>
        <h1 class="lab-title">月相模拟</h1>
      </div>
      <nav class="view-switch" aria-label="场景视角">
        <button v-for="view in views" :key="view.value" class="theme-btn view-toggle" type="button"
          :class="{ active: selectedViews.includes(view.value) }" :aria-pressed="selectedViews.includes(view.value)"
          :title="selectedViews.length === 1 && selectedViews.includes(view.value) ? '至少保留一个视图' : '可同时开启两个视图'"
          @click="toggleView(view.value)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path :d="view.icon" />
          </svg>
          <span>{{ view.label }}</span>
          <span class="view-check" aria-hidden="true"><svg v-if="selectedViews.includes(view.value)" viewBox="0 0 16 16"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m4 8 2.5 2.5L12 5" />
            </svg></span>
        </button>
      </nav>
      <div class="header-tools">
        <button class="theme-btn quiet-button reset-button" type="button" title="恢复初始观测参数和视角" @click="resetAll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
          </svg><span>重置</span>
        </button>
        <button class="theme-btn quiet-button" type="button" :class="{ active: !panelsVisible }"
          :aria-pressed="!panelsVisible" @click="panelsVisible = !panelsVisible">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M15 4v16" />
          </svg>
          <span>{{ panelsVisible ? '收起面板' : '显示面板' }}</span>
        </button>
      </div>
    </header>

    <main ref="stageRef" class="scene-stage" aria-label="月相交互观察场景">
      <section v-for="view in views" :id="`${view.value}-pane`" :key="view.value"
        v-show="selectedViews.includes(view.value)" class="scene-pane"
        :class="{ 'ground-pane': isGroundView(view.value) }" :aria-label="view.label"
        :style="{ flexBasis: splitView ? `${view.value === 'orbit' ? splitPercent : 100 - splitPercent}%` : '100%' }">
        <div :ref="element => setSceneRef(view.value, element)" class="scene-canvas"
          :aria-label="isGroundView(view.value) ? '第一人称天空，拖动或使用方向键环顾' : surfaceView ? '3D地表观测点，拖动环顾月球' : '地月空间场景，拖动旋转，滚轮缩放'">
        </div>
        <div v-if="view.value === 'orbit' && !surfaceView" class="sunlight-halo" aria-hidden="true"></div>
        <div class="scene-vignette" aria-hidden="true"></div>
        <div class="scene-heading">
          <div class="eyebrow"><span class="live-dot"></span>{{ view.value === 'orbit' ? surfaceView ? '空间视角 · 已抵达观测点' :
            '空间视角' : '第一人称' }}</div>
          <p>{{ view.value === 'orbit' ? spaceStation.name : locationLabel }} · 当地太阳时 {{ formatHour(view.value ===
            'orbit' ? spaceObservation.localSolarHour : observation.localSolarHour) }}</p>
          <div v-if="view.value === 'orbit'" class="space-focus-switch" aria-label="空间视角中心">
            <button type="button" class="theme-btn" :class="{ active: !surfaceView && spaceFocus === 'earth' }"
              :aria-pressed="!surfaceView && spaceFocus === 'earth'" @click="focusSpaceBody('earth')"><svg
                viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <circle cx="10" cy="10" r="7" />
                <ellipse cx="10" cy="10" rx="3" ry="7" />
                <path d="M3 10h14" />
              </svg>以地球为中心</button>
            <button type="button" class="theme-btn" :class="{ active: !surfaceView && spaceFocus === 'moon' }"
              :aria-pressed="!surfaceView && spaceFocus === 'moon'" @click="focusSpaceBody('moon')"><svg
                viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <circle cx="10" cy="10" r="7" />
                <circle cx="8" cy="7" r="1.4" />
                <circle cx="12" cy="12" r="2" />
                <path d="M5.5 12.5h1" />
              </svg>以月球为中心</button>
          </div>
          <div v-if="view.value === 'orbit'" class="space-observer-switch" aria-label="空间视图观察者">
            <button type="button" class="theme-btn" :class="{ active: !surfaceView && !spaceFocus }"
              :aria-pressed="!surfaceView && !spaceFocus" @click="returnToOverview">全景</button>
            <button v-for="station in stations" :key="station.id" type="button" class="theme-btn"
              :class="{ active: surfaceView && spaceStation.id === station.id }"
              :aria-pressed="surfaceView && spaceStation.id === station.id" :aria-label="`从${station.name}地表观察月球`"
              :title="`将空间相机移到${station.name}，从地表观察月球`" @click="viewFromStation(station.id)"><i
                :style="{ background: station.color }"></i>{{ station.name }}</button>
          </div>
          <div v-if="view.value === 'observer'" class="observer-heading-actions">
            <button type="button" class="theme-btn" @click="resetView('observer')"><svg viewBox="0 0 20 20" fill="none"
                stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path d="M3 8a7 7 0 1 1 1 7M3 3v5h5" />
              </svg>恢复视线</button>
            <button type="button" class="theme-btn follow-toggle" :class="{ active: moonFollowing.observer }"
              :aria-pressed="moonFollowing.observer" :aria-label="moonFollowing.observer ? '关闭月亮跟随' : '开启月亮跟随'"
              @click="toggleMoonFollowing"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"
                aria-hidden="true">
                <circle cx="10" cy="10" r="5.5" />
                <path d="M10 1v5M10 14v5M1 10h5M14 10h5" />
                <circle cx="10" cy="10" r="1" fill="currentColor" />
              </svg>跟随月亮</button>
          </div>
          <div v-if="view.value === 'orbit' && surfaceView" class="space-scale-note" role="note" aria-label="空间示意比例说明">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 9v5" />
              <circle cx="10" cy="6" r=".7" fill="currentColor" stroke="none" />
            </svg>
            <div><strong>地月距离为示意比例</strong>
              <p>距离压缩会使月球高度及升落显示产生偏差，请以同一观测点的第一人称视图与面板读数为准。</p>
            </div>
          </div>
          <p v-if="view.value === 'orbit' && surfaceView && !spaceObservation.aboveHorizon" class="space-horizon-note">
            月球在此观测点的地平线以下</p>
          <div v-if="view.value === 'orbit' && !surfaceView && showGuides" class="geometry-legend"><span><i
                class="sightline-key"></i>观测点—月球</span><span><i class="normal-key"></i>地表法线</span></div>
        </div>
        <div v-if="isGroundView(view.value)" class="observer-footer">
          <div class="visibility-note" :class="{ 'below-horizon': !observation.aboveHorizon }">
            <span class="visibility-dot"></span>
            <div class="visibility-copy"><strong>{{ visibilityTitle }}</strong><span>{{ visibilityDescription }}</span>
            </div>
            <div class="visibility-actions">
              <button type="button" class="theme-btn quiet-button" :disabled="!observation.aboveHorizon"
                @click="locateMoon(view.value)">定位月亮 <span>↗</span></button>
              <button type="button" class="theme-btn quiet-button" :aria-label="`同步${locationLabel}的观测视角`"
                @click="syncStationViews(activeStationId)">同步观测视角</button>
            </div>
          </div>
          <div class="observer-hud" aria-label="第一人称视线方位">
            <svg class="heading-dial" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" stroke-opacity=".3" />
              <path d="M22 4v4M40 22h-4M22 40v-4M4 22h4" stroke="currentColor" stroke-opacity=".65" />
              <g :transform="`rotate(${-viewDirections[view.value].heading} 22 22)`">
                <path d="m22 9-5 15 5-3 5 3Z" fill="currentColor" />
                <path d="m22 34-5-10 5 3 5-3Z" fill="currentColor" opacity=".3" />
              </g>
            </svg>
            <div class="heading-readout"><span class="hud-label">方位</span><strong>{{
              compassName(viewDirections[view.value].heading) }} <span>{{
                  viewDirections[view.value].heading.toFixed(0) }}°</span></strong><small>仰角 {{
                    viewDirections[view.value].pitch.toFixed(0) }}°</small></div>
          </div>
        </div>
        <div v-if="errorMessages[view.value]" class="scene-error" role="status"><strong>场景提示</strong>
          <p>{{ errorMessages[view.value] }}</p><button type="button" class="theme-btn active primary-button"
            @click="initializeScene(view.value)">重新加载场景</button>
        </div>
        <div v-else-if="!sceneReady[view.value]" class="scene-loading" role="status"><span></span>正在准备月相场景</div>
      </section>
      <div v-if="splitView" class="view-divider" role="separator" tabindex="0" aria-label="调整左右视图宽度"
        aria-orientation="vertical" aria-controls="orbit-pane observer-pane" :aria-valuenow="Math.round(splitPercent)"
        :aria-valuemin="splitMin" :aria-valuemax="100 - splitMin"
        :aria-valuetext="`空间视角 ${Math.round(splitPercent)}%，第一人称 ${Math.round(100 - splitPercent)}%`"
        :style="{ left: `${splitPercent}%` }" @pointerdown="startResize" @pointermove="resizeSplit"
        @pointerup="stopResize" @pointercancel="stopResize" @lostpointercapture="stopResize"
        @keydown="resizeWithKeyboard" @dblclick="splitPercent = 50"><span class="divider-grip"
          aria-hidden="true"><i></i><i></i></span></div>
    </main>

    <div v-show="panelsVisible" class="station-dock">
      <div class="station-tabs" aria-label="切换主观测点">
        <button v-for="station in stations" :key="station.id" type="button" class="theme-btn"
          :class="{ active: station.id === activeStationId }" :aria-pressed="station.id === activeStationId"
          @click="selectStation(station.id)"><i :style="{ background: station.color }"></i>{{ station.name }}</button>
      </div>
      <button type="button" class="theme-btn station-add" :class="{ active: stationMenuOpen }"
        :aria-expanded="stationMenuOpen" aria-controls="station-picker" @click="stationMenuOpen = !stationMenuOpen">＋
        观测点</button>
      <div v-if="stationMenuOpen" id="station-picker" class="station-picker">
        <div class="picker-heading"><strong>选择对比观测点</strong><span>{{ stations.length }} / 3</span></div>
        <div class="comparison-presets" aria-label="三城市对比组合">
          <button v-for="group in comparisonGroups" :key="group.label" type="button" class="theme-btn"
            :class="{ active: isComparisonSelected(group) }" :aria-pressed="isComparisonSelected(group)"
            :aria-label="`对比${group.names.join('、')}`" @click="comparePresets(group)"><span>{{ group.names.join(' · ')
              }}</span><small>{{ group.label }}</small></button>
        </div>
        <div class="picker-subheading">单个城市</div>
        <div class="preset-regions" aria-label="城市预设地区"><button v-for="group in placeGroups" :key="group.label"
            type="button" class="theme-btn" :class="{ active: presetRegion === group.label }"
            :aria-pressed="presetRegion === group.label" @click="presetRegion = group.label">{{ group.label }}</button>
        </div>
        <div class="place-options"><button v-for="place in visiblePlaces" :key="place.name" type="button"
            class="theme-btn" :class="{ active: hasPreset(place) }"
            :disabled="stations.length >= 3 && !hasPreset(place)" @click="addPreset(place)">{{ place.name }}<small>{{
              place.caption }}</small></button></div>
        <button type="button" class="theme-btn" :disabled="stations.length >= 3" @click="startPicking">⌖ 在地球上选点</button>
        <p>最多同时观测三个点。组合会替换当前点位，预设城市坐标固定。</p>
      </div>
    </div>
    <div v-if="pickingPoint" class="point-picking-note" role="status"><span>点击 3D 地球表面，添加观测点</span><button
        class="theme-btn" type="button" @click="pickingPoint = false">取消</button></div>
    <div class="station-layer" v-show="panelsVisible">
      <ObservationStation v-for="item in stationObservations" :key="`${item.station.id}-${compactView}`"
        v-show="panelsVisible && (!compactView || item.station.id === activeStationId)"
        :style="{ '--station-order': item.station.order }" @pointerdown.capture="bringStationToFront(item.station.id)"
        :station="item.station" :observation="item.observation" :lighting="item.lighting" :phase="phase"
        :can-remove="stations.length > 1" :active="item.station.id === activeStationId"
        :collapsed="item.station.collapsed" :compact="compactView"
        :selected-in-both-views="splitView && surfaceView && spaceStation.id === item.station.id && activeStationId === item.station.id"
        :initial-right="stationRight(item.station.slot)" :initial-top="stationTop(item.station.slot)"
        :bottom-inset="timelineHeight + 54" @select="applyStationToFirstPerson(item.station.id)"
        @remove="removeStation(item.station.id)"
        @update:latitude="updateCoordinate(item.station.id, 'latitude', $event)"
        @update:longitude="updateCoordinate(item.station.id, 'longitude', $event)"
        @update:local-solar-hour="setStationTime(item.station.id, $event)"
        @update:collapsed="item.station.collapsed = $event" @locate="locateStation(item.station.id)"
        @sync-view="syncStationViews(item.station.id)" />
    </div>

    <section ref="timelineRef" v-show="panelsVisible" class="timeline-card" aria-label="月相周期控制">
      <div v-if="motionPanelOpen" class="earth-motion-panel">
        <div class="motion-heading"><strong>地球运动</strong><button class="theme-btn" type="button" aria-label="收起地球运动"
            @click="motionPanelOpen = false">×</button></div>
        <div class="annual-position">
          <svg viewBox="0 0 140 118" aria-label="从黄道北侧看：春分在上，夏至在左，秋分在下，冬至在右，逆时针公转">
            <defs>
              <marker id="annual-direction-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5"
                orient="auto-start-reverse">
                <path d="M0 0 10 5 0 10Z" fill="currentColor" />
              </marker>
            </defs>
            <ellipse cx="70" cy="59" rx="44" ry="35" fill="none" stroke="currentColor" stroke-dasharray="2 4" />
            <path class="revolution-arrow" d="M59 25 A44 35 0 0 0 28 48" fill="none" stroke="currentColor"
              marker-end="url(#annual-direction-arrow)" />
            <text x="70" y="11" text-anchor="middle">春分</text><text x="11" y="62" text-anchor="middle">夏至</text><text
              x="70" y="113" text-anchor="middle">秋分</text><text x="129" y="62" text-anchor="middle">冬至</text>
            <circle cx="70" cy="59" r="7" fill="#eab76e" />
            <circle class="annual-earth" :cx="70 - 44 * Math.sin(earthFrame.solarLongitude * Math.PI / 180)"
              :cy="59 - 35 * Math.cos(earthFrame.solarLongitude * Math.PI / 180)" r="6" fill="#56bdcf" />
          </svg>
          <div><strong>{{ seasonLabel }}</strong><span>太阳直射纬度 {{ signedAngle(earthFrame.declination)
              }}</span><span>从黄道北侧看 · 逆时针公转</span></div>
        </div>
        <el-slider :model-value="annualAngle" :min="0" :max="360" :step="0.1" :show-tooltip="false" aria-label="地球公转位置"
          @update:model-value="setAnnualAngle" />
        <div class="season-stops"><button v-for="(season, index) in seasons" :key="season" class="theme-btn"
            type="button" :class="{ active: Math.abs(annualAngle - index * 90) < 1 }"
            @click="setAnnualAngle(index * 90)">{{ season }}</button></div>
        <div class="motion-clock" aria-describedby="utc-explanation"><span>统一时刻 <strong>{{ formatHour(utcHour) }}
              UTC</strong></span><span>年内第 {{ Math.floor(dayOfYear) }} 天</span></div>
        <el-slider :model-value="utcSliderMinutes" :min="0" :max="1439" :step="1" :show-tooltip="false"
          aria-label="统一UTC时刻" @update:model-value="setUtcMinutes" />
        <p id="utc-explanation" class="utc-explanation">UTC 是协调世界时，所有观测点共用这一时刻。面板中的当地太阳时按经度换算，因此各地读数不同，也可能与当地钟表时间不同。</p>
      </div>
      <div class="timeline-toolbar">
        <div class="timeline-status">
          <MoonDisc :phase="phase" />
          <div class="timeline-title"><strong>{{ currentPhaseName }}</strong><span>月龄 {{ phaseAge.toFixed(1) }} 天</span>
          </div>
        </div>
        <div class="observation-tools" aria-label="空间观测控制">
          <span class="utc-tag" :aria-label="`统一观测时刻 ${formatHour(utcHour)} UTC`"
            title="所有观测点共用的协调世界时"><span>UTC</span><strong>{{ formatHour(utcHour) }}</strong></span>
          <button type="button" class="theme-btn motion-toggle" :class="{ active: motionPanelOpen }"
            :aria-expanded="motionPanelOpen" @click="motionPanelOpen = !motionPanelOpen">地球运动</button>
          <button type="button" class="theme-btn" :class="{ active: showOrbitAngle }" :aria-pressed="showOrbitAngle"
            title="以地球为顶点，显示太阳与月球方向之间的较小夹角（0°～180°）"
            @click="showOrbitAngle = !showOrbitAngle">日地月夹角</button>
          <button type="button" class="theme-btn" :class="{ active: showGuides }" :aria-pressed="showGuides"
            @click="showGuides = !showGuides"><span class="guide-symbol">◎</span>观测辅助线</button>
        </div>
        <div class="playback-tools">
          <button type="button" class="theme-btn speed-button" aria-label="切换播放速度" @click="cycleSpeed">{{ speed
            }}×</button>
          <button class="theme-btn play-button" :class="{ active: playing }" type="button"
            :aria-label="playing ? '暂停月相动画' : '播放月相动画'" @click="playing = !playing">
            <svg v-if="!playing" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6 3.8a.7.7 0 0 1 1.05-.6l9 6.2a.7.7 0 0 1 0 1.2l-9 6.2A.7.7 0 0 1 6 16.2Z" />
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect x="5" y="4" width="3" height="12" rx="1" />
              <rect x="12" y="4" width="3" height="12" rx="1" />
            </svg>
          </button>
        </div>
      </div>
      <el-slider class="phase-range" :model-value="phase" :min="0" :max="360" :step="0.1" :show-tooltip="false"
        aria-label="月相周期进度" @update:model-value="setPhaseFromSlider" />
      <div class="phase-stops">
        <button v-for="stop in phaseStops" :key="stop.angle" type="button" class="theme-btn"
          :class="{ active: currentPhaseName === stop.name }" :aria-label="`观察${stop.name}`"
          :aria-pressed="currentPhaseName === stop.name" @click="selectPhase(stop.angle)">
          <MoonDisc :phase="stop.angle" /><span>{{ stop.name }}</span>
        </button>
      </div>
    </section>

    <Transition name="page-loading">
      <div v-if="pageLoading" class="page-loading-overlay" role="status" aria-live="polite" aria-label="页面加载中">
        <div class="loading-orbit" aria-hidden="true"><span></span><i></i></div>
        <strong>正在准备月相观察</strong><span>加载地月纹理与观测场景</span>
        <div class="loading-progress" role="progressbar" :aria-valuenow="pageProgress" aria-valuemin="0"
          aria-valuemax="100"><i :style="{ width: `${pageProgress}%` }"></i></div>
        <small>{{ pageProgress }}%</small>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { ElSlider } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import ObservationStation from './ObservationStation.vue'
import MoonDisc from './MoonDisc.vue'
import { getMoonLighting, getObservation, phaseIllumination, phaseName, SYNODIC_MONTH, TROPICAL_YEAR, VERNAL_EQUINOX_DAY, getEarthFrame, utcHourFromLocalSolarHour } from './moon-geometry'
import { createMoonScene, type SceneMode } from './moon-scene'
import '@/styles/geo-page-template.css'
import './moon-phase.css'

const views: { value: SceneMode; label: string; icon: string }[] = [
  { value: 'orbit', label: '空间视角', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z' },
  { value: 'observer', label: '第一人称', icon: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z' },
]
const placeGroups = [
  {
    label: '亚洲', places: [
      { name: '上海', caption: '中国', latitude: 31.23, longitude: 121.47 },
      { name: '东京', caption: '日本', latitude: 35.68, longitude: 139.69 },
      { name: '新加坡', caption: '新加坡', latitude: 1.29, longitude: 103.85 },
      { name: '新德里', caption: '印度', latitude: 28.61, longitude: 77.21 },
      { name: '迪拜', caption: '阿联酋', latitude: 25.20, longitude: 55.27 },
    ]
  },
  {
    label: '欧洲', places: [
      { name: '伦敦', caption: '英国', latitude: 51.51, longitude: -0.13 },
      { name: '巴黎', caption: '法国', latitude: 48.86, longitude: 2.35 },
      { name: '柏林', caption: '德国', latitude: 52.52, longitude: 13.41 },
      { name: '莫斯科', caption: '俄罗斯', latitude: 55.76, longitude: 37.62 },
    ]
  },
  {
    label: '美洲', places: [
      { name: '纽约', caption: '美国', latitude: 40.71, longitude: -74.01 },
      { name: '洛杉矶', caption: '美国', latitude: 34.05, longitude: -118.24 },
      { name: '墨西哥城', caption: '墨西哥', latitude: 19.43, longitude: -99.13 },
      { name: '基多', caption: '厄瓜多尔', latitude: -0.18, longitude: -78.47 },
      { name: '里约热内卢', caption: '巴西', latitude: -22.91, longitude: -43.17 },
    ]
  },
  {
    label: '非洲 · 大洋洲', places: [
      { name: '开罗', caption: '埃及', latitude: 30.04, longitude: 31.24 },
      { name: '开普敦', caption: '南非', latitude: -33.92, longitude: 18.42 },
      { name: '内罗毕', caption: '肯尼亚', latitude: -1.29, longitude: 36.82 },
      { name: '悉尼', caption: '澳大利亚', latitude: -33.87, longitude: 151.21 },
      { name: '奥克兰', caption: '新西兰', latitude: -36.85, longitude: 174.76 },
    ]
  },
]
const places = placeGroups.flatMap(group => group.places)
const comparisonGroups = [
  { label: '南北半球', names: ['上海', '基多', '悉尼'] },
  { label: '经度对比', names: ['伦敦', '纽约', '东京'] },
  { label: '赤道附近', names: ['新加坡', '基多', '内罗毕'] },
  { label: '南北纬度', names: ['伦敦', '开罗', '开普敦'] },
  { label: '美洲南北', names: ['纽约', '墨西哥城', '里约热内卢'] },
].map(group => ({ ...group, places: group.names.map(name => places.find(place => place.name === name)!) }))
const presetRegion = ref(placeGroups[0]!.label)
const visiblePlaces = computed(() => placeGroups.find(group => group.label === presetRegion.value)!.places)
const phaseStops = [
  { angle: 0, name: '新月' }, { angle: 45, name: '蛾眉月' },
  { angle: 90, name: '上弦月' }, { angle: 135, name: '盈凸月' },
  { angle: 180, name: '满月' }, { angle: 225, name: '亏凸月' },
  { angle: 270, name: '下弦月' }, { angle: 315, name: '残月' },
]
const stageRef = ref<HTMLElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const timelineHeight = ref(104)
const sceneElements: Partial<Record<SceneMode, HTMLElement>> = {}
const selectedViews = ref<SceneMode[]>(['orbit', 'observer'])
const splitView = computed(() => selectedViews.value.length === 2)
const splitPercent = ref(50)
const resizing = ref(false)
const surfaceView = ref(false)
const moonFollowing = ref<Record<SceneMode, boolean>>({ orbit: false, observer: true })
const spaceFocus = ref<'earth' | 'moon' | null>(null)
let spaceViewRequest = 0
const phase = ref(90)
type Station = { id: string; name: string; latitude: number; longitude: number; color: string; readonly: boolean; collapsed: boolean; slot: number; order: number }
const stationColors = ['#4ad2cd', '#f2c079', '#b89cff']
let stationSequence = 1
let stationOrder = 1
const stations = ref<Station[]>([{ ...places[0]!, id: 'station-1', color: stationColors[0]!, readonly: true, collapsed: window.innerWidth <= 820, slot: 0, order: ++stationOrder }])
const activeStationId = ref('station-1')
const spaceObserverId = ref<string | null>(null)
const activeStation = computed(() => stations.value.find(station => station.id === activeStationId.value) ?? stations.value[0]!)
const latitude = computed(() => activeStation.value.latitude)
const longitude = computed(() => activeStation.value.longitude)
const utcHour = ref(utcHourFromLocalSolarHour(18, 121.47))
// Keep the displayed minute within the slider's bounds. Passing the continuous
// clock directly lets the slider clamp its last minute and emit a false edit.
const utcSliderMinutes = computed(() => ((Math.round(utcHour.value * 60) % 1440) + 1440) % 1440)
const dayOfYear = ref(VERNAL_EQUINOX_DAY)
const earthFrame = computed(() => getEarthFrame(dayOfYear.value))
const annualAngle = computed(() => earthFrame.value.solarLongitude)
const seasons = ['春分', '夏至', '秋分', '冬至']
const seasonLabel = computed(() => {
  const index = Math.floor(annualAngle.value / 90) % 4
  return annualAngle.value % 90 < 1 ? seasons[index] : `${seasons[index]} → ${seasons[(index + 1) % 4]}`
})
const stationMenuOpen = ref(false)
const pickingPoint = ref(false)
const motionPanelOpen = ref(false)
const playing = ref(false)
const speed = ref(1)
const showGuides = ref(true)
const showOrbitAngle = ref(false)
const panelsVisible = ref(true)
const compactView = ref(window.innerWidth <= 820)
const splitMin = computed(() => compactView.value ? 35 : 25)
const sceneReady = ref<Record<SceneMode, boolean>>({ orbit: false, observer: false })
const loadingProgress = ref<Record<SceneMode, number>>({ orbit: 0, observer: 0 })
const pageLoading = computed(() => selectedViews.value.some(view => !sceneReady.value[view] && !errorMessages.value[view]))
const pageProgress = computed(() => Math.round(selectedViews.value.reduce((sum, view) => sum + (sceneReady.value[view] || errorMessages.value[view] ? 100 : loadingProgress.value[view]), 0) / selectedViews.value.length))
const errorMessages = ref<Record<SceneMode, string>>({ orbit: '', observer: '' })
const viewDirections = ref<Record<SceneMode, { heading: number; pitch: number }>>({ orbit: { heading: 180, pitch: 20 }, observer: { heading: 180, pitch: 20 } })
const scenes: Partial<Record<SceneMode, ReturnType<typeof createMoonScene>>> = {}
let resizeHandle: HTMLElement | null = null
let resizePointer: number | null = null
let animationId = 0
let lastTime = 0
let timelineObserver: ResizeObserver | null = null

const observationInput = computed(() => ({ phase: phase.value, latitude: latitude.value, longitude: longitude.value, utcHour: utcHour.value, dayOfYear: dayOfYear.value }))
const spaceStation = computed(() => stations.value.find(station => station.id === spaceObserverId.value) ?? activeStation.value)
const spaceObservationInput = computed(() => ({ ...observationInput.value, latitude: spaceStation.value.latitude, longitude: spaceStation.value.longitude }))
const spaceObservation = computed(() => getObservation(spaceObservationInput.value))
const observation = computed(() => getObservation(observationInput.value))
const stationObservations = computed(() => stations.value.map(station => {
  const input = { ...observationInput.value, latitude: station.latitude, longitude: station.longitude }
  return { station, observation: getObservation(input), lighting: getMoonLighting(input) }
}))
const currentPhaseName = computed(() => phaseName(phase.value))
const phaseAge = computed(() => phase.value / 360 * SYNODIC_MONTH)
const illumination = computed(() => phaseIllumination(phase.value) * 100)
const locationLabel = computed(() => activeStation.value.name)
const visibilityTitle = computed(() => !observation.value.aboveHorizon ? '当地不可见 · 月球在地平线以下' : observation.value.altitude < 2 ? '月亮正经过地平线' : illumination.value < 0.1 ? '新月 · 亮面背向我们' : observation.value.sunAltitude > 1 ? '白昼中的月亮' : '月亮在地平线上方')
const visibilityDescription = computed(() => !observation.value.aboveHorizon ? '调整观测时刻或位置，等待月亮升起。' : observation.value.sunAltitude > 1 ? '白天也可能看到月亮，实际可见性取决于天空亮度。' : `月心高度 ${signedAngle(observation.value.altitude)} · 方位 ${observation.value.azimuth.toFixed(0)}°`)

function stationRight(slot: number) { return compactView.value ? 14 : 24 + (slot % Math.max(1, Math.min(3, Math.floor((window.innerWidth - 48) / 342)))) * 342 }
function stationTop(slot: number) { return compactView.value ? 164 : 148 + Math.floor(slot / Math.max(1, Math.min(3, Math.floor((window.innerWidth - 48) / 342)))) * 48 }
function bringStationToFront(id: string) { const station = stations.value.find(item => item.id === id); if (station) station.order = ++stationOrder }
function selectStation(id: string, startFollowing = true) {
  if (!stations.value.some(station => station.id === id)) return
  bringStationToFront(id)
  activeStationId.value = id
  for (const station of stations.value) {
    if (station.id === id) station.collapsed = false
    else if (compactView.value) station.collapsed = true
  }
  if (startFollowing) void nextTick(() => {
    if (activeStationId.value !== id) return
    syncScene()
    scenes.observer?.setMoonFollowing(true)
  })
}
function addStation(name: string, lat: number, lon: number, readonly = false) {
  const existing = stations.value.find(station => Math.abs(station.latitude - lat) < 0.01 && Math.abs(station.longitude - lon) < 0.01)
  if (existing) { if (readonly) { existing.name = name; existing.readonly = true }; selectStation(existing.id); return }
  if (stations.value.length >= 3) return
  const slot = [0, 1, 2].find(value => !stations.value.some(station => station.slot === value)) ?? 0
  const id = `station-${++stationSequence}`
  stations.value.push({ id, name: name.startsWith('观测点') ? `观测点 ${slot + 1}` : name, latitude: lat, longitude: lon, color: stationColors[slot]!, readonly, slot, collapsed: false, order: ++stationOrder })
  selectStation(id)
}
function hasPreset(place: typeof places[number]) { return stations.value.some(station => Math.abs(station.latitude - place.latitude) < 0.01 && Math.abs(station.longitude - place.longitude) < 0.01) }
function addPreset(place: typeof places[number]) { addStation(place.name, place.latitude, place.longitude, true); stationMenuOpen.value = false }
function isComparisonSelected(group: typeof comparisonGroups[number]) {
  return stations.value.length === 3 && stations.value.every(station => station.readonly) && group.places.every(hasPreset)
}
function comparePresets(group: typeof comparisonGroups[number]) {
  spaceViewRequest++
  const wasSurface = surfaceView.value
  pickingPoint.value = false
  stations.value = group.places.map((place, slot) => ({ ...place, id: `station-${++stationSequence}`, color: stationColors[slot]!, readonly: true, collapsed: compactView.value && slot !== 0, slot, order: ++stationOrder }))
  activeStationId.value = stations.value[0]!.id
  spaceObserverId.value = wasSurface ? activeStationId.value : null
  bringStationToFront(activeStationId.value)
  stationMenuOpen.value = false
  syncScene()
  scenes.observer?.setMoonFollowing(true)
  if (wasSurface) scenes.orbit?.flyToObserver()
}
function removeStation(id: string) {
  if (stations.value.length === 1) return
  stations.value = stations.value.filter(station => station.id !== id)
  if (activeStationId.value === id) selectStation(stations.value[0]!.id)
  if (spaceObserverId.value === id) { spaceObserverId.value = null; syncScene(); if (surfaceView.value) scenes.orbit?.flyToObserver() }
}
function updateCoordinate(id: string, coordinate: 'latitude' | 'longitude', value: number) {
  const station = stations.value.find(item => item.id === id)
  if (station && !station.readonly) {
    station[coordinate] = value
    station.name = places.find(place => Math.abs(place.latitude - station.latitude) < 0.01 && Math.abs(place.longitude - station.longitude) < 0.01)?.name ?? `观测点 ${station.slot + 1}`
  }
}
function setStationTime(id: string, hour: number) {
  const station = stations.value.find(item => item.id === id)
  if (station) { playing.value = false; utcHour.value = utcHourFromLocalSolarHour(hour, station.longitude) }
}
function setUtcMinutes(value: number | number[]) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return
  playing.value = false
  utcHour.value = Math.max(0, Math.min(1439, value)) / 60
}
function setAnnualAngle(value: number | number[]) {
  if (typeof value !== 'number') return
  playing.value = false
  dayOfYear.value = ((VERNAL_EQUINOX_DAY - 1 + value / 360 * TROPICAL_YEAR) % TROPICAL_YEAR) + 1
}
async function startPicking() {
  stationMenuOpen.value = false
  await ensureSpaceView()
  returnToOverview()
  pickingPoint.value = true
}
function onObserverPick(lat: number, lon: number) {
  if (!pickingPoint.value) {
    const existing = stations.value.find(station => Math.abs(station.latitude - lat) < 0.01 && Math.abs(station.longitude - lon) < 0.01)
    if (existing) selectStation(existing.id)
    return
  }
  addStation(`观测点 ${stations.value.length + 1}`, Math.round(lat * 100) / 100, Math.round(lon * 100) / 100)
  pickingPoint.value = false
}
function formatHour(value: number) { const minutes = ((Math.round(value * 60) % 1440) + 1440) % 1440; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` }
function signedAngle(value: number) { return `${value > 0 ? '+' : ''}${value.toFixed(1)}°` }
function compassName(value: number) { return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(((value % 360) + 360) % 360 / 45) % 8] }
function selectPhase(value: number) { playing.value = false; phase.value = value }
function setPhaseFromSlider(value: number | number[]) { if (typeof value === 'number') selectPhase(value) }
function cycleSpeed() { speed.value = speed.value === 4 ? 1 : speed.value * 2 }
function isGroundView(view: SceneMode) { return view === 'observer' }
function setSceneRef(view: SceneMode, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) sceneElements[view] = element
  else delete sceneElements[view]
}
function toggleView(view: SceneMode) {
  if (selectedViews.value.includes(view)) {
    if (selectedViews.value.length === 1) return
    selectedViews.value = selectedViews.value.filter(value => value !== view)
  } else selectedViews.value = [...selectedViews.value, view]
  stopResize()
}
function locateMoon(view: SceneMode = 'observer') { if (observation.value.aboveHorizon) scenes[view]?.lookAtMoon() }
async function ensureSpaceView() {
  if (!selectedViews.value.includes('orbit')) selectedViews.value = [...selectedViews.value, 'orbit']
  await nextTick()
  scenes.orbit?.resize()
}
async function viewFromStation(id: string) {
  if (!stations.value.some(station => station.id === id)) return
  const request = ++spaceViewRequest
  pickingPoint.value = false
  spaceObserverId.value = id
  spaceFocus.value = null
  await ensureSpaceView()
  if (request !== spaceViewRequest) return
  syncScene()
  scenes.orbit?.flyToObserver()
}
async function focusSpaceBody(body: 'earth' | 'moon') {
  const request = ++spaceViewRequest
  pickingPoint.value = false
  // Leave the old surface attachment before changing the selected station.
  scenes.orbit?.focusBody(body)
  spaceObserverId.value = null
  spaceFocus.value = body
  await ensureSpaceView()
  if (request !== spaceViewRequest) return
  syncScene()
}
function returnToOverview() { spaceViewRequest++; spaceObserverId.value = null; spaceFocus.value = null; scenes.orbit?.resetView(); syncScene() }
function resetView(view: SceneMode) { if (view === 'orbit') returnToOverview(); else scenes[view]?.resetView() }
function toggleMoonFollowing() { scenes.observer?.setMoonFollowing(!moonFollowing.value.observer) }
async function applyStationToFirstPerson(id: string) {
  if (!stations.value.some(station => station.id === id)) return
  selectStation(id, false)
  if (!selectedViews.value.includes('observer')) selectedViews.value = [...selectedViews.value, 'observer']
  await nextTick()
  if (activeStationId.value !== id) return
  syncScene()
  scenes.observer?.resize()
  scenes.observer?.setMoonFollowing(true)
}
async function locateStation(id: string) {
  await applyStationToFirstPerson(id)
  if (compactView.value) activeStation.value.collapsed = true
}
async function syncStationViews(id: string) {
  if (!stations.value.some(station => station.id === id)) return
  const request = ++spaceViewRequest
  pickingPoint.value = false
  stationMenuOpen.value = false
  selectStation(id, false)
  spaceObserverId.value = id
  spaceFocus.value = null
  selectedViews.value = ['orbit', 'observer']
  await nextTick()
  if (request !== spaceViewRequest) return
  // Commit the same station to both scenes before moving either camera.
  syncScene()
  scenes.orbit?.resize()
  scenes.observer?.resize()
  scenes.orbit?.flyToObserver()
  scenes.observer?.setMoonFollowing(true)
  if (compactView.value) activeStation.value.collapsed = true
}
function clampSplit(value: number) { return Math.max(splitMin.value, Math.min(100 - splitMin.value, value)) }
function startResize(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  resizeHandle = event.currentTarget as HTMLElement
  resizePointer = event.pointerId
  resizeHandle.setPointerCapture(event.pointerId)
  resizeHandle.focus({ preventScroll: true })
  resizing.value = true
}
function resizeSplit(event: PointerEvent) {
  if (!resizing.value || event.pointerId !== resizePointer || !stageRef.value) return
  const bounds = stageRef.value.getBoundingClientRect()
  if (bounds.width > 0) splitPercent.value = clampSplit((event.clientX - bounds.left) / bounds.width * 100)
}
function stopResize() {
  const handle = resizeHandle
  const pointer = resizePointer
  resizePointer = null; resizeHandle = null; resizing.value = false
  if (handle && pointer !== null && handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer)
}
function resizeWithKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2
  const values: Record<string, number> = { ArrowLeft: splitPercent.value - step, ArrowRight: splitPercent.value + step, Home: splitMin.value, End: 100 - splitMin.value, Enter: 50 }
  const value = values[event.key]
  if (value === undefined) return
  event.preventDefault()
  splitPercent.value = clampSplit(value)
}
function syncViewport() {
  const compact = window.innerWidth <= 820
  if (compact && !compactView.value) stations.value.forEach(station => { station.collapsed = true })
  compactView.value = compact
  splitPercent.value = clampSplit(splitPercent.value)
}
function resetAll() {
  spaceViewRequest++
  playing.value = false; phase.value = 90; utcHour.value = utcHourFromLocalSolarHour(18, 121.47); dayOfYear.value = VERNAL_EQUINOX_DAY
  stations.value = [{ ...places[0]!, id: `station-${++stationSequence}`, color: stationColors[0]!, readonly: true, collapsed: compactView.value, slot: 0, order: ++stationOrder }]
  activeStationId.value = stations.value[0]!.id; spaceObserverId.value = null; spaceFocus.value = null; motionPanelOpen.value = false; stationMenuOpen.value = false; presetRegion.value = placeGroups[0]!.label; pickingPoint.value = false
  speed.value = 1; showGuides.value = true; showOrbitAngle.value = false; selectedViews.value = ['orbit', 'observer']; splitPercent.value = 50; panelsVisible.value = true
  stopResize(); syncScene(); scenes.orbit?.resetView(); scenes.observer?.resetView()
}
function syncScene() {
  for (const view of views) scenes[view.value]?.update({ ...(view.value === 'orbit' ? spaceObservationInput.value : observationInput.value), mode: view.value, showGuides: showGuides.value, showOrbitAngle: showOrbitAngle.value, stations: stations.value, activeStationId: view.value === 'orbit' ? spaceStation.value.id : activeStationId.value })
}
function initializeScene(view: SceneMode) {
  const element = sceneElements[view]
  if (!element) return
  scenes[view]?.dispose(); delete scenes[view]; sceneReady.value[view] = false; loadingProgress.value[view] = 0; errorMessages.value[view] = ''
  if (view === 'orbit') { surfaceView.value = false; spaceFocus.value = null }
  try {
    scenes[view] = createMoonScene(element, {
      onReady: () => { sceneReady.value[view] = true; loadingProgress.value[view] = 100 },
      onLoadingProgress: progress => { loadingProgress.value[view] = progress },
      onObserverPick: (lat, lon) => { if (view === 'orbit') onObserverPick(lat, lon) },
      onError: message => { errorMessages.value[view] = message },
      onViewChange: (heading, pitch) => { viewDirections.value[view] = { heading, pitch } },
      onSurfaceViewChange: active => { if (view === 'orbit') surfaceView.value = active },
      onMoonFollowChange: active => { moonFollowing.value[view] = active },
    })
    syncScene()
  } catch { errorMessages.value[view] = '当前设备暂时无法创建三维场景。仍可使用观测站与时间轴探索月相。' }
}
function animate(time: number) {
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
  lastTime = time
  if (playing.value && !document.hidden && !pageLoading.value) {
    const days = delta / 48 * speed.value
    utcHour.value = (utcHour.value + days * 24) % 24
    dayOfYear.value = (dayOfYear.value - 1 + days) % TROPICAL_YEAR + 1
    phase.value = (phase.value + days / SYNODIC_MONTH * 360) % 360
  }
  animationId = requestAnimationFrame(animate)
}
watch([observationInput, spaceObservationInput, showGuides, showOrbitAngle, stations, activeStationId], syncScene, { deep: true })
watch(selectedViews, async () => { await nextTick(); scenes.orbit?.resize(); scenes.observer?.resize() })
onMounted(() => {
  for (const view of views) initializeScene(view.value)
  timelineObserver = new ResizeObserver(entries => {
    const height = entries[0]?.target.getBoundingClientRect().height ?? 0
    if (height > 0) timelineHeight.value = Math.ceil(height)
  })
  if (timelineRef.value) timelineObserver.observe(timelineRef.value)
  animationId = requestAnimationFrame(animate)
  window.addEventListener('resize', syncViewport)
})
onBeforeUnmount(() => { stopResize(); cancelAnimationFrame(animationId); timelineObserver?.disconnect(); scenes.orbit?.dispose(); scenes.observer?.dispose(); window.removeEventListener('resize', syncViewport) })
</script>
