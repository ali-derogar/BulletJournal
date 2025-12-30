
export const LEVELS = {
    IRON: 'Iron',
    BRONZE: 'Bronze',
    SILVER: 'Silver',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
    DIAMOND: 'Diamond',
} as const;

export type Level = typeof LEVELS[keyof typeof LEVELS];

export const getLevelColor = (level: string = 'Iron') => {
    switch (level) {
        case LEVELS.DIAMOND:
            return 'from-blue-400 to-cyan-300 ring-blue-400/50';
        case LEVELS.PLATINUM:
            return 'from-slate-300 to-cyan-200 ring-cyan-200/50'; // Shiny white/cyan
        case LEVELS.GOLD:
            return 'from-yellow-300 to-amber-500 ring-yellow-400/50';
        case LEVELS.SILVER:
            return 'from-gray-300 to-gray-400 ring-gray-400/50';
        case LEVELS.BRONZE:
            return 'from-orange-600 to-orange-800 ring-orange-700/50';
        case LEVELS.IRON:
        default:
            return 'from-gray-600 to-gray-700 ring-gray-600/50';
    }
};

export const getLevelBorder = (level: string = 'Iron') => {
    switch (level) {
        case LEVELS.DIAMOND:
            return 'border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]';
        case LEVELS.PLATINUM:
            return 'border-cyan-200 shadow-[0_0_15px_rgba(165,243,252,0.5)]';
        case LEVELS.GOLD:
            return 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
        case LEVELS.SILVER:
            return 'border-gray-300 shadow-[0_0_10px_rgba(209,213,219,0.3)]';
        case LEVELS.BRONZE:
            return 'border-orange-700 shadow-[0_0_10px_rgba(194,65,12,0.3)]';
        case LEVELS.IRON:
        default:
            return 'border-gray-600';
    }
};
