const request = require("request");
const axios = require("axios");
const _ = require("underscore");
const FormData = require("form-data");
const fs = require("fs");
const util = require("util");
const wait = require("waait");

const write = util.promisify(fs.writeFile);
const upload = util.promisify(request.post);

let txt = "";

log("Initializing script");
let url = "https://apiestiloar1.websiteseguro.com/api/pecas";
let success_items = 0;
let success_images = 0;
let current_page = 392;
let current_page_pecas = {};
let total_pages = 392;

let startTime = new Date().getTime();

async function start() {
  log("Starting loop");
  await getCurrentPage();
}
// 1 - get peças
async function getCurrentPage() {
  // log(`Getting page ${current_page}`);
  let res = await axios.get(`${url}?page=${current_page}`);
  current_page_pecas = res.data.data;
  // log(`${current_page_pecas.length} items on page ${current_page}`);
  for (const peca of current_page_pecas) {
    convertData(peca);
  }
  // current_page++;
  // if (current_page <= total_pages) {
  //   getCurrentPage();
  // }
}
// 2 - convert data
async function convertData(item) {
  // log(`\n-----------------------------------------------\n`);
  // log(`Handling "${item.codigo}"`);
  let peca = {
    codigo: item.codigo,
    nome: item.nome,
    categorias: await convertCategories(item.categorias),
    linha: await convertLinha(item.linha),
    descricao: await convertDescricao(item.descricao),
    imagens: await handleImages(JSON.parse(item.imagens)),
  };

  // createPeca(peca);
}

// 2.1 convert categories
async function convertCategories(categories) {
  let obj = [];
  for await (const cat of categories) {
    try {
      let res = await axios.get(
        `http://localhost:1337/pecas-categorias?slug=${cat.slug}`
      );
      obj.push({ id: res.data[0].id });
    } catch (error) {
      log(`"${cat.nome}" not found on strapi`);
    }
  }
  // log(`   ✅ "categorias"`);
  return obj;
}

// 2.2 convert linhas
async function convertLinha(linha) {
  switch (linha) {
    case "Equipamentos":
      // log(`   ✅ "linha"`);
      return "Equipamentos";

    case "Linha Agricola":
      // log(`   ✅ "linha"`);
      return "Agricola";

    case "Linha Leve":
      // log(`   ✅ "linha"`);
      return "Leve";

    case "Linha Pesada":
      // log(`   ✅ "linha"`);
      return "Pesada";

    default:
      log(`   🆘🆘🆘 "linha" `);
      log(`Error, cant convert "${linha}"`);
      break;
  }
}

// 2.3 convert descrição
async function convertDescricao(descricao) {
  let reg = /(<([^>]+)>)/gi;
  // log(`   ✅ "descrição"`);
  return _.unescape(descricao.replace(reg, ""));
}

// 3 - handle images
async function handleImages(images) {
  let obj = [];

  // log(`   ${images.length} images`);
  for await (let [key, image] of images.entries()) {
    let res = await downloadImage(image);
    // if (res == "✅") {
    //   let id = await uploadImage(image);
    //   obj.push({ id });
    // }
    // log(`     ${res} ${key + 1}`);
  }
  return obj;
}

// 3.1 - download file
async function downloadImage(image) {
  let res = null;
  try {
    await axios.get(`https://apiestiloar1.websiteseguro.com/storage/${image}`, {
      responseType: "arraybuffer",
    });
    await write(`./${image}`, res.data);
    res = "✅";
    return res;
  } catch (error) {
    log(`"${image}" not found on server`);
    res = "❌";
    return res;
  }
}

// 3.2 - upload file
async function uploadImage(image) {
  try {
    let formData = {
      files: fs.createReadStream(`./${image}`),
    };

    let res = await upload({
      url: "http://localhost:1337/upload",
      formData: formData,
    });
    success_images++;
    return JSON.parse(res.body)[0].id;
  } catch (error) {
    log("Erro ao subir imagem");
    log(error);
  }
}

// 4 - create new peça
async function createPeca(item) {
  // log(`Creating peça - ${item.codigo}`);
  await axios
    .post("http://localhost:1337/pecas", item)
    .then(function (response) {
      success_items++;
      log('\n ------------------------------------------------ \n');
      log(`Success - ${item.codigo}`);
      log(JSON.stringify(item));
      let end = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(2);
      log(
        `\nDone in ${end} minutes!\nCreated ${success_items} new items and ${success_images} new images`
      );
      log('\n ------------------------------------------------ \n');
    })
    .catch(function (error) {
      log(`Erro ao criar peça - ${item.codigo}`);
      log(error);
    });
}

function log(str) {
  console.log(str);
  txt = `${txt}\n${str}`;
  fs.writeFileSync("./log.txt", txt);
}

start();
