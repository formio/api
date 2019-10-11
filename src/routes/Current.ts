import {Route} from '../classes';

export class Current extends Route {
  get path() {
    return `${super.path}/current`;
  }

  public execute(req, res) {
    if (!req.user) {
      res.send({});
    }

    // If external user, just send it.
    if (req.user.external) {
      res.send(req.user);
    }

    this.app.makeChildRequest({
      req,
      url: '/form/:formId/submission/:submissionId',
      params: {
        formId: req.user.form,
        submissionId: req.user._id,
      },
      middleware: this.app.resources.Submission.get.bind(this.app.resources.Submission),
    })
      .then((submission) => {
        res.send(submission);
      });
  }
}
