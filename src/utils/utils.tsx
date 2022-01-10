export const leadingZero = (num: Number): String => {
    const numString = num.toString();

    return num < 10 ? `0${numString}` : numString;
};
