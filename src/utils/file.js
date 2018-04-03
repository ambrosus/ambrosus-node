import fs from 'fs';

const writeFile = (path, data) =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

const checkFileExists = (path) =>
  new Promise((resolve) => {
    fs.access(path, (err) => {
      resolve(!err);
    });
  });

export {writeFile, checkFileExists};
