const quotes = [
  `🦁 It's better to be a lion for a day than a sheep all your life. - Elizabeth Kenny`,
  `🧘‍♂️ Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment. - Buddha`,
  `🏋️‍♂️ He who has a why to live can bear almost any how. - Friedrich Nietzsche`,
  `🙇‍♂️ Failure is success if we learn from it. - Malcolm Forbes`,
  `👀 Open your eyes, look within. Are you satisfied with the life you're living? - Bob Marley`,
  `🐣 We are here to add what we can to life, not to get what we can from life. - William Osler`,
  `🧱 Sometimes life hits you in the head with a brick. Don't lose faith. - Steve Jobs`,
  `😨 It's not what happens to you, but how you react to it that matters. - Epictetus`,
  `🛣 You always pass failure on the way to success. - Mickey Rooney`,
  `🦢 No one is perfect - that’s why pencils have erasers. - Wolfgang Riebe`,
  `🥇 Winning doesn’t always mean being first. Winning means you’re doing better than you’ve done before. - Bonnie Blair`,
  `💪 You’re braver than you believe, and stronger than you seem, and smarter than you think. - A.A. Mine`,
  `🤯 It always seems impossible until it is done. - Nelson Mandela`,
  `☀️ Keep your face to the sunshine and you cannot see a shadow. - Helen Keller`,
  `👞 All your dreams can come true if you have the courage to pursue them - Walt Disney`,
  `⏱ In every day, there are 1,440 minutes. That means we have 1,440 daily opportunities to make a positive impact. - Les Brown`,
  `🤕 The only time you fail is when you fall down and stay down. - Stephen Richards`,
  `📈 Positive anything is better than negative nothing. - Elbert Hubbard`,
  `🎤 Virtually nothing is impossible in this world if you just put your mind to it and maintain a positive attitude. - Lou Holtz`,
  `🧲 Optimism is a happiness magnet. If you stay positive good things and good people will be drawn to you. - Mary Lou Retton`,
  `🚪 If opportunity doesn’t knock, build a door. - Milton Berle`,
  `😊 Happiness is an attitude. We either make ourselves miserable, or happy and strong. The amount of work is the same. - Francesca Reigler`,
  `🍠 Believe you can and you're halfway there - Theodore Roosevelt`,
  `🔨 It’s not whether you get knocked down, it’s whether you get up. - Vince Lombardi`,
  `🌈 The way I see it, if you want the rainbow, you gotta put up with the rain. - Dolly Parton`,
  `👽 The difference between ordinary and extraordinary is that little extra. - Jimmy Johnson`,
  `🌤 If you want light to come into your life, you need to stand where it is shining. - Guy Finley`,
  `🌞 Success is the sum of small efforts repeated day in and day out. - Robert Collier`,
  `🏔 Live life to the fullest and focus on the positive. - Matt Cameron`,
  `🌋 The price of greatness is responsibility. - Winston Churchill`,
  `📊 Facts are stubborn, but statistics are more pliable - Mark Twain`,
  `🛣 The road to success and the road to failure are almost exactly the same. - Colin R. Davis`,
  `🏃‍♂️ Success usually comes to those who are too busy to be looking for it. - Henry David Thoreau`,
  `🛠 Opportunities don't happen. You create them. - Chris Grosser`,
  `🍀 I find that the harder I work, the more luck I seem to have. - Thomas Jefferson`,
  `🤸‍♂️ Successful people do what unsuccessful people are not willing to do. Don't wish it were easier; wish you were better. - Jim Rohn`,
  `🚶‍♂️ Success is walking from failure to failure with no loss of enthusiasm. - Winston Churchill`,
  `🙀 Do one thing every day that scares you - Anonymous`,
  `🌍 The ones who are crazy enough to think they can change the world, are the ones that do - Anonymous`,
  `🌘 If you really look closely, most overnight successes took a long time. - Steve Jobs`,
  `🗽 The real test is not whether you avoid this failure, because you won't. It's whether you let it harden or shame you into inaction, or whether you learn from it; whether you choose to persevere - Barack Obama`,
  `🥋 The successful warrior is the average man, with laser-like focus - Bruce Lee`,
  `🙊 The way to get started is to quit talking and begin doing - Walt Disney`,
  `📢 If you really want to do something, you'll find a way. If you don't, you'll find an excuse - Jim Rohn`,
  `🎱 Fall seven times and stand up eight - Japanese Proverb`,
  `🧗🏻‍♂️ The difference between who you are and who you want to be is what you do. - Anonymous`,
  `🤾‍♂️ Many of life's failures are people who did not realize how close they were to success when they gave up. - Thomas Edison`,
  `🕵️‍♂️ The secret to success is to know something nobody else knows - Aristotle Onassis`,
  `🥀 I failed my way to success. - Thomas Edison`,
  `🌸 I never dreamed about success, I worked for it - Estee Lauder`,
  `💐 The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty. - Winston Churchill`,
  `🍂 Don’t let yesterday take up too much of today. – Will Rogers`,
];

const template = (id, quote) => `# ${id} ${quote}

Hi friends,

It's been another week, how are y'all doing?

So, here are some of the things I've done over the past weeks

---

TODO:

---

And that's the end of this week! Hope you enjoyed.

Until next time, friends! 👋

[@lihautan](https://twitter.com/lihautan)`;

const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(__dirname);
for (const file of files) {
  if (!(/^#(\d+)-\d+-\d+-\d+\.md$/.test(file))) continue;
  let [_, id] = file.match(/^#(\d+)-\d+-\d+-\d+\.md$/);
  id = Number(id);
  if (id < 13) continue;
  let num = id - 13;
  fs.writeFileSync(path.join(__dirname, file), template(id, quotes[num]), 'utf-8');
}
