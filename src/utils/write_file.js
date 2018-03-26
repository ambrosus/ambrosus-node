import fs from 'fs';

const writeFile = (filename, data) =>
  new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

export default writeFile;
