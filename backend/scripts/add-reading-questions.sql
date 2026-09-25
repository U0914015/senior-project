-- 幫原本 8 個主題各補 5 題課文閱讀理解題
-- 這份是 add-reading-questions.js 的 SQL 版本，內容完全一致，供 Cloud SQL migration 用

INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (1, 'reading', 'mcq', 'Mia is at the park. She sees a rabbit and a bird. The rabbit is white. The bird is singing.\n\nWhere is Mia?', '[\"park\",\"zoo\",\"school\",\"home\"]', 'park', '故事開頭就說 Mia is at the park（在公園）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (1, 'reading', 'mcq', 'Mia is at the park. She sees a rabbit and a bird. The rabbit is white. The bird is singing.\n\nWhat color is the rabbit?', '[\"white\",\"black\",\"brown\",\"pink\"]', 'white', '故事提到 The rabbit is white（兔子是白色的）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (1, 'reading', 'mcq', 'Dad and I go to the zoo. We see a big lion and a scary tiger. My brother likes the tiger. I like the bear.\n\nWho likes the tiger?', '[\"my brother\",\"I\",\"dad\",\"the lion\"]', 'my brother', '故事說 My brother likes the tiger（我弟弟喜歡老虎）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (1, 'reading', 'mcq', 'Dad and I go to the zoo. We see a big lion and a scary tiger. My brother likes the tiger. I like the bear.\n\nWhat animal does \"I\" like?', '[\"bear\",\"tiger\",\"lion\",\"monkey\"]', 'bear', '故事說 I like the bear（我喜歡熊）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (1, 'reading', 'mcq', 'Grandma has a pig and a chicken on the farm. The pig is pink. The chicken is small.\n\nWhat color is the pig?', '[\"pink\",\"white\",\"black\",\"brown\"]', 'pink', '故事說 The pig is pink（豬是粉紅色的）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (2, 'reading', 'mcq', 'It is breakfast time. Ken eats bread and an egg. He drinks milk.\n\nWhat does Ken drink?', '[\"milk\",\"juice\",\"water\",\"tea\"]', 'milk', '故事說 He drinks milk（他喝牛奶）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (2, 'reading', 'mcq', 'It is breakfast time. Ken eats bread and an egg. He drinks milk.\n\nWhat does Ken eat for breakfast?', '[\"bread and an egg\",\"pizza and cake\",\"fish and soup\",\"hamburger and hot dog\"]', 'bread and an egg', '故事說 Ken eats bread and an egg（肯吃麵包和蛋）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (2, 'reading', 'mcq', 'Today is my birthday. We have pizza and cake for dinner. My friends drink juice.\n\nWhat do they eat for dinner?', '[\"pizza and cake\",\"sandwich and soup\",\"hamburger and bread\",\"fish and rice\"]', 'pizza and cake', '故事說晚餐吃 pizza and cake（披薩和蛋糕）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (2, 'reading', 'mcq', 'Today is my birthday. We have pizza and cake for dinner. My friends drink juice.\n\nWhat do my friends drink?', '[\"juice\",\"milk\",\"tea\",\"water\"]', 'juice', '故事說 My friends drink juice（我朋友喝果汁）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (2, 'reading', 'mcq', 'Amy is thirsty. She wants water, not tea. She drinks a big glass of water.\n\nWhat does Amy want to drink?', '[\"water\",\"tea\",\"milk\",\"juice\"]', 'water', '故事說 She wants water, not tea（她想喝水，不是茶）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (3, 'reading', 'mcq', 'This is Tim. He is my classmate. He is a good friend. Our teacher likes him.\n\nWhat is Tim to me?', '[\"classmate\",\"teacher\",\"brother\",\"grandpa\"]', 'classmate', '故事說 He is my classmate（他是我的同學）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (3, 'reading', 'mcq', 'My grandpa and grandma live near my house. My grandpa is funny. My grandma cooks well.\n\nWho cooks well?', '[\"grandma\",\"grandpa\",\"mother\",\"father\"]', 'grandma', '故事說 My grandma cooks well（我奶奶很會做菜）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (3, 'reading', 'mcq', 'My grandpa and grandma live near my house. My grandpa is funny. My grandma cooks well.\n\nWho is funny?', '[\"grandpa\",\"grandma\",\"teacher\",\"classmate\"]', 'grandpa', '故事說 My grandpa is funny（我爺爺很好笑）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (3, 'reading', 'mcq', 'Ann has one brother and one sister. Her brother is a student. Her sister is still a baby.\n\nHow many siblings does Ann have?', '[\"two\",\"one\",\"three\",\"four\"]', 'two', 'Ann 有一個哥哥/弟弟和一個姊姊/妹妹，總共兩個。', 2);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (3, 'reading', 'mcq', 'Ann has one brother and one sister. Her brother is a student. Her sister is still a baby.\n\nWhat is Ann\'s brother?', '[\"a student\",\"a teacher\",\"a baby\",\"a friend\"]', 'a student', '故事說 Her brother is a student（她哥哥是學生）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (4, 'reading', 'mcq', 'Today is Friday. Amy has ten pencils. She gives three to her friend. Now she has seven pencils.\n\nWhat day is it?', '[\"Friday\",\"Monday\",\"Sunday\",\"Saturday\"]', 'Friday', '故事開頭說 Today is Friday（今天是星期五）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (4, 'reading', 'mcq', 'Today is Friday. Amy has ten pencils. She gives three to her friend. Now she has seven pencils.\n\nHow many pencils does Amy have now?', '[\"seven\",\"ten\",\"three\",\"eight\"]', 'seven', '10 支給出去 3 支，剩下 7 支（seven）。', 2);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (4, 'reading', 'mcq', 'It is Sunday evening. Ben watches TV at eight. Then he goes to bed at nine.\n\nWhat day is it?', '[\"Sunday\",\"Monday\",\"Friday\",\"Wednesday\"]', 'Sunday', '故事開頭說 It is Sunday evening（現在是星期日晚上）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (4, 'reading', 'mcq', 'It is Sunday evening. Ben watches TV at eight. Then he goes to bed at nine.\n\nWhat time does Ben go to bed?', '[\"nine\",\"eight\",\"seven\",\"ten\"]', 'nine', '故事說 he goes to bed at nine（他九點睡覺）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (4, 'reading', 'mcq', 'There are seven days in a week. Saturday and Sunday are my favorite days.\n\nHow many days are in a week?', '[\"seven\",\"five\",\"six\",\"eight\"]', 'seven', '故事說 There are seven days in a week（一星期有七天）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (5, 'reading', 'mcq', 'Kate is tired and thirsty. She wants some water. After she drinks water, she feels happy.\n\nHow does Kate feel before she drinks water?', '[\"tired\",\"happy\",\"sick\",\"sorry\"]', 'tired', '故事一開始說 Kate is tired and thirsty（凱特累了又渴）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (5, 'reading', 'mcq', 'Kate is tired and thirsty. She wants some water. After she drinks water, she feels happy.\n\nHow does Kate feel after she drinks water?', '[\"happy\",\"sad\",\"angry\",\"hungry\"]', 'happy', '故事說喝完水之後 she feels happy（她覺得開心）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (5, 'reading', 'mcq', 'Leo\'s arm hurts. His hand is red. He is sad. His mom helps him.\n\nWhat hurts on Leo?', '[\"his arm\",\"his head\",\"his leg\",\"his foot\"]', 'his arm', '故事說 Leo\'s arm hurts（里歐的手臂痛）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (5, 'reading', 'mcq', 'Leo\'s arm hurts. His hand is red. He is sad. His mom helps him.\n\nHow does Leo feel?', '[\"sad\",\"happy\",\"angry\",\"tired\"]', 'sad', '故事說 He is sad（他很難過）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (5, 'reading', 'mcq', 'My eyes are big. My nose is small. My mouth is happy today!\n\nHow does \"my mouth\" feel today?', '[\"happy\",\"sad\",\"angry\",\"tired\"]', 'happy', '故事說 My mouth is happy today（我的嘴巴今天很開心，意指笑容滿面）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (6, 'reading', 'mcq', 'Tom wears a red shirt and black shoes today. He looks cool.\n\nWhat color is Tom\'s shirt?', '[\"red\",\"blue\",\"black\",\"green\"]', 'red', '故事說 Tom wears a red shirt（湯姆穿紅色上衣）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (6, 'reading', 'mcq', 'Tom wears a red shirt and black shoes today. He looks cool.\n\nWhat color are Tom\'s shoes?', '[\"black\",\"red\",\"white\",\"brown\"]', 'black', '故事說 black shoes（黑色的鞋子）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (6, 'reading', 'mcq', 'Emma has a purple dress and a pink hat. She likes pink best.\n\nWhat color does Emma like best?', '[\"pink\",\"purple\",\"blue\",\"yellow\"]', 'pink', '故事說 She likes pink best（她最喜歡粉紅色）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (6, 'reading', 'mcq', 'Emma has a purple dress and a pink hat. She likes pink best.\n\nWhat does Emma wear on her head?', '[\"a pink hat\",\"a purple hat\",\"a red hat\",\"a blue hat\"]', 'a pink hat', '故事說 a pink hat（一頂粉紅色帽子）戴在頭上。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (6, 'reading', 'mcq', 'My brother\'s jacket is orange. My jacket is green. We look different.\n\nWhat color is my jacket?', '[\"green\",\"orange\",\"yellow\",\"purple\"]', 'green', '故事說 My jacket is green（我的外套是綠色的）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (7, 'reading', 'mcq', 'Amy is in the library. She reads a book. She has a pencil and a notebook.\n\nWhere is Amy?', '[\"library\",\"classroom\",\"zoo\",\"park\"]', 'library', '故事說 Amy is in the library（艾咪在圖書館）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (7, 'reading', 'mcq', 'Amy is in the library. She reads a book. She has a pencil and a notebook.\n\nWhat does Amy have besides a pencil?', '[\"a notebook\",\"a ruler\",\"an eraser\",\"a computer\"]', 'a notebook', '故事說 a pencil and a notebook（一支鉛筆和一本筆記本）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (7, 'reading', 'mcq', 'Ben forgets his book bag at home. His teacher gives him a pencil box to use.\n\nWhat does Ben forget?', '[\"his book bag\",\"his pencil\",\"his ruler\",\"his eraser\"]', 'his book bag', '故事說 Ben forgets his book bag（班忘記帶書包）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (7, 'reading', 'mcq', 'There is a computer, a desk and a marker in the classroom.\n\nHow many things are in the classroom?', '[\"three\",\"two\",\"four\",\"one\"]', 'three', '電腦、桌子、麥克筆，一共三樣東西。', 2);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (7, 'reading', 'mcq', 'There is a computer, a desk and a marker in the classroom.\n\nWhat is in the classroom besides a computer and a desk?', '[\"a marker\",\"a book\",\"a ruler\",\"an eraser\"]', 'a marker', '故事說還有 a marker（一支麥克筆）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (8, 'reading', 'mcq', 'It is July. The weather is hot and sunny. We go swimming.\n\nWhat month is it?', '[\"July\",\"January\",\"October\",\"December\"]', 'July', '故事開頭說 It is July（現在是七月）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (8, 'reading', 'mcq', 'It is July. The weather is hot and sunny. We go swimming.\n\nWhat is the weather like?', '[\"hot and sunny\",\"cold and windy\",\"cloudy and cool\",\"rainy and cold\"]', 'hot and sunny', '故事說 The weather is hot and sunny（天氣又熱又晴朗）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (8, 'reading', 'mcq', 'In winter, it is cold. In summer, it is hot. I like spring the best because it is warm.\n\nWhich season does \"I\" like best?', '[\"spring\",\"summer\",\"winter\",\"fall\"]', 'spring', '故事說 I like spring the best（我最喜歡春天）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (8, 'reading', 'mcq', 'In winter, it is cold. In summer, it is hot. I like spring the best because it is warm.\n\nWhat is the weather like in winter?', '[\"cold\",\"hot\",\"warm\",\"windy\"]', 'cold', '故事說 In winter, it is cold（冬天很冷）。', 1);
INSERT INTO questions (theme_id, level, question_type, question_text, options, correct_answer, explanation, difficulty)
     VALUES (8, 'reading', 'mcq', 'Today is cloudy and cool. Maybe it will be rainy tomorrow.\n\nWhat is the weather like today?', '[\"cloudy and cool\",\"hot and sunny\",\"cold and windy\",\"rainy and warm\"]', 'cloudy and cool', '故事說 Today is cloudy and cool（今天多雲又涼爽）。', 1);
