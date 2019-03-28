const bcrypt = require('bcryptjs');

module.exports = text => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return reject(err);
      }

      bcrypt.hash(text, salt, function(error, hash) {
        if (error) {
          return reject(error);
        }

        resolve(hash);
      });
    });
  });
};
