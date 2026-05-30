const hex = '0101000020E6100000CC20517B24981040412B306475F94940';
const buf = Buffer.from(hex, 'hex');
console.log("X (lng):", buf.readDoubleLE(9));
console.log("Y (lat):", buf.readDoubleLE(17));
