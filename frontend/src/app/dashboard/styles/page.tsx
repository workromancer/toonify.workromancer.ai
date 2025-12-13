export default function ArtStylesPage() {
    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Art Styles</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage and generate your custom AI art styles.</p>
            </header>

            <div className="grid gap-6">
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <div className="max-w-md space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Style</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            Train a new AI model with your own art style or generate one from varied inputs.
                        </p>
                        {/* Placeholder for future functionality */}
                        <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                            Generate AI Art Style
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
