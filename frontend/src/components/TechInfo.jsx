import React from 'react';
import { Bot, Globe, ShieldCheck, Zap, Send, MessageCircle } from 'lucide-react';

const TechInfo = () => {
    return (
        <div className="mt-auto pt-16 pb-8 w-full max-w-2xl text-center opacity-80 hover:opacity-100 transition-opacity duration-300">
            <h4 className="text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-widest mb-6">
                Powered by Dual-Engine Technology
            </h4>

            {/* Tech Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Engine 1: ML Scraping */}
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100 dark:border-gray-700 p-4 rounded-xl flex items-start text-left hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-2 rounded-lg mr-3 shadow-sm shrink-0">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">Kabum Scraping</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Varredura em tempo real no maior marketplace da América Latina via <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded dark:text-gray-300">Puppeteer</span>.
                        </p>
                    </div>
                </div>

                {/* Engine 2: Google Search */}
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100 dark:border-gray-700 p-4 rounded-xl flex items-start text-left hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all">
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-2 rounded-lg mr-3 shadow-sm shrink-0">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">Google Shopping API</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Integração oficial via <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded dark:text-gray-300">Serper.dev</span> para comparação de preço multi-loja em tempo real.
                        </p>
                    </div>
                </div>

                {/* Engine 3: Telegram Bot */}
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100 dark:border-gray-700 p-4 rounded-xl flex items-start text-left hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all">
                    <div className="bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] dark:text-[#33aaff] p-2 rounded-lg mr-3 shadow-sm shrink-0">
                        <Send size={20} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">Telegram "Vigia" Bot</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Monitoramento persistente 24/7. O Bot "acorda" o servidor e te envia alertas de preço instantaneamente.
                        </p>
                    </div>
                </div>

                {/* Engine 4: WhatsApp (Coming Soon) */}
                <div className="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 p-4 rounded-xl flex items-start text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all opacity-70">
                    <div className="bg-[#25D366]/10 dark:bg-[#25D366]/20 text-[#25D366] dark:text-[#4ade80] p-2 rounded-lg mr-3 shadow-sm shrink-0">
                        <MessageCircle size={20} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-1 flex items-center">
                            WhatsApp Alerts
                            <span className="ml-2 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full font-medium">Em Breve</span>
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Estamos integrando com a API oficial da Meta para trazer a mesma rapidez do Telegram.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                    <Zap size={10} className="text-green-500" /> Real-time Fetch
                </span>
                <span className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-blue-500" /> Backend Validation
                </span>
            </div>
        </div>
    );
};

export default TechInfo;
