// modules//
const botgram = require("botgram")
const bot = botgram("1413880732:AAFrI49zsRBI8SlxRpIyRwRUtArTblx7Dao")

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
bot.command("start", "help", (msg, reply) =>
  reply.text('Справка: \nhelp - Список команд РобоКоупа \ntimer - Таймер, пример: "/timer 25 минут" \nremind - Напоминание, пример: "/remind через 1 час начать" \nrounds - Раунды pomodoro, пример: "/rounds 25 5 3" - 25 минут работы, 5 минут отдыха, 3 раунда'))

bot.command("timer", (msg, reply, next) => {
  if (!msg.args(2)[0]?.match(/^\d+$/) || !msg.args(2)[1]) return next()
  var [value, unit] = msg.args(2);
  if (unit == 'минут' || unit == 'минуты' || unit == 'минуту') {
    value = value * 60
  } else if (unit == 'час' || unit == 'часов') {
    value = value * 3600
  }
  reply.text(`Установил таймер на ${msg.args(2).join(' ')}`);
  setTimeout(() => reply.text(`${msg.args(2).join(' ')} прошло`), Number(value) * 1000)
})

bot.command("remind", (msg, reply, next) => {
  if (!msg.args(4)[1]?.match(/^\d+$/) || !msg.args(4)[2] || !msg.args(4)[3]) return next()
  var [after, value, unit, message] = msg.args(4);
  if (unit == 'минут' || unit == 'минуты') {
    value = value * 60
  } else if (unit == 'час' || unit == 'часов') {
    value = value * 3600
  }
  reply.text(`Установил напоминание: ${msg.args(2).join(' ')}`);
  setTimeout(() => reply.text(`Пора ${message}`), Number(value) * 1000)
})

bot.command("rounds", (msg, reply, next) => {
  if (!msg.args(3)[0]?.match(/^\d+$/) || !msg?.args(3)[1]?.match(/^\d+$/) || !msg?.args(3)[2]?.match(/^\d+$/)) return next();
  var [work, rest, repeate] = msg.args(3);
  reply.text(`Запущены раунды: ${work} минут работы, затем ${rest} минут отдыха, количество раундов: ${repeate}. Приступаем к работе`);
  const a = [work * 60000, rest * 60000];
  const b = ['Пора сделать перерыв', 'Приступаем к работе']
  let i = 0;
  let timerId = setTimeout(function tick() {
    reply.text(b[i % 2]);
    i += 1;
    timerId = setTimeout(tick, a[i % 2]);
  }, a[0]);
  setTimeout(() => { clearInterval(timerId); reply.text(`Финал`) }, (a[0] + a[1]) * repeate);
})

bot.command((msg, reply) =>
  reply.text("Неправильная команда, сформулируйте запрос правильно (справка - /help)"))
//-----------------------------------------------

const port = process.env.PORT || 3000;
app.listen(port);
