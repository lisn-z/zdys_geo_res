import type { Poem } from './data'

export type GeographyProfile = {
  coordinate: string
  naturalRegion: string
  terrainStep: string
  landform: string
  basin: string
  climate: string
  spatialReading: string
  imageReading: string
  humanGeography: string
  inquiry: string
}

const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(word))
const poemText = (poem: Poem) => `${poem.title}${poem.place}${poem.lines.join('')}`

const formatCoordinate = (poem: Poem) => {
  const longitude = `${Math.abs(poem.longitude).toFixed(2)}°${poem.longitude >= 0 ? 'E' : 'W'}`
  const latitude = `${Math.abs(poem.latitude).toFixed(2)}°${poem.latitude >= 0 ? 'N' : 'S'}`
  return `${longitude} · ${latitude}`
}

const getNaturalRegion = (poem: Poem) => {
  if (poem.longitude < 103 && poem.latitude < 36) return '青藏高寒区东缘'
  if (poem.longitude < 106 && poem.latitude > 35) return '西北干旱、半干旱区'
  if (poem.latitude >= 34.5) return '东部季风区北部'
  return '东部季风区南部'
}

const getTerrainStep = (poem: Poem) => {
  if (poem.longitude < 101 && poem.latitude < 36) return '第一阶梯东缘'
  if (poem.longitude < 108 || includesAny(poem.place, ['蜀道', '剑门', '凉州', '居延', '陇山', '玉门'])) return '第二阶梯'
  return '第三阶梯'
}

const getLandform = (poem: Poem) => {
  const text = poemText(poem)
  if (includesAny(text, ['洞庭', '太湖', '西湖', '溪亭', '湖'])) return '湖积平原、滨湖洲滩与淡水湖泊'
  if (includesAny(text, ['庐山', '泰山', '终南', '岳麓', '碣石', '山', '峰', '岭'])) return '山地、丘陵及河谷相间地貌'
  if (includesAny(text, ['蜀道', '剑门', '白帝', '夔州'])) return '四川盆地边缘山地与峡谷'
  if (includesAny(text, ['凉州', '居延', '玉门', '阳关', '边塞', '古道', '大漠'])) return '高原、荒漠与山间走廊'
  if (includesAny(text, ['黄河', '潼关', '渭水', '蒲州', '河东'])) return '黄土高原、冲积平原与河谷阶地'
  if (includesAny(text, ['长江', '赤壁', '黄鹤楼', '秦淮', '江南', '苏州', '杭州', '临安'])) return '河流冲积平原、丘陵与低山'
  if (poem.latitude > 36) return '温带平原与低山丘陵'
  if (poem.longitude < 108) return '高原、盆地与山地过渡带'
  return '东部平原与丘陵过渡地带'
}

const getBasin = (poem: Poem) => {
  const text = poemText(poem)
  if (includesAny(text, ['黄河', '渭水', '潼关', '蒲州', '河东', '鹳雀楼', '济南'])) return '黄河流域'
  if (includesAny(text, ['汉水', '襄阳'])) return '长江流域 · 汉江水系'
  if (includesAny(text, ['洞庭', '岳阳', '潇水'])) return '长江流域 · 洞庭湖水系'
  if (includesAny(text, ['太湖', '西湖', '钱塘', '杭州', '临安', '苏州', '枫桥', '江南'])) return '长江下游及东南水网'
  if (includesAny(text, ['长江', '赤壁', '黄鹤楼', '江州', '庐山', '白帝', '夔州', '秦淮', '金陵', '柴桑'])) return '长江干流及支流水系'
  if (includesAny(text, ['凉州', '居延', '玉门', '阳关', '大漠'])) return '西北内流区'
  if (poem.longitude > 113 && poem.latitude < 25) return '珠江及东南沿海水系'
  if (poem.latitude > 37) return '海河、辽河或沿海水系'
  return '东部季风区河流水系'
}

const getClimate = (poem: Poem) => {
  if (poem.longitude < 106 && poem.latitude > 35) return '温带大陆性气候'
  if (poem.longitude < 103 && poem.latitude < 35) return '高原山地气候'
  if (poem.latitude >= 34.5) return '温带季风气候'
  return '亚热带季风气候'
}

const getSpatialReading = (poem: Poem, landform: string, basin: string) => {
  const text = poemText(poem)
  if (includesAny(text, ['蜀道', '剑门', '关', '岭', '峰', '山', '崖'])) {
    return `作品把视线置于${landform}之中。高差、坡度和狭窄通道压缩了行旅空间，山势的垂直尺度因此被转换成“难行”“阻隔”或“登临”的情绪强度。`
  }
  if (includesAny(text, ['江', '河', '湖', '水', '潮', '舟', '浦'])) {
    return `作品所在空间与${basin}相连。水面拉长了横向视野，也把上游—下游、此岸—彼岸和出发—归返组织成清晰的空间关系，诗中的远近感并非抽象背景。`
  }
  if (includesAny(text, ['楼', '台', '城', '寺', '亭'])) {
    return `作品以建筑为观察支点：登高后，${landform}由近景延伸到区域尺度。楼台、城郭与道路共同形成“可俯瞰、可辨方向、可回望”的古代空间坐标。`
  }
  return `作品的经纬位置处在${landform}。地势决定视野开合与出行方向，也使同一轮月色、风雨或暮色在这里呈现出独特的远近层次。`
}

const getImageReading = (poem: Poem, climate: string, basin: string) => {
  const text = poemText(poem)
  if (includesAny(text, ['雪', '霜', '冰', '寒', '雁'])) return `雪、霜、寒意与候鸟是季节信号。结合${climate}，这些意象既记录温度与物候变化，也帮助判断诗中时间、纬度和海拔所造成的环境差异。`
  if (includesAny(text, ['雨', '云', '烟', '雾', '风'])) return `云雨、烟雾与风不是静止装饰，它们受${climate}和地形抬升、谷地通风影响。诗人借可移动的天气过程，让山河具有速度、湿度与方向。`
  if (includesAny(text, ['江', '河', '湖', '水', '潮', '浪'])) return `水色、波浪与潮汐来自${basin}的真实水文环境。水位、流速和季节径流被转化为时间感，使离愁、行旅或旷达获得可感知的空间尺度。`
  if (includesAny(text, ['月', '日', '星', '夕', '暮'])) return `日月星辰提供方向和时刻。开阔地平线、山体遮挡与水面反光改变天象的观看方式，因此“落日”“明月”同时也是定位空间的地理线索。`
  if (includesAny(text, ['花', '柳', '草', '竹', '梅', '枫'])) return `植物意象记录物候。${climate}控制花期、落叶和植被景观，诗句由此把抽象季节落实到可观察、可比较的区域环境。`
  return `诗中的光线、声音与色彩都依托${climate}和地方地表环境。把意象还原为可观察的自然现象，可以读出作品隐藏的季节与区域信息。`
}

const getHumanGeography = (poem: Poem, basin: string) => {
  const text = poemText(poem)
  if (includesAny(text, ['送', '行', '舟', '帆', '驿', '道', '关', '客'])) return `作品涉及迁移与交通。古代驿道、关隘和${basin}的水运网络决定行程方向与停留节点，“送别”或“羁旅”因真实路线而产生距离感。`
  if (includesAny(text, ['城', '楼', '寺', '桥', '市', '京', '宫'])) return `城郭、楼台、寺观与桥梁体现聚落功能和区域中心性。它们既是公共交往空间，也是交通、政治与文化资源汇集的地标。`
  if (includesAny(text, ['田', '村', '农', '桑', '麻', '渔', '樵'])) return `田园、渔樵与村落反映土地利用方式。水源、坡度和季风节律影响耕作与居住，诗意日常背后是一套适应地方环境的生产系统。`
  if (includesAny(text, ['塞', '戍', '战', '兵', '胡', '羌', '大漠'])) return `边塞意象对应防御体系与文化交流通道。水源稀缺、聚落间距和山口走廊共同影响军镇布局，也塑造中原与边疆之间的往来。`
  return `这处诗意坐标同时属于地方文化景观。地形、水系和聚落共同影响方言、饮食、出行与记忆，作品因此成为认识区域人地关系的一份文本地图。`
}

const getInquiry = (poem: Poem, basin: string, landform: string) => {
  const text = poem.lines.join('')
  if (includesAny(text, ['黄河', '长江', '江', '湖', '水', '波'])) return `诗中的水体意象与“${basin}”的水文环境有什么联系？若改在枯水期或丰水期观察，画面会怎样变化？`
  if (includesAny(text, ['山', '峰', '岭', '关', '崖'])) return `“${landform}”怎样影响诗中的视野、交通与情绪？请在地形图上判断诗人的主要观察方向。`
  if (includesAny(text, ['雪', '雨', '霜', '风', '云'])) return '诗中的天气现象反映了怎样的季节变化与区域气候？可以从哪些物候词语找到证据？'
  return '如果改变这首诗的地理位置，原有意境还会成立吗？请至少从地形、气候或交通中选择两项说明理由。'
}

export const getGeographyProfile = (poem: Poem): GeographyProfile => {
  const basin = getBasin(poem)
  const landform = getLandform(poem)
  const climate = getClimate(poem)
  return {
    coordinate: formatCoordinate(poem),
    naturalRegion: getNaturalRegion(poem),
    terrainStep: getTerrainStep(poem),
    landform,
    basin,
    climate,
    spatialReading: getSpatialReading(poem, landform, basin),
    imageReading: getImageReading(poem, climate, basin),
    humanGeography: getHumanGeography(poem, basin),
    inquiry: getInquiry(poem, basin, landform),
  }
}
