/**
 * Generates a random string of specified length
 * @param length The length of the string to generate
 * @returns A random alphanumeric string
 */
export const generateRandomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Formats a date object or string to a readable format
 * @param date The date to format
 * @param includeTime Whether to include the time in the output
 * @returns A formatted date string
 */
export const formatDate = (date: string | Date, includeTime: boolean = true): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Format date
    const dateString = dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Format time if requested
    if (includeTime) {
        const timeString = dateObj.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${dateString}, ${timeString}`;
    }
    
    return dateString;
};

/**
 * Truncates a string if it exceeds a maximum length
 * @param str The string to truncate
 * @param maxLength Maximum allowed length
 * @returns The truncated string with ellipsis if needed
 */
export const truncateString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

/**
 * Extracts initials from a name
 * @param name The full name
 * @param limit Maximum number of initials to return
 * @returns The initials
 */
export const getInitials = (name: string, limit: number = 2): string => {
    if (!name) return '';
    
    return name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, limit)
        .join('');
};

/**
 * Capitalizes the first letter of each word in a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export const capitalizeWords = (str: string): string => {
    if (!str) return '';
    
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}; 