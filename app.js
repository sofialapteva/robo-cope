/* eslint-disable default-case */
const express = require('express');
const session = require('express-session');
require('dotenv').config();
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
// mongoose
const uri = process.env.URI || 'mongodb://localhost:27017/robocope';
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});
const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/user');
const Timer = require('./models/timer');
const Pomodoro = require('./models/pomodoro');
const models = {
  'Timer': Timer,
  'Pomodoro': Pomodoro,
};
// telegram
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
// server
const app = express();
// middlewares//
app.set('views', 'views');
app.set('view engine', 'hbs');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new MongoStore({
      mongooseConnection: mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
      }),
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET || 's2dnkslkf4Nvk2s',
    cookie: { secure: false },
  }),
);

app.use((req, res, next) => {
  res.locals.userId = req.session?.userId;
  next();
});

app.get('/', (req, res) => {
  res.render('index');
});
//-----------------------------------------------
// bot handlers

bot.on('message', async (msg) => {
  switch (msg.text) {
    case '/start':
      let user = await User.findOne({ userId: msg.from.id });
      if (!user) {
        user = new User({ userId: msg.from.id });
        await user.save();
      }
      console.log(user);
      bot.sendMessage(msg.chat.id, `${msg.from.first_name}, выберите одну из команд меню, чтобы продолжить:`, {
        reply_markup: {
          keyboard:
            [['Поставить таймер', 'Создать напоминание'],
            ['Запустить Pomodoro', 'Статистика']],
          one_time_keyboard: true,
        },
      });
      break;
    case 'Вернуться в главное меню':
      bot.sendMessage(msg.chat.id, `${msg.from.first_name}, выберите одну из команд меню, чтобы продолжить:`, {
        reply_markup: {
          keyboard:
            [['Поставить таймер', 'Создать напоминание'],
            ['Запустить Pomodoro', 'Статистика']],
          one_time_keyboard: true,
        },
      });
      break;
    case 'Поставить таймер':
      bot.sendMessage(msg.chat.id, 'Выберите один из предложенных вариантов или настройте свой таймер в формате \n/timer N секунд/минут/часов', {
        reply_markup: {
          keyboard:
            [['/timer 5 минут', '/timer 25 минут'],
            ['/timer 1 час', 'Вернуться в главное меню']],
          one_time_keyboard: true,
        },
      });
      break;
    case 'Создать напоминание':
      bot.sendMessage(msg.chat.id, 'Выберите один из предложенных вариантов или настройте своё напоминание в формате \n/remind через N секунд/минут/часов текст задачи', {
        reply_markup: {
          keyboard:
            [['/remind через 25 минут сделать перерыв'],
            ['/remind через 1 час сделать разминку'],
            ['/remind через 3 часа лечь спать'],
            ['Вернуться в главное меню']],
          one_time_keyboard: true,
        },
      });
      break;
    case 'Запустить Pomodoro':
      bot.sendMessage(msg.chat.id, 'Выберите один из предложенных вариантов или настройте свой Pomodoro в формате \n/pomodoro 25 5 2, где \n25 - время работы, 5 - время перерыва, 2 - количество циклов', {
        reply_markup: {
          keyboard:
            [['/pomodoro 25 5 5', '/pomodoro 60 20 2'],
            ['/pomodoro 40 15 3', 'Вернуться в главное меню']],
          one_time_keyboard: true,
        },
      });
      break;
    case 'Статистика':
      let timers = await Timer.find({ userId: msg.from.id });
      let pomodoros = await Pomodoro.find({ userId: msg.from.id });
      timers = timers.reduce((acc, el) => `${acc}\n Таймер за ${el.createdAt.toLocaleString()}
        Сколько длился интервал? ${el.time}
        Задача была выполнена? ${el.isSuccessful}
        `, 'Статистика по выполнению задач с таймером:');
      pomodoros = pomodoros.reduce((acc, el) => `${acc}\n Pomodoro за ${el.createdAt.toLocaleString()}
        Сколько длился период работы? ${el.work}
        Сколько длился период отдыха? ${el.rest}
        Сколько циклов было пройдено? ${el.repeate}
        Задача была выполнена? ${el.isSuccessful}
        `, 'Статистика использования Pomodoro:');
      bot.sendMessage(msg.chat.id, `${timers} \n${pomodoros}`);
      break;
  }
});

bot.onText(/\/timer (.+) (.+)/, async (msg, data) => {
  [_, time, unit] = data;
  const timer = (value) => {
    bot.sendMessage(msg.chat.id, `Установил таймер на ${time} ${unit}`);
    setTimeout(async () => {
      bot.sendMessage(msg.chat.id, `${time} ${unit} прошло`);
      const newTimer = new Timer({
        userId: msg.from.id,
        time: `${time} ${unit}`,
        createdAt: new Date(),
      });
      await newTimer.save();
      successCheck(msg, 'Timer', newTimer._id);
    }, value);
  };
  switch (unit) {
    case 'секунд':
    case 'секунда':
    case 'секунды':
    case 'секунду':
      timer(time * 1000);
      break;
    case 'минут':
    case 'минута':
    case 'минуты':
    case 'минуту':
      timer(time * 60000);
      break;
    case 'час':
    case 'часов':
    case 'часа':
      timer(time * 3600000);
      break;
    default:
      bot.sendMessage(msg.chat.id, 'Некорректно указаны единицы времени');
  }
});

bot.onText(/\/remind (.*\s)?(\d+) (.*)/, (msg, data) => {
  try {
    const time = data[2];
    data = data[3].split(' ');
    const unit = data[0];
    data.shift();
    const task = data.join(' ');
    const reminder = (value) => {
      bot.sendMessage(msg.chat.id, `Установил напоминание: через ${time} ${unit} нужно ${task}`);
      setTimeout(() => bot.sendMessage(msg.chat.id, `${time} ${unit} прошло, пора ${task}`), value);
    };
    switch (unit) {
      case 'секунд':
      case 'секунда':
      case 'секунды':
      case 'секунду':
        reminder(time * 1000);
        break;
      case 'минут':
      case 'минута':
      case 'минуты':
      case 'минуту':
        reminder(time * 60000);
        break;
      case 'час':
      case 'часов':
      case 'часа':
        reminder(time * 3600000);
        break;
      default:
        bot.sendMessage(msg.chat.id, 'Некорректно указаны единицы времени');
    }
    if (!task || !unit || !time) {
      bot.sendMessage(msg.chat.id, 'Некорректно сформулирован запрос, попробуйте снова');
    }
  } catch (e) {
    console.log(e);
  }
});

bot.onText(/\/pomodoro (\d*) (\d*) (\d*)/, (msg, data) => {
  try {
    [_, work, rest, repeate] = data;
    if (!work || !rest || !repeate) {
      bot.sendMessage(msg.chat.id, 'Некорректно сформулирован запрос, попробуйте снова');
    };
    pomodoro(msg, work, rest, repeate);
  } catch (e) {
    console.log(e);
  }
});

bot.onText(/Да, задание завершено успешно! :(.*):(.*)/, async (msg, data) => {
  try {
    const Model = models[data[1]];
    await Model.updateOne({ _id: data[2] }, { isSuccessful: 'Да' });
    bot.sendMessage(msg.chat.id, `Поздравляю! \n${msg.from.first_name}, выберите одну из команд меню, чтобы продолжить:`, {
      reply_markup: {
        keyboard:
          [['Поставить таймер', 'Создать напоминание'],
          ['Запустить Pomodoro', 'Статистика']],
        one_time_keyboard: true,
      },
    });
  } catch (e) {
    console.log(e);
  }
});

bot.onText(/Нет, что-то пошло не так {2}:(.*):(.*)/, async (msg, data) => {
  try {
    bot.sendMessage(msg.chat.id, `Ничего, в следующий раз получится :) \n${msg.from.first_name}, выберите одну из команд меню, чтобы продолжить:`, {
      reply_markup: {
        keyboard:
          [['Поставить таймер', 'Создать напоминание'],
          ['Запустить Pomodoro', 'Статистика']],
        one_time_keyboard: true,
      },
    });
  } catch (e) {
    console.log(e);
  }
});

//-----------------------------------------------
//functions
function successCheck(msg, task, id) {
  bot.sendMessage(msg.chat.id, 'Задание завершено успешно?', {
    reply_markup: {
      keyboard:
        [[`Да, задание завершено успешно! :${task}:${id}`],
        [`Нет, что-то пошло не так  :${task}:${id}`],
        ['Вернуться в главное меню']],
      one_time_keyboard: true,
    },
  });
};
async function pomodoro(msg, work, rest, repeate) {
  bot.sendMessage(msg.chat.id, `Запущены раунды: ${work} минут работы, затем ${rest} минут отдыха, количество раундов: ${repeate}. \nПриступаем к работе`);
  const intervals = [work * 60000, rest * 60000];
  const messages = ['Пора сделать перерыв', 'Приступаем к работе'];
  let i = 0;
  let timerId = setTimeout(function tick() {
    bot.sendMessage(msg.chat.id, messages[i % 2]);
    i += 1;
    timerId = setTimeout(tick, intervals[i % 2]);
  }, intervals[0]);
  setTimeout(async () => {
    clearInterval(timerId);
    bot.sendMessage(msg.chat.id, 'Готово!');
    const newPomodoro = new Pomodoro({
      userId: msg.from.id,
      work,
      rest,
      repeate,
      createdAt: new Date(),
    });
    await newPomodoro.save();
    successCheck(msg, 'Pomodoro', newPomodoro._id);
  },
    (intervals[0] + intervals[1]) * repeate);
};
//-----------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port);
