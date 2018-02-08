const matchHexOfLength = (text, length) => new RegExp(`^0x[a-f0-9]{${length}}$`, 'gi').test(text);

export default matchHexOfLength;
