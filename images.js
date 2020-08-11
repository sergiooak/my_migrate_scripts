const request = require("request");
const fs = require("fs");
const util = require("util");
const wait = require("waait");
const slugify = require("slugify");
const logUpdate = require("log-update");

const upload = util.promisify(request.post);

let pecasConvertidas = fs.readFileSync("./pecasConvertidas.json");
pecasConvertidas = JSON.parse(pecasConvertidas);

let done = 0;
let imagesDone = 0;
let success = 0;
let errors = 0;
let errorList = [];

let txt = "";
let startTime = new Date().getTime();

async function start() {
  for (let index = 0; index < pecasConvertidas.length; index += 12) {
    for (let i = 0; i < 12; i++) {
      let current = index + i;
      if (current < pecasConvertidas.length) {
        handleImages(pecasConvertidas[current], current);
      }
    }
    if (done !== index + 12) {
      await wait(6000);
    } else {
      await wait(1);
    }
  }
}

async function handleImages(peca, i) {
  let files = fs.readdirSync(`./pecas/${peca.codigo}`);

  for (let index = 0; index < files.length; index++) {
    try {
      let current_slot = pecasConvertidas[i].imagens[index];
      if (typeof current_slot !== "object" || current_slot.id === undefined) {
        let id = await uploadImage(files[index], peca.codigo);
        pecasConvertidas[i].imagens[index] = { id };
      }
      imagesDone++;
    } catch (error) {
      log(error);
    }
  }

  log(JSON.stringify(pecasConvertidas[i].imagens));
  done++;
}

async function uploadImage(image, codigo) {
  try {
    let formData = {
      files: fs.createReadStream(`./pecas/${codigo}/${image}`),
    };

    let res = await upload({
      url: "http://localhost:1337/upload",
      formData: formData,
    });
    log(`\n   ✅ OK! "${image}"`);
    success++;
    return JSON.parse(res.body)[0].id;
  } catch (error) {
    log(
      `\n   ❌ ERR! "${JSON.stringify(image)}"\n    ${JSON.stringify(error)}\n`
    );
    errors++;
    return "ERR";
  }
}

async function showProgress() {
  let percent = ((done / pecasConvertidas.length) * 100).toFixed(2);
  let end = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(2);
  let eta = Math.round((parseFloat(end) * pecasConvertidas.length) / done);

  logUpdate(`
  ${done} pecas done!
  ${percent}% of the total (${pecasConvertidas.length})

  ${imagesDone} images so far
  ${success} ✅ | ${errors} ❌

  Estimate total time: ${parseTime(eta)}
  ${parseTime(end)} so far, last ${parseTime(eta - end)} minutes to finish

  Error list:
  ${errorList.join("\n    ")}
  `);

  if (done < pecasConvertidas.length) {
    await wait(1000);
    showProgress();
    save();
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
  fs.writeFileSync("./logImages.txt", txt);
}

// save json
function save() {
  fs.writeFileSync("./pecasConvertidas.json", JSON.stringify(pecasConvertidas));
}

start();
showProgress();
