export const DYNASTIES = ['全部', '诗经', '汉魏', '唐', '宋', '元'] as const

export type Dynasty = (typeof DYNASTIES)[number]

export type Poem = {
  id: string
  title: string
  author: string
  dynasty: Exclude<Dynasty, '全部'>
  place: string
  longitude: number
  latitude: number
  lines: string[]
  note: string
}

const note = (scene: string) => `${scene}。诗句与山河相映，在有限文字中留下悠远的空间与情思。`

export const POEMS: Poem[] = [
  { id:'guan-ju', title:'关雎', author:'佚名', dynasty:'诗经', place:'黄河流域 · 河洲', longitude:112.4, latitude:34.8, lines:['关关雎鸠，在河之洲。窈窕淑女，君子好逑。','参差荇菜，左右流之。窈窕淑女，寤寐求之。','求之不得，寤寐思服。悠哉悠哉，辗转反侧。','参差荇菜，左右采之。窈窕淑女，琴瑟友之。','参差荇菜，左右芼之。窈窕淑女，钟鼓乐之。'], note:note('以河洲水鸟起兴，写纯真而克制的爱慕') },
  { id:'jian-jia', title:'蒹葭', author:'佚名', dynasty:'诗经', place:'秦地 · 渭水', longitude:108.1, latitude:34.5, lines:['蒹葭苍苍，白露为霜。所谓伊人，在水一方。','溯洄从之，道阻且长；溯游从之，宛在水中央。','蒹葭萋萋，白露未晞。所谓伊人，在水之湄。','溯洄从之，道阻且跻；溯游从之，宛在水中坻。','蒹葭采采，白露未已。所谓伊人，在水之涘。','溯洄从之，道阻且右；溯游从之，宛在水中沚。'], note:note('秋水、白露与逆流追寻构成朦胧深远的意境') },
  { id:'tao-yao', title:'桃夭', author:'佚名', dynasty:'诗经', place:'周南 · 汉水', longitude:112.1, latitude:31.8, lines:['桃之夭夭，灼灼其华。之子于归，宜其室家。','桃之夭夭，有蕡其实。之子于归，宜其家室。','桃之夭夭，其叶蓁蓁。之子于归，宜其家人。'], note:note('用桃花、桃实与桃叶祝颂新婚与家室和美') },
  { id:'lu-ming', title:'鹿鸣', author:'佚名', dynasty:'诗经', place:'周原 · 岐山', longitude:107.6, latitude:34.4, lines:['呦呦鹿鸣，食野之苹。我有嘉宾，鼓瑟吹笙。','吹笙鼓簧，承筐是将。人之好我，示我周行。','呦呦鹿鸣，食野之蒿。我有嘉宾，德音孔昭。','视民不恌，君子是则是效。我有旨酒，嘉宾式燕以敖。'], note:note('原野鹿鸣与宴饮礼乐共同营造温厚清雅的气氛') },
  { id:'cai-wei', title:'采薇', author:'佚名', dynasty:'诗经', place:'西周边地 · 陇山', longitude:106.5, latitude:35.2, lines:['昔我往矣，杨柳依依。今我来思，雨雪霏霏。','行道迟迟，载渴载饥。我心伤悲，莫知我哀。'], note:note('以杨柳与风雪对照征人出发和归来的漫长岁月') },
  { id:'shuo-shu', title:'硕鼠', author:'佚名', dynasty:'诗经', place:'魏地 · 河东', longitude:111.0, latitude:35.1, lines:['硕鼠硕鼠，无食我黍！三岁贯女，莫我肯顾。','逝将去女，适彼乐土。乐土乐土，爰得我所。','硕鼠硕鼠，无食我麦！三岁贯女，莫我肯德。','逝将去女，适彼乐国。乐国乐国，爰得我直。'], note:note('以硕鼠作比，表达离开盘剥之地、寻找乐土的愿望') },

  { id:'da-feng-ge', title:'大风歌', author:'刘邦', dynasty:'汉魏', place:'沛县 · 泗水', longitude:116.9, latitude:34.7, lines:['大风起兮云飞扬，威加海内兮归故乡。','安得猛士兮守四方！'], note:note('大风卷云的雄阔气象中，也藏着守成忧思') },
  { id:'chang-ge-xing', title:'长歌行', author:'汉乐府', dynasty:'汉魏', place:'洛阳 · 上林', longitude:112.5, latitude:34.7, lines:['青青园中葵，朝露待日晞。阳春布德泽，万物生光辉。','常恐秋节至，焜黄华叶衰。百川东到海，何时复西归？','少壮不努力，老大徒伤悲！'], note:note('从园葵、朝露写到百川归海，劝人珍惜光阴') },
  { id:'jiang-nan', title:'江南', author:'汉乐府', dynasty:'汉魏', place:'江南 · 太湖', longitude:120.2, latitude:31.2, lines:['江南可采莲，莲叶何田田。鱼戏莲叶间。','鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。'], note:note('莲叶与游鱼构成明快灵动的江南水景') },
  { id:'guan-cang-hai', title:'观沧海', author:'曹操', dynasty:'汉魏', place:'碣石 · 渤海', longitude:119.2, latitude:39.7, lines:['东临碣石，以观沧海。水何澹澹，山岛竦峙。','树木丛生，百草丰茂。秋风萧瑟，洪波涌起。','日月之行，若出其中；星汉灿烂，若出其里。','幸甚至哉，歌以咏志。'], note:note('沧海吞吐日月星汉，显出雄健开阔的胸襟') },
  { id:'yin-jiu', title:'饮酒·其五', author:'陶渊明', dynasty:'汉魏', place:'柴桑 · 庐山', longitude:115.9, latitude:29.5, lines:['结庐在人境，而无车马喧。问君何能尔？心远地自偏。','采菊东篱下，悠然见南山。山气日夕佳，飞鸟相与还。','此中有真意，欲辨已忘言。'], note:note('东篱、南山和归鸟写出心远自静的田园境界') },
  { id:'gui-yuan', title:'归园田居', author:'陶渊明', dynasty:'汉魏', place:'柴桑 · 田园', longitude:116.0, latitude:29.7, lines:['少无适俗韵，性本爱丘山。误落尘网中，一去三十年。','羁鸟恋旧林，池鱼思故渊。开荒南野际，守拙归园田。','暧暧远人村，依依墟里烟。狗吠深巷中，鸡鸣桑树颠。','户庭无尘杂，虚室有余闲。久在樊笼里，复得返自然。'], note:note('村烟、犬吠与桑树共同组成朴素安宁的归隐图景') },

  { id:'que-lou', title:'登鹳雀楼', author:'王之涣', dynasty:'唐', place:'蒲州 · 鹳雀楼', longitude:110.5, latitude:34.8, lines:['白日依山尽，黄河入海流。','欲穷千里目，更上一层楼。'], note:note('落日与黄河纳入开阔长卷，由眼前之景转向人生境界') },
  { id:'liang-zhou-ci', title:'凉州词', author:'王之涣', dynasty:'唐', place:'凉州 · 玉门关', longitude:96.0, latitude:40.3, lines:['黄河远上白云间，一片孤城万仞山。','羌笛何须怨杨柳，春风不度玉门关。'], note:note('孤城、羌笛和万仞山写出苍凉雄浑的边塞') },
  { id:'chun-xiao', title:'春晓', author:'孟浩然', dynasty:'唐', place:'襄阳 · 鹿门山', longitude:112.1, latitude:32.0, lines:['春眠不觉晓，处处闻啼鸟。','夜来风雨声，花落知多少。'], note:note('从晨鸟回想夜雨，用听觉唤醒整个春天') },
  { id:'wang-dong-ting', title:'望洞庭湖赠张丞相', author:'孟浩然', dynasty:'唐', place:'岳州 · 洞庭湖', longitude:112.9, latitude:29.4, lines:['八月湖水平，涵虚混太清。气蒸云梦泽，波撼岳阳城。','欲济无舟楫，端居耻圣明。坐观垂钓者，徒有羡鱼情。'], note:note('洞庭水天相接、气势撼城，景象宏阔而寓意深长') },
  { id:'jing-ye-si', title:'静夜思', author:'李白', dynasty:'唐', place:'长安 · 客舍', longitude:108.9, latitude:34.3, lines:['床前明月光，疑是地上霜。','举头望明月，低头思故乡。'], note:note('从一片月光到一次俯仰，乡愁显得格外清澈') },
  { id:'shu-dao-nan', title:'蜀道难', author:'李白', dynasty:'唐', place:'剑门 · 蜀道', longitude:105.5, latitude:32.2, lines:['噫吁嚱，危乎高哉！蜀道之难，难于上青天！','西当太白有鸟道，可以横绝峨眉巅。地崩山摧壮士死，然后天梯石栈相钩连。','上有六龙回日之高标，下有冲波逆折之回川。黄鹤之飞尚不得过，猿猱欲度愁攀援。','青泥何盘盘，百步九折萦岩峦。扪参历井仰胁息，以手抚膺坐长叹。','连峰去天不盈尺，枯松倒挂倚绝壁。飞湍瀑流争喧豗，砯崖转石万壑雷。','剑阁峥嵘而崔嵬，一夫当关，万夫莫开。','蜀道之难，难于上青天，侧身西望长咨嗟！'], note:note('险峻地貌、急促节奏与夸张尺度共同推高蜀道奇险') },
  { id:'wang-lu-shan', title:'望庐山瀑布', author:'李白', dynasty:'唐', place:'江州 · 庐山', longitude:116.0, latitude:29.5, lines:['日照香炉生紫烟，遥看瀑布挂前川。','飞流直下三千尺，疑是银河落九天。'], note:note('紫烟、飞瀑和银河赋予庐山宇宙般的尺度') },
  { id:'zao-bai-di', title:'早发白帝城', author:'李白', dynasty:'唐', place:'夔州 · 白帝城', longitude:109.6, latitude:31.0, lines:['朝辞白帝彩云间，千里江陵一日还。','两岸猿声啼不住，轻舟已过万重山。'], note:note('轻舟在猿声与万重山间疾驰，节奏明快酣畅') },
  { id:'huang-he-lou-song', title:'黄鹤楼送孟浩然之广陵', author:'李白', dynasty:'唐', place:'鄂州 · 黄鹤楼', longitude:114.3, latitude:30.5, lines:['故人西辞黄鹤楼，烟花三月下扬州。','孤帆远影碧空尽，唯见长江天际流。'], note:note('孤帆消失之后，只余长江流向天际，送别情深而不滞') },
  { id:'du-wang-yue', title:'望岳', author:'杜甫', dynasty:'唐', place:'泰安 · 泰山', longitude:117.1, latitude:36.3, lines:['岱宗夫如何？齐鲁青未了。造化钟神秀，阴阳割昏晓。','荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。'], note:note('泰山分割阴阳、云气荡胸，托起昂扬进取的志向') },
  { id:'chun-wang', title:'春望', author:'杜甫', dynasty:'唐', place:'长安 · 春城', longitude:108.9, latitude:34.3, lines:['国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。','烽火连三月，家书抵万金。白头搔更短，浑欲不胜簪。'], note:note('春城草木繁盛与乱世离情形成沉痛对照') },
  { id:'deng-gao', title:'登高', author:'杜甫', dynasty:'唐', place:'夔州 · 长江', longitude:109.5, latitude:31.0, lines:['风急天高猿啸哀，渚清沙白鸟飞回。','无边落木萧萧下，不尽长江滚滚来。','万里悲秋常作客，百年多病独登台。','艰难苦恨繁霜鬓，潦倒新停浊酒杯。'], note:note('落木与长江把个人身世推入无边秋色和历史长流') },
  { id:'yue-yang-lou', title:'登岳阳楼', author:'杜甫', dynasty:'唐', place:'岳州 · 洞庭湖', longitude:113.1, latitude:29.4, lines:['昔闻洞庭水，今上岳阳楼。吴楚东南坼，乾坤日夜浮。','亲朋无一字，老病有孤舟。戎马关山北，凭轩涕泗流。'], note:note('宏阔洞庭与一叶孤舟正面相遇，沉郁而巨大') },
  { id:'huang-he-lou', title:'黄鹤楼', author:'崔颢', dynasty:'唐', place:'鄂州 · 黄鹤楼', longitude:114.3, latitude:30.6, lines:['昔人已乘黄鹤去，此地空余黄鹤楼。黄鹤一去不复返，白云千载空悠悠。','晴川历历汉阳树，芳草萋萋鹦鹉洲。日暮乡关何处是？烟波江上使人愁。'], note:note('晴日江城被暮色烟波收拢，明丽风景染上乡愁') },
  { id:'feng-qiao', title:'枫桥夜泊', author:'张继', dynasty:'唐', place:'苏州 · 枫桥', longitude:120.6, latitude:31.3, lines:['月落乌啼霜满天，江枫渔火对愁眠。','姑苏城外寒山寺，夜半钟声到客船。'], note:note('月落、渔火与钟声层层进入夜色，构成江南羁旅') },
  { id:'qian-tang', title:'钱塘湖春行', author:'白居易', dynasty:'唐', place:'杭州 · 西湖', longitude:120.2, latitude:30.3, lines:['孤山寺北贾亭西，水面初平云脚低。几处早莺争暖树，谁家新燕啄春泥。','乱花渐欲迷人眼，浅草才能没马蹄。最爱湖东行不足，绿杨阴里白沙堤。'], note:note('早莺、新燕、浅草捕捉西湖初春正在发生的瞬间') },
  { id:'mu-jiang-yin', title:'暮江吟', author:'白居易', dynasty:'唐', place:'江州 · 长江', longitude:116.0, latitude:29.7, lines:['一道残阳铺水中，半江瑟瑟半江红。','可怜九月初三夜，露似真珠月似弓。'], note:note('残阳铺江之后，新月与露珠接续成清丽秋夜') },
  { id:'jiang-xue', title:'江雪', author:'柳宗元', dynasty:'唐', place:'永州 · 潇水', longitude:111.6, latitude:26.4, lines:['千山鸟飞绝，万径人踪灭。','孤舟蓑笠翁，独钓寒江雪。'], note:note('极度空寂的雪境中，一叶孤舟显出清峻人格') },
  { id:'wang-dong-ting-liu', title:'望洞庭', author:'刘禹锡', dynasty:'唐', place:'岳州 · 洞庭湖', longitude:113.0, latitude:29.3, lines:['湖光秋月两相和，潭面无风镜未磨。','遥望洞庭山水翠，白银盘里一青螺。'], note:note('把洞庭压缩为银盘青螺，清新而富有想象') },
  { id:'shan-xing', title:'山行', author:'杜牧', dynasty:'唐', place:'长沙 · 岳麓山', longitude:112.9, latitude:28.2, lines:['远上寒山石径斜，白云生处有人家。','停车坐爱枫林晚，霜叶红于二月花。'], note:note('石径、白云和霜叶构成色彩明朗的秋山图') },
  { id:'bo-qin-huai', title:'泊秦淮', author:'杜牧', dynasty:'唐', place:'金陵 · 秦淮河', longitude:118.8, latitude:32.0, lines:['烟笼寒水月笼沙，夜泊秦淮近酒家。','商女不知亡国恨，隔江犹唱后庭花。'], note:note('烟月笼罩秦淮，繁华夜色中潜藏历史忧思') },
  { id:'jin-se', title:'锦瑟', author:'李商隐', dynasty:'唐', place:'长安 · 曲江', longitude:108.9, latitude:34.2, lines:['锦瑟无端五十弦，一弦一柱思华年。','庄生晓梦迷蝴蝶，望帝春心托杜鹃。','沧海月明珠有泪，蓝田日暖玉生烟。','此情可待成追忆？只是当时已惘然。'], note:note('沧海月色、蓝田烟玉交织成迷离深沉的追忆') },
  { id:'chu-sai', title:'出塞', author:'王昌龄', dynasty:'唐', place:'陇西 · 边塞', longitude:103.8, latitude:36.1, lines:['秦时明月汉时关，万里长征人未还。','但使龙城飞将在，不教胡马度阴山。'], note:note('一轮明月跨越秦汉，把边塞战争推向历史纵深') },
  { id:'song-yuan-er', title:'送元二使安西', author:'王维', dynasty:'唐', place:'渭城 · 阳关古道', longitude:108.7, latitude:34.4, lines:['渭城朝雨浥轻尘，客舍青青柳色新。','劝君更尽一杯酒，西出阳关无故人。'], note:note('朝雨洗柳的清新景色衬出西行送别的深情') },
  { id:'shi-zhi-sai-shang', title:'使至塞上', author:'王维', dynasty:'唐', place:'凉州 · 居延', longitude:101.0, latitude:39.0, lines:['单车欲问边，属国过居延。征蓬出汉塞，归雁入胡天。','大漠孤烟直，长河落日圆。萧关逢候骑，都护在燕然。'], note:note('孤烟与落日以极简几何构成苍茫壮阔的大漠意境') },
  { id:'shan-ju-qiu-ming', title:'山居秋暝', author:'王维', dynasty:'唐', place:'终南山 · 辋川', longitude:109.0, latitude:33.9, lines:['空山新雨后，天气晚来秋。明月松间照，清泉石上流。','竹喧归浣女，莲动下渔舟。随意春芳歇，王孙自可留。'], note:note('月照松林、清泉过石，声音与光影写尽空山清秋') },

  { id:'jiang-cheng-zi', title:'江城子·密州出猎', author:'苏轼', dynasty:'宋', place:'密州 · 超然台', longitude:119.4, latitude:36.0, lines:['老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。','为报倾城随太守，亲射虎，看孙郎。','酒酣胸胆尚开张。鬓微霜，又何妨！','持节云中，何日遣冯唐？会挽雕弓如满月，西北望，射天狼。'], note:note('千骑卷冈、雕弓如月，显出豪放雄健的精神') },
  { id:'shui-diao', title:'水调歌头', author:'苏轼', dynasty:'宋', place:'密州 · 超然台', longitude:119.5, latitude:36.0, lines:['明月几时有？把酒问青天。不知天上宫阙，今夕是何年。','我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。','转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？','人有悲欢离合，月有阴晴圆缺，此事古难全。','但愿人长久，千里共婵娟。'], note:note('由问月到观照人间，最终把离别化为共享的月光') },
  { id:'nian-nu-jiao', title:'念奴娇·赤壁怀古', author:'苏轼', dynasty:'宋', place:'黄州 · 赤壁', longitude:114.9, latitude:30.4, lines:['大江东去，浪淘尽，千古风流人物。','故垒西边，人道是，三国周郎赤壁。','乱石穿空，惊涛拍岸，卷起千堆雪。江山如画，一时多少豪杰。','遥想公瑾当年，小乔初嫁了，雄姿英发。','羽扇纶巾，谈笑间，樯橹灰飞烟灭。','故国神游，多情应笑我，早生华发。人生如梦，一尊还酹江月。'], note:note('大江、乱石与惊涛打开历史纵深，豪情中见苍凉') },
  { id:'die-lian-hua', title:'蝶恋花·春景', author:'苏轼', dynasty:'宋', place:'惠州 · 春庭', longitude:114.4, latitude:23.1, lines:['花褪残红青杏小。燕子飞时，绿水人家绕。','枝上柳绵吹又少。天涯何处无芳草。','墙里秋千墙外道。墙外行人，墙里佳人笑。','笑渐不闻声渐悄。多情却被无情恼。'], note:note('绿水、燕子和墙里秋千写出轻灵又惆怅的春景') },
  { id:'yu-jia-ao', title:'渔家傲·秋思', author:'范仲淹', dynasty:'宋', place:'延州 · 塞下', longitude:109.5, latitude:36.6, lines:['塞下秋来风景异，衡阳雁去无留意。','四面边声连角起，千嶂里，长烟落日孤城闭。','浊酒一杯家万里，燕然未勒归无计。','羌管悠悠霜满地，人不寐，将军白发征夫泪。'], note:note('长烟、落日与孤城写出边塞苍凉和征人乡思') },
  { id:'sheng-sheng-man', title:'声声慢', author:'李清照', dynasty:'宋', place:'临安 · 秋庭', longitude:120.2, latitude:30.3, lines:['寻寻觅觅，冷冷清清，凄凄惨惨戚戚。','乍暖还寒时候，最难将息。三杯两盏淡酒，怎敌他、晚来风急！','雁过也，正伤心，却是旧时相识。','满地黄花堆积，憔悴损，如今有谁堪摘？','守着窗儿，独自怎生得黑！梧桐更兼细雨，到黄昏、点点滴滴。','这次第，怎一个愁字了得！'], note:note('梧桐细雨与叠字节奏将深秋孤寂层层推进') },
  { id:'ru-meng-ling', title:'如梦令', author:'李清照', dynasty:'宋', place:'济南 · 溪亭', longitude:117.0, latitude:36.7, lines:['常记溪亭日暮，沉醉不知归路。','兴尽晚回舟，误入藕花深处。','争渡，争渡，惊起一滩鸥鹭。'], note:note('暮色、藕花与惊飞鸥鹭组成活泼明亮的少女记忆') },
  { id:'yu-mei-ren', title:'虞美人·听雨', author:'蒋捷', dynasty:'宋', place:'临安 · 吴江', longitude:120.6, latitude:31.2, lines:['少年听雨歌楼上，红烛昏罗帐。','壮年听雨客舟中，江阔云低、断雁叫西风。','而今听雨僧庐下，鬓已星星也。','悲欢离合总无情，一任阶前、点滴到天明。'], note:note('三场听雨贯穿一生，空间转换就是人生流变') },
  { id:'man-jiang-hong', title:'满江红', author:'岳飞', dynasty:'宋', place:'临安 · 西湖', longitude:120.2, latitude:30.2, lines:['怒发冲冠，凭栏处、潇潇雨歇。抬望眼、仰天长啸，壮怀激烈。','三十功名尘与土，八千里路云和月。莫等闲、白了少年头，空悲切！','靖康耻，犹未雪；臣子恨，何时灭？','驾长车、踏破贺兰山缺。壮志饥餐胡虏肉，笑谈渴饮匈奴血。','待从头、收拾旧山河，朝天阙。'], note:note('雨歇凭栏、八千里云月凝聚壮烈的家国情怀') },
  { id:'po-zhen-zi', title:'破阵子·为陈同甫赋壮词以寄之', author:'辛弃疾', dynasty:'宋', place:'江西 · 带湖', longitude:117.9, latitude:28.5, lines:['醉里挑灯看剑，梦回吹角连营。','八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。','马作的卢飞快，弓如霹雳弦惊。','了却君王天下事，赢得生前身后名。可怜白发生！'], note:note('军营梦境急促雄壮，末句骤然跌回苍凉现实') },
  { id:'qing-yu-an', title:'青玉案·元夕', author:'辛弃疾', dynasty:'宋', place:'临安 · 元夕', longitude:120.2, latitude:30.3, lines:['东风夜放花千树。更吹落、星如雨。宝马雕车香满路。','凤箫声动，玉壶光转，一夜鱼龙舞。','蛾儿雪柳黄金缕。笑语盈盈暗香去。','众里寻他千百度。蓦然回首，那人却在，灯火阑珊处。'], note:note('元夕灯海的绚烂反衬灯火阑珊处的孤高身影') },
  { id:'bu-suan-zi-mei', title:'卜算子·咏梅', author:'陆游', dynasty:'宋', place:'临安 · 驿外', longitude:120.1, latitude:30.3, lines:['驿外断桥边，寂寞开无主。已是黄昏独自愁，更着风和雨。','无意苦争春，一任群芳妒。零落成泥碾作尘，只有香如故。'], note:note('断桥风雨中的梅花寄托孤高不改的品格') },

  { id:'tian-jing-sha-qiu-si', title:'天净沙·秋思', author:'马致远', dynasty:'元', place:'燕地 · 古道', longitude:115.5, latitude:39.4, lines:['枯藤老树昏鸦，小桥流水人家，古道西风瘦马。','夕阳西下，断肠人在天涯。'], note:note('十种意象排列成苍凉秋景，一轮夕阳收束天涯羁旅') },
  { id:'shan-po-yang', title:'山坡羊·潼关怀古', author:'张养浩', dynasty:'元', place:'潼关 · 黄河', longitude:110.2, latitude:34.5, lines:['峰峦如聚，波涛如怒，山河表里潼关路。','望西都，意踌躇。伤心秦汉经行处，宫阙万间都做了土。','兴，百姓苦；亡，百姓苦。'], note:note('峰峦与波涛赋予潼关压迫气势，怀古最终落到苍生') },
  { id:'shui-xian-zi', title:'水仙子·夜雨', author:'徐再思', dynasty:'元', place:'江南 · 秋夜', longitude:119.8, latitude:30.8, lines:['一声梧叶一声秋，一点芭蕉一点愁，三更归梦三更后。','落灯花，棋未收，叹新丰孤馆人留。','枕上十年事，江南二老忧，都到心头。'], note:note('梧叶、芭蕉和夜雨的声响把羁旅愁绪一层层敲深') },
  { id:'shuang-diao-chen-zui', title:'沉醉东风·渔夫', author:'白朴', dynasty:'元', place:'江南 · 芦花洲', longitude:118.6, latitude:29.7, lines:['黄芦岸白蘋渡口，绿柳堤红蓼滩头。','虽无刎颈交，却有忘机友，点秋江白鹭沙鸥。','傲杀人间万户侯，不识字烟波钓叟。'], note:note('多彩秋江与白鹭沙鸥写出烟波钓叟的自在') },
  { id:'mai-hua-sheng', title:'卖花声·怀古', author:'张可久', dynasty:'元', place:'金陵 · 江岸', longitude:118.8, latitude:32.1, lines:['美人自刎乌江岸，战火曾烧赤壁山，将军空老玉门关。','伤心秦汉，生民涂炭，读书人一声长叹。'], note:note('乌江、赤壁、玉门关并置，在历史废墟上发出长叹') },
  { id:'zhe-gui-ling', title:'折桂令·春情', author:'徐再思', dynasty:'元', place:'江南 · 春城', longitude:120.5, latitude:30.7, lines:['平生不会相思，才会相思，便害相思。','身似浮云，心如飞絮，气若游丝。','空一缕余香在此，盼千金游子何之。','证候来时，正是何时？灯半昏时，月半明时。'], note:note('浮云、飞絮和半明月色写出婉转缠绵的相思') },
]
