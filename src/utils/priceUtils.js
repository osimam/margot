export const PriceUtils = {
    toCents(amount) {
        if (isNaN(amount) || amount === null || amount === "") return 0;
        return Math.round(parseFloat(amount) * 100);
    },
    toEurosString(cents) {
        return (cents / 100).toFixed(2);
    },
    toEurosFloat(cents) {
        return cents / 100;
    }
};

export const escapeHtml = (str) => 
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');