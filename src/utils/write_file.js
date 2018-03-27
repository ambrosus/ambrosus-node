import fs from 'fs';

export default function writeFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
