// 幫原本 8 個主題各補 5 題課文閱讀理解題（原本每主題只有 1 題，太少不成關卡）
// 用該主題自己的單字表寫的短故事+理解題，跟 New Friends/We Can Help 的課文題風格一致
require('dotenv').config()
const mysql = require('mysql2/promise')

const newQuestions = [
  // ── 主題1：動物與地點探險 ──────────────────────────
  { theme_id: 1, question_text: "Mia is at the park. She sees a rabbit and a bird. The rabbit is white. The bird is singing.\n\nWhere is Mia?",
    options: ["park", "zoo", "school", "home"], correct_answer: "park",
    explanation: "故事開頭就說 Mia is at the park（在公園）。", difficulty: 1 },
  { theme_id: 1, question_text: "Mia is at the park. She sees a rabbit and a bird. The rabbit is white. The bird is singing.\n\nWhat color is the rabbit?",
    options: ["white", "black", "brown", "pink"], correct_answer: "white",
    explanation: "故事提到 The rabbit is white（兔子是白色的）。", difficulty: 1 },
  { theme_id: 1, question_text: "Dad and I go to the zoo. We see a big lion and a scary tiger. My brother likes the tiger. I like the bear.\n\nWho likes the tiger?",
    options: ["my brother", "I", "dad", "the lion"], correct_answer: "my brother",
    explanation: "故事說 My brother likes the tiger（我弟弟喜歡老虎）。", difficulty: 1 },
  { theme_id: 1, question_text: "Dad and I go to the zoo. We see a big lion and a scary tiger. My brother likes the tiger. I like the bear.\n\nWhat animal does \"I\" like?",
    options: ["bear", "tiger", "lion", "monkey"], correct_answer: "bear",
    explanation: "故事說 I like the bear（我喜歡熊）。", difficulty: 1 },
  { theme_id: 1, question_text: "Grandma has a pig and a chicken on the farm. The pig is pink. The chicken is small.\n\nWhat color is the pig?",
    options: ["pink", "white", "black", "brown"], correct_answer: "pink",
    explanation: "故事說 The pig is pink（豬是粉紅色的）。", difficulty: 1 },

  // ── 主題2：美食派對 ────────────────────────────────
  { theme_id: 2, question_text: "It is breakfast time. Ken eats bread and an egg. He drinks milk.\n\nWhat does Ken drink?",
    options: ["milk", "juice", "water", "tea"], correct_answer: "milk",
    explanation: "故事說 He drinks milk（他喝牛奶）。", difficulty: 1 },
  { theme_id: 2, question_text: "It is breakfast time. Ken eats bread and an egg. He drinks milk.\n\nWhat does Ken eat for breakfast?",
    options: ["bread and an egg", "pizza and cake", "fish and soup", "hamburger and hot dog"], correct_answer: "bread and an egg",
    explanation: "故事說 Ken eats bread and an egg（肯吃麵包和蛋）。", difficulty: 1 },
  { theme_id: 2, question_text: "Today is my birthday. We have pizza and cake for dinner. My friends drink juice.\n\nWhat do they eat for dinner?",
    options: ["pizza and cake", "sandwich and soup", "hamburger and bread", "fish and rice"], correct_answer: "pizza and cake",
    explanation: "故事說晚餐吃 pizza and cake（披薩和蛋糕）。", difficulty: 1 },
  { theme_id: 2, question_text: "Today is my birthday. We have pizza and cake for dinner. My friends drink juice.\n\nWhat do my friends drink?",
    options: ["juice", "milk", "tea", "water"], correct_answer: "juice",
    explanation: "故事說 My friends drink juice（我朋友喝果汁）。", difficulty: 1 },
  { theme_id: 2, question_text: "Amy is thirsty. She wants water, not tea. She drinks a big glass of water.\n\nWhat does Amy want to drink?",
    options: ["water", "tea", "milk", "juice"], correct_answer: "water",
    explanation: "故事說 She wants water, not tea（她想喝水，不是茶）。", difficulty: 1 },

  // ── 主題3：我的家庭與朋友 ──────────────────────────
  { theme_id: 3, question_text: "This is Tim. He is my classmate. He is a good friend. Our teacher likes him.\n\nWhat is Tim to me?",
    options: ["classmate", "teacher", "brother", "grandpa"], correct_answer: "classmate",
    explanation: "故事說 He is my classmate（他是我的同學）。", difficulty: 1 },
  { theme_id: 3, question_text: "My grandpa and grandma live near my house. My grandpa is funny. My grandma cooks well.\n\nWho cooks well?",
    options: ["grandma", "grandpa", "mother", "father"], correct_answer: "grandma",
    explanation: "故事說 My grandma cooks well（我奶奶很會做菜）。", difficulty: 1 },
  { theme_id: 3, question_text: "My grandpa and grandma live near my house. My grandpa is funny. My grandma cooks well.\n\nWho is funny?",
    options: ["grandpa", "grandma", "teacher", "classmate"], correct_answer: "grandpa",
    explanation: "故事說 My grandpa is funny（我爺爺很好笑）。", difficulty: 1 },
  { theme_id: 3, question_text: "Ann has one brother and one sister. Her brother is a student. Her sister is still a baby.\n\nHow many siblings does Ann have?",
    options: ["two", "one", "three", "four"], correct_answer: "two",
    explanation: "Ann 有一個哥哥/弟弟和一個姊姊/妹妹，總共兩個。", difficulty: 2 },
  { theme_id: 3, question_text: "Ann has one brother and one sister. Her brother is a student. Her sister is still a baby.\n\nWhat is Ann's brother?",
    options: ["a student", "a teacher", "a baby", "a friend"], correct_answer: "a student",
    explanation: "故事說 Her brother is a student（她哥哥是學生）。", difficulty: 1 },

  // ── 主題4：數字與時間密碼 ──────────────────────────
  { theme_id: 4, question_text: "Today is Friday. Amy has ten pencils. She gives three to her friend. Now she has seven pencils.\n\nWhat day is it?",
    options: ["Friday", "Monday", "Sunday", "Saturday"], correct_answer: "Friday",
    explanation: "故事開頭說 Today is Friday（今天是星期五）。", difficulty: 1 },
  { theme_id: 4, question_text: "Today is Friday. Amy has ten pencils. She gives three to her friend. Now she has seven pencils.\n\nHow many pencils does Amy have now?",
    options: ["seven", "ten", "three", "eight"], correct_answer: "seven",
    explanation: "10 支給出去 3 支，剩下 7 支（seven）。", difficulty: 2 },
  { theme_id: 4, question_text: "It is Sunday evening. Ben watches TV at eight. Then he goes to bed at nine.\n\nWhat day is it?",
    options: ["Sunday", "Monday", "Friday", "Wednesday"], correct_answer: "Sunday",
    explanation: "故事開頭說 It is Sunday evening（現在是星期日晚上）。", difficulty: 1 },
  { theme_id: 4, question_text: "It is Sunday evening. Ben watches TV at eight. Then he goes to bed at nine.\n\nWhat time does Ben go to bed?",
    options: ["nine", "eight", "seven", "ten"], correct_answer: "nine",
    explanation: "故事說 he goes to bed at nine（他九點睡覺）。", difficulty: 1 },
  { theme_id: 4, question_text: "There are seven days in a week. Saturday and Sunday are my favorite days.\n\nHow many days are in a week?",
    options: ["seven", "five", "six", "eight"], correct_answer: "seven",
    explanation: "故事說 There are seven days in a week（一星期有七天）。", difficulty: 1 },

  // ── 主題5：我的身體與感受 ──────────────────────────
  { theme_id: 5, question_text: "Kate is tired and thirsty. She wants some water. After she drinks water, she feels happy.\n\nHow does Kate feel before she drinks water?",
    options: ["tired", "happy", "sick", "sorry"], correct_answer: "tired",
    explanation: "故事一開始說 Kate is tired and thirsty（凱特累了又渴）。", difficulty: 1 },
  { theme_id: 5, question_text: "Kate is tired and thirsty. She wants some water. After she drinks water, she feels happy.\n\nHow does Kate feel after she drinks water?",
    options: ["happy", "sad", "angry", "hungry"], correct_answer: "happy",
    explanation: "故事說喝完水之後 she feels happy（她覺得開心）。", difficulty: 1 },
  { theme_id: 5, question_text: "Leo's arm hurts. His hand is red. He is sad. His mom helps him.\n\nWhat hurts on Leo?",
    options: ["his arm", "his head", "his leg", "his foot"], correct_answer: "his arm",
    explanation: "故事說 Leo's arm hurts（里歐的手臂痛）。", difficulty: 1 },
  { theme_id: 5, question_text: "Leo's arm hurts. His hand is red. He is sad. His mom helps him.\n\nHow does Leo feel?",
    options: ["sad", "happy", "angry", "tired"], correct_answer: "sad",
    explanation: "故事說 He is sad（他很難過）。", difficulty: 1 },
  { theme_id: 5, question_text: "My eyes are big. My nose is small. My mouth is happy today!\n\nHow does \"my mouth\" feel today?",
    options: ["happy", "sad", "angry", "tired"], correct_answer: "happy",
    explanation: "故事說 My mouth is happy today（我的嘴巴今天很開心，意指笑容滿面）。", difficulty: 1 },

  // ── 主題6：色彩與穿搭 ──────────────────────────────
  { theme_id: 6, question_text: "Tom wears a red shirt and black shoes today. He looks cool.\n\nWhat color is Tom's shirt?",
    options: ["red", "blue", "black", "green"], correct_answer: "red",
    explanation: "故事說 Tom wears a red shirt（湯姆穿紅色上衣）。", difficulty: 1 },
  { theme_id: 6, question_text: "Tom wears a red shirt and black shoes today. He looks cool.\n\nWhat color are Tom's shoes?",
    options: ["black", "red", "white", "brown"], correct_answer: "black",
    explanation: "故事說 black shoes（黑色的鞋子）。", difficulty: 1 },
  { theme_id: 6, question_text: "Emma has a purple dress and a pink hat. She likes pink best.\n\nWhat color does Emma like best?",
    options: ["pink", "purple", "blue", "yellow"], correct_answer: "pink",
    explanation: "故事說 She likes pink best（她最喜歡粉紅色）。", difficulty: 1 },
  { theme_id: 6, question_text: "Emma has a purple dress and a pink hat. She likes pink best.\n\nWhat does Emma wear on her head?",
    options: ["a pink hat", "a purple hat", "a red hat", "a blue hat"], correct_answer: "a pink hat",
    explanation: "故事說 a pink hat（一頂粉紅色帽子）戴在頭上。", difficulty: 1 },
  { theme_id: 6, question_text: "My brother's jacket is orange. My jacket is green. We look different.\n\nWhat color is my jacket?",
    options: ["green", "orange", "yellow", "purple"], correct_answer: "green",
    explanation: "故事說 My jacket is green（我的外套是綠色的）。", difficulty: 1 },

  // ── 主題7：校園生活與文具 ──────────────────────────
  { theme_id: 7, question_text: "Amy is in the library. She reads a book. She has a pencil and a notebook.\n\nWhere is Amy?",
    options: ["library", "classroom", "zoo", "park"], correct_answer: "library",
    explanation: "故事說 Amy is in the library（艾咪在圖書館）。", difficulty: 1 },
  { theme_id: 7, question_text: "Amy is in the library. She reads a book. She has a pencil and a notebook.\n\nWhat does Amy have besides a pencil?",
    options: ["a notebook", "a ruler", "an eraser", "a computer"], correct_answer: "a notebook",
    explanation: "故事說 a pencil and a notebook（一支鉛筆和一本筆記本）。", difficulty: 1 },
  { theme_id: 7, question_text: "Ben forgets his book bag at home. His teacher gives him a pencil box to use.\n\nWhat does Ben forget?",
    options: ["his book bag", "his pencil", "his ruler", "his eraser"], correct_answer: "his book bag",
    explanation: "故事說 Ben forgets his book bag（班忘記帶書包）。", difficulty: 1 },
  { theme_id: 7, question_text: "There is a computer, a desk and a marker in the classroom.\n\nHow many things are in the classroom?",
    options: ["three", "two", "four", "one"], correct_answer: "three",
    explanation: "電腦、桌子、麥克筆，一共三樣東西。", difficulty: 2 },
  { theme_id: 7, question_text: "There is a computer, a desk and a marker in the classroom.\n\nWhat is in the classroom besides a computer and a desk?",
    options: ["a marker", "a book", "a ruler", "an eraser"], correct_answer: "a marker",
    explanation: "故事說還有 a marker（一支麥克筆）。", difficulty: 1 },

  // ── 主題8：天氣與季節變化 ──────────────────────────
  { theme_id: 8, question_text: "It is July. The weather is hot and sunny. We go swimming.\n\nWhat month is it?",
    options: ["July", "January", "October", "December"], correct_answer: "July",
    explanation: "故事開頭說 It is July（現在是七月）。", difficulty: 1 },
  { theme_id: 8, question_text: "It is July. The weather is hot and sunny. We go swimming.\n\nWhat is the weather like?",
    options: ["hot and sunny", "cold and windy", "cloudy and cool", "rainy and cold"], correct_answer: "hot and sunny",
    explanation: "故事說 The weather is hot and sunny（天氣又熱又晴朗）。", difficulty: 1 },
  { theme_id: 8, question_text: "In winter, it is cold. In summer, it is hot. I like spring the best because it is warm.\n\nWhich season does \"I\" like best?",
    options: ["spring", "summer", "winter", "fall"], correct_answer: "spring",
    explanation: "故事說 I like spring the best（我最喜歡春天）。", difficulty: 1 },
  { theme_id: 8, question_text: "In winter, it is cold. In summer, it is hot. I like spring the best because it is warm.\n\nWhat is the weather like in winter?",
    options: ["cold", "hot", "warm", "windy"], correct_answer: "cold",
    explanation: "故事說 In winter, it is cold（冬天很冷）。", difficulty: 1 },
  { theme_id: 8, question_text: "Today is cloudy and cool. Maybe it will be rainy tomorrow.\n\nWhat is the weather like today?",
    options: ["cloudy and cool", "hot and sunny", "cold and windy", "rainy and warm"], correct_answer: "cloudy and cool",
    explanation: "故事說 Today is cloudy and cool（今天多雲又涼爽）。", difficulty: 1 },
]

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, charset: 'utf8mb4',
  })

  for (const q of newQuestions) {
    await conn.query(
      `INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
       VALUES (?, 'reading', 'mcq', ?, ?, ?, ?, ?)`,
      [q.theme_id, q.question_text, JSON.stringify(q.options), q.correct_answer, q.explanation, q.difficulty]
    )
  }
  console.log(`寫入完成，共 ${newQuestions.length} 題`)

  const [check] = await conn.query(
    `SELECT theme_id, COUNT(*) AS 題數 FROM questions WHERE level='reading' GROUP BY theme_id ORDER BY theme_id`
  )
  console.log(check)

  await conn.end()
}
main().catch(e => console.error('ERROR:', e.code, e.message))
