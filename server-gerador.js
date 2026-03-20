const express = require("express");
const path = require("path");

const app = express();
// Usamos a porta 3001 para não dar conflito com o Terminal (que usa a 3000)
// Assim você pode deixar os dois ligados ao mesmo tempo durante a partida!
const PORT = 3001; 

// Diz ao servidor para liberar o acesso a todos os arquivos estáticos da pasta atual (HTML, CSS, JS, JSON)
app.use(express.static(path.join(__dirname)));

// Quando acessar o endereço principal, abre direto o gerador.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "gerador.html"));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log("=========================================");
  console.log("  MÓDULO GERADOR DE BURACOS INICIADO");
  console.log("=========================================");
  console.log(`=> Acesse no navegador: http://localhost:${PORT}`);
  console.log("=========================================");
});