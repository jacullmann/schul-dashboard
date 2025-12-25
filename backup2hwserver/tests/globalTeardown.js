export default async function () {
  await global.__MONGOD__.stop();
}
