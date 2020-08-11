const axios = require("axios");
const fs = require("fs");
const wait = require("waait");
const logUpdate = require("log-update");

let pecasConvertidas = fs.readFileSync("./pecasConvertidas.json");
pecasConvertidas = JSON.parse(pecasConvertidas);

let done = 0;
let success = 0;
let errors = 0;
let errorList = [];
let current = null;

let txt = "";
let startTime = new Date().getTime();

async function start() {
  for (let index = 0; index < pecasConvertidas.length; index += 5) {
    for (let i = 0; i < 5; i++) {
      let current = index + i;
      if (current <= pecasConvertidas.length) {
        upload(pecasConvertidas[current], current);
      }
    }
    if (done !== index + 5) {
      await wait(3000);
    } else {
      await wait(500);
    }
  }
}

async function upload(peca, i) {
  await axios
    .post("http://localhost:1337/pecas", peca)
    .then(function (response) {
      success++;
    })
    .catch(function (error) {
      errors++
      log(`Erro ao criar peça - ${peca.codigo}`);
      log(error);
      errorList.push(error)
    }).finally(() => {
      done++
    });
}

async function showProgress() {
  let percent = ((done / pecasConvertidas.length) * 100).toFixed(2);
  let end = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(2);
  let eta = Math.round((parseFloat(end) * pecasConvertidas.length) / done);

  logUpdate(`
  ${done} pecas done!
  ${percent}% of the total (${pecasConvertidas.length})

  ${success} ✅ | ${errors} ❌

  Estimate total time: ${parseTime(eta)}
  ${parseTime(end)} so far, last ${parseTime(eta - end)} minutes to finish

  Error list:
  ${errorList.join("\n    ")}
  `);

  if (done < pecasConvertidas.length) {
    await wait(1000);
    showProgress();
  }
}

function parseTime(time) {
  time = parseFloat(time) * 60;
  let minutes = Math.round(time / 60) | 0;
  let seconds = Math.round(time % 60);

  let str =
    (minutes < 10 ? "0" + minutes : minutes) +
    ":" +
    (seconds < 10 ? "0" + seconds : seconds);
  return str;
}

function log(str) {
  txt = `${txt}\n${str}`;
  fs.writeFileSync("./logUpload.txt", txt);
}

showProgress();
start();
