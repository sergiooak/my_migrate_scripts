// const request = require("request");
const axios = require("axios");

// 0 - loop logic
console.log("Initializing script");
let url = "https://apiestiloar1.websiteseguro.com/api/pecas/taxonomias";
let success_items = 0;
let total_items = 4700;

let current_mae = null;
let current_item = {};

async function start() {
  console.log("Starting loop");
  await getCategorias();
}
// 1 - get categorias
async function getCategorias() {
  console.log(`Getting categorias`);
  let res = await axios.get(url);
  let categorias = res.data.categorias;
  console.log(`Found ${categorias.length} categories with children`);
  for await (const categoria of categorias) {
    await handleMae(categoria);
  }
}

async function handleMae(mae) {
  console.log(`\n-----------------------------------------------\n`);
  console.log(`Handling "${mae.nome}"`);
  let item = {
    name: mae.nome,
  };
  let id = await createItem(item);
  console.log(`"${mae.nome}" create with id = ${id}`);
  console.log(`\n ${mae.nome} has ${mae.sub.length} children`);
  await handleChildren(mae.sub, id);
}

async function handleChildren(children, id) {
  for await (const child of children) {
    let item = {
      name: child.nome,
      mae: id,
    };
    let newId = await createItem(item);
    console.log(`   "${child.nome}" create with id = ${newId}`);
  }
}

async function createItem(item) {
  let res = null;
  try {
    res = await axios.post("http://localhost:1337/pecas-categorias", item);
    res = res.data.id;
  } catch (error) {
    res = "!!!ERRO!!!";
  }
  return res;
}

start();
