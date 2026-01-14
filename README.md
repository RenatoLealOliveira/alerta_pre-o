
# 📉 Alerta de Preço Inteligente (Dual-Engine)

> **Projeto Fullstack** capaz de monitorar preços em tempo real usando **Scraping** (Puppeteer) e **APIs Oficiais** (Google Shopping), com notificações instantâneas via **Telegram Bot**.

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-blue) ![Node](https://img.shields.io/badge/Backend-Node.js-green) ![Puppeteer](https://img.shields.io/badge/Scraping-Puppeteer-orange) ![Telegram](https://img.shields.io/badge/Bot-Telegram-blue)

## 🚀 Funcionalidades

Este projeto resolve o problema de monitorar preços em múltiplas fontes simultaneamente:

*   **🔍 Motor Híbrido de Busca**:
    *   **Mercado Livre**: Scraping em tempo real via `Puppeteer` para capturar ofertas relâmpago que APIs comuns não veem.
    *   **Google Shopping**: Integração via API (`Serper do Google Gratuita`) para comparar preços em grandes varejistas (Amazon, Magazine Luiza, Casas Bahia).
*   **📱 Notificações Rich-Media**: O Bot do Telegram não manda apenas texto, ele envia a **Foto do Produto** + Preço formatado assim que detecta uma queda.
*   **🌙 UI Moderna**: Interface React com **Dark Mode** automático, animações suaves e design responsivo (Mobile-first).
*   **⚡ Performance**: Sistema de cache inteligente e debounce na busca para não sobrecarregar as APIs.

## 🛠️ Tecnologias Utilizadas

### Frontend
-   **React + Vite**: Para altíssima performance.
-   **Tailwind CSS**: Estilização moderna e responsiva.
-   **Lucide React**: Ícones leves e elegantes.
-   **Fetch API**: Comunicação assíncrona com o backend.

### Backend
-   **Node.js + Express**: API RESTful robusta.
-   **Puppeteer**: Automação de browser para scraping avançado.
-   **Axios**: Consumo de APIs externas.
-   **Telegram Bot API**: Integração direta via Python/Node para envio de alertas.

## 📸 Como Funciona

1.  O usuário digita o produto (ex: "iPhone 15").
2.  O **Backend** acorda:
    *   Lança um navegador invisível (Puppeteer) para varrer o Mercado Livre.
    *   Consulta a API do Google Shopping em paralelo.
3.  O Frontend exibe o **Menor Preço** encontrado.
4.  O usuário clica em "Criar Alerta".
5.  O **Bot "Vigia"** passa a monitorar esse produto 24/7 e avisa no Telegram se o preço cair.

## 📦 Como Rodar Localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/SEU_USUARIO/alerta-preco-app.git
    ```

2.  Configure o Backend:
    ```bash
    cd backend
    npm install
    # Crie um arquivo .env com suas chaves:
    # TELEGRAM_TOKEN=seu_token_aqui
    # GOOGLE_API_KEY=sua_chave_serper
    node server.js
    ```

3.  Configure o Frontend:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---
Desenvolvido por **[Renato Leal de Oliveira]** para fins de portfólio e estudos em Automação e Desenvolvimento Web.
