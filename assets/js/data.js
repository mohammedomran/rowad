/*
 * رواد — كتالوج المحتوى (بيانات تجريبية)
 * ------------------------------------------------------------------
 * هذا الملف هو المصدر الوحيد لبيانات القصص في الواجهة.
 * عند ربط الواجهة بالخادم استبدل محتواه باستجابة الـ API (انظر Rowad.api في app.js).
 *
 * حقل video: ضع رابط ملف الفيديو (mp4/webm) لتعمل شاشة المشاهدة.
 * إذا تُرك null تعرض الواجهة حالة «قريبًا» بدل المشغّل.
 */
window.ROWAD_DATA = {
  categories: [
    { id: 'adventure', name: 'قصص المغامرات', short: 'المغامرات', tone: 'orange', icon: 'assets/img/icons/adventure.webp', blurb: 'رحلات واكتشافات لا تنتهي' },
    { id: 'bedtime',   name: 'قصص قبل النوم', short: 'قبل النوم', tone: 'violet', icon: 'assets/img/icons/bedtime.webp',   blurb: 'حكايات هادئة لأحلام سعيدة' },
    { id: 'values',    name: 'قصص القيم',     short: 'القيم',     tone: 'blue',   icon: 'assets/img/icons/values.webp',    blurb: 'الصدق والأمانة والتعاون' },
    { id: 'animals',   name: 'قصص الحيوانات', short: 'الحيوانات', tone: 'green',  icon: 'assets/img/icons/animals.webp',   blurb: 'أصدقاء من الغابة والبحر' }
  ],

  stories: [
    {
      id: 'robo',
      title: 'مغامرات روبو',
      kind: 'series',
      category: 'adventure',
      age: 5,
      cover: 'assets/img/covers/robo.webp',
      wide: 'assets/img/hero/robo-wide.webp',
      focus: '18% 40%',
      summary: 'يوسف وكلبه القماشي بندق وصديقهما الآلي روبو ينطلقون في مغامرات مدهشة، ويتعلمون في كل حلقة شيئًا جديدًا.',
      episodes: [
        {
          n: 1, title: 'روبو تاه في المدينة', duration: 300, sizeMB: 48,
          thumb: 'assets/img/covers/robo.webp', video: null,
          summary: 'يفقد روبو طريقه في المدينة، فينطلق يوسف وبندق في مغامرة ممتعة للعثور عليه، ويتعلمون معًا أهمية التركيز واتباع التعليمات.'
        },
        {
          n: 2, title: 'روبو يرصد النجوم', duration: 360, sizeMB: 56,
          thumb: 'assets/img/covers/robo-stars.webp', video: null,
          summary: 'في ليلة صافية يصعد الأصدقاء إلى التل ومعهم المنظار، فيكتشفون أسرار القمر والنجوم ويتعلمون الصبر.'
        },
        {
          n: 3, title: 'روبو عند الأهرامات', duration: 420, sizeMB: 64,
          thumb: 'assets/img/covers/robo-pyramids.webp', video: null,
          summary: 'رحلة إلى الأهرامات يتعرف فيها الأصدقاء إلى حضارة عريقة، ويدركون أن العمل الجماعي يصنع العجائب.'
        }
      ]
    },
    {
      id: 'whale', title: 'الحوت الصغير', kind: 'story', category: 'animals', age: 3, isNew: true,
      cover: 'assets/img/covers/whale.webp', wide: 'assets/img/hero/whale-wide.webp', focus: '26% 50%',
      duration: 240, sizeMB: 38, video: null,
      summary: 'حوت صغير يبتعد عن أمه في البحر الواسع، فيساعده أصدقاؤه على العودة إليها ويتعلم ألا يبتعد وحده.'
    },
    {
      id: 'jungle', title: 'مغامرة في الغابة', kind: 'story', category: 'adventure', age: 5, isNew: true,
      cover: 'assets/img/covers/jungle.webp', duration: 360, sizeMB: 55, video: null,
      summary: 'تحمل ليلى منظارها وتستكشف الغابة مع صديقها الببغاء، فتتعلم كيف تحافظ على الطبيعة وتحترم سكانها.'
    },
    {
      id: 'castle', title: 'القلعة السحرية', kind: 'story', category: 'bedtime', age: 4, isNew: true,
      cover: 'assets/img/covers/castle.webp', wide: 'assets/img/hero/castle-wide.webp', focus: '22% 45%',
      duration: 300, sizeMB: 46, video: null,
      summary: 'في ليلة مقمرة تضيء نوافذ قلعة بعيدة، وتبدأ حكاية هادئة تأخذ الصغار إلى أحلام سعيدة.'
    },
    {
      id: 'lion', title: 'الأسد الشجاع', kind: 'story', category: 'animals', age: 4,
      cover: 'assets/img/covers/lion.webp', duration: 300, sizeMB: 47, video: null,
      summary: 'شبل صغير يخاف من الظلام، ثم يكتشف أن الشجاعة تبدأ بخطوة صغيرة وقلب مطمئن.'
    },
    {
      id: 'lantern', title: 'فانوس الأمانة', kind: 'story', category: 'values', age: 5,
      cover: 'assets/img/covers/lantern.webp', duration: 360, sizeMB: 52, video: null,
      summary: 'تجد سلمى فانوسًا مضيئًا في السوق القديم، فتبحث عن صاحبه حتى تعيده إليه، وتعرف قيمة الأمانة.'
    },
    {
      id: 'moon', title: 'القمر النعسان', kind: 'story', category: 'bedtime', age: 3,
      cover: 'assets/img/covers/moon.webp', duration: 240, sizeMB: 36, video: null,
      summary: 'القمر يتثاءب والنجوم تغني له أغنية هادئة، وقد حان وقت النوم لكل الصغار.'
    },
    {
      id: 'rabbit', title: 'الأرنب والسلحفاة', kind: 'story', category: 'values', age: 4,
      cover: 'assets/img/covers/rabbit.webp', duration: 300, sizeMB: 44, video: null,
      summary: 'سباق بين أرنب سريع وسلحفاة صبورة، والفوز لمن يواصل طريقه ولا يستسلم.'
    },
    {
      id: 'space', title: 'رحلة إلى القمر', kind: 'story', category: 'adventure', age: 6,
      cover: 'assets/img/covers/space.webp', duration: 420, sizeMB: 62, video: null,
      summary: 'يبني سامي صاروخًا من الورق المقوّى، وينطلق بخياله في رحلة بين الكواكب والنجوم.'
    },
    {
      id: 'bee', title: 'النحلة النشيطة', kind: 'story', category: 'values', age: 3,
      cover: 'assets/img/covers/bee.webp', duration: 240, sizeMB: 35, video: null,
      summary: 'نحلة صغيرة تتعلم أن العمل مع الفريق يصنع أشهى عسل في الخلية.'
    },
    {
      id: 'cloud', title: 'الغيمة الصغيرة', kind: 'story', category: 'bedtime', age: 3,
      cover: 'assets/img/covers/cloud.webp', duration: 240, sizeMB: 34, video: null,
      summary: 'غيمة صغيرة تبحث عن صديق في السماء، فتلتقي النجوم والطيور وتنام سعيدة.'
    }
  ],

  /* شرائح الواجهة الرئيسية */
  featured: [
    { story: 'robo',   badge: 'السلسلة الأولى', line: 'ثلاث حلقات من المغامرة والاكتشاف', cta: 'شاهد الحلقة الأولى' },
    { story: 'castle', badge: 'حكاية قبل النوم', line: 'حكاية هادئة لليلة سعيدة',          cta: 'شاهد القصة' },
    { story: 'whale',  badge: 'قصة جديدة',       line: 'مغامرة لطيفة في أعماق البحر',      cta: 'شاهد القصة' }
  ],

  dailyStory: 'lantern',

  avatars: [
    { id: 'youssef', name: 'يوسف',  src: 'assets/img/avatars/youssef.webp' },
    { id: 'layla',   name: 'ليلى',  src: 'assets/img/avatars/layla.webp' },
    { id: 'sami',    name: 'سامي',  src: 'assets/img/avatars/sami.webp' },
    { id: 'salma',   name: 'سلمى',  src: 'assets/img/avatars/salma.webp' },
    { id: 'robo',    name: 'روبو',  src: 'assets/img/avatars/robo.webp' },
    { id: 'bunduq',  name: 'بندق',  src: 'assets/img/avatars/bunduq.webp' },
    { id: 'lion',    name: 'الشبل', src: 'assets/img/avatars/lion.webp' },
    { id: 'cat',     name: 'القطة', src: 'assets/img/avatars/cat.webp' }
  ],

  badges: [
    { id: 'first',    name: 'أول حكاية',      icon: 'rocket-launch', tone: 'sun',    need: 1,  hint: 'أكمل قصة واحدة' },
    { id: 'explorer', name: 'المستكشف',       icon: 'compass',       tone: 'orange', need: 3,  hint: 'أكمل 3 قصص' },
    { id: 'reader',   name: 'محب الحكايات',   icon: 'book-open',     tone: 'blue',   need: 5,  hint: 'أكمل 5 قصص' },
    { id: 'friend',   name: 'صديق الحيوانات', icon: 'paw-print',     tone: 'green',  need: 8,  hint: 'أكمل 8 قصص' },
    { id: 'star',     name: 'نجم رواد',       icon: 'crown',         tone: 'violet', need: 12, hint: 'أكمل 12 قصة' }
  ],

  notifications: [
    { icon: 'sparkle',        tone: 'sun',  title: 'حكاية اليوم جاهزة', text: 'فانوس الأمانة في انتظارك.',        href: 'story.html?id=lantern' },
    { icon: 'play-circle',    tone: 'blue', title: 'حلقة جديدة',        text: 'روبو عند الأهرامات متاحة الآن.', href: 'story.html?id=robo&ep=3' }
  ]
};
