import { ShoppingBag, Search } from 'lucide-react';

const SkeletonCard = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden max-w-sm w-full animate-pulse relative">

            {/* Overlay Status (Centered) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 opacity-80">
                <div className="bg-yellow-300 p-4 rounded-full shadow-lg mb-3 animate-bounce">
                    <ShoppingBag size={32} className="text-blue-900" strokeWidth={2.5} />
                </div>
                <span className="text-gray-900 dark:text-gray-100 font-bold text-lg tracking-wide">Pesquisando...</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">Buscando menor preço</span>
            </div>

            {/* Background Skeleton Structure (Faded) */}
            <div className="opacity-30 pointer-events-none filter blur-[1px]">
                {/* Image Skeleton */}
                <div className="h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                </div>

                <div className="p-6">
                    {/* Title Skeleton */}
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-6"></div>

                    {/* Price Skeleton */}
                    <div className="mb-6">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="space-y-3">
                        <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl w-full"></div>
                        <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl w-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
