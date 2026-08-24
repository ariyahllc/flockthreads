// Lets every pipeline script target a different catalog file:
//   node --env-file=.env scripts/<x>.js data=products-mens.json
export function dataFileUrl() {
  const arg = process.argv.slice(2).find((a) => a.startsWith("data="));
  const name = arg ? arg.split("=")[1] : "products.json";
  return new URL(`../../data/${name}`, import.meta.url);
}
