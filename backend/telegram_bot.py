import requests
import time

# Seus dados reais
TOKEN = "8541687378:AAG22m8MVK5rVCk5Eecy0kAo0sMUGkNipOE"
URL_BASE = f"https://api.telegram.org/bot{TOKEN}"

print("🤖 Servidor do Renato Iniciado...")
print("Aguardando você clicar no botão do site...")

ultimo_id = 0

while True:
    try:
        # 1. Verifica se alguém (você) clicou no botão
        response = requests.get(f"{URL_BASE}/getUpdates?offset={ultimo_id + 1}", timeout=10).json()
        
        if response.get("ok") and response.get("result"):
            for update in response["result"]:
                ultimo_id = update["update_id"]
                
                if "message" in update:
                    texto = update["message"].get("text", "")
                    chat_id = update["message"]["chat"]["id"] # Será o seu: 7166599533
                    nome = update["message"]["from"].get("first_name", "Renato")

                    if texto.startswith("/start"):
                        parts = texto.split(" ", 1)
                        if len(parts) > 1:
                            alert_id = parts[1]
                            print(f"📥 Buscando dados do alerta ID: {alert_id}...")
                            
                            try:
                                # Fetch full data from node backend
                                print(f"  -> Requisitando API: http://localhost:3000/get_alert/{alert_id}")
                                r_data = requests.get(f"http://localhost:3000/get_alert/{alert_id}")
                                
                                print(f"  -> Status Backend: {r_data.status_code}")
                                
                                if r_data.status_code == 200:
                                    data = r_data.json()
                                    
                                    # --- NOVO: Registrar Vínculo (Chat ID <-> Alert ID) ---
                                    requests.post("http://localhost:3000/register_user", json={
                                        "alert_id": alert_id,
                                        "chat_id": chat_id
                                    })
                                    print(f"  -> Vínculo registrado para {alert_id}")
                                    # --------------------------------------------------------

                                    title = data.get("title", "Produto")
                                    price = data.get("formattedPrice", "R$ ???")
                                    image_url = data.get("image", "")

                                    caption = f"🔔 *Alerta Criado!*\n\n📦 *{title}*\n💰 *{price}*\n\nVou monitorar esse preço para você."

                                    print(f"  -> Baixando imagem: {image_url}")
                                    img_data = requests.get(image_url).content
                                    
                                    # Send Photo
                                    print(f"  -> Enviando para Telegram ID: {chat_id}")
                                    res = requests.post(f"{URL_BASE}/sendPhoto", data={
                                        "chat_id": chat_id,
                                        "caption": caption,
                                        "parse_mode": "Markdown"
                                    }, files={
                                        "photo": img_data
                                    })
                                    print(f"  -> Resposta Telegram: {res.json()}")
                                else:
                                    print("  -> ERRO: Backend retornou 404/500")
                                    requests.post(f"{URL_BASE}/sendMessage", data={"chat_id": chat_id, "text": "❌ Erro ao buscar dados do produto."})

                            except Exception as api_err:
                                print(f"🔥 ERRO FATAL: {api_err}")
                                requests.post(f"{URL_BASE}/sendMessage", data={"chat_id": chat_id, "text": "Erro interno ao processar alerta."})
                        
                        else:
                             requests.post(f"{URL_BASE}/sendMessage", data={"chat_id": chat_id, "text": "Clique no botão do site para iniciar."})

    except Exception as e:
        print(f"Erro: {e}")
    
    # --- NOVO: Verificar Notificações Pendentes (VIGIA) ---
    try:
        pending = requests.get("http://localhost:3000/pending_notifications", timeout=2).json()
        if pending:
            print(f"🚨 Encontradas {len(pending)} notificações pendentes!")
            for alert in pending:
                p_id = alert["id"]
                p_chat_id = alert["chat_id"]
                p_title = alert["title"]
                p_price = alert["formattedPrice"]
                p_image = alert.get("image", "")
                
                msg = f"📉 *PREÇO CAIU!* 📉\n\n📦 {p_title}\n💰 *{p_price}* (Desconto Simulado de 20%)\n\nCorra para aproveitar!"
                
                print(f"  -> Notificando {p_chat_id} sobre {p_title}")

                try:
                    if p_image:
                        print(f"  -> Baixando imagem para alerta: {p_image}")
                        photo_data = requests.get(p_image, timeout=5).content
                        requests.post(f"{URL_BASE}/sendPhoto", 
                            data={"chat_id": p_chat_id, "caption": msg, "parse_mode": "Markdown"}, 
                            files={"photo": photo_data}
                        )
                    else:
                         requests.post(f"{URL_BASE}/sendMessage", data={"chat_id": p_chat_id, "text": msg, "parse_mode": "Markdown"})
                except Exception as img_err:
                    print(f"  -> Erro ao enviar imagem ({img_err}), enviando apenas texto.")
                    requests.post(f"{URL_BASE}/sendMessage", data={"chat_id": p_chat_id, "text": msg, "parse_mode": "Markdown"})
                
                # Marcar como notificado
                requests.post("http://localhost:3000/mark_notified", json={"id": p_id})
    except Exception as vigia_err:
        pass # Silently ignore connection errors to avoid spamming console
    # -------------------------------------------------------

    time.sleep(2)
