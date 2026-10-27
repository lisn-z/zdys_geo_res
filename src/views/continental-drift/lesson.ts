export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
export const MAX_AGE_MA = 250

export const timeStops = [
  { ageMa: 250, title: '相连的盘古大陆', label: '2.5 亿年前', short: '2.5亿年前', summary: '主要大陆汇聚成盘古大陆，也称联合古陆，周围是广阔的海洋。今天相隔大洋的许多陆块，当时相互邻接。', prompt: '观察：这片古大陆与今天的大陆分布有什么不同？' },
  { ageMa: 200, title: '大陆开始裂解', label: '2 亿年前', short: '2亿年前', summary: '盘古大陆逐步裂解，北部称劳亚大陆，南部称冈瓦纳大陆。劳亚包括北美及欧亚主体；冈瓦纳包括南美、非洲、印度、澳大利亚和南极洲等陆块。各地区并非同时分离。', prompt: '找一找：劳亚大陆和冈瓦纳大陆分别在哪里？' },
  { ageMa: 135, title: '大陆逐步分离', label: '1.35 亿年前', short: '1.35亿年前', summary: '劳亚大陆和冈瓦纳大陆继续裂解，大西洋逐步扩展。此时用具体陆块名称追踪南美、非洲和印度等的位置，观察它们怎样逐步分离。', prompt: '追踪：南美洲与非洲之间的海域怎样变化？' },
  { ageMa: 65, title: '走向今天的格局', label: '6500 万年前', short: '6500万年前', summary: '主要陆块的分布逐渐接近今天，但印度、澳大利亚等仍在移动。此时的海岸与现代海岸并不完全相同。', prompt: '比较：印度与亚欧大陆的相对位置有什么不同？' },
  { ageMa: 0, title: '仍在运动的地球', label: '现在', short: '现在', summary: '岩石圈分成大小不等的板块，可包含大陆和洋底。切换到“板块构造（当今）”，观察边界、相对运动与火山地震分布之间的联系。', prompt: '思考：现代海陆格局会永远保持不变吗？' },
] as const

export function formatAge(ageMa: number) {
  if (ageMa <= 0.05) return '现在'
  if (ageMa >= 100) return `${Number((ageMa / 100).toFixed(2))} 亿年前`
  return `${Math.round(ageMa * 100)} 万年前`
}

export const teachingCases = [
  { id: 'atlantic', name: '大西洋中脊', kind: '张裂 · 海底扩张', lon: -30, lat: 0, layers: ['boundaries', 'motion'], detail: '沿洋中脊，两侧板块相对分离，新的洋壳不断形成。相背的箭头表示板块张裂。' },
  { id: 'pacific', name: '环太平洋地区', kind: '火山 · 地震集中分布', lon: 160, lat: 10, layers: ['boundaries', 'seismicity', 'volcanoes', 'earthquakes'], detail: '将火山与历史地震点叠加到板块边界上，观察环太平洋地区的集中分布。点位是观测记录，不能把它们看成一条精确的带状边线。' },
  { id: 'himalaya', name: '喜马拉雅地区', kind: '碰撞 · 挤压抬升', lon: 85, lat: 30, layers: ['boundaries', 'motion', 'seismicity', 'earthquakes'], detail: '印度所在板块与亚欧板块碰撞，地壳变形、增厚并形成高大山系。碰撞区地震活跃，不能据此推断所有汇聚边界都有火山。' },
  { id: 'red-sea', name: '红海地区', kind: '张裂 · 海域扩展', lon: 43, lat: 18, layers: ['boundaries', 'motion'], detail: '非洲东北侧与阿拉伯半岛所在的岩石圈相对分离，红海逐步扩展。对照教材，观察非洲板块与印度洋板块概括范围之间相背的箭头。' },
] as const

export const scientificSources = [
  { name: 'USGS · 盘古大陆', url: 'https://www.usgs.gov/faqs/what-was-pangea' },
  { name: 'NPS · 劳亚与冈瓦纳及盘古大陆裂解', url: 'https://home.nps.gov/articles/000/triassic-period.htm' },
  { name: 'PALEOMAP · 古地形与海陆重建', url: 'https://www.earthbyte.org/paleodem-resource-scotese-and-wright-2018/' },
  { name: 'GPlates · 板块重建与运动模型', url: 'https://www.gplates.org/' },
  { name: 'OpenTopoMap · 地形设色色表参考', url: 'https://github.com/der-stefan/OpenTopoMap/blob/master/mapnik/relief_color_text_file.txt' },
  { name: 'USGS · 全球板块、火山与地震图', url: 'https://pubs.usgs.gov/imap/2800/' },
  { name: 'USGS · 地震目录', url: 'https://earthquake.usgs.gov/fdsnws/event/1/' },
  { name: 'Smithsonian · 全球火山计划', url: 'https://volcano.si.edu/' },
]
