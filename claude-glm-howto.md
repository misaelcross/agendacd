O Comando para Rodar
Sempre que estiver na pasta do projeto que deseja trabalhar, execute:

docker run -it --rm \
  --env-file .env.glm \
  -v "$(pwd):/project" \
  -v "claude-glm-config:/root/.claude" \
  claude-glm

  Nota: Certifique-se de que o arquivo .env.glm esteja na pasta onde você está executando o comando, ou aponte o caminho completo para ele (ex: --env-file ~/config/.env.glm).