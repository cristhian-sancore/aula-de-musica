const fs = require('fs');

async function checkGitHubActions() {
  console.log("Verificando status da compilação no GitHub Actions...");
  while (true) {
    try {
      const res = await fetch('https://api.github.com/repos/cristhian-sancore/aula-de-musica/actions/runs?per_page=1');
      if (!res.ok) {
        console.log("Aviso: Limite de taxa do GitHub API ou repositório privado. Pulando verificação...");
        return true;
      }
      
      const data = await res.json();
      const run = data.workflow_runs?.[0];
      
      if (!run) {
        console.log("Nenhuma compilação encontrada. Prosseguindo...");
        return true;
      }
      
      if (run.status === 'completed') {
        if (run.conclusion === 'success') {
          console.log(`✅ GitHub Action finalizado com sucesso! (Run #${run.run_number})`);
          return true;
        } else {
          console.log(`❌ GitHub Action falhou (Conclusão: ${run.conclusion}). Não vamos atualizar o Portainer.`);
          return false;
        }
      } else {
        console.log(`⏳ GitHub Action está em andamento (Status: ${run.status}). Aguardando 15 segundos...`);
        await new Promise(r => setTimeout(r, 15000));
      }
    } catch (e) {
      console.error("Erro ao verificar o GitHub:", e);
      return true; // Prosseguir em caso de erro de rede intermitente
    }
  }
}

async function updatePortainer() {
  console.log("Iniciando a atualização no Portainer...");
  const stack = JSON.parse(fs.readFileSync('stack_59.json'));
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const res = await fetch('https://PORTAINER.CRISTHIANSANCORE.COM.BR/api/stacks/59?endpointId=3', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'ptr_ywG6wVg3F1/HEqFeCLac1NT2hZez1PnpJ+aZbkptIA0='
      },
      body: JSON.stringify({
        StackFileContent: stack.StackFileContent,
        Env: [],
        Prune: false,
        PullImage: true
      })
    });
    const result = await res.json();
    console.log("✅ Atualização no Portainer enviada com sucesso:", result);
  } catch (e) {
    console.error("❌ Falha na atualização do Portainer:", e);
  }
}

async function run() {
  // Dá 3 segundinhos só pro github registrar o novo push antes de checar a API
  await new Promise(r => setTimeout(r, 3000));
  
  const success = await checkGitHubActions();
  if (success) {
    await updatePortainer();
  } else {
    console.log("Atualização cancelada pois o código quebrou na nuvem.");
  }
}

run();
