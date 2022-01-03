import ngrok from 'ngrok'

async function main() {
   const api = ngrok.getApi()!;
   console.log(await api.listTunnels());
}
main();
