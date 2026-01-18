import React from 'react';
import { ExternalLink, Bell, MessageCircle, Send, ArrowDown } from 'lucide-react';

const ProductCard = ({ product }) => {
    const { title, price, image, link } = product;
    const [showAlertOptions, setShowAlertOptions] = React.useState(false);
    const [createdAlertId, setCreatedAlertId] = React.useState(null);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden max-w-sm w-full transition-all hover:shadow-xl hover:scale-[1.02] duration-300">
            <div className="relative h-64 bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-6 group">
                <img
                    src={image}
                    alt={title}
                    className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 group-hover:scale-110"
                />
            </div>

            <div className="p-6">
                <h3 className="text-gray-900 dark:text-white font-semibold text-base leading-snug line-clamp-3 min-h-[4.5rem] mb-3 break-words" title={title}>
                    {title}
                </h3>

                <div className="flex items-end justify-between mb-6">
                    <div className="w-full">
                        <div className="flex flex-wrap gap-2 mb-2">
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                                Menor Preço
                            </span>
                            {product.store && (
                                <span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold border ${product.store === 'Mercado Livre'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    : product.store === 'Kabum'
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                    }`}>
                                    via {product.store}
                                </span>
                            )}
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight truncate" title={price}>
                            {typeof price === 'number'
                                ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                : price}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors text-sm group"
                    >
                        Ver na Loja
                        <ExternalLink size={16} className="ml-2 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                    </a>

                    {/* Logic: Button 1 -> Buttons 2 (WA/TG) -> Button 3 (Simulate) */}

                    {!showAlertOptions && (
                        <button
                            onClick={() => setShowAlertOptions(true)}
                            className="flex items-center justify-center w-full py-3 px-4 bg-white dark:bg-gray-800 border-2 border-primary/10 hover:border-primary text-primary dark:text-blue-400 hover:bg-primary/5 rounded-xl font-bold transition-all text-sm group"
                        >
                            <Bell size={18} className="mr-2 group-hover:animate-swing" />
                            Criar Alerta de Preço
                        </button>
                    )}

                    {showAlertOptions && !createdAlertId && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <button
                                onClick={async () => {
                                    console.log('🔴 Telegram button clicked for:', title);
                                    try {
                                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                        const res = await fetch(`${API_URL}/create_alert`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(product)
                                        });
                                        const data = await res.json();
                                        console.log('🔴 Server response:', data);

                                        if (data.id) {
                                            console.log('🔴 Setting createdAlertId to:', data.id);
                                            setCreatedAlertId(data.id);
                                            // Delay opening window slightly to allow state update to potentially process? (React batches, so maybe not needed but safe)
                                            window.open(`https://t.me/meu_alerta_preco_bot?start=${data.id}`, '_blank');
                                        }
                                    } catch (e) {
                                        alert('Erro ao criar alerta. Tente novamente.');
                                        console.error('🔴 Fetch error:', e);
                                    }
                                }}
                                className="flex items-center justify-center w-full py-3 px-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-medium transition-colors text-sm shadow-md"
                                title="Criar Alerta no Telegram"
                            >
                                <Send size={18} className="mr-2" />
                                Telegram
                            </button>
                            <button
                                className="flex items-center justify-center w-full py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-medium transition-colors text-sm shadow-md"
                                onClick={() => alert("🚧 Funcionalidade em Breve!\nEstamos aguardando aprovação da API Oficial do WhatsApp.")}
                                title="Criar Alerta no WhatsApp"
                            >
                                <MessageCircle size={18} className="mr-2" />
                                WhatsApp
                            </button>
                        </div>
                    )}

                    {showAlertOptions && createdAlertId && (
                        <button
                            onClick={async () => {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                    const res = await fetch(`${API_URL}/simulate_drop`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: createdAlertId })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        alert(`🔥 Preço Simulado! Caiu para ${data.newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no Banco de Dados!`);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert('Erro na simulação');
                                }
                            }}
                            className="flex items-center justify-center w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all text-sm animate-pulse"
                        >
                            <ArrowDown size={18} className="mr-2" />
                            Simular Queda de Preço (-20%)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
