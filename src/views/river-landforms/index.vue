<template>
  <div
    ref="pageRef"
    class="river-landforms-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">流水地貌</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="resetView"
        >
          重置视角
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main
      class="workspace"
      v-bind="workspaceAttrs"
    >
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>调整流水地貌标注、剖面与视角</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">显示控制</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地形标签</strong>
                <span>显示冰川、峡谷、瀑布等地形名称</span>
              </div>

              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>等高线</strong>
                <span>在地面叠加等高线辅助观察</span>
              </div>

              <el-switch v-model="showContours" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>水流动画</strong>
                <span>河流表面产生流动效果</span>
              </div>

              <el-switch v-model="showFlow" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">地形放大</h3>
              <strong class="control-value">
                {{ terrainScale.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="terrainScale"
              :min="0.6"
              :max="2.2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">自动旋转</span>
              <el-switch v-model="autoRotate" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="view-grid">
              <button
                v-for="item in viewPresets"
                :key="item.value"
                type="button"
                class="theme-btn option-btn view-btn"
                :class="{ active: currentView === item.value }"
                @click="setView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>
        </div>

        <div
          class="resize-handle resize-right"
          v-bind="leftResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <div class="labels-overlay">
            <div
              v-for="label in screenLabels"
              :key="label.id"
              v-show="label.visible"
              class="scene-label"
              :class="['label-' + label.tone, { 'label-hot': label.hot }]"
              :style="{
                left: label.x + 'px',
                top: label.y + 'px',
                opacity: showLabels ? 1 : 0,
              }"
            >
              {{ label.text }}
            </div>
          </div>



          <div class="stage-hint">
            <span class="hint-icon">🖱</span>
            拖拽旋转 · 滚轮缩放 · 点击红色圆点查看地貌成因
          </div>
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>地貌详情</h2>
              <p>点击主场景红色圆点或下方按钮查看</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <div class="quick-access">
            <div class="quick-access-title">
              <strong>快速切换</strong>
              <span>点击下方任一地貌查看详情</span>
            </div>
            <div class="quick-access-grid">
              <button
                v-for="item in quickFeatures"
                :key="item.id"
                type="button"
                class="theme-btn option-btn quick-access-btn"
                :class="{ active: selectedFeatureId === item.id }"
                @click="selectFeature(item.id)"
              >
                <span class="qa-icon">{{ item.icon }}</span>
                <span class="qa-name">{{ item.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="selectedFeature" class="feature-detail">
            <div class="feature-head">
              <div class="feature-icon" :class="'icon-' + selectedFeature.id">
                {{ selectedFeature.icon }}
              </div>
              <div>
                <h3>{{ selectedFeature.name }}</h3>
                <span class="feature-type">
                  {{ selectedFeature.type }} · {{ selectedFeature.shape }}
                </span>
              </div>
            </div>

            <div class="feature-photo-card">
              <div class="feature-photo-frame">
                <img
                  :src="selectedFeature.photoUrl"
                  :alt="selectedFeature.name + '实景图'"
                  class="feature-photo-img"
                  @error="onPhotoError"
                />
                <div class="feature-photo-mask">
                  <span class="photo-badge">实景</span>
                  <span class="photo-caption">{{ selectedFeature.name }}</span>
                </div>
              </div>
            </div>

            <el-collapse
              v-model="activeDetailPanels"
              class="analysis-collapse"
            >
              <el-collapse-item
                title="地貌成因"
                name="cause"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.cause"></p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'meander-oxbow'"
                title="牛轭湖形成过程"
                name="process"
              >
                <div class="collapse-content">
                  <div class="oxbow-form-steps">
                    <div class="oxbow-form-step">
                      <div class="form-illu">
                        <svg viewBox="0 0 60 36">
                          <rect x="0" y="0" width="60" height="22" fill="#7cb86f" />
                          <rect x="0" y="22" width="60" height="14" fill="#a48b5a" />
                          <path d="M 4 14 Q 14 8 24 14 Q 34 20 44 14 Q 50 10 56 14" stroke="#247cff" stroke-width="2.4" fill="none" stroke-linecap="round" />
                          <circle cx="3" cy="2" r="2" fill="#5b8a3f" />
                          <circle cx="18" cy="3" r="2" fill="#5b8a3f" />
                          <circle cx="38" cy="2" r="2" fill="#5b8a3f" />
                          <circle cx="52" cy="3" r="2" fill="#5b8a3f" />
                        </svg>
                      </div>
                      <div>
                        <strong>① 初期：河床不平</strong>
                        <p>由于<strong>惯性</strong>与河床微起伏，水流在弯道处冲刷凹岸。</p>
                      </div>
                    </div>
                    <div class="oxbow-form-step">
                      <div class="form-illu">
                        <svg viewBox="0 0 60 36">
                          <rect x="0" y="0" width="60" height="22" fill="#7cb86f" />
                          <rect x="0" y="22" width="60" height="14" fill="#a48b5a" />
                          <path d="M 4 18 Q 14 4 28 8 Q 38 12 44 22" stroke="#247cff" stroke-width="2.4" fill="none" stroke-linecap="round" />
                          <path d="M 28 8 Q 36 4 44 6" stroke="#a48b5a" stroke-width="0.8" stroke-dasharray="2 1" fill="none" opacity="0.7" />
                          <circle cx="3" cy="2" r="2" fill="#5b8a3f" />
                          <circle cx="16" cy="3" r="2" fill="#5b8a3f" />
                          <circle cx="48" cy="2" r="2" fill="#5b8a3f" />
                        </svg>
                      </div>
                      <div>
                        <strong>② 发展：弯曲加剧</strong>
                        <p>凹岸不断<strong>侵蚀后退</strong>，凸岸不断<strong>堆积前伸</strong>，河道愈发弯曲。</p>
                      </div>
                    </div>
                    <div class="oxbow-form-step">
                      <div class="form-illu">
                        <svg viewBox="0 0 60 36">
                          <rect x="0" y="0" width="60" height="22" fill="#7cb86f" />
                          <rect x="0" y="22" width="60" height="14" fill="#a48b5a" />
                          <path d="M 4 18 Q 14 4 28 8" stroke="#247cff" stroke-width="2.4" fill="none" stroke-linecap="round" />
                          <path d="M 22 12 L 36 12 L 56 12" stroke="#247cff" stroke-width="2.4" fill="none" stroke-linecap="round" />
                          <path d="M 28 8 Q 38 12 44 22" stroke="#247cff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5" stroke-dasharray="2 1" />
                          <circle cx="3" cy="2" r="2" fill="#5b8a3f" />
                          <circle cx="48" cy="2" r="2" fill="#5b8a3f" />
                        </svg>
                      </div>
                      <div>
                        <strong>③ 截直：洪水冲开曲流颈</strong>
                        <p>洪水期水流冲开狭窄<strong>曲流颈</strong>，河道取直，主流改道。</p>
                      </div>
                    </div>
                    <div class="oxbow-form-step">
                      <div class="form-illu">
                        <svg viewBox="0 0 60 36">
                          <rect x="0" y="0" width="60" height="22" fill="#7cb86f" />
                          <rect x="0" y="22" width="60" height="14" fill="#a48b5a" />
                          <path d="M 4 18 L 56 18" stroke="#247cff" stroke-width="2.4" fill="none" stroke-linecap="round" />
                          <path d="M 12 18 C 12 8 32 8 32 18 Z" fill="rgba(36,124,255,0.55)" stroke="#247cff" stroke-width="1.5" />
                          <circle cx="12" cy="18" r="1.5" fill="#a48b5a" />
                          <circle cx="32" cy="18" r="1.5" fill="#a48b5a" />
                          <circle cx="3" cy="2" r="2" fill="#5b8a3f" />
                          <circle cx="48" cy="2" r="2" fill="#5b8a3f" />
                        </svg>
                      </div>
                      <div>
                        <strong>④ 形成：牛轭湖</strong>
                        <p>被遗弃的弯曲河段两端被<strong>泥沙淤塞封闭</strong>，形成状如牛轭的弯月形湖泊。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'delta'"
                title="不同形态的河口三角洲"
                name="shapes"
              >
                <div class="collapse-content">
                  <div class="delta-shapes-image">
                    <img
                      src="/geo-resources-folder/images/delta-shapes.jpg"
                      alt="不同形态的河口三角洲示意"
                      class="delta-shapes-img"
                      @error="onPhotoError"
                    />
                  </div>

                  <div class="delta-shapes">
                    <div class="delta-shape-card">
                      <strong>扇形三角洲</strong>
                      <p>形成于<strong>入海河流含沙量高</strong>，<br />多份汉冲常较远的河口区。</p>
                    </div>

                    <div class="delta-shape-card">
                      <strong>鸟足形三角洲</strong>
                      <p>形成于<strong>入海河流含沙量较高</strong>，<br />河流作用占优势的河口区。</p>
                    </div>

                    <div class="delta-shape-card">
                      <strong>尖头形三角洲</strong>
                      <p>形成于<strong>波浪作用较强</strong>，<br />河流沉积被侵蚀修整的河口区。</p>
                    </div>

                    <div class="delta-shape-card">
                      <strong>岛屿形三角洲</strong>
                      <p>形成于<strong>众多沙洲和纵横汊道</strong>，<br />构成岛屿星布的河口区。</p>
                    </div>
                  </div>

                  <p class="delta-note">
                    <strong>形态成因：</strong>三角洲形态取决于
                    <strong>河流堆积作用</strong> 与
                    <strong>海水侵蚀作用</strong>（波浪、潮汐）的强弱对比。
                    河流作用占优则形成<strong>鸟足形／扇形</strong>；
                    海水作用占优则形成<strong>尖头形／岛屿形</strong>。
                  </p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'floodplain'"
                title="河谷剖面示意"
                name="profile"
              >
                <div class="collapse-content">
                  <div class="profile-illu">
                    <svg viewBox="0 0 320 160" preserveAspectRatio="none">
                      <!-- 河谷横剖面 -->
                      <path
                        d="M 20 30 L 90 30 L 100 80 L 220 80 L 230 30 L 300 30 L 300 140 L 20 140 Z"
                        fill="rgba(140,180,110,0.5)"
                        stroke="#5b8a3f"
                        stroke-width="1"
                      />
                      <path
                        d="M 20 30 L 90 30 L 100 80 L 220 80 L 230 30 L 300 30"
                        fill="none"
                        stroke="#5b8a3f"
                        stroke-width="1.4"
                      />
                      <!-- 河床（平水位） -->
                      <path
                        d="M 110 80 L 210 80"
                        stroke="#247cff"
                        stroke-width="14"
                        stroke-linecap="round"
                      />
                      <!-- 河床内纹理 -->
                      <path
                        d="M 110 80 L 210 80"
                        stroke="#74eae5"
                        stroke-width="2"
                        stroke-linecap="round"
                        opacity="0.6"
                      />
                      <!-- 河漫滩 -->
                      <rect x="100" y="64" width="120" height="16" fill="rgba(160,200,140,0.7)" />
                      <!-- 阶地（左右两层） -->
                      <path
                        d="M 50 30 L 90 30 L 100 80 L 110 80 L 110 50 L 90 50 L 90 60 L 80 60 L 80 30 Z"
                        fill="rgba(190,160,110,0.85)"
                        stroke="#a48b5a"
                        stroke-width="0.8"
                      />
                      <path
                        d="M 210 80 L 220 80 L 230 30 L 270 30 L 270 50 L 230 50 L 230 80 L 240 80 L 240 30 Z"
                        fill="rgba(190,160,110,0.85)"
                        stroke="#a48b5a"
                        stroke-width="0.8"
                      />
                      <!-- 洪水位虚线 -->
                      <path
                        d="M 100 64 L 220 64"
                        stroke="#74eae5"
                        stroke-width="1.2"
                        stroke-dasharray="4 3"
                      />
                      <!-- 标签 -->
                      <line x1="40" y1="30" x2="40" y2="80" stroke="#7894a8" stroke-width="0.6" />
                      <line x1="285" y1="30" x2="285" y2="80" stroke="#7894a8" stroke-width="0.6" />
                      <text x="60" y="22" fill="#eaf8ff" font-size="9">河岸</text>
                      <text x="262" y="22" fill="#eaf8ff" font-size="9">河岸</text>
                      <text x="115" y="50" fill="#3a2c10" font-size="9" font-weight="bold">河漫滩</text>
                      <text x="60" y="42" fill="#fff" font-size="8" font-weight="bold">阶地</text>
                      <text x="260" y="42" fill="#fff" font-size="8" font-weight="bold">阶地</text>
                      <text x="160" y="76" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">河床</text>
                      <text x="80" y="56" fill="#eaffff" font-size="7" font-weight="bold">阶地</text>
                      <text x="240" y="56" fill="#eaffff" font-size="7" font-weight="bold">阶地</text>
                      <!-- 图例 -->
                      <line x1="20" y1="130" x2="35" y2="130" stroke="#247cff" stroke-width="3" />
                      <text x="40" y="133" fill="#7894a8" font-size="9">平水位</text>
                      <line x1="80" y1="130" x2="95" y2="130" stroke="#74eae5" stroke-width="1.5" stroke-dasharray="3 2" />
                      <text x="100" y="133" fill="#7894a8" font-size="9">洪水位</text>
                      <line x1="150" y1="130" x2="165" y2="130" stroke="#5b8a3f" stroke-width="2" />
                      <text x="170" y="133" fill="#7894a8" font-size="9">阶地面</text>
                    </svg>
                  </div>
                  <p>
                    河流阶地是<strong>地壳抬升</strong>或
                    <strong>河流下切</strong>作用形成的阶梯状地貌。
                    早期的河漫滩超出一般洪水位，呈阶梯状分布在河谷谷坡之上，
                    便成为河流阶地。
                  </p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                title="典型分布"
                name="distribution"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.distribution"></p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                title="教学提示"
                name="tip"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.tip"></p>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-else class="feature-empty">
            <div class="empty-icon">🗺</div>
            <h3>请点击上方按钮或主场景红点</h3>
            <p>查看冲积扇、河漫滩、牛轭湖、三角洲四种典型堆积地貌的形态、过程与成因。</p>
          </div>

          <el-collapse
            v-model="activeGlobalPanels"
            class="analysis-collapse"
          >
            <el-collapse-item
              title="流水地貌"
              name="overview"
            >
              <div class="collapse-content">
                <p>
                  <strong>流水地貌</strong>是由地表流水作用塑造形成的。
                  流水作用包括<strong>流水的侵蚀、搬运和堆积</strong>等方式。
                </p>
                <p>
                  <strong>侵蚀</strong>指流水对河床的冲蚀及对可溶性岩石的溶蚀；
                  <strong>搬运</strong>指流水携带泥沙和溶解质以及推动砾石移动的过程；
                  <strong>堆积</strong>指流水中侵蚀、搬运的物质最终沉积下来的过程。
                </p>
                <p>
                  根据流水作用方式，流水地貌主要有
                  <strong>流水侵蚀地貌</strong>和
                  <strong>流水堆积地貌</strong>。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="河谷的演变"
              name="valley"
            >
              <div class="collapse-content">
                <p>
                  <strong>在河流的不同发育阶段，河谷呈现不同的形态特征。</strong>
                </p>

                <div class="valley-stages">
                  <div class="valley-stage-card">
                    <div class="valley-stage-illu">
                      <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                        <path d="M 0 0 L 200 0 L 200 100 L 0 100 Z" fill="rgba(140,180,110,0.45)" />
                        <path d="M 30 30 L 95 85 L 105 85 L 170 30 L 160 30 L 100 75 L 40 30 Z" fill="rgba(160,130,90,0.6)" />
                        <path d="M 95 85 L 100 95 L 105 85 Z" fill="rgba(36,124,255,0.85)" />
                        <text x="100" y="22" fill="#eaf8ff" font-size="11" font-weight="bold" text-anchor="middle">A</text>
                      </svg>
                    </div>
                    <strong>初期：V 形谷</strong>
                    <p>河流<strong>以下蚀作用</strong>为主，河谷不断加深延长，<br />横剖面呈 "<strong>V</strong>" 字形。</p>
                  </div>

                  <div class="valley-stage-card">
                    <div class="valley-stage-illu">
                      <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                        <path d="M 0 0 L 200 0 L 200 100 L 0 100 Z" fill="rgba(140,180,110,0.45)" />
                        <path d="M 20 35 C 50 95 150 95 180 35 L 170 25 L 30 25 Z" fill="rgba(160,130,90,0.6)" />
                        <path d="M 80 70 C 95 92 105 92 120 70 Z" fill="rgba(36,124,255,0.85)" />
                        <path d="M 30 70 C 40 88 60 92 80 70" stroke="#247cff" stroke-width="3" fill="none" stroke-linecap="round" />
                        <path d="M 120 70 C 140 88 160 88 170 70" stroke="#247cff" stroke-width="3" fill="none" stroke-linecap="round" />
                        <text x="100" y="20" fill="#eaf8ff" font-size="11" font-weight="bold" text-anchor="middle">B</text>
                      </svg>
                    </div>
                    <strong>中期：U 形谷</strong>
                    <p>河流<strong>侧蚀作用</strong>增强，凹岸不断被侵蚀，<br />凸岸不断堆积，河道更加弯曲。</p>
                  </div>

                  <div class="valley-stage-card">
                    <div class="valley-stage-illu">
                      <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                        <path d="M 0 0 L 200 0 L 200 100 L 0 100 Z" fill="rgba(140,180,110,0.45)" />
                        <path d="M 10 35 L 190 35 L 190 80 L 10 80 Z" fill="rgba(160,130,90,0.6)" />
                        <rect x="40" y="35" width="120" height="4" fill="rgba(190,170,110,0.9)" />
                        <path d="M 60 80 C 80 92 120 92 140 80" stroke="#247cff" stroke-width="6" fill="none" stroke-linecap="round" />
                        <path d="M 70 80 C 90 88 110 88 130 80" stroke="#74eae5" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8" />
                        <path d="M 50 35 L 50 22 L 100 22 L 100 35" stroke="#a48b5a" stroke-width="1" fill="rgba(190,170,110,0.4)" />
                        <path d="M 110 35 L 110 14 L 160 14 L 160 35" stroke="#a48b5a" stroke-width="1" fill="rgba(190,170,110,0.4)" />
                        <text x="100" y="12" fill="#eaf8ff" font-size="11" font-weight="bold" text-anchor="middle">C</text>
                        <text x="30" y="42" fill="#eaf8ff" font-size="7">阶地</text>
                        <text x="170" y="42" fill="#eaf8ff" font-size="7">阶地</text>
                      </svg>
                    </div>
                    <strong>成熟期：槽形宽谷</strong>
                    <p>发育有<strong>河漫滩及河流阶地</strong>，河谷不断拓宽，<br />横剖面呈宽而浅的 "<strong>U</strong>" 字形。</p>
                  </div>
                </div>

                <p class="valley-note">
                  随着河流下切，<strong>早期河漫滩超出一般洪水位</strong>，
                  呈阶梯状分布在河谷谷坡之上，便成为<strong>河流阶地</strong>。
                  在河流下游，堆积作用占主导地位，往往形成广阔的
                  <strong>冲积平原</strong>和<strong>河口三角洲</strong>。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="思考与练习"
              name="think"
            >
              <div class="collapse-content">
                <p>
                  <strong>思考：</strong>为什么在河流的上游多形成峡谷，
                  而在下游多形成冲积平原和三角洲？
                </p>
                <p>
                  <strong>提示：</strong>上游地势起伏大，流速快，
                  以下蚀和搬运为主；中下游地势平缓，流速减慢，
                  以侧蚀和堆积为主。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div
          class="resize-handle resize-left"
          v-bind="rightResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

/* ===================================================================
 * 真实实景图（来自项目 OSS 图床，存放在 geo/image 下）
 * =================================================================== */

const SUN_TEXTURE_URL = '/geo-resources-folder/images/'

const PHOTO_PLACEHOLDER =
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=520&h=320&fit=crop'

interface FeatureInfo {
  id: string
  name: string
  type: string
  shape: string
  icon: string
  photoUrl: string
  cause: string
  distribution: string
  tip: string
}

const alluvialFanInfo: FeatureInfo = {
  id: 'alluvial-fan',
  name: '冲积扇',
  type: '流水堆积地貌',
  shape: '以谷口为顶点呈扇形',
  icon: '🌾',
  photoUrl: SUN_TEXTURE_URL + 'alluvial-fan.jpg',
  cause:
    '河流流出<strong>山口</strong>时，地势突然变得<strong>平缓</strong>、' +
    '河道开阔，水流<strong>流速减慢</strong>，' +
    '搬运能力降低，所携带的砾石和泥沙便在山前大量堆积下来，' +
    '形成以谷口为顶点、向外辐散的扇形堆积体。',
  distribution:
    '多分布于<strong>河流出山口</strong>处，常见于干旱、半干旱地区。' +
    '我国太行山东麓、燕山南麓的洪积—冲积扇连成一片，构成华北平原的西部边界。',
  tip:
    '冲积扇的扇顶物质较粗，以砾石为主；扇缘物质较细，以粉砂、黏土为主，' +
    '因此冲积扇常是良好的地下水富集区。',
}

const floodplainInfo: FeatureInfo = {
  id: 'floodplain',
  name: '河漫滩',
  type: '流水堆积地貌',
  shape: '河床两侧洪水期被淹没的平坦滩地',
  icon: '🏞',
  photoUrl: SUN_TEXTURE_URL + 'floodplain.jpg',
  cause:
    '河流在中下游地区<strong>侧蚀作用</strong>加强，' +
    '<strong>凹岸</strong>不断侵蚀后退，<strong>凸岸</strong>不断堆积。' +
    '洪水期河水漫过河床，挟带的<strong>细颗粒泥沙</strong>在河床两侧堆积，' +
    '形成河床两侧洪水期才能被淹没的滩地。',
  distribution:
    '广泛分布于<strong>河流中下游</strong>，尤其是平原河流两侧。' +
    '在黄河下游、长江中下游平原最为典型。',
  tip:
    '河漫滩上部为洪水期堆积的细颗粒物质（粉砂、黏土），' +
    '下部为枯水期河床堆积的较粗物质（砂、砾石），' +
    '具有典型的"二元结构"。',
}

const meanderOxbowInfo: FeatureInfo = {
  id: 'meander-oxbow',
  name: '牛轭湖',
  type: '流水堆积地貌',
  shape: '状如牛轭的弯月形湖泊',
  icon: '🌙',
  photoUrl: SUN_TEXTURE_URL + 'oxbow-lake.jpg',
  cause:
    '在河流弯曲处，<strong>惯性</strong>使水流冲向<strong>凹岸</strong>，' +
    '凹岸不断被侵蚀后退；' +
    '<strong>凸岸</strong>则因流速减慢而不断堆积前伸，河道愈发弯曲。' +
    '洪水期水流冲开狭窄的<strong>曲流颈</strong>，河道取直，' +
    '被遗弃的弯曲河段两端被泥沙淤塞，' +
    '形成状如牛轭的弯月形湖泊。',
  distribution:
    '多见于<strong>平原河流中下游</strong>，如长江荆江段、汉江下游，' +
    '以及黄河三角洲附近。',
  tip:
    '牛轭湖是河曲高度发展的产物，反映了河流侧蚀作用占主导、' +
    '河道不断弯曲并最终截直的过程。',
}

const deltaInfo: FeatureInfo = {
  id: 'delta',
  name: '三角洲',
  type: '流水堆积地貌',
  shape: '河口处向海延伸的冲积平原',
  icon: '🔺',
  photoUrl: SUN_TEXTURE_URL + 'delta.jpg',
  cause:
    '河流入海（或入湖）处，由于<strong>地势平坦</strong>、流速减慢，' +
    '加之<strong>海水顶托</strong>作用，' +
    '河流搬运能力大大降低，所携带的泥沙在河口大量堆积，' +
    '形成向海伸出的冲积平原。' +
    '三角洲形态取决于<strong>河流堆积</strong>与<strong>海水侵蚀</strong>（波浪、潮汐）的强弱对比。',
  distribution:
    '世界典型三角洲有<strong>尼罗河三角洲</strong>（扇形）、' +
    '<strong>密西西比河三角洲</strong>（鸟足形）、' +
    '<strong>长江三角洲</strong>（尖头形）、' +
    '<strong>恒河—布拉马普特拉河三角洲</strong>（岛屿形）。',
  tip:
    '判断三角洲形态的关键：河流作用越强（输沙量大、海水弱），' +
    '三角洲越向海突出（如鸟足形）；海水作用越强（波浪、潮汐强），' +
    '三角洲越被侵蚀夷平（如尖头形、岛屿形）。',
}

const featureInfoMap: Record<string, FeatureInfo> = {
  'alluvial-fan': alluvialFanInfo,
  'floodplain': floodplainInfo,
  'meander-oxbow': meanderOxbowInfo,
  'delta': deltaInfo,
}

const quickFeatures = [
  { id: 'alluvial-fan', name: '冲积扇', icon: '🌾' },
  { id: 'floodplain', name: '河漫滩', icon: '🏞' },
  { id: 'meander-oxbow', name: '牛轭湖', icon: '🌙' },
  { id: 'delta', name: '三角洲', icon: '🔺' },
]

function onPhotoError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target && target.src !== PHOTO_PLACEHOLDER) {
    target.src = PHOTO_PLACEHOLDER
  }
}

/* ===================================================================
 * Hook
 * =================================================================== */

const hasLeftPanel = true
const hasRightPanel = true

const {
  rootRef: pageRef,
  layoutMode,

  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,

  draggingSide,
  viewportResizing,

  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,

  leftResizeAttrs,
  rightResizeAttrs,

  leftCollapseAttrs,
  rightCollapseAttrs,

  leftEntryAttrs,
  rightEntryAttrs,

  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },

  right: {
    enabled: hasRightPanel,
  },

  onLayoutChange(state) {
    if (state.resizing) {
      return
    }

    scheduleSceneResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

void pageRef

/* ===================================================================
 * 业务状态
 * =================================================================== */

const showLabels = ref(true)
const showContours = ref(true)
const showFlow = ref(true)

const terrainScale = ref(1)
const autoRotate = ref(true)

const currentView = ref('overview')

const selectedFeatureId = ref<string>('')

const activeDetailPanels = ref(['cause'])
const activeGlobalPanels = ref(['overview'])

const viewPresets = [
  { label: '总览', value: 'overview' },
  { label: '上游', value: 'upstream' },
  { label: '中游', value: 'middle' },
  { label: '下游', value: 'downstream' },
  { label: '俯视', value: 'top' },
]

const selectedFeature = computed<FeatureInfo | null>(() => {
  if (!selectedFeatureId.value) {
    return null
  }
  return featureInfoMap[selectedFeatureId.value] || null
})

function selectFeature(id: string) {
  selectedFeatureId.value = id
  activeDetailPanels.value = ['cause']
}

const screenLabels = ref<
  Array<{
    id: string
    text: string
    x: number
    y: number
    visible: boolean
    tone: string
    hot: boolean
  }>
>([])

/* ===================================================================
 * Three.js 场景
 * =================================================================== */

const threeContainerRef =
  ref<HTMLElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let sceneGroup: THREE.Group | null = null
let labelTargets: Array<{
  id: string
  text: string
  position: THREE.Vector3
  tone: string
  hot: boolean
}> = []

let riverMesh: THREE.Mesh | null = null
let riverMaterial: THREE.MeshStandardMaterial | null = null
let contourGroup: THREE.Group | null = null
let contourGroupVisible = true
let flowGroup: THREE.Group | null = null
let flowGroupVisible = true

let dotMeshes: Record<
  string,
  THREE.Mesh
> = {}
let dotRings: Record<
  string,
  THREE.Mesh
> = {}

let sceneAnimationFrameId = 0
const sceneClock = new THREE.Clock()
let lastSceneWidth = 0
let lastSceneHeight = 0
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let threeResizeObserver: ResizeObserver | null = null
let raycaster: THREE.Raycaster | null = null
let pointer: THREE.Vector2 | null = null
let containerEl: HTMLElement | null = null
let cameraOriginalPos = new THREE.Vector3(0, 16, 26)
let cameraTargetPos = new THREE.Vector3(0, 16, 26)
let cameraAnimProgress = 1

let flowDots: Array<{
  mesh: THREE.Mesh
  progress: number
  speed: number
}> = []
let flowSamples: THREE.Vector2[] = []

/* ---- 河流路径 ---- */
const riverPath: Array<{ x: number; z: number }> = [
  { x: -28, z: 0 },
  { x: -24, z: 0.4 },
  { x: -20, z: -0.2 },
  { x: -16, z: 0.5 },
  { x: -12, z: -0.3 },
  { x: -8, z: 0.6 },
  { x: -4, z: 0 },
  { x: 0, z: 0.4 },
  { x: 4, z: -0.5 },
  { x: 8, z: 0.3 },
  { x: 12, z: -0.6 },
  { x: 16, z: 0.4 },
  { x: 18, z: 1.6 },
  { x: 20, z: 0.4 },
  { x: 22, z: -0.3 },
  { x: 25, z: 0.5 },
  { x: 28, z: 0 },
  { x: 30, z: 0 },
]

function sampleRiverPath(samples = 200) {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1)
    const idxFloat = t * (riverPath.length - 1)
    const i0 = Math.floor(idxFloat)
    const i1 = Math.min(i0 + 1, riverPath.length - 1)
    const localT = idxFloat - i0
    const a = riverPath[i0]!
    const b = riverPath[i1]!
    const x = a.x + (b.x - a.x) * localT
    const z = a.z + (b.z - a.z) * localT
    pts.push(new THREE.Vector2(x, z))
  }
  return pts
}

function riverWidthAt(t: number) {
  if (t < 0.25) return 0.35 + t * 1.2
  if (t < 0.6) return 0.65 + (t - 0.25) * 0.4
  return 0.85 + (t - 0.6) * 1.4
}

function terrainHeightAt(x: number, z: number) {
  const distFromRiver = Math.abs(z)
  let baseHeight = 0

  if (x < -20) {
    baseHeight = 7 + Math.sin((x + 28) * 0.6) * 1.4
  } else if (x < -12) {
    const t = (x + 20) / 8
    baseHeight = 6 - t * 2.2
  } else if (x < -6) {
    baseHeight = 3.6 - (x + 12) * 0.18
  } else if (x < 0) {
    const t = (x + 6) / 6
    baseHeight = 2.4 * (1 - t) + 0.2 * t
  } else if (x < 22) {
    baseHeight = 0.15 + Math.sin(x * 0.4) * 0.05
  } else {
    baseHeight = 0.05 + Math.max(0, (22 - x) * 0.005)
  }

  let valleyDepth = 0
  if (x > -8 && x < 22) {
    valleyDepth = Math.exp(-distFromRiver * distFromRiver * 0.7) * 1.3
  } else if (x >= -12 && x <= -8) {
    valleyDepth = Math.exp(-distFromRiver * distFromRiver * 0.4) * 2.0
  } else if (x > 22 && x < 28) {
    valleyDepth = Math.exp(-distFromRiver * distFromRiver * 1.0) * 0.4
  }

  if (x < -22) {
    const ridge = Math.exp(-distFromRiver * distFromRiver * 0.04) * 4
    baseHeight = Math.max(baseHeight, ridge)
  }

  return Math.max(0, baseHeight - valleyDepth)
}

/* ---- 真实草地贴图（程序生成） ---- */
function createGrassTexture() {
  const canvas =
    document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx =
    canvas.getContext('2d')!
  // 绿色底
  ctx.fillStyle = '#5a8a3a'
  ctx.fillRect(0, 0, 256, 256)
  // 草叶
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const len = 3 + Math.random() * 4
    const ang =
      -Math.PI / 2 + (Math.random() - 0.5) * 0.5
    const green =
      90 + Math.random() * 80
    ctx.strokeStyle =
      `rgba(${30 + Math.random() * 40}, ${green}, ${30 + Math.random() * 30}, 0.85)`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len
    )
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(8, 8)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---- 地形（带真实草地贴图） ---- */
function createTerrain() {
  const group = new THREE.Group()
  const sizeX = 60
  const sizeZ = 30
  const segX = 240
  const segZ = 120

  const geometry = new THREE.PlaneGeometry(
    sizeX,
    sizeZ,
    segX,
    segZ
  )
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position!
  const colors: number[] = []
  const grassTex = createGrassTexture()

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const h = terrainHeightAt(x, z)
    positions.setY(i, h)

    let r: number, g: number, b: number

    if (h < 0.15) {
      r = 0.55
      g = 0.46
      b = 0.32
    } else if (h < 0.8) {
      r = 0.45
      g = 0.62
      b = 0.36
    } else if (h < 2.5) {
      r = 0.4
      g = 0.55
      b = 0.3
    } else if (h < 5) {
      r = 0.45
      g = 0.48
      b = 0.36
    } else if (h < 7) {
      r = 0.65
      g = 0.68
      b = 0.7
    } else {
      r = 0.95
      g = 0.97
      b = 0.99
    }

    colors.push(r, g, b)
  }

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )
  geometry.computeVertexNormals()

  // 顶点 alpha 贴图（草地图与岩地图混合）
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  group.add(mesh)

  // 单独的草地覆盖层（沿平原）
  const grassGeo = new THREE.PlaneGeometry(38, 24, 60, 40)
  grassGeo.rotateX(-Math.PI / 2)
  const grassPos = grassGeo.attributes.position!
  for (let i = 0; i < grassPos.count; i++) {
    const x = grassPos.getX(i) + 10
    const z = grassPos.getZ(i)
    grassPos.setY(i, terrainHeightAt(x, z) + 0.015)
  }
  grassGeo.computeVertexNormals()
  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0x6ea84a,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85,
  })
  const grass = new THREE.Mesh(grassGeo, grassMat)
  grass.receiveShadow = true
  group.add(grass)

  return { group, mesh }
}

/* ---- 河流 ---- */
function createRiver() {
  const samples = sampleRiverPath(400)
  const positions: number[] = []
  const indices: number[] = []
  const colors: number[] = []

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i]!
    const t = i / (samples.length - 1)
    const w = riverWidthAt(t)

    let tangent: THREE.Vector2
    if (i === 0) {
      tangent = new THREE.Vector2(
        samples[1]!.x - p.x,
        samples[1]!.y - p.y
      ).normalize()
    } else if (i === samples.length - 1) {
      tangent = new THREE.Vector2(
        p.x - samples[i - 1]!.x,
        p.y - samples[i - 1]!.y
      ).normalize()
    } else {
      tangent = new THREE.Vector2(
        samples[i + 1]!.x - samples[i - 1]!.x,
        samples[i + 1]!.y - samples[i - 1]!.y
      ).normalize()
    }
    const normal = new THREE.Vector2(-tangent.y, tangent.x)

    const y = terrainHeightAt(p.x, p.y) - 0.06

    positions.push(p.x + normal.x * w, y, p.y + normal.y * w)
    positions.push(p.x - normal.x * w, y, p.y - normal.y * w)

    const colorMix = Math.min(1, t)
    const r = 0.1 + colorMix * 0.06
    const g = 0.4 + colorMix * 0.16
    const b = 0.7 + colorMix * 0.18
    colors.push(r, g, b, r, g, b)

    if (i < samples.length - 1) {
      const a = i * 2
      const b = (i + 1) * 2
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  riverMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.55,
    transparent: true,
    opacity: 0.92,
  })

  riverMesh = new THREE.Mesh(geometry, riverMaterial)
  riverMesh.receiveShadow = true

  return riverMesh
}

/* ---- 海洋（带波浪） ---- */
function createOcean() {
  const geometry = new THREE.PlaneGeometry(40, 36, 80, 60)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position!
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const wave =
      Math.sin(x * 0.6) * 0.06 +
      Math.cos(z * 0.5) * 0.05
    positions.setY(i, wave)
  }
  geometry.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    color: 0x247cff,
    roughness: 0.12,
    metalness: 0.75,
    transparent: true,
    opacity: 0.88,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(46, 0, 0)
  mesh.receiveShadow = true
  return mesh
}

/* ---- 流动粒子 ---- */
function createFlowParticles() {
  const group = new THREE.Group()
  const samples = sampleRiverPath(80)
  const dots: Array<{
    mesh: THREE.Mesh
    progress: number
    speed: number
  }> = []

  const geo = new THREE.SphereGeometry(0.07, 8, 6)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcaf6ff,
    transparent: true,
    opacity: 0.85,
  })

  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(geo, mat.clone())
    const p0 = samples[i % samples.length]!
    const y = terrainHeightAt(p0.x, p0.y) + 0.05
    m.position.set(p0.x, y, p0.y)
    group.add(m)
    dots.push({
      mesh: m,
      progress: i / 36,
      speed: 0.04 + Math.random() * 0.04,
    })
  }

  return { group, dots, samples }
}

/* ---- 雪山山脉（带冰川） ---- */
function createMountain() {
  const group = new THREE.Group()

  // 主山
  const mountainGeo = new THREE.ConeGeometry(8, 9.5, 7, 4)
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x6a7480,
    roughness: 0.88,
    metalness: 0.06,
    flatShading: true,
  })
  const mountain = new THREE.Mesh(mountainGeo, mountainMat)
  mountain.position.set(-26, 4.7, 0)
  mountain.castShadow = true
  mountain.receiveShadow = true
  group.add(mountain)

  // 雪顶
  const snowGeo = new THREE.ConeGeometry(3.4, 4.5, 7)
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    roughness: 0.55,
    metalness: 0.12,
    flatShading: true,
  })
  const snow = new THREE.Mesh(snowGeo, snowMat)
  snow.position.set(-26, 9, 0)
  snow.castShadow = true
  group.add(snow)

  // 冰川（白色向下流的不规则形状）
  const glacierGeo = new THREE.BoxGeometry(2.4, 4, 1.6)
  const glacierMat = new THREE.MeshStandardMaterial({
    color: 0xdfeefb,
    roughness: 0.3,
    metalness: 0.2,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  })
  const glacier = new THREE.Mesh(glacierGeo, glacierMat)
  glacier.position.set(-22, 2, 0)
  glacier.rotation.z = 0.18
  group.add(glacier)

  const glacier2 = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 3.2, 1.2),
    glacierMat
  )
  glacier2.position.set(-23, 1.5, 1.4)
  glacier2.rotation.z = 0.22
  group.add(glacier2)

  // 副山
  const m2 = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 6.5, 6, 3),
    mountainMat
  )
  m2.position.set(-30, 3.2, -4)
  m2.castShadow = true
  group.add(m2)

  const m2snow = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 3, 6),
    snowMat
  )
  m2snow.position.set(-30, 6.5, -4)
  group.add(m2snow)

  const m3 = new THREE.Mesh(
    new THREE.ConeGeometry(6, 7.5, 6, 3),
    mountainMat
  )
  m3.position.set(-30, 3.7, 4)
  m3.castShadow = true
  group.add(m3)

  const m3snow = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 3.4, 6),
    snowMat
  )
  m3snow.position.set(-30, 7.4, 4)
  group.add(m3snow)

  return group
}

/* ---- 瀑布 ---- */
function createWaterfall() {
  const group = new THREE.Group()
  const wfGeo = new THREE.PlaneGeometry(1.5, 5, 4, 8)
  const wfMat = new THREE.MeshStandardMaterial({
    color: 0x9adfff,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  })
  const wf = new THREE.Mesh(wfGeo, wfMat)
  wf.position.set(-10, 1.6, 0)
  wf.rotation.x = -0.08
  group.add(wf)

  // 飞溅水雾
  for (let i = 0; i < 8; i++) {
    const splat = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshBasicMaterial({
        color: 0xcaf6ff,
        transparent: true,
        opacity: 0.6,
      })
    )
    splat.position.set(
      -10 + (Math.random() - 0.5) * 0.6,
      0.2 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.6
    )
    group.add(splat)
  }

  return group
}

/* ---- 树木（针叶林） ---- */
function createTrees() {
  const group = new THREE.Group()
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x3d6e2a,
    roughness: 0.85,
  })
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5e3a1f,
    roughness: 0.95,
  })

  function makeTree() {
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5),
      trunkMat
    )
    trunk.position.y = 0.2
    tree.add(trunk)
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.85, 6),
      treeMat
    )
    cone.position.y = 0.85
    tree.add(cone)
    const cone2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.7, 6),
      treeMat
    )
    cone2.position.y = 1.2
    tree.add(cone2)
    return tree
  }

  // 在平原两侧散布
  for (let i = 0; i < 50; i++) {
    const t = Math.random()
    const x = -8 + t * 32
    const side = Math.random() > 0.5 ? 1 : -1
    const z = side * (2 + Math.random() * 8)
    const y = terrainHeightAt(x, z)
    const tree = makeTree()
    tree.position.set(x, y, z)
    const scale = 0.7 + Math.random() * 0.7
    tree.scale.setScalar(scale)
    tree.rotation.y = Math.random() * Math.PI
    group.add(tree)
  }

  return group
}

/* ---- 等高线 ---- */
const _contourCorners = [0, 1, 1, 0]
const _contourAx = [0, 1, 1, 0]
const _contourAz = [0, 0, 1, 1]

/* ---- 封闭的土壤块（底部 + 四壁） ---- */
function createSoilBlock() {
  const group = new THREE.Group()

  const sizeX = 60
  const sizeZ = 30
  const depth = 4
  const topY = 0.001

  // 程序化生成土壤贴图（多色斑驳）
  function makeSoilTexture(isTop = false) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    if (isTop) {
      ctx.fillStyle = '#5a8a3a'
      ctx.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * 256
        const y = Math.random() * 256
        const len = 2 + Math.random() * 3
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.5
        const green = 80 + Math.random() * 80
        ctx.strokeStyle = `rgba(${30 + Math.random() * 30}, ${green}, ${30 + Math.random() * 25}, 0.9)`
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
        ctx.stroke()
      }
    } else {
      // 棕色土壤层
      const grad = ctx.createLinearGradient(0, 0, 256, 0)
      grad.addColorStop(0, '#8b6535')
      grad.addColorStop(0.3, '#a07745')
      grad.addColorStop(0.5, '#8b6535')
      grad.addColorStop(0.7, '#7a5528')
      grad.addColorStop(1, '#6e4a22')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 256, 256)
      // 颗粒
      for (let i = 0; i < 1200; i++) {
        const x = Math.random() * 256
        const y = Math.random() * 256
        const r = Math.random() * 1.4
        const shade = Math.random()
        if (shade > 0.7) {
          ctx.fillStyle = `rgba(50,30,15,${0.4 + Math.random() * 0.4})`
        } else if (shade > 0.4) {
          ctx.fillStyle = `rgba(140,100,60,${0.3 + Math.random() * 0.3})`
        } else {
          ctx.fillStyle = `rgba(180,140,90,${0.2 + Math.random() * 0.3})`
        }
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      // 横向层理线
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(80,50,25,${0.18 + Math.random() * 0.15})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        const y = 30 + i * 40 + (Math.random() - 0.5) * 8
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(
          80, y + (Math.random() - 0.5) * 6,
          170, y + (Math.random() - 0.5) * 6,
          256, y
        )
        ctx.stroke()
      }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }

  const grassTex = makeSoilTexture(true)
  grassTex.repeat.set(12, 6)

  const soilTex = makeSoilTexture(false)
  soilTex.repeat.set(4, 1)

  // 底面
  const bottomGeo = new THREE.PlaneGeometry(sizeX, sizeZ)
  bottomGeo.rotateX(Math.PI / 2)
  const bottomMat = new THREE.MeshStandardMaterial({
    map: soilTex,
    color: 0x8b6535,
    roughness: 0.95,
  })
  const bottom = new THREE.Mesh(bottomGeo, bottomMat)
  bottom.position.set(0, -depth, 0)
  bottom.receiveShadow = true
  group.add(bottom)

  // 顶面（绿色草地，覆盖在土壤之上）
  const topGeo = new THREE.PlaneGeometry(sizeX, sizeZ)
  topGeo.rotateX(-Math.PI / 2)
  const topMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0x6ea84a,
    roughness: 0.92,
    metalness: 0,
  })
  const top = new THREE.Mesh(topGeo, topMat)
  top.position.set(0, topY, 0)
  top.receiveShadow = true
  group.add(top)

  // 前壁
  const frontGeo = new THREE.PlaneGeometry(sizeX, depth)
  const frontMat = new THREE.MeshStandardMaterial({
    map: soilTex,
    color: 0x8b6535,
    roughness: 0.95,
  })
  const front = new THREE.Mesh(frontGeo, frontMat)
  front.position.set(0, -depth / 2, sizeZ / 2)
  front.receiveShadow = true
  group.add(front)

  // 后壁
  const back = new THREE.Mesh(frontGeo, frontMat)
  back.position.set(0, -depth / 2, -sizeZ / 2)
  back.rotation.y = Math.PI
  back.receiveShadow = true
  group.add(back)

  // 左壁
  const sideGeo = new THREE.PlaneGeometry(sizeZ, depth)
  const leftMat = new THREE.MeshStandardMaterial({
    map: soilTex,
    color: 0x7a5528,
    roughness: 0.95,
  })
  const left = new THREE.Mesh(sideGeo, leftMat)
  left.position.set(-sizeX / 2, -depth / 2, 0)
  left.rotation.y = Math.PI / 2
  left.receiveShadow = true
  group.add(left)

  // 右壁
  const right = new THREE.Mesh(sideGeo, leftMat)
  right.position.set(sizeX / 2, -depth / 2, 0)
  right.rotation.y = -Math.PI / 2
  right.receiveShadow = true
  group.add(right)

  return group
}

function createContourLines() {
  const group = new THREE.Group()
  const sizeX = 60
  const sizeZ = 30
  const segX = 180
  const segZ = 90

  const heightMap: number[][] = []
  for (let i = 0; i <= segZ; i++) {
    const row: number[] = []
    for (let j = 0; j <= segX; j++) {
      const x = (j / segX - 0.5) * sizeX
      const z = (i / segZ - 0.5) * sizeZ
      row.push(terrainHeightAt(x, z))
    }
    heightMap.push(row)
  }

  const levels = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7]

  for (const level of levels) {
    const linePts: THREE.Vector3[] = []
    for (let i = 0; i < segZ; i++) {
      for (let j = 0; j < segX; j++) {
        const x0 = (j / segX - 0.5) * sizeX
        const z0 = (i / segZ - 0.5) * sizeZ
        const dx = sizeX / segX
        const dz = sizeZ / segZ

        const interp = (
          h1: number,
          h2: number,
          x1: number,
          z1: number,
          x2: number,
          z2: number
        ) => {
          const t = (level - h1) / (h2 - h1)
          return new THREE.Vector3(
            x1 + (x2 - x1) * t,
            level,
            z1 + (z2 - z1) * t
          )
        }

        const edges: Array<[number, number]> = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ]
        const pts: THREE.Vector3[] = []
        edges.forEach(([a, b]) => {
          const ha = heightMap[i]![j + _contourCorners[a]!]!
          const hb = heightMap[i]![j + _contourCorners[b]!]!
          if (
            (ha < level && hb >= level) ||
            (ha >= level && hb < level)
          ) {
            const xa = x0 + _contourAx[a]! * dx
            const za = z0 + _contourAz[a]! * dz
            const xb = x0 + _contourAx[b]! * dx
            const zb = z0 + _contourAz[b]! * dz
            pts.push(interp(ha, hb, xa, za, xb, zb))
          }
        })

        if (pts.length === 2) {
          linePts.push(pts[0]!, pts[1]!)
        }
      }
    }

    if (linePts.length > 0) {
      const geo = new THREE.BufferGeometry().setFromPoints(linePts)
      const mat = new THREE.LineBasicMaterial({
        color: level > 4 ? 0xffffff : 0x2ec4b6,
        transparent: true,
        opacity: 0.4,
      })
      const lineSeg = new THREE.LineSegments(geo, mat)
      lineSeg.position.y = 0.02
      group.add(lineSeg)
    }
  }

  return group
}

/* ---- 可点击红点（带光圈） ---- */
function createHotspot(
  id: string,
  x: number,
  y: number,
  z: number
) {
  const group = new THREE.Group()
  group.position.set(x, y, z)

  const dotGeo = new THREE.SphereGeometry(0.3, 20, 16)
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xff3838,
    emissive: 0xff3838,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  group.add(dot)

  const ringGeo = new THREE.RingGeometry(0.5, 0.68, 28)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff5252,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -0.05
  group.add(ring)

  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6)
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0xff5252,
    transparent: true,
    opacity: 0.65,
  })
  const pillar = new THREE.Mesh(pillarGeo, pillarMat)
  pillar.position.y = 0.7
  group.add(pillar)

  dotMeshes[id] = dot
  dotRings[id] = ring

  return group
}

/* ---- 初始化场景 ---- */
function initScene() {
  const container = threeContainerRef.value
  if (!container) return
  containerEl = container

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a2540)
  scene.fog = new THREE.Fog(0x0a2540, 50, 95)

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  camera.position.copy(cameraOriginalPos)
  camera.lookAt(0, 1.5, 0)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  )
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className =
    'scene-canvas three-canvas'
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(
    camera,
    renderer.domElement
  )
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 8
  orbitControls.maxDistance = 60
  orbitControls.maxPolarAngle = Math.PI * 0.49
  orbitControls.target.set(0, 1.5, 0)

  // 光照
  const hemi = new THREE.HemisphereLight(
    0xcaf6ff,
    0x1a2a3a,
    1.15
  )
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xfff5e0, 1.5)
  dir.position.set(-10, 18, 14)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024, 1024)
  dir.shadow.camera.left = -30
  dir.shadow.camera.right = 30
  dir.shadow.camera.top = 30
  dir.shadow.camera.bottom = -30
  scene.add(dir)

  sceneGroup = new THREE.Group()
  scene.add(sceneGroup)

  // 底部封闭的土壤块
  const soilBlock = createSoilBlock()
  sceneGroup.add(soilBlock)

  const { group: terrainGroup } = createTerrain()
  sceneGroup.add(terrainGroup)

  contourGroup = createContourLines()
  contourGroup.visible = showContours.value
  contourGroupVisible = showContours.value
  sceneGroup.add(contourGroup)

  riverMesh = createRiver()
  sceneGroup.add(riverMesh)

  const ocean = createOcean()
  sceneGroup.add(ocean)

  const mountain = createMountain()
  sceneGroup.add(mountain)

  const waterfall = createWaterfall()
  sceneGroup.add(waterfall)

  const flow = createFlowParticles()
  flowGroup = flow.group
  flowDots = flow.dots
  flowSamples = flow.samples
  flowGroup.visible = showFlow.value
  flowGroupVisible = showFlow.value
  sceneGroup.add(flowGroup)

  const trees = createTrees()
  sceneGroup.add(trees)

  const hotspots = [
    { id: 'alluvial-fan', x: -1.2, y: 1.6, z: 0.5 },
    { id: 'floodplain', x: 8.5, y: 0.7, z: -1.0 },
    { id: 'meander-oxbow', x: 16, y: 0.6, z: 1.0 },
    { id: 'delta', x: 26, y: 0.4, z: 0 },
  ]
  hotspots.forEach((h) => {
    const dot = createHotspot(h.id, h.x, h.y, h.z)
    sceneGroup?.add(dot)
  })

  labelTargets = [
    { id: 'glacier', text: '冰川', position: new THREE.Vector3(-22, 5.5, 1.5), tone: 'cool', hot: false },
    { id: 'canyon', text: '峡谷', position: new THREE.Vector3(-14, 3.8, 3.2), tone: 'cool', hot: false },
    { id: 'waterfall', text: '瀑布', position: new THREE.Vector3(-9.6, 4.2, 1.6), tone: 'cool', hot: false },
    { id: 'alluvial-fan', text: '冲积扇', position: new THREE.Vector3(-1.2, 3.4, 0.5), tone: 'warm', hot: true },
    { id: 'river', text: '河流', position: new THREE.Vector3(4, 2.2, -1.6), tone: 'cool', hot: false },
    { id: 'meander', text: '曲流', position: new THREE.Vector3(13, 1.7, -1.4), tone: 'cool', hot: false },
    { id: 'floodplain', text: '河漫滩', position: new THREE.Vector3(8.5, 1.8, -1.7), tone: 'warm', hot: true },
    { id: 'meander-oxbow', text: '牛轭湖', position: new THREE.Vector3(16, 1.8, 1.5), tone: 'warm', hot: true },
    { id: 'alluvial-plain', text: '冲积平原', position: new THREE.Vector3(20, 1.1, 3.6), tone: 'cool', hot: false },
    { id: 'valley', text: '河谷', position: new THREE.Vector3(-15, 3.0, 4.1), tone: 'cool', hot: false },
    { id: 'terrace', text: '阶地', position: new THREE.Vector3(11, 1.4, 2.1), tone: 'cool', hot: false },
    { id: 'delta', text: '三角洲', position: new THREE.Vector3(26, 1.5, -2.1), tone: 'warm', hot: true },
    { id: 'sea', text: '海洋', position: new THREE.Vector3(46, 1.0, 8), tone: 'cool', hot: false },
  ]

  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  threeResizeObserver = new ResizeObserver(() => {
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  resizeThreeSceneNow()
  sceneClock.start()
  animateScene()
}

function onPointerDown(event: PointerEvent) {
  if (!containerEl) return
  const rect = containerEl.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  pointer?.set(x, y)
  if (!raycaster || !camera || !sceneGroup) return
  raycaster.setFromCamera(pointer!, camera)
  const intersects = raycaster.intersectObjects(
    Object.values(dotMeshes),
    false
  )
  if (intersects.length > 0) {
    const hit = intersects[0]!.object
    const id = Object.keys(dotMeshes).find(
      (k) => dotMeshes[k] === hit
    )
    if (id) {
      selectFeature(id)
    }
  }
}

function setView(value: string) {
  currentView.value = value
  const orbitTarget = orbitControls?.target
  if (!orbitTarget) return

  if (value === 'overview') {
    cameraTargetPos = new THREE.Vector3(0, 16, 26)
    orbitTarget.set(0, 1.5, 0)
  } else if (value === 'upstream') {
    cameraTargetPos = new THREE.Vector3(-22, 8, 14)
    orbitTarget.set(-18, 3, 0)
  } else if (value === 'middle') {
    cameraTargetPos = new THREE.Vector3(4, 6, 12)
    orbitTarget.set(8, 1, 0)
  } else if (value === 'downstream') {
    cameraTargetPos = new THREE.Vector3(28, 6, 14)
    orbitTarget.set(22, 0.5, 0)
  } else if (value === 'top') {
    cameraTargetPos = new THREE.Vector3(0, 36, 0.01)
    orbitTarget.set(0, 0, 0)
  }
  cameraAnimProgress = 0
}

function resetView() {
  setView('overview')
}

watch(terrainScale, (val) => {
  if (sceneGroup) {
    sceneGroup.scale.setScalar(val)
  }
})

watch(showContours, (val) => {
  contourGroupVisible = val
  if (contourGroup) {
    contourGroup.visible = val
  }
})

watch(showFlow, (val) => {
  flowGroupVisible = val
  if (flowGroup) {
    flowGroup.visible = val
  }
})

watch(showLabels, () => {
  updateScreenLabels()
})

function updateScreenLabels() {
  if (!camera || !renderer || !sceneGroup) return
  const width = renderer.domElement.clientWidth
  const height = renderer.domElement.clientHeight
  if (!width || !height) return

  const result: Array<{
    id: string
    text: string
    x: number
    y: number
    visible: boolean
    tone: string
    hot: boolean
  }> = []

  const v = new THREE.Vector3()

  for (const target of labelTargets) {
    v.copy(target.position)
    sceneGroup.localToWorld(v)
    v.project(camera)

    const x = (v.x * 0.5 + 0.5) * width
    const y = (-v.y * 0.5 + 0.5) * height
    const visible = v.z > -1 && v.z < 1

    result.push({
      id: target.id,
      text: target.text,
      x,
      y,
      visible,
      tone: target.tone,
      hot: target.hot,
    })
  }

  screenLabels.value = result
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return
  const width = Math.max(
    1,
    Math.round(container.clientWidth)
  )
  const height = Math.max(
    1,
    Math.round(container.clientHeight)
  )
  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }
  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  if (scene && camera) {
    renderer.render(scene, camera)
  }
  updateScreenLabels()
}

function scheduleSceneResize(delay = 90) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (
      draggingSide.value ||
      viewportResizing.value
    ) {
      return
    }
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame =
        requestAnimationFrame(() => {
          resizeThreeSceneNow()
        })
    })
  }, delay)
}

function animateScene() {
  sceneAnimationFrameId =
    requestAnimationFrame(animateScene)

  const delta = Math.min(sceneClock.getDelta(), 0.05)
  const time = sceneClock.elapsedTime

  if (cameraAnimProgress < 1) {
    cameraAnimProgress = Math.min(
      1,
      cameraAnimProgress + delta * 1.5
    )
    if (camera) {
      const t = cameraAnimProgress
      const easeT = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2
      camera.position.lerpVectors(
        cameraOriginalPos,
        cameraTargetPos,
        easeT
      )
    }
  }

  if (autoRotate.value && cameraAnimProgress >= 1) {
    if (orbitControls && sceneGroup && camera) {
      const cam = camera
      const radius = cam.position.length()
      const angle = Math.atan2(
        cam.position.z,
        cam.position.x
      )
      const nextAngle = angle + delta * 0.08
      const y = cam.position.y
      const horiz = Math.sqrt(
        radius * radius - y * y
      )
      cam.position.set(
        Math.cos(nextAngle) * horiz,
        y,
        Math.sin(nextAngle) * horiz
      )
    }
  }

  Object.values(dotRings).forEach((ring) => {
    const scale = 1 + Math.sin(time * 3) * 0.15
    ring.scale.setScalar(scale)
    ;(ring.material as THREE.MeshBasicMaterial).opacity =
      0.55 + Math.sin(time * 3) * 0.2
  })

  if (flowGroupVisible) {
    for (let i = 0; i < flowDots.length; i++) {
      const d = flowDots[i]!
      d.progress += d.speed * delta
      if (d.progress > 1) {
        d.progress = 0
      }
      const idx = Math.floor(
        d.progress * (flowSamples.length - 1)
      )
      const p = flowSamples[idx]!
      const y = terrainHeightAt(p.x, p.y) + 0.08
      d.mesh.position.set(p.x, y, p.y)
    }
  }

  if (sceneGroup && terrainScale.value) {
    sceneGroup.scale.setScalar(terrainScale.value)
  }

  orbitControls?.update()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }

  updateScreenLabels()
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer?.domElement) {
    renderer.domElement.removeEventListener(
      'pointerdown',
      onPointerDown
    )
  }

  orbitControls?.dispose()
  orbitControls = null

  scene?.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      const mat = obj.material
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose())
      } else {
        mat?.dispose()
      }
    }
  })

  renderer?.dispose()
  if (
    renderer?.domElement.parentElement
  ) {
    renderer.domElement.parentElement.removeChild(
      renderer.domElement
    )
  }

  scene = null
  camera = null
  renderer = null
  sceneGroup = null
  riverMesh = null
  riverMaterial = null
  contourGroup = null
  flowGroup = null
  labelTargets = []
  Object.keys(dotMeshes).forEach((k) => {
    delete dotMeshes[k]
  })
  Object.keys(dotRings).forEach((k) => {
    delete dotRings[k]
  })
  flowDots = []
  flowSamples = []
  raycaster = null
  pointer = null
  containerEl = null
}

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
/* ------------------------------------------------------------------
 * 视角按钮
 * ------------------------------------------------------------------ */
.view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
}

.view-btn {
  width: 100%;
  font-size: clamp(11px, 0.95vw, 13px);
  padding-block: clamp(6px, 0.7vh, 9px);
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vh, 12px);
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: clamp(8px, 0.7vw, 12px);
  padding: clamp(6px, 0.6vh, 9px) clamp(8px, 0.7vw, 11px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.legend-item strong {
  display: block;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.legend-item span {
  display: block;
  margin-top: 2px;
  font-size: clamp(9px, 0.8vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.legend-dot {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  margin-top: 3px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* ------------------------------------------------------------------
 * 场景标注
 * ------------------------------------------------------------------ */
.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 2px 10px;
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 700;
  color: var(--text-primary);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  background: rgba(8, 20, 34, 0.75);
  border: 1px solid rgba(116, 234, 229, 0.45);
  border-radius: 4px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  letter-spacing: 0.04em;
  transition: opacity 0.2s ease;
  z-index: 4;
}

.scene-label.label-cool {
  border-color: rgba(116, 234, 229, 0.55);
  color: #e8fbff;
  background: rgba(8, 30, 50, 0.78);
}

.scene-label.label-warm {
  border-color: rgba(255, 82, 82, 0.7);
  color: #ffe2e2;
  background: rgba(70, 12, 12, 0.7);
}

.scene-label.label-hot {
  border-color: #ff5252;
  background: rgba(255, 82, 82, 0.25);
  color: #ffeaea;
  box-shadow: 0 0 14px rgba(255, 82, 82, 0.55);
}

.stage-hint {
  position: absolute;
  right: clamp(10px, 1vw, 18px);
  bottom: clamp(10px, 1vw, 16px);
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.85vw, 12px);
  background: rgba(8, 20, 34, 0.55);
  border: 1px solid var(--inactive-border);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
}

.hint-icon {
  font-size: 12px;
}

/* 牛轭湖形成过程相关样式已移除（弹层已被拆分到右侧详情） */

/* ------------------------------------------------------------------
 * 地貌详情
 * ------------------------------------------------------------------ */
.feature-detail {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1vw, 14px);
  margin-bottom: clamp(10px, 1vw, 14px);
}

.feature-head {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 14px);
  padding: clamp(10px, 0.9vw, 14px);
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: clamp(46px, 4.4vw, 56px);
  height: clamp(46px, 4.4vw, 56px);
  font-size: 26px;
  background: linear-gradient(
    135deg,
    rgba(46, 196, 182, 0.32),
    rgba(36, 124, 255, 0.32)
  );
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.3);
}

.feature-icon.icon-alluvial-fan,
.feature-icon.icon-floodplain,
.feature-icon.icon-meander-oxbow,
.feature-icon.icon-delta {
  background: linear-gradient(
    135deg,
    rgba(255, 82, 82, 0.32),
    rgba(255, 165, 0, 0.32)
  );
  box-shadow: 0 0 12px rgba(255, 82, 82, 0.3);
}

.feature-head h3 {
  margin: 0 0 4px;
  font-size: clamp(15px, 1.35vw, 19px);
  color: var(--text-primary);
}

.feature-type {
  display: inline-block;
  padding: 2px 8px;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--theme-primary);
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 4px;
}

/* 实景图 */
.feature-photo-card {
  display: flex;
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.feature-photo-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(180deg, #3a5a7a 0%, #4a6a4a 70%, #5a4a3a 100%);
  overflow: hidden;
}

.feature-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%);
}

.feature-photo-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8px 10px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 60%,
    rgba(0, 0, 0, 0.55) 100%
  );
}

.photo-badge {
  align-self: flex-start;
  display: inline-block;
  padding: 2px 8px;
  font-size: clamp(9px, 0.78vw, 11px);
  font-weight: 700;
  color: #fff;
  background: rgba(255, 82, 82, 0.85);
  border-radius: 4px;
}

.photo-caption {
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

/* 牛轭湖形成过程（在右侧详情中） */
.oxbow-form-steps {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
}

.oxbow-form-step {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: clamp(8px, 0.8vw, 12px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.form-illu {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 20, 34, 0.4);
  border-radius: 6px;
  padding: 4px;
}

.form-illu svg {
  width: 100%;
  height: auto;
  display: block;
}

.oxbow-form-step strong {
  display: block;
  margin-bottom: 2px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.oxbow-form-step p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.55;
}

/* 河谷剖面（floodplain 子项） */
.profile-illu {
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: clamp(6px, 0.6vw, 10px);
  margin-bottom: 8px;
  background: rgba(8, 20, 34, 0.4);
  border-radius: 6px;
}

.profile-illu svg {
  width: 100%;
  max-width: 360px;
  height: auto;
}

/* 三角洲形态 */
.delta-shapes-image {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(8px, 0.8vw, 12px);
  background: rgba(8, 20, 34, 0.4);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(6px, 0.6vw, 10px);
  padding: 6px;
}

.delta-shapes-img {
  width: 100%;
  max-width: 480px;
  height: auto;
  display: block;
  border-radius: 4px;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%);
}

.delta-shapes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: clamp(10px, 0.9vw, 14px);
}

@media (max-width: 720px) {
  .delta-shapes {
    grid-template-columns: 1fr;
  }
}

.delta-shape-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: clamp(8px, 0.8vw, 12px);
  text-align: center;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.delta-shape-svg {
  width: 100%;
  max-width: 120px;
}

.delta-shape-svg svg {
  display: block;
  width: 100%;
  height: auto;
}

.delta-shape-card strong {
  display: block;
  margin-top: 4px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.delta-shape-card p {
  margin: 2px 0 0;
  font-size: clamp(9px, 0.78vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.delta-note {
  margin: 0;
  padding: clamp(8px, 0.8vw, 12px);
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: clamp(6px, 0.6vw, 9px);
}

.delta-note strong {
  color: var(--theme-primary-light);
}

/* 河谷演变 A/B/C */
.valley-stages {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
  margin: clamp(8px, 0.8vw, 12px) 0;
}

@media (max-width: 720px) {
  .valley-stages {
    grid-template-columns: 1fr;
  }
}

.valley-stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: clamp(8px, 0.8vw, 12px);
  text-align: center;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.valley-stage-illu {
  width: 100%;
  max-width: 180px;
}

.valley-stage-illu svg {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  background: rgba(8, 20, 34, 0.4);
}

.valley-stage-card strong {
  display: block;
  margin-top: 4px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.valley-stage-card p {
  margin: 2px 0 0;
  font-size: clamp(9px, 0.78vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.valley-note {
  margin: 0;
  padding: clamp(8px, 0.8vw, 12px);
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: clamp(6px, 0.6vw, 9px);
}

.valley-note strong {
  color: var(--theme-primary-light);
}

/* ------------------------------------------------------------------
 * 快速切换区（始终显示在右上面板）
 * ------------------------------------------------------------------ */
.quick-access {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: clamp(10px, 1vw, 14px);
  padding: clamp(10px, 0.9vw, 14px);
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.quick-access-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: clamp(6px, 0.6vw, 9px);
  border-bottom: 1px solid var(--inactive-border);
}

.quick-access-title strong {
  font-size: clamp(12px, 1.1vw, 15px);
  color: var(--text-primary);
}

.quick-access-title span {
  font-size: clamp(9px, 0.8vw, 11px);
  color: var(--text-muted);
}

.quick-access-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
}

.quick-access-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(8px, 0.8vw, 12px) clamp(6px, 0.6vw, 10px);
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  border-radius: clamp(6px, 0.6vw, 10px);
  transition: all 0.2s ease;
}

.quick-access-btn .qa-icon {
  font-size: clamp(14px, 1.2vw, 18px);
  line-height: 1;
}

.quick-access-btn .qa-name {
  font-size: clamp(11px, 0.95vw, 13px);
  letter-spacing: 0.04em;
}

.quick-access-btn.active {
  background: rgba(255, 82, 82, 0.18);
  border-color: #ff5252;
  color: #ffe2e2;
  box-shadow: 0 0 12px rgba(255, 82, 82, 0.4);
}

/* ------------------------------------------------------------------
 * 空状态
 * ------------------------------------------------------------------ */
.feature-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 0.8vw, 12px);
  padding: clamp(16px, 1.6vw, 24px) clamp(10px, 0.9vw, 14px);
  margin-bottom: clamp(10px, 1vw, 14px);
  text-align: center;
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.empty-icon {
  font-size: 36px;
  opacity: 0.7;
}

.feature-empty h3 {
  margin: 0;
  font-size: clamp(13px, 1.2vw, 16px);
  color: var(--text-primary);
}

.feature-empty p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 32ch;
}

/* ------------------------------------------------------------------
 * 文字说明
 * ------------------------------------------------------------------ */
.collapse-content p {
  margin: 0 0 clamp(6px, 0.6vh, 9px);
  font-size: clamp(10.5px, 0.92vw, 12.5px);
  color: var(--text-secondary);
  line-height: 1.7;
}

.collapse-content p:last-child {
  margin-bottom: 0;
}

.collapse-content strong {
  color: var(--theme-primary-light);
  font-weight: 700;
}

/* ------------------------------------------------------------------
 * Hook 状态
 * ------------------------------------------------------------------ */
.river-landforms-container .workspace.panel-resizing,
.river-landforms-container .workspace.layout-resizing,
.river-landforms-container
  .workspace.panel-resizing
  .side-panel,
.river-landforms-container
  .workspace.layout-resizing
  .side-panel,
.river-landforms-container
  .workspace.panel-resizing
  .center-stage,
.river-landforms-container
  .workspace.layout-resizing
  .center-stage {
  transition: none !important;
}

.river-landforms-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
