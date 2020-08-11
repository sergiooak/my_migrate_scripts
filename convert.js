const axios = require("axios");
const _ = require("underscore");
const fs = require("fs");
const util = require("util");
const wait = require("waait");

let pecas = fs.readFileSync("./pecas.json");
pecas = JSON.parse(pecas);

let json = [];

let startTime = new Date().getTime();

async function start() {
  for await (const peca of pecas) {
    convertData(peca);
    await wait(500);
  }
}

// 2 - convert data
async function convertData(item) {
  let peca = {
    codigo: item.codigo,
    nome: item.nome,
    categorias: await convertCategories(item.categorias),
    linha: await convertLinha(item.linha),
    descricao: await convertDescricao(item.descricao),
    imagens: await convertImages(JSON.parse(item.imagens), item.codigo),
  };

  json.push(peca);
  save();
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
      console.log(`"${cat.nome}" not found on strapi`);
    }
  }
  return obj;
}

// 2.2 convert linhas
async function convertLinha(linha) {
  switch (linha) {
    case "Equipamentos":
      return "Equipamentos";

    case "Linha Agricola":
      return "Agricola";

    case "Linha Leve":
      return "Leve";

    case "Linha Pesada":
      return "Pesada";

    default:
      console.log(`   🆘🆘🆘 "linha" `);
      console.log(`Error, cant convert "${linha}"`);
      break;
  }
}

// 2.3 convert descrição
async function convertDescricao(descricao) {
  let reg = /(<([^>]+)>)/gi;
  return _.unescape(descricao.replace(reg, ""));
}

// 2.4 convert images
async function convertImages(images, codigo) {
  let path = `./pecas/${codigo}`;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  let obj = [];

  for await (const [key, image] of images.entries()) {
    let img = await downloadImage(image, path, codigo, key);
    if (img) {
      obj.push(img);
    }
  }

  return obj;
}
// 3 download images
async function downloadImage(image, path, codigo, key) {
  try {
    let res = await axios.get(
      `https://apiestiloar1.websiteseguro.com/storage/${image}`,
      { responseType: "arraybuffer" }
    );
    let completePath = `${path}/${makeid(codigo, key)}.png`;
    fs.writeFileSync(completePath, res.data);
    return completePath;
  } catch (error) {
    return false;
  }
}

// save json
function save() {
  fs.writeFileSync("./pecasConvertidas.json", JSON.stringify(json));
  let end = ((new Date().getTime() - startTime) / 1000 / 60).toFixed(2);
  console.log(
    `${json.length} of ${pecas.length} (${((json.length / pecas.length) * 100).toFixed(2)}%)\nIn ${end} minutes\nETR: ${Math.round(parseFloat(end) * pecas.length / json.length)} minutes\n\n`
  );
}

// gerate id
function makeid(prefix, key) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return prefix + " - " + (key + 1) + " - " + result;
}

start();
