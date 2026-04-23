FROM node:20-slim

# Instala o Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Cria as pastas necessárias e dá permissão ao usuário node
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/

WORKDIR /project

# Muda para o usuário não-root
USER node

ENTRYPOINT ["claude"]