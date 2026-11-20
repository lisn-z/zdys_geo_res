export interface LessonQuestion {
  id: string
  prompt: string
  options: { text: string; correct: boolean; feedback: string }[]
}

export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export const TEXTBOOK_NOTE = '上海版地理七年级上册：第127页认识台风及其引发的风暴潮危害，第128页学习提升防灾减灾能力。三维过程、控制变量实验、过程回放与判断题为配套拓展。'

export const MODEL_NOTE = '风线表现空气吹动方向，海浪展示向岸推进、拍堤飞溅与泡沫消退。每轮固定所选岸段的代表风向，并保持选定的天文潮位不变，便于比较其他条件。只改变一项可探究其影响；同时改变多项只能比较综合结果。沿岸水位由天文潮位与风暴增减水叠加，负值表示减水；海浪起伏仅作展示，未计入波浪越堤。海堤影响海水进入陆地的条件，不改变外海增水。受淹统计范围是海堤后40栋建筑所在的120米×180米城区观察区，远处地形仅作环境展示。结果取全过程的最高水位和观察区最大受淹情况：水位高出建筑基础面8厘米才计为受淹房屋，堤后水深超过2厘米的网格才计入淹没面积。这些是教学统计口径，并非现实安全阈值。场景尺寸、数值和时长用于教学比较；气压、潮汐相互作用、堤防破坏与排水等过程均作简化，不能用于现实预报或工程设计。'

export const OBSERVATIONS = [
  {
    title: '分清水位与波浪',
    text: '水位尺表示较大范围海面的升降，海面上的波峰波谷表示海浪。观察天文潮位与风暴增减水怎样共同影响沿岸水位。',
  },
  {
    title: '先保持其他条件相同',
    text: '保存一组原始条件，只改变风力、潮位或海堤高度中的一项，再比较最高水位、受淹房屋和淹没范围。',
  },
  {
    title: '沿着海水进入的路径观察',
    text: '从海堤看向低洼居民区，观察海水何时越过堤顶、先到达哪里。比较升高海堤前后，外海水位和堤后淹没是否都改变。',
  },
  {
    title: '退水以后继续看',
    text: '外海水位回落时，观察陆地低洼处是否仍有积水。过程末尾的水位与本轮最高水位是两个不同指标。',
  },
]

export const QUESTIONS: LessonQuestion[] = [
  {
    id: 'surge-water-level',
    prompt: '场景中，哪种变化最能体现风暴增水？',
    options: [
      { text: '风暴使沿岸水位高于同时刻的天文潮位', correct: true, feedback: '风暴增水是风暴造成的额外水位升高；海浪则是叠加在水面上的波动。' },
      { text: '每一个短暂升起的波峰', correct: false, feedback: '波峰属于海浪。请结合水位尺，观察沿岸水位相对天文潮位的变化。' },
      { text: '月球引起的正常涨潮', correct: false, feedback: '正常潮汐属于天文潮。风暴造成的额外增水会与天文潮位共同影响沿岸水位。' },
    ],
  },
  {
    id: 'surge-tide',
    prompt: '风力、风向和海堤保持相同，为什么还要比较低潮与高潮条件？',
    options: [
      { text: '高潮一定会使风力变强', correct: false, feedback: '这组比较保持风力不变。改变的是天文潮位，而不是风力。' },
      { text: '相同风暴增水叠加不同潮位，沿岸水位会不同', correct: true, feedback: '本模型中，相同增水叠加更高的天文潮位，沿岸水位更高，更可能超过堤顶。实际过程还受多种因素影响。' },
      { text: '高潮时海堤会自动降低', correct: false, feedback: '海堤高度没有改变；变化的是海面相对堤顶的高度。' },
    ],
  },
  {
    id: 'surge-control-variable',
    prompt: '想研究海堤高度的影响，应怎样安排两次实验？',
    options: [
      { text: '同时加大风力、抬高潮位和海堤', correct: false, feedback: '同时改变多项条件，无法把结果差异单独归因于海堤高度。' },
      { text: '只运行一次，看到淹没就结束', correct: false, feedback: '需要有另一组条件作比较，才能观察改变海堤高度后的差异。' },
      { text: '保持风力、风向和潮位相同，只改变海堤高度', correct: true, feedback: '两次实验只改变海堤高度，才能比较它对堤后淹没的影响。' },
    ],
  },
  {
    id: 'surge-wall',
    prompt: '同样的风暴和潮位下，加高海堤后，应重点观察什么？',
    options: [
      { text: '外海水位自动下降了多少', correct: false, feedback: '本模型中海堤不改变外海的风暴增水。应比较海水能否进入陆地，以及堤后的淹没情况。' },
      { text: '越堤情况和堤后淹没范围是否改变', correct: true, feedback: '海堤改变的是防护条件。真实防护还受波浪、堤防强度、排水等影响，不能仅凭本模型判断安全。' },
      { text: '潮汐是否从此消失', correct: false, feedback: '海堤不会消除天文潮。它在海洋与受保护陆地之间形成屏障。' },
    ],
  },
  {
    id: 'surge-evacuation',
    prompt: '沿海低洼地区收到转移通知，哪种做法合适？',
    options: [
      { text: '先去海堤拍摄，水漫上来再走', correct: false, feedback: '海堤与岸边可能受风浪影响，临近时再撤离会增加危险。应按通知提前转移。' },
      { text: '有海堤就可以忽略通知', correct: false, feedback: '海堤的防护能力有条件限制。应关注预警，并服从当地转移安排。' },
      { text: '按组织安排及时撤离危险区域', correct: true, feedback: '及时转移是防灾减灾的重要措施。撤离路线与目的地以当地通知和现场组织为准。' },
    ],
  },
]

export const SAFETY_RULES = [
  '关注台风、风暴潮和海浪预警，按当地安排提前撤离沿海低洼等危险区域。',
  '停止海边观浪、赶海和水上活动，不到海堤、礁石或岸边拍摄风浪。',
  '避开积水和受损道路，按现场组织行动；外海水位回落不代表可以立即返回。',
]

export const SOURCES = [
  {
    title: '上海版地理七年级上册 · 第127—128页',
    url: 'https://dtxs.sinomaps.com/files/headimg/cf4459ec-78e0-4cd6-bf0b-07916911d85a.pdf',
    note: '已核对教材页图：台风与风暴潮危害、防灾减灾能力。',
  },
  {
    title: '上海市水务局 · 海洋灾害科普',
    url: 'https://swj.sh.gov.cn/shshyhjjcybzx-xwzx/20220608/690915a886614121a923c67ada01960a.html',
    note: '风暴潮与海浪的区别、天文潮叠加及公众防御。',
  },
  {
    title: 'NOAA · Storm Surge / Storm Tide 术语',
    url: 'https://www.noaa.gov/jetstream/appendix/weather-glossary-s',
    note: '风暴增水与天文潮位、风暴潮期间水位的区别。',
  },
  {
    title: 'NOAA · 台风相关水灾与撤离安全',
    url: 'https://www.noaa.gov/education/explainers/hurricane-safety-explained',
    note: '提前撤离、避开积水，以及风暴过后仍可能存在的危险。',
  },
]
