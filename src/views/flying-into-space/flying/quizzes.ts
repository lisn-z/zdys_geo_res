/** Questions use facts introduced by each historical chapter. Times are chapter-local. */
export interface HistoryQuiz {
    chapterId: number;
    at: number;
    question: string;
    choices: readonly string[];
    correctIndex: number;
    explanation: string;
}
export const HISTORY_QUIZZES: readonly HistoryQuiz[] = [
    { chapterId: 1, at: 30, question: '1903 年，莱特兄弟的“飞行者一号”展示了什么突破？',
      choices: ['机器载人完成动力飞行', '人类首次登上月球', '第一颗卫星进入轨道'], correctIndex: 0,
      explanation: '这一章呈现的是 1903 年的载人动力飞行。飞行者一号采用双翼和后置双桨。' },
    { chapterId: 2, at: 25, question: '1926 年，戈达德试验的火箭采用了哪一种推进方式？',
      choices: ['螺旋桨推进', '液体火箭推进', '太阳帆推进'], correctIndex: 1,
      explanation: '戈达德的试验开启了液体火箭飞行的新阶段，片中展示了发动机、管路和贮箱。' },
    { chapterId: 3, at: 27, question: 'V-2 触及太空高度之后，还需要解决什么问题才能持续环绕地球？',
      choices: ['只需继续垂直上升', '必须先到达月球', '获得合适的横向速度'], correctIndex: 2,
      explanation: '越过太空的高度门槛并不等于入轨。持续环绕地球还需要合适的横向速度。' },
    { chapterId: 4, at: 29, question: '1957 年，斯普特尼克一号在人类航天史上的身份是什么？',
      choices: ['第一颗人造地球卫星', '第一个空间站', '第一辆火星车'], correctIndex: 0,
      explanation: '斯普特尼克一号是第一颗人造地球卫星，人造的“星”从此开始环绕地球。' },
    { chapterId: 6, at: 58, question: '1961 年，搭乘东方一号进入太空的是谁？',
      choices: ['阿姆斯特朗', '加加林', '戈达德'], correctIndex: 1,
      explanation: '加加林搭乘东方一号完成了太空旅程，这一章以舱窗外的地球呈现载人航天的突破。' },
    { chapterId: 7, at: 75, question: '1969 年，阿波罗 11 号把人类的脚步带到了哪里？',
      choices: ['火星表面', '天宫空间站', '月球表面'], correctIndex: 2,
      explanation: '阿波罗 11 号完成了从地球到月面的旅程，片中重现了登月舱着陆和宇航员踏上月面的场景。' },
    { chapterId: 8, at: 31, question: '1970 年升空的中国第一颗人造地球卫星叫什么？',
      choices: ['东方红一号', '东方一号', '神舟五号'], correctIndex: 0,
      explanation: '东方红一号是中国第一颗人造地球卫星。这一章讲述它将来自中国的信号带入太空。' },
    { chapterId: 9, at: 31, question: '1971 年的礼炮一号，主要代表哪一种航天器的开端？',
      choices: ['月球车', '空间站', '可回收火箭一级'], correctIndex: 1,
      explanation: '礼炮一号是首个空间站，航天探索开始从短暂到达走向在轨驻留。' },
    { chapterId: 10, at: 37, question: '1976 年，海盗一号着陆后在火星表面怎样开展探测？',
      choices: ['像巡视车一样四处行驶', '载着宇航员徒步探索', '作为固定式着陆器进行探测'], correctIndex: 2,
      explanation: '片中的海盗一号是固定式着陆器，通过相机和科学仪器观察火星的土壤、岩石与地平线。' },
    { chapterId: 11, at: 39, question: '神舟五号的返回阶段，由哪个舱段载人返回地面？',
      choices: ['返回舱', '轨道舱', '太阳翼'], correctIndex: 0,
      explanation: '神舟五号的返回阶段由返回舱执行，轨道舱、推进舱与返回舱在画面中分别表达。' },
    { chapterId: 12, at: 45, question: '2015 年猎鹰 9 号的陆上回收画面中，返回的是哪个部分？',
      choices: ['整枚火箭和卫星一起返回', '完成初段工作的一级箭体', '继续运载任务的上面级'], correctIndex: 1,
      explanation: '一级结束初段工作后返回陆上着陆场，上面级继续执行运载任务。' },
    { chapterId: 13, at: 43, question: '嫦娥四号位于月球背面，主要通过什么保持与地球的联系？',
      choices: ['穿过月球的直通信号', '宇航员携带的电缆', '鹊桥中继星'], correctIndex: 2,
      explanation: '月球会遮挡月背与地球之间的直接通信，鹊桥中继星为探测器保留了通信联系。' },
    { chapterId: 14, at: 43, question: '2021 年，天问一号任务中驶离着陆平台、开展巡视的火星车叫什么？',
      choices: ['祝融号', '玉兔二号', '礼炮一号'], correctIndex: 0,
      explanation: '祝融号是天问一号任务的火星车，落稳后驶离平台，继续开展火面巡视探测。' },
    { chapterId: 15, at: 36, question: '2022 年的天宫空间站基本构型，为航天员提供了怎样的空间？',
      choices: ['只能短暂飞越地球的座舱', '在太空持续工作与生活的空间', '在月球表面行驶的车辆'], correctIndex: 1,
      explanation: '这一章呈现天宫空间站的基本构型，以及从短暂到访走向在太空持续工作与生活。' },
];
