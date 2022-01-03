import ngrok from 'ngrok'

async function main() {
   let url = await ngrok.connect(); 
   console.log(url);
}
main();
