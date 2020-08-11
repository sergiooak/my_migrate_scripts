const axios = require("axios");
const fs = require("fs");
const wait = require("waait");
const slugify = require("slugify");
const chalk = require("chalk");
const logUpdate = require("log-update");

let pecas = fs.readFileSync("./pecas.json");
pecas = JSON.parse(pecas);
let pecasConvertidas = fs.readFileSync("./pecasConvertidas.json");
pecasConvertidas = JSON.parse(pecasConvertidas);

let done = 0;
let needToUpdate = 0;
let success = 0;
let errors = 0;
let errorList = [];

let txt = "";
let startTime = new Date().getTime();

async function start() {
  for (let index = 0; index < pecas.length; index++) {
    await checkCategorias(pecas[index], index);

    let percent = (((index + 1) / pecas.length) * 100).toFixed(2);
    let end = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(2);
    let eta = Math.round((parseFloat(end) * pecas.length) / done);

    logUpdate(`
    ${done} pecas done!
    ${percent}% of the total

    ${needToUpdate} has needed to update:
    ${success} ✅ | ${errors} ❌

    Estimate total time: ${eta} minutes
    ${end} minutes so far, last ${eta - end} minutes to finish

    Error list:
    ${errorList.join("\n    ")}
    `);
  }

  save();
}

async function checkCategorias(peca, i) {
  log(`\n${peca.codigo} has ${peca.categorias.length} categories`);
  for (let index = 0; index < peca.categorias.length; index++) {
    let correctSlug = slugify(peca.categorias[index].nome, { lower: true });
    let oldSlug = peca.categorias[index].slug;
    let isTheSame = correctSlug == oldSlug;

    if (isTheSame) {
      log(`   OK! - "${correctSlug}"`);
    } else {
      log(`   WARN" - "${correctSlug}" need to update!`);
      needToUpdate++;
      let id = await getCategory(correctSlug);
      pecasConvertidas[i].categorias[index] = id;
    }
  }

  done++;
}

async function getCategory(cat) {
  try {
    let res = await axios.get(
      `http://localhost:1337/pecas-categorias?slug=${cat}`
    );
    console.log(JSON.stringify(res.data));
    success++;
    return { id: res.data[0].id };
  } catch (error) {
    errors++;
    errorList.push(`"${cat}" not found on strapi`);
  }
}

function log(str) {
  txt = `${txt}\n${str}`;
  fs.writeFileSync("./logUpdate.txt", txt);
}

// save json
function save() {
  fs.writeFileSync("./pecasConvertidas.json", JSON.stringify(pecasConvertidas));
}

start();
