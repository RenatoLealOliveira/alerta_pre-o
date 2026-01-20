import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

const InputSection = ({ onSearch, isLoading }) => {
    const [url, setUrl] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedStores, setSelectedStores] = useState({ ml: false, google: true });

    // Lifecycle Log
    useEffect(() => {
        console.log('🔴 InputSection MOUNTED');
        return () => console.log('🔴 InputSection UNMOUNTED');
    }, []);

    const handleStoreToggle = (store) => {
        console.log(`Toggling store: ${store}`);
        setSelectedStores(prev => {
            const newState = { ...prev };

            // If we are toggling 'google' ON, turn 'ml' OFF
            if (store === 'google' && !prev.google) {
                newState.google = true;
                newState.ml = false;
            }
            // If we are toggling 'ml' ON, turn 'google' OFF
            else if (store === 'ml' && !prev.ml) {
                newState.ml = true;
                newState.google = false;
            }
            // Otherwise just toggle normally
            else {
                newState[store] = !prev[store];
            }
            console.log('New Store State:', newState);
            return newState;
        });
    };

    // Debounce Effect
    useEffect(() => {
        // Don't search if empty or short
        if (url.length <= 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Delay the fetch by 300ms
        const timerId = setTimeout(async () => {
            try {
                // Prepare query params with store selection
                const params = new URLSearchParams({
                    q: url,
                    ml: String(selectedStores.ml),
                    google: String(selectedStores.google)
                });

                console.log(`fetching suggestions (debounced) for: ${url} [ML: ${selectedStores.ml}]`);
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await fetch(`${API_URL}/autosuggest?${params.toString()}`);

                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error("Failed to fetch suggestions");
            }
        }, 400); // 400ms wait time

        // Cleanup function: cancels the previous timer if user types again
        return () => clearTimeout(timerId);
    }, [url, selectedStores]); // Re-run if url or stores change

    const handleInputChange = (e) => {
        const value = e.target.value;
        setUrl(value);
    };

    const handleSuggestionClick = (suggestion) => {
        setUrl(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
        onSearch(suggestion, selectedStores);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            setShowSuggestions(false);
            onSearch(url, selectedStores);
        }
    };

    const wrapperRef = React.useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    return (
        <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-10 text-center relative z-10 transition-all duration-300">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-1 sm:mb-2 transition-colors">
                Monitor de Preços
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-8 text-sm sm:text-lg transition-colors">
                Digite o nome do produto e encontraremos o menor preço para você.
            </p>

            <form ref={wrapperRef} onSubmit={handleSubmit} className="relative group w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-base"
                    placeholder="Nome do produto..."
                    value={url}
                    onChange={handleInputChange}
                    onFocus={() => url.length > 2 && setShowSuggestions(true)}
                    disabled={isLoading}
                    required
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center z-20"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        'Buscar'
                    )}
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200 z-50">
                        {suggestions.map((s, i) => (
                            <li
                                key={i}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200 flex items-center text-sm sm:text-base transition-colors"
                                onClick={() => handleSuggestionClick(s)}
                            >
                                <Search className="w-4 h-4 mr-3 text-gray-300 dark:text-gray-500" />
                                {s}
                            </li>
                        ))}
                    </ul>
                )}
            </form>

            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6">
                <label className="flex items-center space-x-2 cursor-pointer group select-none">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={selectedStores.ml}
                            onChange={() => handleStoreToggle('ml')}
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all overflow-hidden ${selectedStores.ml ? 'bg-white border-yellow-400 shadow-md transform scale-105' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 grayscale opacity-70'}`}>
                            <img
                                src="https://www.google.com/s2/favicons?domain=kabum.com.br&sz=64"
                                alt="Kabum"
                                className="w-6 h-6 object-contain"
                            />
                        </div>
                        {/* Checkmark Badge */}
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity z-10">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <span className={`text-sm sm:text-base font-medium transition-colors ${selectedStores.ml ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-500'}`}>Kabum</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer group select-none">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={selectedStores.google}
                            onChange={() => handleStoreToggle('google')}
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all overflow-hidden ${selectedStores.google ? 'bg-white border-blue-500 shadow-md transform scale-105' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 grayscale opacity-70'}`}>
                            <img
                                src="https://www.google.com/s2/favicons?domain=shopping.google.com&sz=64"
                                alt="Google Shopping"
                                className="w-6 h-6 object-contain"
                            />
                        </div>
                        {/* Checkmark Badge */}
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity z-10">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <span className={`text-sm sm:text-base font-medium transition-colors ${selectedStores.google ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-500'}`}>Google Shopping</span>
                </label>
            </div>
        </div>
    );
};

export default InputSection;
