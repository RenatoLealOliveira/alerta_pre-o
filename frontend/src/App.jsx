import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import InputSection from './components/InputSection';
import ProductCard from './components/ProductCard';
import SkeletonCard from './components/SkeletonCard';
import TechInfo from './components/TechInfo';

function App() {
    // Main App Component with Skeleton Loader
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (query, stores = { ml: true }) => {
        console.log('App.handleSearch called with:', { query, stores });
        setLoading(true);
        setError(null);
        setProduct(null);

        try {
            // Pass store flags to backend
            const queryParams = new URLSearchParams({
                query: query,
                ml: String(stores.ml),
                google: String(stores.google)
            });

            // Assuming backend is running on port 3000 or defined in .env
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_URL}/search?${queryParams.toString()}`);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || errData.error || 'Falha ao buscar produtos.');
            }

            const data = await response.json();
            setProduct(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Featured Items for Random Auto-Search
    const featuredTerms = [
        'iPhone 16 Pro Max',
        'PlayStation 5 Slim',
        'Nintendo Switch OLED',
        'MacBook Air M3',
        'Samsung Galaxy S24 Ultra',
        'Xbox Series X',
        'iPad Air 5',
        'Kindle Paperwhite'
    ];

    const hasSearched = React.useRef(false);

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        if (hasSearched.current) return;
        hasSearched.current = true;

        // Pick a random term
        const randomTerm = featuredTerms[Math.floor(Math.random() * featuredTerms.length)];
        console.log(`🚀 Auto-searching for featured item: ${randomTerm}`);

        // Initial search with Google enabled by default
        handleSearch(randomTerm, { ml: false, google: true });
    }, []);

    return (
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-gray-900 flex flex-col items-center py-20 px-4 transition-colors duration-300">
            {/* Theme Toggle */}
            <button
                onClick={() => setDarkMode(!darkMode)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-yellow-400 hover:scale-110 transition-all"
                title={darkMode ? "Mudar para Claro" : "Mudar para Escuro"}
            >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <InputSection onSearch={handleSearch} isLoading={loading} />

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center mb-8 animate-in fade-in slide-in-from-bottom-2">
                    <span className="font-medium mr-1">Erro:</span> {error}
                </div>
            )}

            {loading && !product && (
                <SkeletonCard />
            )}

            {product && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <ProductCard product={product} />
                </div>
            )}

            <TechInfo />
        </div>
    );
}

export default App;
