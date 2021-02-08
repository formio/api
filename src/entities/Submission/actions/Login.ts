import * as bcrypt from 'bcryptjs';
import { Action } from '../../../classes';
import { lodash as _ } from '../../../util/lodash';

export class Login extends Action {
  // Should be a low number (or it will degrade experience)
  // But not too low (should take much more time than bcrypt.compare is taking)
  public static readonly MAX_JITTER = 100;

  public static info() {
    return {
      name: 'login',
      title: 'Login',
      group: 'default',
      description: 'Provides a way to login to the application.',
      priority: 2,
      default: false,
      defaults: {
        handler: ['before'],
        method: ['create'],
      },
      access: {
        handler: false,
        method: false,
      },
    };
  }

  /**
   * Settings form for auth action.
   *
   * @param req
   * @param res
   * @param next
   */
  public static settingsForm(options) {
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
          required: true,
        },
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
          required: true,
        },
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
          required: true,
        },
      },
      {
        type: 'textfield',
        key: 'allowedAttempts',
        input: true,
        label: 'Maximum Login Attempts',
        description: 'Use 0 for unlimited attempts',
        defaultValue: '5',
      },
      {
        type: 'textfield',
        key: 'attemptWindow',
        input: true,
        label: 'Login Attempt Time Window',
        description: 'This is the window of time to count the login attempts.',
        defaultValue: '30',
        suffix: 'seconds',
      },
      {
        type: 'textfield',
        key: 'lockWait',
        input: true,
        label: 'Locked Account Wait Time',
        description:
          'The amount of time a person needs to wait before they can try to login again.',
        defaultValue: '1800',
        suffix: 'seconds',
      },
    ]);
  }

  public resolve({ data: submission, req, res }, setActionInfoMessage) {
    if (!submission || !submission.hasOwnProperty('data')) {
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a username.
    if (!_.has(submission.data, this.settings.username)) {
      setActionInfoMessage('Username not set');
      return res.status(401).send('User or password was incorrect.');
    }

    // They must provide a password.
    if (!_.has(submission.data, this.settings.password)) {
      setActionInfoMessage('Password not set');
      return res.status(401).send('User or password was incorrect.');
    }

    const query = {
      form: { $in: this.settings.resources.map(this.app.db.toID) },
      [`data.${this.settings.username}`]: _.get(
        submission.data,
        this.settings.username,
      ),
    };

    return this.app.models.Submission.read(
      query,
      req.context ? req.context.params : {},
    ).then((user) => {
      const sendInvalid = () => {
        // Deliberately vague to discourage user enumeration via Login
        setActionInfoMessage(
          'If you have not set a password yet, please use the reset password link.',
        );
        return res.status(401).send('Provided credentials are not valid.');
      };

      setTimeout(() => {
        // - User not found
        // - Invalid password for user
        // - User has not yet set a password
        if (!user || !_.get(user.data, this.settings.password)) {
          return sendInvalid();
        }

        // Need to use req.submission.data for password as it hasn't been encrypted yet.
        return bcrypt
          .compare(
            _.get(req.submission.data, this.settings.password, ''),
            _.get(user.data, this.settings.password),
          )
          .then((value) => {
            if (!value) {
              return sendInvalid();
            }
            return this.app
              .loadEntity(req, 'Form', {
                _id: this.app.db.toID(user.form),
              })
              .then(async (form) => {
                req.user = user;
                res.token = this.app.generateToken(
                  this.app.tokenPayload(user, form),
                );
                res.resource.item = await this.app.resources.Submission.finalize(
                  user,
                  req,
                );
              });
          });
      }, Math.floor(Math.random() * Login.MAX_JITTER));
    });
  }
}
