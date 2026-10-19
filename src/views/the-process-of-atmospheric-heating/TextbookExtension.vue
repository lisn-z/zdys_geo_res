<template>
  <details class="textbook-extension">
    <summary class="extension-heading">教材拓展 · 按需查看</summary>
    <div class="extension-content">
      <p class="extension-intro">先理解过程，需要读图比较时再查看数据。</p>

      <details class="extension-topic">
        <summary>地表反射对比</summary>
        <div class="topic-content">
          <p class="comparison-condition">同样的太阳辐射入射条件下</p>
          <div class="surface-cards" aria-label="新雪与草地的定性比较">
            <article class="surface-card snow-card">
              <span class="surface-swatch snow-swatch" aria-hidden="true"></span>
              <div><h3>新雪</h3><p>反射较多<span>吸收较少</span></p></div>
            </article>
            <article class="surface-card grass-card">
              <span class="surface-swatch grass-swatch" aria-hidden="true"></span>
              <div><h3>草地</h3><p>反射较少<span>吸收较多</span></p></div>
            </article>
          </div>
          <p class="reading-note">这里比较的是短波辐射的分配，不能只凭反射率直接判断地表温度。</p>

          <details class="reference-values">
            <summary>查看教材参考范围</summary>
            <div class="reference-content">
              <dl class="reflectivity-values">
                <div><dt>新雪反射率</dt><dd>75%～95%</dd></div>
                <div><dt>草地反射率</dt><dd>10%～30%</dd></div>
              </dl>
              <p>这是典型范围，不是每处地表固定不变的值；地表状态与太阳高度等条件会影响反射率。</p>
              <p class="source-note">教材第 51 页 · 图 2-18</p>
            </div>
          </details>
        </div>
      </details>

      <details class="extension-topic">
        <summary>太阳常数是什么</summary>
        <div class="topic-content">
          <p class="constant-value">8.2 <span>J/(cm²·min)</span></p>
          <p>在日地平均距离处，大气上界垂直于太阳光线的单位面积，在单位时间内接收的太阳辐射能。</p>
          <p class="definition-note">它不是地面吸收值，也不能当作任意地点、任意时刻的地面入射量。</p>
          <p class="source-note">教材第 49 页 · 图 2-14</p>
        </div>
      </details>

      <a class="textbook-link"
        href="https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&amp;contentId=7a8797ab-dcee-4bb8-88f8-c6b67f0ac667&amp;catalogType=tchMaterial&amp;subCatalog=tchMaterial"
        target="_blank" rel="noopener noreferrer">
        <span>查看官方电子教材</span><span aria-hidden="true">↗</span>
        <small>上海使用 · 中图中华地图版《地理·必修第一册》</small>
      </a>
    </div>
  </details>
</template>

<style scoped>
.textbook-extension {
  min-width: 0;
  margin-top: 16px;
  border: 1px solid #d8dfcf;
  border-radius: 8px;
  background: #f7f6ee;
  color: #344b3d;
  font-size: 13px;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

summary {
  cursor: pointer;
  list-style-position: outside;
  margin-left: 16px;
  padding: 11px 12px 11px 0;
  font-weight: 600;
  line-height: 1.5;
}

summary::marker {
  color: #64816b;
  font-size: 10px;
}

summary:hover { color: #1c6049; }
summary:focus-visible, a:focus-visible { outline: 2px solid #426e53; outline-offset: 3px; border-radius: 3px; }
.extension-heading { margin-left: 28px; font-size: 13px; }
.extension-content { padding: 0 12px 12px; }
.extension-intro { margin: 0 0 10px; color: #64725f; font-size: 12px; }
.extension-topic { border-top: 1px solid #dce2d4; }
.topic-content { padding-bottom: 13px; }
.topic-content > p { margin: 0 0 10px; }
.comparison-condition { color: #5b6d58; font-size: 12px; }

.surface-cards { display: grid; gap: 7px; margin-bottom: 10px; }
.surface-card { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid #dce3d5; border-radius: 6px; background: #fcfcf7; }
.surface-card > div { flex: 1; min-width: 0; }
.surface-card h3 { margin: 0; font-size: 13px; font-weight: 600; }
.surface-card p { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 1px 0 0; font-size: 12px; color: #526750; }
.surface-swatch { width: 28px; height: 28px; border: 1px solid #cdd6cd; border-radius: 5px; flex-shrink: 0; }
.snow-swatch { background: linear-gradient(155deg, #ffffff 35%, #d9e4e6); }
.grass-swatch { background: linear-gradient(155deg, #8b9c64, #516b40); }
.reading-note { color: #67735f; font-size: 12px; }

.reference-values { border: 1px solid #dce2d4; border-radius: 5px; background: #eeefe4; }
.reference-values > summary { margin-left: 25px; padding-block: 9px; font-size: 12px; }
.reference-content { padding: 0 10px 10px; }
.reference-content p { margin: 8px 0 0; font-size: 12px; }
.reflectivity-values { margin: 0; }
.reflectivity-values > div { display: flex; justify-content: space-between; gap: 10px; padding-block: 3px; }
.reflectivity-values dt { font-size: 12px; }
.reflectivity-values dd { margin: 0; font-weight: 600; color: #305743; font-variant-numeric: tabular-nums; }
.constant-value { color: #305743; font-size: 22px; font-weight: 600; line-height: 1.4; }
.constant-value span { font-size: 13px; font-weight: 500; }
.definition-note { padding-left: 10px; border-left: 2px solid #9caa8e; color: #496343; }
.source-note { font-size: 11px !important; color: #6b7765; }

.textbook-link { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding-top: 11px; border-top: 1px solid #dce2d4; color: #365e47; text-decoration: none; }
.textbook-link > span:first-child { text-decoration: underline; text-underline-offset: 3px; }
.textbook-link small { grid-column: 1 / -1; font-size: 11px; color: #68755f; line-height: 1.6; }
.textbook-link:hover { color: #1c6049; }
</style>
