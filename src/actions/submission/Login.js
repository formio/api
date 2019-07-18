const bcrypt = require('bcryptjs');
const Action = require('../Action');
const has = require('lodash/has');
const get = require('lodash/get');

module.exports = class Login extends Action {
  static info() {
    return {
      name: 'login',
      title: 'Login',
      group: 'default',
      description: 'Provides a way to login to the application.',
      priority: 2,
      defaults: {
        handler: ['before'],
        method: ['create']
      },
      access: {
        handler: false,
        method: false
      }
    };
  }

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  static settingsForm(options) {
    return super.settingsForm(options, [
      {
        type: 'select',
        input: true,
        label: 'Resources',
        key: 'resources',
        placeholder: 'Select the resources we should login against.',
        dataSrc: 'url',
        data: { url: `${options.baseUrl}?type=resource` },
        valueProperty: '_id',
        template: '<span>{{ item.title }}</span>',
        multiple: true,
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Username Field',
        key: 'username',
        placeholder: 'Select the username field',
        template: '<span>{{ item.label || item.key }} ({{item.key}})</span>',
        dataSrc: 'json',
        data: { json: JSON.stringify(options.components) },
        valueProperty: 'key',
        multiple: false,
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Password Field',
        key: 'password',
        placeholder: 'Select the password field',
        template: '<span>{{ item.label || item.key }} ({{item.key}})</span>',
        dataSrc: 'json',
        data: { json: JSON.stringify(options.components) },
        valueProperty: 'key',
        multiple: false,
        validate: {
          required: true
        }
      },
      {
        type: 'textfield',
        key: 'allowedAttempts',
        input: true,
        label: 'Maximum Login Attempts',
        description: 'Use 0 for unlimited attempts',
        defaultValue: '5'
      },
      {
        type: 'textfield',
        key: 'attemptWindow',
        input: true,
        label: 'Login Attempt Time Window',
        description: 'This is the window of time to count the login attempts.',
        defaultValue: '30',
        suffix: 'seconds'
      },
      {
        type: 'textfield',
        key: 'lockWait',
        input: true,
        label: 'Locked Account Wait Time',
        description: 'The amount of time a person needs to wait before they can try to login again.',
        defaultValue: '1800',
        suffix: 'seconds'
      }
    ]);
  }

  resolve(handler, method, req, res, setActionInfoMessage) {
    if (!req.body || !req.body.hasOwnProperty('data')) {
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a username.
    if (!has(req.body.data, this.settings.username)) {
      setActionInfoMessage('Username not set or not found');
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a password.
    if (!has(req.body.data, this.settings.password)) {
      setActionInfoMessage('Password not set or not found');
      return res.status(401).send('User or password was incorrect.');
    }

    const query = {
      form: { '$in': this.settings.resources.map(this.app.db.toID) },
      [`data.${this.settings.username}`]: get(req.body.data, this.settings.username),
    };

    return this.app.models.Submission.read(query)
      .then(user => {
        if (!user) {
          setActionInfoMessage('User not found');
          return Promise.reject('User or password was incorrect.');
        }

        if (!get(user.data, this.settings.password)) {
          setActionInfoMessage('Password not set');
          return Promise.reject('User account does not have a password. You must reset your password to login.');
        }

        return bcrypt.compare(get(req.submission.data, this.settings.password), get(user.data, this.settings.password))
          .then(value => {
            if (!value) {
              setActionInfoMessage('Password did not match');
              return Promise.reject('User or password was incorrect.');
            }
            setActionInfoMessage('Password matched. Setting response data');
            return this.app.models.Form.read({
              _id: this.app.db.toID(user.form),
            })
              .then(form => {
                req.user = user;
                res.token = this.app.generateToken(this.app.tokenPayload(user, form));
              });
          });
      });
  }
};
